require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('DB Connected'))
  .catch(e => { console.error('DB Error:', e.message); process.exit(1); });

mongoose.connection.once('open', async () => {
  try {
    const Student = require('./src/models/student/Student');

    const prkey = 'ITEG2025TEST';
    const plainPassword = 'Test@1234';

    // Remove if exists
    await Student.deleteOne({ prkey });

    const hashed = await bcrypt.hash(plainPassword, 10);

    const student = await Student.create({
      prkey,
      firstName: 'Test',
      lastName: 'Student',
      fatherName: 'Test Father',
      email: 'teststudent@iteg.com',
      studentMobile: '9999999999',
      parentMobile: '8888888888',
      gender: 'Male',
      dob: new Date('2002-01-15'),
      address: 'Test Address, Indore',
      village: 'Indore',
      course: 'B.Tech',
      subDepartmentId: '69fecc8bb1101f812527491d',  // ITEG
      sessionId:       '69fef5ea53c4013a38899554',  // 2025-26
      currentLevelId:  '69fecdaeb1101f8125274937',  // Level 1
      currentSubLevelId: '69fece0cb1101f8125274956', // SubLevel 1A
      syllabusVersionId: '69fef6e153c4013a38899577', // v1.0
      status: 'Active',
      password: hashed,
    });

    console.log('\n✅ Student Created Successfully');
    console.log('Student ID :', student._id.toString());
    console.log('PR Key     : ITEG2025TEST');
    console.log('Password   : Test@1234');
    console.log('Department : ITEG');
    console.log('Level      : 1 → SubLevel 1A');
    console.log('Session    : 2025-26\n');

    // Assign tasks
    const Task = require('./src/models/syllabus/Task');
    const StudentTask = require('./src/models/syllabus/StudentTask');

    const tasks = await Task.find({
      syllabusVersionId: '69fef6e153c4013a38899577',
      isActive: true
    });

    console.log('Tasks in syllabus:', tasks.length);

    if (tasks.length > 0) {
      const studentTasks = tasks.map(t => ({
        studentId: student._id,
        taskId: t._id,
        sessionId: student.sessionId,
        levelId: student.currentLevelId,
        subLevelId: student.currentSubLevelId,
        syllabusVersionId: student.syllabusVersionId,
        subjectId: t.subjectId || null,
        topicId: t.topicId || null,
        subTopicId: t.subTopicId || null,
        subjectName: t.subjectName || 'General',
        topicName: t.topicName || '',
        subTopicName: t.subTopicName || '',
        taskNodeType: t.taskNodeType || 'topic',
        taskName: t.title || 'Task',
        title: t.title || 'Task',
        description: t.description || '',
        type: t.type || 'assignment',
        mandatory: t.mandatory ?? true,
        maxMarks: t.maxMarks || 10,
        status: 'pending',
        isExtra: false,
        isActive: true,
        assignedType: 'auto',
        assignedAt: new Date(),
      }));

      await StudentTask.insertMany(studentTasks);
      console.log('Tasks assigned:', studentTasks.length);
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
});
