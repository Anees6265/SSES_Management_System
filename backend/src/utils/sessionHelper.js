const mongoose = require("mongoose");
const Session = require("../models/Session");

/**
 * Finds an existing Session by ID or Name, or creates a new active Session if not found.
 * @param {string} sessionInput - Session ID or session/year string (e.g., "2024-2025", "2024-25", "2025")
 * @returns {Promise<mongoose.Types.ObjectId|null>} Session ObjectId
 */
async function findOrCreateSessionByName(sessionInput) {
  if (!sessionInput) return null;

  const rawInput = String(sessionInput).trim();
  if (!rawInput) return null;

  // 1. If it's a valid ObjectId, check if it exists in Session collection
  if (mongoose.Types.ObjectId.isValid(rawInput)) {
    const existingById = await Session.findById(rawInput);
    if (existingById) {
      return existingById._id;
    }
  }

  // 2. Search by Session Name (case-insensitive exact match)
  const existingByName = await Session.findOne({
    name: { $regex: new RegExp(`^${rawInput.replace(/[-[\]{}()*+? me.\\^$|]/g, '\\$&')}$`, 'i') }
  });

  if (existingByName) {
    return existingByName._id;
  }

  // 3. Derive start and end dates if input has year information
  let startYear = new Date().getFullYear();
  let endYear = startYear + 1;

  const yearsMatch = rawInput.match(/\d{4}/g);
  if (yearsMatch && yearsMatch.length > 0) {
    startYear = parseInt(yearsMatch[0], 10);
    if (yearsMatch.length > 1) {
      endYear = parseInt(yearsMatch[1], 10);
    } else {
      endYear = startYear + 1;
    }
  } else {
    // Check 2-digit year format e.g. 2024-25
    const shortYearMatch = rawInput.match(/(\d{4})[-/](\d{2})/);
    if (shortYearMatch) {
      startYear = parseInt(shortYearMatch[1], 10);
      const century = Math.floor(startYear / 100) * 100;
      endYear = century + parseInt(shortYearMatch[2], 10);
    }
  }

  const startDate = new Date(startYear, 6, 1); // July 1st of start year
  const endDate = new Date(endYear, 5, 30);    // June 30th of end year

  const now = new Date();
  let status = 'upcoming';
  if (now >= startDate && now <= endDate) {
    status = 'active';
  } else if (now > endDate) {
    status = 'completed';
  }

  // 4. Create new Session record
  const newSession = await Session.create({
    name: rawInput,
    startDate,
    endDate,
    isActive: true,
    status,
    description: "Auto-created from student data"
  });

  return newSession._id;
}

module.exports = {
  findOrCreateSessionByName
};
