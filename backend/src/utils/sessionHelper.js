const mongoose = require("mongoose");
const Session = require("../models/Session");

/**
 * Extracts intake year (e.g. 2024, 2025, 2026) from a batch string, year, or session string.
 * Supports: "2024", 2024, "2024-2028", "2024-25", "2024-2025", "AY 2024-25", "Batch 2024", "24-25", "24", etc.
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
 * Finds an existing Session or auto-creates a new Session from a student's batch or session input.
 * @param {string|number} batchInput - e.g. "2024", "2025", "2026", "2024-2028", "2024-25"
 * @param {string|mongoose.Types.ObjectId} [fallbackSessionId] - Optional session ID to check first
 * @returns {Promise<mongoose.Types.ObjectId>} Session ObjectId
 */
async function findOrCreateSessionFromBatch(batchInput, fallbackSessionId) {
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

  const intakeYear = extractIntakeYear(batchInput);
  const nextYear = intakeYear + 1;
  const shortNextYear = String(nextYear).slice(-2); // e.g. "25" for 2025
  const standardName = `${intakeYear}-${shortNextYear}`; // e.g. "2024-25"
  const fullYearName = `${intakeYear}-${nextYear}`;      // e.g. "2024-2025"

  // 2. Search for any existing session representing this academic intake year
  let existing = await Session.findOne({
    $or: [
      { name: standardName },
      { name: fullYearName },
      { name: String(intakeYear) },
      { name: { $regex: new RegExp(`^AY\\s*${intakeYear}[-/](${shortNextYear}|${nextYear})`, 'i') } },
      { name: { $regex: new RegExp(`^${intakeYear}[-/](${shortNextYear}|${nextYear})`, 'i') } }
    ]
  });

  if (!existing) {
    // Check if any session exists with startDate within intake year
    existing = await Session.findOne({
      startDate: {
        $gte: new Date(intakeYear, 0, 1),
        $lte: new Date(intakeYear, 11, 31)
      }
    });
  }

  if (existing) {
    return existing._id;
  }

  // 3. Auto-create new Session for this batch intake year
  const startDate = new Date(intakeYear, 6, 1); // July 1st of intake year
  const endDate = new Date(nextYear, 5, 30);    // June 30th of next year

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
      description: `Academic Session for Batch ${intakeYear}`
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
async function findOrCreateSessionByName(sessionInput) {
  return findOrCreateSessionFromBatch(sessionInput);
}

module.exports = {
  findOrCreateSessionFromBatch,
  findOrCreateSessionByName,
  extractIntakeYear
};
