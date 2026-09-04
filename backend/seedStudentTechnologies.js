require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/student/Student');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found");
  process.exit(1);
}

const sampleTechs = ["MERN Stack", "Python", "Java", "Full Stack Development", "React & Node.js", "Data Science & Python"];

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    console.log("Connected to MongoDB for student technology update...");

    const students = await Student.find({});
    console.log(`Found ${students.length} total students.`);

    let updatedCount = 0;
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (!s.techno && !s.technology && !s.track) {
        const assignedTech = sampleTechs[i % sampleTechs.length];
        s.techno = assignedTech;
        s.technology = assignedTech;
        s.track = assignedTech;
        await s.save();
        updatedCount++;
        console.log(`Updated student ${s.firstName} ${s.lastName} (${s.prkey}) -> Technology: ${assignedTech}`);
      } else if (!s.techno || !s.technology) {
        const existingTech = s.techno || s.technology || s.track;
        s.techno = existingTech;
        s.technology = existingTech;
        s.track = existingTech;
        await s.save();
        updatedCount++;
        console.log(`Ensured student ${s.firstName} ${s.lastName} (${s.prkey}) -> Technology: ${existingTech}`);
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} students with technology data.`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error updating student technologies:", err.message);
    process.exit(1);
  });
