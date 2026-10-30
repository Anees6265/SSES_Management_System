/**
 * Helper utilities to compute session durations and filter academic sessions
 * based on Department course duration requirements.
 *
 * Requirements:
 * - ITEG: 3-year (BCA) and 2-year (ITEG Diploma) sessions (e.g. 2026 - 29, 2025 - 28, 2024 - 27, 2025 - 27, 2026 - 28)
 * - MEG, BEG: 3-year sessions (e.g. 2026 - 29, 2025 - 28, 2024 - 27, 2022 - 25)
 * - B.Tech / BTECH: 4-year sessions (e.g. 2026 - 30, 2025 - 29)
 */

/**
 * Calculates duration in years for an academic session.
 * Checks session name format first (e.g. "2026-29", "2026 - 29", "2026-30", "2026 - 2030", "2025-27"),
 * then falls back to startDate and endDate or durationInYears.
 */
export const getSessionDurationInYears = (session) => {
  if (!session) return null;

  // 1. Check session name (e.g., "2026-29", "2026 - 29", "2026 - 2030", "2024-27", "2025-27")
  if (session.name) {
    const match = String(session.name).match(/(\d{4})\s*[-–—/]\s*(\d{2,4})/);
    if (match) {
      const start = parseInt(match[1], 10);
      let end = parseInt(match[2], 10);
      if (end < 100) {
        const century = Math.floor(start / 100) * 100;
        end = century + end;
      }
      const diff = end - start;
      if (diff > 0) return diff;
    }
  }

  // 2. Check startDate & endDate
  if (session.startDate && session.endDate) {
    const startYear = new Date(session.startDate).getFullYear();
    const endYear = new Date(session.endDate).getFullYear();
    const diff = endYear - startYear;
    if (diff > 0) return diff;
  }

  // 3. Explicit duration field if present
  if (session.durationInYears) {
    return Number(session.durationInYears);
  }

  return null;
};

/**
 * Formats a session label for display in dropdowns and select menus.
 * For 2-year sessions (e.g. 2025-27, 2026-28), appends "(ITEG Diploma)"
 * so staff clearly understand it is for the 2-year ITEG Diploma course.
 */
export const formatSessionLabel = (session) => {
  if (!session) return "";
  const rawName = typeof session === "object" ? (session.name || "") : String(session);
  const duration = getSessionDurationInYears(session);
  if (duration === 2 && !rawName.toLowerCase().includes("diploma")) {
    return `${rawName} (ITEG Diploma)`;
  }
  return rawName;
};

/**
 * Returns the target course durations in years (array of numbers) for a given department.
 * - ITEG: [3, 2] (3-year for BCA and 2-year for Diploma)
 * - MEG / BEG: [3]
 * - B.Tech / BTECH: [4]
 */
export const getTargetDurationsForDepartment = (deptNameOrObj) => {
  if (!deptNameOrObj) return null;
  const name = String(typeof deptNameOrObj === "object" ? (deptNameOrObj.name || "") : deptNameOrObj)
    .trim()
    .toUpperCase();

  // 4-year: B.Tech / BTECH / Engineering
  if (name.includes("B.TECH") || name.includes("BTECH") || name.includes("ENGINEERING")) {
    return [4];
  }

  // ITEG: 3-year (BCA) and 2-year (ITEG Diploma)
  if (name.includes("ITEG")) {
    return [3, 2];
  }

  // 3-year: MEG / BEG
  if (name.includes("MEG") || name.includes("BEG")) {
    return [3];
  }

  // Check department object allowedCourses if available
  if (typeof deptNameOrObj === "object" && Array.isArray(deptNameOrObj.allowedCourses)) {
    const durations = [...new Set(deptNameOrObj.allowedCourses.map((c) => Number(c.durationInYears)).filter(Boolean))];
    if (durations.length > 0) return durations;
  }

  return null;
};

/**
 * Single duration backward compatibility wrapper.
 */
export const getTargetDurationForDepartment = (deptNameOrObj) => {
  const durations = getTargetDurationsForDepartment(deptNameOrObj);
  return durations && durations.length > 0 ? durations[0] : null;
};

/**
 * Filters a list of sessions according to the department's required course duration(s).
 * If targetDurations are found, returns only sessions matching those durations.
 * If no targetDurations are resolved or sessions array is empty, returns original sessions.
 */
export const filterSessionsByDepartment = (sessions = [], deptNameOrObj) => {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const targetDurations = getTargetDurationsForDepartment(deptNameOrObj);
  if (!targetDurations || targetDurations.length === 0) return sessions;

  const filtered = sessions.filter((s) => {
    const duration = getSessionDurationInYears(s);
    return targetDurations.includes(duration);
  });

  // Return filtered list; fallback to original sessions only if no session matches duration
  return filtered.length > 0 ? filtered : sessions;
};
