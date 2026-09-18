require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Department = require('./src/models/department/Department');
const SubDepartment = require('./src/models/department/SubDepartment');
const Level = require('./src/models/department/Level');
const SubLevel = require('./src/models/department/SubLevel');
const Session = require('./src/models/Session');
const SyllabusVersion = require('./src/models/syllabus/SyllabusVersion');
const Task = require('./src/models/syllabus/Task');
const Student = require('./src/models/student/Student');
const { assignTasksToStudent } = require('./src/services/taskAssignmentService');

async function seedMEGData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  try {
    // 1. Find MEG Department & SubDepartment
    const megDept = await Department.findOne({
      $or: [{ code: 'MEG-001' }, { name: /Management Excellence/i }, { name: 'MEG' }]
    });
    if (!megDept) throw new Error('MEG Department not found');
    console.log(`Department found: ${megDept.name} (${megDept._id})`);

    // Ensure allowedCourses in Department
    megDept.allowedCourses = [
      { courseName: 'BBA', durationInYears: 3 },
      { courseName: 'BCom', durationInYears: 3 }
    ];
    await megDept.save();
    console.log('✅ Department allowedCourses updated to [BBA, BCom]');

    // Find MEG SubDepartment
    let megSubDept = await SubDepartment.findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId('6a0eebd80e812b062d541ec4') },
        { departmentId: megDept._id },
        { name: 'MEG' }
      ]
    });
    if (!megSubDept) throw new Error('MEG SubDepartment not found');
    megSubDept.allowedCourses = ['BBA', 'BCom'];
    await megSubDept.save();
    console.log(`✅ SubDepartment found: ${megSubDept.name} (${megSubDept._id}) with courses [BBA, BCom]`);

    // 2. Find MEG Level 1
    const level1 = await Level.findOne({
      subDepartmentId: megSubDept._id,
      order: 1
    });
    if (!level1) throw new Error('MEG Level 1 not found');
    console.log(`✅ Level 1 found: ${level1.name} (${level1._id})`);

    // Find MEG Level 2 if exists
    const level2 = await Level.findOne({
      subDepartmentId: megSubDept._id,
      order: 2
    });

    // 3. Ensure SubLevels for Level 1 exist (1A and 1B)
    let subLevel1A = await SubLevel.findOne({ levelId: level1._id, order: 1 });
    if (!subLevel1A) {
      subLevel1A = await SubLevel.create({
        name: '1A',
        order: 1,
        levelId: level1._id,
        isActive: true
      });
      console.log(`✅ Created SubLevel 1A: ${subLevel1A._id}`);
    } else {
      console.log(`SubLevel 1A already exists: ${subLevel1A._id} (name: ${subLevel1A.name})`);
    }

    let subLevel1B = await SubLevel.findOne({ levelId: level1._id, order: 2 });
    if (!subLevel1B) {
      subLevel1B = await SubLevel.create({
        name: '1B',
        order: 2,
        levelId: level1._id,
        isActive: true
      });
      console.log(`✅ Created SubLevel 1B: ${subLevel1B._id}`);
    }

    // Ensure SubLevels for Level 2 if level 2 exists
    if (level2) {
      let subLevel2A = await SubLevel.findOne({ levelId: level2._id, order: 1 });
      if (!subLevel2A) {
        subLevel2A = await SubLevel.create({
          name: '2A',
          order: 1,
          levelId: level2._id,
          isActive: true
        });
        console.log(`✅ Created SubLevel 2A: ${subLevel2A._id}`);
      }
      let subLevel2B = await SubLevel.findOne({ levelId: level2._id, order: 2 });
      if (!subLevel2B) {
        subLevel2B = await SubLevel.create({
          name: '2B',
          order: 2,
          levelId: level2._id,
          isActive: true
        });
        console.log(`✅ Created SubLevel 2B: ${subLevel2B._id}`);
      }
    }

    // 4. Find Active Session
    let activeSession = await Session.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!activeSession) {
      activeSession = await Session.findOne().sort({ createdAt: -1 });
    }
    if (!activeSession) throw new Error('No Session found');
    console.log(`✅ Active Session: ${activeSession.name} (${activeSession._id})`);

    // 5. Create or Get SyllabusVersion for MEG Level 1, SubLevel 1A
    let syllabus = await SyllabusVersion.findOne({
      sessionId: activeSession._id,
      levelId: level1._id,
      subLevelId: subLevel1A._id,
      isActive: true
    });

    if (!syllabus) {
      syllabus = await SyllabusVersion.create({
        sessionId: activeSession._id,
        levelId: level1._id,
        subLevelId: subLevel1A._id,
        version: 'v1.0',
        title: 'MEG Level 1A Foundation Syllabus (Management & Commerce)',
        status: 'active',
        isActive: true,
        versionNumber: 1,
        effectiveFrom: new Date(),
        subjects: [
          {
            name: 'Principles & Practice of Management',
            code: 'MGMT101',
            description: 'Core foundational principles of management and organizational dynamics.',
            order: 1,
            isActive: true,
            topics: [
              {
                name: 'Introduction to Management',
                description: 'Managerial roles, functions, and scientific management.',
                order: 1,
                isActive: true,
                subTopics: [
                  { name: 'Management Concepts & Evolution', order: 1, isActive: true },
                  { name: 'Functions of Management', order: 2, isActive: true }
                ]
              },
              {
                name: 'Planning & Decision Making',
                description: 'Strategic planning, decision processes, and SWOT analysis.',
                order: 2,
                isActive: true,
                subTopics: [
                  { name: 'Planning Process & Objectives', order: 1, isActive: true },
                  { name: 'Decision Making Models', order: 2, isActive: true }
                ]
              }
            ]
          },
          {
            name: 'Financial Accounting & Reporting',
            code: 'ACCT101',
            description: 'Double entry bookkeeping, ledger management, and financial statements.',
            order: 2,
            isActive: true,
            topics: [
              {
                name: 'Accounting Fundamentals',
                description: 'Journalizing, posting, and trial balance.',
                order: 1,
                isActive: true,
                subTopics: [
                  { name: 'Journal & Ledger Entries', order: 1, isActive: true },
                  { name: 'Trial Balance Preparation', order: 2, isActive: true }
                ]
              },
              {
                name: 'Final Accounts',
                description: 'Trading, Profit & Loss accounts and Balance Sheet.',
                order: 2,
                isActive: true,
                subTopics: [
                  { name: 'P&L Account & Adjustments', order: 1, isActive: true },
                  { name: 'Balance Sheet Analysis', order: 2, isActive: true }
                ]
              }
            ]
          },
          {
            name: 'Business Communication & Soft Skills',
            code: 'COMM101',
            description: 'Professional verbal and written business communications.',
            order: 3,
            isActive: true,
            topics: [
              {
                name: 'Written Communication',
                description: 'Memos, professional emails, and formal reports.',
                order: 1,
                isActive: true,
                subTopics: [
                  { name: 'Business Writing & Etiquette', order: 1, isActive: true },
                  { name: 'Executive Report Drafting', order: 2, isActive: true }
                ]
              },
              {
                name: 'Oral Presentation & Group Discussion',
                description: 'Public speaking, leadership in group discussions, and pitch presentations.',
                order: 2,
                isActive: true,
                subTopics: [
                  { name: 'Presentation Structuring', order: 1, isActive: true },
                  { name: 'Corporate Presentation Delivery', order: 2, isActive: true }
                ]
              }
            ]
          },
          {
            name: 'Business Economics',
            code: 'ECON101',
            description: 'Economic concepts, market forces, demand analysis, and pricing.',
            order: 4,
            isActive: true,
            topics: [
              {
                name: 'Demand & Supply Analysis',
                description: 'Law of demand, elasticity, and equilibrium analysis.',
                order: 1,
                isActive: true,
                subTopics: [
                  { name: 'Price & Income Elasticity', order: 1, isActive: true },
                  { name: 'Market Equilibrium', order: 2, isActive: true }
                ]
              }
            ]
          },
          {
            name: 'Business Mathematics & Statistics',
            code: 'STAT101',
            description: 'Commercial calculations, central tendency, dispersion, and data analysis.',
            order: 5,
            isActive: true,
            topics: [
              {
                name: 'Commercial Mathematics',
                description: 'Compound interest, annuity, and financial metrics.',
                order: 1,
                isActive: true,
                subTopics: [
                  { name: 'Time Value of Money', order: 1, isActive: true },
                  { name: 'Ratio & Percentage Analysis', order: 2, isActive: true }
                ]
              }
            ]
          }
        ]
      });
      console.log(`✅ Created SyllabusVersion for MEG Level 1A: ${syllabus._id}`);
    } else {
      console.log(`SyllabusVersion already exists: ${syllabus._id}`);
    }

    // 6. Create sample tasks for this syllabus version if not exist
    const existingTasksCount = await Task.countDocuments({
      syllabusVersionId: syllabus._id,
      isActive: true
    });

    if (existingTasksCount === 0) {
      const taskDocs = [];
      syllabus.subjects.forEach((subj) => {
        subj.topics.forEach((top) => {
          taskDocs.push({
            syllabusVersionId: syllabus._id,
            levelId: level1._id,
            subLevelId: subLevel1A._id,
            subjectId: subj._id,
            subjectName: subj.name,
            topicId: top._id,
            topicName: top.name,
            subTopicId: top.subTopics?.[0]?._id || null,
            subTopicName: top.subTopics?.[0]?.name || '',
            taskNodeType: 'topic',
            title: `${subj.name} - ${top.name} Assignment`,
            description: `Complete foundational case study and practice problem set for ${top.name}.`,
            type: 'assignment',
            priority: 'medium',
            mandatory: true,
            maxMarks: 10,
            order: 1,
            timeDays: 7,
            isActive: true
          });
        });
      });

      if (taskDocs.length > 0) {
        await Task.insertMany(taskDocs);
        console.log(`✅ Created ${taskDocs.length} syllabus tasks for MEG Level 1A`);
      }
    } else {
      console.log(`Found ${existingTasksCount} existing tasks for this syllabus`);
    }

    // 7. Dummy Student Definitions (5 BBA, 5 BCom)
    const hashedPassword = await bcrypt.hash('Student@123', 10);

    const dummyStudents = [
      // --- 5 BBA Students ---
      {
        prkey: 'MEG2026BBA001',
        firstName: 'Aarav',
        lastName: 'Sharma',
        fatherName: 'Rajesh Sharma',
        email: 'aarav.sharma@ssism.org',
        studentMobile: '9826012301',
        parentMobile: '9826098701',
        gender: 'Male',
        dob: new Date('2005-04-12'),
        address: '14/B Scheme 54, Dewas',
        village: 'Dewas',
        course: 'BBA',
        track: 'Marketing & Management',
        technology: 'Digital Marketing & CRM',
        techno: 'Digital Marketing',
        percent12: '86.4%',
        percent10: '88.2%'
      },
      {
        prkey: 'MEG2026BBA002',
        firstName: 'Priya',
        lastName: 'Patel',
        fatherName: 'Dinesh Patel',
        email: 'priya.patel@ssism.org',
        studentMobile: '9826012302',
        parentMobile: '9826098702',
        gender: 'Female',
        dob: new Date('2005-08-22'),
        address: '202 Silver Heights, Vijay Nagar',
        village: 'Indore',
        course: 'BBA',
        track: 'HR & Management',
        technology: 'Human Resources & Talent Management',
        techno: 'HR Analytics',
        percent12: '91.0%',
        percent10: '89.5%'
      },
      {
        prkey: 'MEG2026BBA003',
        firstName: 'Rohan',
        lastName: 'Verma',
        fatherName: 'Anand Verma',
        email: 'rohan.verma@ssism.org',
        studentMobile: '9826012303',
        parentMobile: '9826098703',
        gender: 'Male',
        dob: new Date('2004-11-15'),
        address: '45 Mahakal Marg',
        village: 'Ujjain',
        course: 'BBA',
        track: 'Finance & Banking',
        technology: 'Corporate Finance & Valuation',
        techno: 'Financial Modeling',
        percent12: '84.5%',
        percent10: '82.0%'
      },
      {
        prkey: 'MEG2026BBA004',
        firstName: 'Ananya',
        lastName: 'Joshi',
        fatherName: 'Sanjay Joshi',
        email: 'ananya.joshi@ssism.org',
        studentMobile: '9826012304',
        parentMobile: '9826098704',
        gender: 'Female',
        dob: new Date('2005-02-18'),
        address: '88 MP Nagar Zone 2',
        village: 'Bhopal',
        course: 'BBA',
        track: 'Operations & Supply Chain',
        technology: 'Supply Chain Management',
        techno: 'Logistics',
        percent12: '88.0%',
        percent10: '90.2%'
      },
      {
        prkey: 'MEG2026BBA005',
        firstName: 'Kabir',
        lastName: 'Mehta',
        fatherName: 'Sunil Mehta',
        email: 'kabir.mehta@ssism.org',
        studentMobile: '9826012305',
        parentMobile: '9826098705',
        gender: 'Male',
        dob: new Date('2004-06-30'),
        address: '74 Palasia Main Road',
        village: 'Indore',
        course: 'BBA',
        track: 'Entrepreneurship & Strategy',
        technology: 'Business Analytics & BI',
        techno: 'Business Intelligence',
        percent12: '79.5%',
        percent10: '83.0%'
      },

      // --- 5 BCom Students ---
      {
        prkey: 'MEG2026BCM001',
        firstName: 'Neha',
        lastName: 'Gupta',
        fatherName: 'Rakesh Gupta',
        email: 'neha.gupta@ssism.org',
        studentMobile: '9826012306',
        parentMobile: '9826098706',
        gender: 'Female',
        dob: new Date('2005-03-10'),
        address: '12 Rajwada Chowk',
        village: 'Indore',
        course: 'BCom',
        track: 'Taxation & Auditing',
        technology: 'Tally Prime & GST Filing',
        techno: 'Tally Prime',
        percent12: '93.2%',
        percent10: '92.0%'
      },
      {
        prkey: 'MEG2026BCM002',
        firstName: 'Siddharth',
        lastName: 'Jain',
        fatherName: 'Manoj Jain',
        email: 'siddharth.jain@ssism.org',
        studentMobile: '9826012307',
        parentMobile: '9826098707',
        gender: 'Male',
        dob: new Date('2004-09-25'),
        address: '30 Civil Lines',
        village: 'Dewas',
        course: 'BCom',
        track: 'Cost & Management Accounting',
        technology: 'Advance Excel & Financial Modeling',
        techno: 'Advanced Excel',
        percent12: '87.0%',
        percent10: '85.4%'
      },
      {
        prkey: 'MEG2026BCM003',
        firstName: 'Tanvi',
        lastName: 'Kulkarni',
        fatherName: 'Suresh Kulkarni',
        email: 'tanvi.kulkarni@ssism.org',
        studentMobile: '9826012308',
        parentMobile: '9826098708',
        gender: 'Female',
        dob: new Date('2005-07-14'),
        address: '56 Geeta Bhawan Square',
        village: 'Indore',
        course: 'BCom',
        track: 'Banking & Insurance',
        technology: 'Fintech & Core Banking Systems',
        techno: 'Fintech Operations',
        percent12: '89.5%',
        percent10: '91.0%'
      },
      {
        prkey: 'MEG2026BCM004',
        firstName: 'Ayush',
        lastName: 'Tiwari',
        fatherName: 'Pramod Tiwari',
        email: 'ayush.tiwari@ssism.org',
        studentMobile: '9826012309',
        parentMobile: '9826098709',
        gender: 'Male',
        dob: new Date('2004-12-05'),
        address: '19 Station Road',
        village: 'Sehore',
        course: 'BCom',
        track: 'E-Commerce & Digital Accounting',
        technology: 'QuickBooks & SAP FICO Basics',
        techno: 'SAP FICO',
        percent12: '82.0%',
        percent10: '80.5%'
      },
      {
        prkey: 'MEG2026BCM005',
        firstName: 'Riya',
        lastName: 'Saxena',
        fatherName: 'Vinod Saxena',
        email: 'riya.saxena@ssism.org',
        studentMobile: '9826012310',
        parentMobile: '9826098710',
        gender: 'Female',
        dob: new Date('2005-01-20'),
        address: '82 Freeganj',
        village: 'Ujjain',
        course: 'BCom',
        track: 'Corporate Law & Secretarial Practice',
        technology: 'Corporate Compliance & MCA Portal',
        techno: 'Corporate Governance',
        percent12: '90.4%',
        percent10: '89.0%'
      }
    ];

    console.log('\n--- Inserting Students ---');
    const createdStudents = [];

    for (const data of dummyStudents) {
      // Remove previous test record if prkey exists
      await Student.deleteOne({ prkey: data.prkey });

      const student = await Student.create({
        ...data,
        password: hashedPassword,
        subDepartmentId: megSubDept._id,
        sessionId: activeSession._id,
        currentLevelId: level1._id,
        currentSubLevelId: subLevel1A._id,
        syllabusVersionId: syllabus._id,
        status: 'Active',
        isFTP: false,
        promotionPending: false
      });

      // Auto-assign tasks to student
      try {
        await assignTasksToStudent(student._id, syllabus._id);
      } catch (err) {
        console.warn(`Task assignment warning for ${student.prkey}:`, err.message);
      }

      createdStudents.push(student);
      console.log(`✅ [${data.course}] ${student.prkey} - ${student.firstName} ${student.lastName} created in Level 1 -> SubLevel 1A`);
    }

    console.log(`\n🎉 Successfully created ${createdStudents.length} students in MEG Department (Level 1, SubLevel 1A)!`);
    console.log(`- 5 BBA Students`);
    console.log(`- 5 BCom Students`);
    console.log(`- SubDepartment: ${megSubDept.name} (${megSubDept._id})`);
    console.log(`- Level: ${level1.name} (${level1._id})`);
    console.log(`- SubLevel: ${subLevel1A.name} (${subLevel1A._id})`);
    console.log(`- Syllabus: ${syllabus.title} (${syllabus.version})`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

seedMEGData();
