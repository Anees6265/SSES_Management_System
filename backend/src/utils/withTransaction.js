const mongoose = require("mongoose");

// Runs fn(session) inside a MongoDB transaction.
// Falls back to fn(null) without a session when running on a standalone
// MongoDB instance (local dev) that does not support transactions.
const withTransaction = async (fn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (_) {}
    }
    // Standalone MongoDB does not support transactions — fall back gracefully
    if (
      err.message?.includes("Transaction numbers") ||
      err.message?.includes("replica set") ||
      err.codeName === "IllegalOperation"
    ) {
      return await fn(null);
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
};

module.exports = { withTransaction };
