const mongoose = require("mongoose");
const Session = require("../models/Session");
const { resolveCourseDuration } = require("./batchHelper");

/**
 * Extracts intake year (e.g. 2024, 2025, 2026) from a batch string, year, or session string.
 * Supports: "2024", 2024, "2024-2028", "2024-25", "2024-2027", "AY 2024-25", "Batch 2024", "24-25", "24", etc.
 */
function extractIntakeYear(input) {
  if (!input) return new Date().getFullYear();
  const s = String(input).trim();

  // 1. Look for 4-digit year like 2024, 2025, 2026
  const match4 = s.match(/\b(20\d\d)\b/);
  if (match4) return parseInt(match4[1], 10);

  // 2. Look for 2-digit range e.g. 24-25 or 24/25
  const match2 = s.match(/\b(\d{2})[-/](\d{2})\b/);
  if (match2) return 2000 + parseInt(match2[1], 10);

  // 3. Fallback direct number e.g. 24 or 2024
  const num = parseInt(s, 10);
  if (!isNaN(num)) {
    if (num >= 2000 && num <= 2100) return num;
    if (num >= 20 && num <= 99) return 2000 + num;
  }

  return new Date().getFullYear();
}

/**
 * Finds an existing Session or auto-creates a new Session from a student's batch or session input,
 * dynamically respecting course duration (e.g., 4 years for B.Tech -> 2025-29, 3 years for BCA/BBA -> 2025-28, 2 years for Diploma -> 2025-27).
 *
 * @param {string|number} batchInput - e.g. "2025", "2025-2029", "2025-28", "2025-29"
 * @param {string|mongoose.Types.ObjectId} [fallbackSessionId] - Optional session ID to check first
 * @param {Object} [options] - Additional context for duration calculation
 * @param {string} [options.course]
 * @param {mongoose.Types.ObjectId|string} [options.departmentId]
 * @param {mongoose.Types.ObjectId|string} [options.subDepartmentId]
 * @param {number} [options.duration]
 * @returns {Promise<mongoose.Types.ObjectId>} Session ObjectId
 */
async function findOrCreateSessionFromBatch(batchInput, fallbackSessionId, options = {}) {
  // 1. If a valid fallback session ID was provided and exists in DB, use it
  if (fallbackSessionId && mongoose.Types.ObjectId.isValid(String(fallbackSessionId).trim())) {
    try {
      const existingById = await Session.findById(String(fallbackSessionId).trim());
      if (existingById) {
        return existingById._id;
      }
    } catch (_) {}
  }

  // If batchInput itself is already a valid ObjectId that exists in Session
  if (batchInput && mongoose.Types.ObjectId.isValid(String(batchInput).trim())) {
    try {
      const existingById = await Session.findById(String(batchInput).trim());
      if (existingById) {
        return existingById._id;
      }
    } catch (_) {}
  }

  // 2. Resolve Course Duration
  let durationInYears = options.duration;
  if (!durationInYears && (options.departmentId || options.subDepartmentId || options.course)) {
    try {
      durationInYears = await resolveCourseDuration({
        departmentId: options.departmentId,
        subDepartmentId: options.subDepartmentId,
        course: options.course
      });
    } catch (_) {}
  }
  if (!durationInYears || durationInYears < 1) {
    durationInYears = 3; // Default 3 years (UG)
  }

  // 3. Check if batchInput already specifies an explicit end year or range
  // e.g. "2025-28", "2025-29", "2025-2029", "2024-2028"
  const rangeMatch = String(batchInput || "").match(/\b(20\d\d)\s*[-/]\s*(\d{2,4})\b/);
  let intakeYear;
  let endYear;

  if (rangeMatch) {
    intakeYear = parseInt(rangeMatch[1], 10);
    const rawEnd = parseInt(rangeMatch[2], 10);
    endYear = rawEnd < 100 ? (2000 + rawEnd) : rawEnd;
    durationInYears = Math.max(1, endYear - intakeYear);
  } else {
    intakeYear = extractIntakeYear(batchInput);
    endYear = intakeYear + durationInYears;
  }

  const shortEndYear = String(endYear).slice(-2);
  const standardName = `${intakeYear}-${shortEndYear}`; // e.g. "2025-28" for BCA, "2025-29" for B.Tech
  const fullYearName = `${intakeYear}-${endYear}`;       // e.g. "2025-2028", "2025-2029"

  // 4. Search for any existing session matching this exact duration range
  let existing = await Session.findOne({
    $or: [
      { name: standardName },
      { name: fullYearName },
      { name: { $regex: new RegExp(`^AY\\s*${intakeYear}[-/](${shortEndYear}|${endYear})`, 'i') } },
      { name: { $regex: new RegExp(`^${intakeYear}[-/](${shortEndYear}|${endYear})`, 'i') } }
    ]
  });

  if (existing) {
    return existing._id;
  }

  // 5. Auto-create new Session for this exact course batch range
  const startDate = new Date(intakeYear, 6, 1); // July 1st of intake year
  const endDate = new Date(endYear, 5, 30);      // June 30th of graduation year

  const now = new Date();
  let status = 'upcoming';
  if (now >= startDate && now <= endDate) {
    status = 'active';
  } else if (now > endDate) {
    status = 'completed';
  }

  try {
    const newSession = await Session.create({
      name: standardName,
      startDate,
      endDate,
      isActive: true,
      status,
      description: `Academic Session for Batch ${intakeYear} (${durationInYears} Year Program: ${intakeYear}-${shortEndYear})`
    });
    return newSession._id;
  } catch (err) {
    // In case of parallel creation race condition on unique name index
    if (err.code === 11000) {
      const raceSession = await Session.findOne({ name: standardName });
      if (raceSession) return raceSession._id;
    }
    throw err;
  }
}

/**
 * Backward compatibility wrapper for findOrCreateSessionByName
 */
async function findOrCreateSessionByName(sessionInput, fallbackSessionId, options) {
  return findOrCreateSessionFromBatch(sessionInput, fallbackSessionId, options);
}

module.exports = {
  findOrCreateSessionFromBatch,
  findOrCreateSessionByName,
  extractIntakeYear
};
