/**
 * Standalone Utility Script: Purge Unnecessary Activity Logs
 *
 * Keeps ONLY:
 * 1. Login logs (action: "LOGIN")
 * 2. Logout logs (action: "LOGOUT")
 * 3. Student promotion logs (module: "Students" and description contains promote/promoted/level)
 * 4. Student data deletion logs (action: "DELETE" and module: "Students")
 *
 * Usage:
 *   node backend/scripts/purgeUnnecessaryLogs.js
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const ActivityLog = require("../src/models/activity/ActivityLog");

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI not found in backend/.env");
    process.exit(1);
  }

  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB successfully.");

  const totalBefore = await ActivityLog.countDocuments();
  console.log(`📊 Total Activity Logs currently in DB: ${totalBefore}`);

  const queryToDelete = {
    $and: [
      { action: { $nin: ["LOGIN", "LOGOUT"] } },
      {
        $nor: [
          {
            module: "Students",
            $or: [
              { "meta.isPromotion": true },
              { description: { $regex: /promot|level/i } },
            ],
          },
          {
            action: "DELETE",
            $or: [
              { module: "Students" },
              { description: { $regex: /student/i } },
            ],
          },
        ],
      },
    ],
  };

  const toDeleteCount = await ActivityLog.countDocuments(queryToDelete);
  console.log(`🧹 Found ${toDeleteCount} unnecessary activity logs to purge.`);

  if (toDeleteCount === 0) {
    console.log("✨ Database is already clean! No unnecessary logs found.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const result = await ActivityLog.deleteMany(queryToDelete);
  const totalAfter = await ActivityLog.countDocuments();

  console.log(`✅ Successfully deleted ${result.deletedCount} unnecessary logs.`);
  console.log(`📉 Remaining logs in DB (Login, Logout, Student Promotion & Deletion): ${totalAfter}`);

  await mongoose.disconnect();
  console.log("👋 Disconnected. Done!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error running purge script:", err);
  process.exit(1);
});
