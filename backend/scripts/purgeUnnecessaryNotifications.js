/**
 * Standalone Utility Script: Purge Unnecessary Notifications
 *
 * Keeps ONLY:
 * 1. Promotion notifications (category: "level")
 * 2. Student Leave / Permission notifications (category: "permission")
 *
 * Usage:
 *   node backend/scripts/purgeUnnecessaryNotifications.js
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Notification = require("../src/models/notification/Notification");

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI not found in backend/.env");
    process.exit(1);
  }

  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB successfully.");

  const totalBefore = await Notification.countDocuments();
  console.log(`📊 Total Notifications currently in DB: ${totalBefore}`);

  const queryToDelete = {
    category: { $nin: ["level", "permission"] },
  };

  const toDeleteCount = await Notification.countDocuments(queryToDelete);
  console.log(`🧹 Found ${toDeleteCount} unnecessary notifications to purge.`);

  if (toDeleteCount === 0) {
    console.log("✨ Database is already clean! No unnecessary notifications found.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const result = await Notification.deleteMany(queryToDelete);
  const totalAfter = await Notification.countDocuments();

  console.log(`✅ Successfully deleted ${result.deletedCount} unnecessary notifications.`);
  console.log(`📉 Remaining notifications in DB (Promotion & Student Leave only): ${totalAfter}`);

  await mongoose.disconnect();
  console.log("👋 Disconnected. Done!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error running notification purge script:", err);
  process.exit(1);
});
