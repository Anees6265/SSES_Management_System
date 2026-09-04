require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/student/Student');
const StudentPlacement = require('./src/models/placement/StudentPlacement');
const Company = require('./src/models/company/company');
const SubDepartment = require('./src/models/department/SubDepartment');
const Level = require('./src/models/department/Level');
const SubLevel = require('./src/models/department/SubLevel');
const Session = require('./src/models/Session');
const SyllabusVersion = require('./src/models/syllabus/SyllabusVersion');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in process.env");
  process.exit(1);
}

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('✅ Connected to MongoDB for Placement Data Seeding'))
  .catch(e => { console.error('❌ DB Connection Error:', e.message); process.exit(1); });

mongoose.connection.once('open', async () => {
  try {
    console.log('🌱 Starting Placement Data Seeding...\n');

    // 1. Fetch SubDepartment, Level, SubLevel, Session, SyllabusVersion
    let subDept = await SubDepartment.findOne();
    if (!subDept) subDept = await SubDepartment.create({ name: 'ITEG - Software Engineering', isActive: true });
    
    let level = await Level.findOne();
    if (!level) level = await Level.create({ name: 'Level 1', order: 1, subDepartmentId: subDept._id });
    
    let subLevel = await SubLevel.findOne();
    if (!subLevel) subLevel = await SubLevel.create({ name: 'SubLevel 1A', order: 1, levelId: level._id });
    
    let session = await Session.findOne();
    if (!session) session = await Session.create({ name: '2025-26', isActive: true });
    
    let syllabus = await SyllabusVersion.findOne();
    if (!syllabus) syllabus = await SyllabusVersion.create({ version: 'v1.0', title: 'Default Syllabus', status: 'active', subDepartmentId: subDept._id });

    // 2. Create Companies
    const companiesData = [
      { companyName: 'TCS (Tata Consultancy Services)', hrEmail: 'careers@tcs.com', hrContact: '9876543210', location: 'Mumbai', headOffice: 'Mumbai', industry: 'IT Services' },
      { companyName: 'Infosys', hrEmail: 'recruitment@infosys.com', hrContact: '9876543211', location: 'Bengaluru', headOffice: 'Bengaluru', industry: 'Software' },
      { companyName: 'Accenture', hrEmail: 'campus@accenture.com', hrContact: '9876543212', location: 'Pune', headOffice: 'Dublin', industry: 'Consulting' },
      { companyName: 'Microsoft', hrEmail: 'university@microsoft.com', hrContact: '9876543213', location: 'Hyderabad', headOffice: 'Redmond', industry: 'Technology' },
      { companyName: 'Wipro', hrEmail: 'careers@wipro.com', hrContact: '9876543214', location: 'Gurugram', headOffice: 'Bengaluru', industry: 'IT Services' },
      { companyName: 'Tech Mahindra', hrEmail: 'hr@techmahindra.com', hrContact: '9876543215', location: 'Noida', headOffice: 'Pune', industry: 'IT Services' },
      { companyName: 'Google', hrEmail: 'campus-in@google.com', hrContact: '9876543216', location: 'Bengaluru', headOffice: 'Mountain View', industry: 'Technology' }
    ];

    const companyMap = {};
    for (const cData of companiesData) {
      let c = await Company.findOne({ companyName: cData.companyName });
      if (!c) {
        c = await Company.create(cData);
      }
      companyMap[cData.companyName] = c;
    }
    console.log(`✅ Created/Retrieved ${Object.keys(companyMap).length} recruiting companies.`);

    // 3. Create Test Students & Placements
    const seedStudents = [
      {
        prkey: 'ITEG2026STUD01',
        firstName: 'Aarav',
        lastName: 'Patel',
        email: 'aarav.patel@example.com',
        studentMobile: '9876500001',
        course: 'B.Tech',
        track: 'MERN Stack',
        readinessStatus: 'Ready for Drive',
        PlacementinterviewRecord: [
          {
            companyRef: companyMap['TCS (Tata Consultancy Services)']._id,
            jobProfile: 'System Engineer',
            status: 'Not Selected',
            statusRemark: 'Technical depth in system architecture needed improvement',
            scheduleDate: new Date('2026-04-10'),
            rounds: [
              { roundName: 'Round 1 - Technical Assessment', roundType: 'Assessment', date: new Date('2026-04-10'), mode: 'Online', result: 'Cleared', feedback: 'Good logic and coding skills' },
              { roundName: 'Round 2 - HR & Technical', roundType: 'Technical', date: new Date('2026-04-12'), mode: 'Offline', result: 'Not Cleared', feedback: 'Struggled with system design questions', resultReason: 'Technical Skills' }
            ]
          },
          {
            companyRef: companyMap['Infosys']._id,
            jobProfile: 'Full Stack MERN Developer',
            status: 'Selected',
            statusRemark: 'Excelled in all 3 interview rounds',
            scheduleDate: new Date('2026-05-15'),
            rounds: [
              { roundName: 'Round 1 - Coding Test', roundType: 'Assessment', date: new Date('2026-05-15'), mode: 'Online', result: 'Cleared', feedback: 'Scored 95% in React & Node' },
              { roundName: 'Round 2 - Technical Interview', roundType: 'Technical', date: new Date('2026-05-18'), mode: 'Offline', result: 'Cleared', feedback: 'Clear understanding of state management' },
              { roundName: 'Round 3 - HR Round', roundType: 'HR', date: new Date('2026-05-20'), mode: 'Offline', result: 'Selected', feedback: 'Selected for offer letter' }
            ]
          },
          {
            companyRef: companyMap['Accenture']._id,
            jobProfile: 'Application Development Associate',
            status: 'Ongoing',
            statusRemark: 'Round 1 cleared; Round 2 scheduled for next week',
            scheduleDate: new Date('2026-08-01'),
            rounds: [
              { roundName: 'Round 1 - Aptitude & Technical', roundType: 'Technical', date: new Date('2026-08-01'), mode: 'Online', result: 'Cleared', feedback: 'High analytical score' }
            ]
          }
        ]
      },
      {
        prkey: 'ITEG2026STUD02',
        firstName: 'Ananya',
        lastName: 'Roy',
        email: 'ananya.roy@example.com',
        studentMobile: '9876500002',
        course: 'B.Tech',
        track: 'Python Data Science',
        readinessStatus: 'Ready for Drive',
        status: 'Placed',
        placedInfo: {
          companyRef: companyMap['Microsoft']._id,
          companyName: 'Microsoft',
          salary: 1250000,
          location: 'Hyderabad',
          jobProfile: 'Software Development Engineer - 1',
          jobType: 'Full-Time',
          joiningDate: new Date('2026-09-01'),
          placedDate: new Date()
        },
        PlacementinterviewRecord: [
          {
            companyRef: companyMap['Microsoft']._id,
            jobProfile: 'Software Development Engineer - 1',
            status: 'Placed',
            statusRemark: 'Hired through Campus Placement Drive',
            scheduleDate: new Date('2026-06-01'),
            rounds: [
              { roundName: 'Round 1 - Technical Assessment', roundType: 'Assessment', date: new Date('2026-06-01'), mode: 'Online', result: 'Cleared', feedback: 'Top 1% candidate' },
              { roundName: 'Round 2 - System Architecture', roundType: 'Technical', date: new Date('2026-06-05'), mode: 'Offline', result: 'Cleared', feedback: 'Excellent algorithmic thinking' },
              { roundName: 'Round 3 - Hiring Manager Round', roundType: 'Managerial', date: new Date('2026-06-10'), mode: 'Offline', result: 'Selected', feedback: 'Hired with full-time offer' }
            ]
          }
        ]
      },
      {
        prkey: 'ITEG2026STUD03',
        firstName: 'Rohan',
        lastName: 'Sharma',
        email: 'rohan.sharma@example.com',
        studentMobile: '9876500003',
        course: 'MCA',
        track: 'Java Backend',
        readinessStatus: 'Ready for Placement',
        PlacementinterviewRecord: []
      },
      {
        prkey: 'ITEG2026STUD04',
        firstName: 'Priya',
        lastName: 'Verma',
        email: 'priya.verma@example.com',
        studentMobile: '9876500004',
        course: 'B.Tech',
        track: 'UI/UX Design',
        readinessStatus: 'Ready for Drive',
        PlacementinterviewRecord: [
          {
            companyRef: companyMap['Wipro']._id,
            jobProfile: 'UI/UX Designer & Developer',
            status: 'Offer Received',
            statusRemark: 'Official offer letter received; waiting for acceptance confirmation',
            scheduleDate: new Date('2026-07-05'),
            rounds: [
              { roundName: 'Round 1 - Design Portfolio Review', roundType: 'Technical', date: new Date('2026-07-05'), mode: 'Online', result: 'Cleared', feedback: 'Outstanding portfolio and Figma prototypes' },
              { roundName: 'Round 2 - HR & Salary Negotiation', roundType: 'HR', date: new Date('2026-07-10'), mode: 'Offline', result: 'Selected', feedback: 'Offer issued' }
            ]
          }
        ]
      },
      {
        prkey: 'ITEG2026STUD05',
        firstName: 'Kavya',
        lastName: 'Nair',
        email: 'kavya.nair@example.com',
        studentMobile: '9876500005',
        course: 'B.Tech',
        track: 'Salesforce Development',
        readinessStatus: 'Ready for Drive',
        PlacementinterviewRecord: [
          {
            companyRef: companyMap['Tech Mahindra']._id,
            jobProfile: 'Salesforce Technical Consultant',
            status: 'Did Not Join',
            notJoiningReason: 'Higher Studies',
            notJoiningRemarks: 'Enrolled in MS in Computer Science at US University',
            statusRemark: 'Candidate declined offer due to higher education plans',
            scheduleDate: new Date('2026-03-15'),
            rounds: [
              { roundName: 'Round 1 - Technical Interview', roundType: 'Technical', date: new Date('2026-03-15'), mode: 'Online', result: 'Cleared', feedback: 'Good Apex & LWC knowledge' },
              { roundName: 'Round 2 - Managerial Round', roundType: 'Managerial', date: new Date('2026-03-20'), mode: 'Offline', result: 'Selected', feedback: 'Selected' }
            ]
          }
        ]
      },
      {
        prkey: 'ITEG2026STUD06',
        firstName: 'Vikram',
        lastName: 'Singh',
        email: 'vikram.singh@example.com',
        studentMobile: '9876500006',
        course: 'B.Tech',
        track: 'Cloud & DevOps',
        readinessStatus: 'Ready for Drive',
        PlacementinterviewRecord: [
          {
            companyRef: companyMap['Google']._id,
            jobProfile: 'Cloud Solutions Associate',
            status: 'Scheduled',
            statusRemark: 'Drive scheduled for upcoming week',
            scheduleDate: new Date('2026-08-25'),
            rounds: []
          }
        ]
      }
    ];

    for (const sData of seedStudents) {
      let student = await Student.findOne({ prkey: sData.prkey });
      if (!student) {
        student = await Student.create({
          prkey: sData.prkey,
          firstName: sData.firstName,
          lastName: sData.lastName,
          fatherName: `${sData.firstName} Father`,
          email: sData.email,
          studentMobile: sData.studentMobile,
          parentMobile: '9876543210',
          dob: new Date('2003-05-20'),
          gender: 'Male',
          address: 'Main Street, Vijay Nagar',
          village: 'Indore',
          course: sData.course,
          track: sData.track,
          status: sData.status || 'Active',
          subDepartmentId: subDept._id,
          currentLevelId: level._id,
          currentSubLevelId: subLevel._id,
          sessionId: session._id,
          syllabusVersionId: syllabus._id
        });
      } else {
        student.status = sData.status || 'Active';
        await student.save();
      }

      let placement = await StudentPlacement.findOne({ studentId: student._id });
      if (!placement) {
        placement = new StudentPlacement({
          studentId: student._id,
          subDepartmentId: subDept._id,
          readinessStatus: sData.readinessStatus,
          PlacementinterviewRecord: sData.PlacementinterviewRecord || [],
          placedInfo: sData.placedInfo || null
        });
      } else {
        placement.readinessStatus = sData.readinessStatus;
        placement.PlacementinterviewRecord = sData.PlacementinterviewRecord || [];
        placement.placedInfo = sData.placedInfo || null;
      }
      await placement.save();
      console.log(`✔️ Seeded Placement record for: ${student.firstName} ${student.lastName} (${sData.readinessStatus})`);
    }

    // 4. Create Placement Drives for testing Placement Drives & Resume Sharing flow
    const PlacementDrive = require('./src/models/placement/PlacementDrive');
    const allStudents = await Student.find({ subDepartmentId: subDept._id }).limit(6);
    const studentIds = allStudents.map(s => s._id);

    const drivesData = [
      {
        companyRef: companyMap['TCS (Tata Consultancy Services)']._id,
        companyName: 'TCS (Tata Consultancy Services)',
        jobRole: 'Software Engineer',
        technology: 'Full Stack Web Development',
        packageCTC: '7.2 LPA',
        jobLocation: 'Pune / Mumbai',
        workMode: 'WFO',
        driveDate: new Date('2026-08-30'),
        applicationDeadline: new Date('2026-08-25'),
        jobDescription: 'Seeking full-stack developers proficient in React.js, Node.js, and MongoDB.',
        vacancies: 15,
        requiredSkills: ['React', 'Node.js', 'Express', 'MongoDB'],
        shortlistedStudents: studentIds.slice(0, 4),
        resumeSharedStudents: [
          { studentId: studentIds[0], resumeURL: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', sharedAt: new Date(), sharedBy: 'Placement Officer', status: 'Shared' },
          { studentId: studentIds[1], resumeURL: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', sharedAt: new Date(), sharedBy: 'Placement Officer', status: 'Company Reviewed' },
          { studentId: studentIds[2], resumeURL: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', sharedAt: new Date(), sharedBy: 'Placement Officer', status: 'Shortlisted for Interview' }
        ],
        subDepartmentId: subDept._id
      },
      {
        companyRef: companyMap['Infosys']._id,
        companyName: 'Infosys',
        jobRole: 'Systems Engineer Specialist',
        technology: 'Java Spring Boot',
        packageCTC: '6.5 LPA',
        jobLocation: 'Bengaluru',
        workMode: 'Hybrid',
        driveDate: new Date('2026-09-05'),
        applicationDeadline: new Date('2026-09-01'),
        jobDescription: 'Hiring enterprise Java backend developers.',
        vacancies: 10,
        requiredSkills: ['Java', 'Spring Boot', 'SQL', 'REST API'],
        shortlistedStudents: studentIds.slice(2, 6),
        resumeSharedStudents: [
          { studentId: studentIds[2], resumeURL: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', sharedAt: new Date(), sharedBy: 'Placement Officer', status: 'Shared' }
        ],
        subDepartmentId: subDept._id
      },
      {
        companyRef: companyMap['Microsoft']._id,
        companyName: 'Microsoft',
        jobRole: 'Software Development Engineer - 1',
        technology: 'Cloud & System Design',
        packageCTC: '14.0 LPA',
        jobLocation: 'Hyderabad',
        workMode: 'Hybrid',
        driveDate: new Date('2026-09-15'),
        applicationDeadline: new Date('2026-09-10'),
        jobDescription: 'Campus drive for high-performing software engineers.',
        vacancies: 5,
        requiredSkills: ['Data Structures', 'Algorithms', 'C++', 'System Design'],
        shortlistedStudents: [studentIds[1]],
        resumeSharedStudents: [
          { studentId: studentIds[1], resumeURL: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', sharedAt: new Date(), sharedBy: 'Placement Officer', status: 'Shortlisted for Interview' }
        ],
        subDepartmentId: subDept._id
      }
    ];

    for (const dData of drivesData) {
      await PlacementDrive.findOneAndUpdate(
        { companyName: dData.companyName, jobRole: dData.jobRole },
        { $set: dData },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${drivesData.length} Placement Drives with candidates and resume sharing records.`);

    console.log('\n🎉 Placement dummy data seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected DB.');
  }
});
