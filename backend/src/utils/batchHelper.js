const mongoose = require("mongoose");
const Session = require("../models/Session");
const SubDepartment = require("../models/department/SubDepartment");
const Department = require("../models/department/Department");

/**
 * Calculates student batch year string (e.g. "2025 - 2029" for 4-year B.Tech, "2025 - 2028" for 3-year BCA)
 * based on session intake year and department/course durationInYears.
 *
 * @param {Object} params
 * @param {mongoose.Types.ObjectId|string} [params.sessionId]
 * @param {Object} [params.session]
 * @param {string} [params.sessionName]
 * @param {mongoose.Types.ObjectId|string} [params.subDepartmentId]
 * @param {mongoose.Types.ObjectId|string} [params.departmentId]
 * @param {string} [params.course]
 * @returns {Promise<string>} e.g. "2025 - 2029"
 */
async function calculateBatchYear({
  sessionId,
  session,
  sessionName,
  subDepartmentId,
  departmentId,
  course = ""
} = {}) {
  // 1. Determine Intake Start Year
  let startYear = null;

  // From session object
  if (session) {
    if (session.startDate) {
      const d = new Date(session.startDate);
      if (!isNaN(d.getTime())) startYear = d.getFullYear();
    }
    if (!startYear && session.name) {
      const match = String(session.name).match(/\b(20\d\d)\b/);
      if (match) startYear = parseInt(match[1], 10);
    }
  }

  // From sessionId
  if (!startYear && sessionId) {
    try {
      const foundSession = await Session.findById(sessionId).lean();
      if (foundSession) {
        if (foundSession.startDate) {
          const d = new Date(foundSession.startDate);
          if (!isNaN(d.getTime())) startYear = d.getFullYear();
        }
        if (!startYear && foundSession.name) {
          const match = String(foundSession.name).match(/\b(20\d\d)\b/);
          if (match) startYear = parseInt(match[1], 10);
        }
      }
    } catch (e) {
      // ignore lookup error
    }
  }

  // From raw sessionName string
  if (!startYear && sessionName) {
    const match = String(sessionName).match(/\b(20\d\d)\b/);
    if (match) startYear = parseInt(match[1], 10);
  }

  // Fallback to current year
  if (!startYear) {
    startYear = new Date().getFullYear();
  }

  // 2. Determine Course Duration (durationInYears)
  let durationInYears = null;
  let resolvedDept = null;

  if (departmentId) {
    try {
      resolvedDept = await Department.findById(departmentId).lean();
    } catch (e) {}
  } else if (subDepartmentId) {
    try {
      const subDept = await SubDepartment.findById(subDepartmentId).populate("departmentId").lean();
      if (subDept?.departmentId) {
        resolvedDept = subDept.departmentId;
      }
    } catch (e) {}
  }

  const courseClean = String(course || "").trim().toLowerCase();

  // Try matching inside resolved department's allowedCourses
  if (resolvedDept?.allowedCourses?.length && courseClean) {
    const matched = resolvedDept.allowedCourses.find((c) => {
      const cName = String(c.courseName || "").trim().toLowerCase();
      return cName === courseClean || courseClean.includes(cName) || cName.includes(courseClean);
    });
    if (matched && Number(matched.durationInYears) > 0) {
      durationInYears = Number(matched.durationInYears);
    }
  }

  // Heuristic fallbacks if department lookup did not find duration
  if (!durationInYears) {
    if (resolvedDept?.name && /b\.?tech|engineering/i.test(resolvedDept.name)) {
      durationInYears = 4;
    } else if (/b\.?tech|engineering|b\.?e\b/i.test(courseClean)) {
      durationInYears = 4;
    } else if (/mca|mba|m\.?tech|m\.?sc|master/i.test(courseClean)) {
      durationInYears = 2;
    } else if (/diploma|polytechnic/i.test(courseClean)) {
      durationInYears = 3;
    } else if (/phd|doctorate/i.test(courseClean)) {
      durationInYears = 4;
    } else {
      // Default duration for standard undergraduate degrees (BCA, BBA, B.Sc, B.Com)
      durationInYears = 3;
    }
  }

  const endYear = startYear + durationInYears;
  return `${startYear} - ${endYear}`;
}

module.exports = {
  calculateBatchYear
};
