const Student = require("../../models/student/Student");
const StudentTask = require("../../models/syllabus/StudentTask");
const StudentProgressSnapshot = require("../../models/student/StudentProgressSnapshot");
const StudentTaskHistory = require("../../models/student/StudentTaskHistory");
const StudentEventLog = require("../../models/student/StudentEventLog");
const SubDepartment = require("../../models/department/SubDepartment");
const Level = require("../../models/department/Level");
const SubLevel = require("../../models/department/SubLevel");
const Session = require("../../models/Session");
const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
const { assignTasksToStudent, assignTasksToMultipleStudents } = require("../../services/taskAssignmentService");
const { promoteToNextSubLevel } = require("../../services/studentService");
const { findOrCreateSessionByName } = require("../../utils/sessionHelper");
const { calculateBatchYear } = require("../../utils/batchHelper");
const ExcelJS = require("exceljs");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const cloudinary = require("../../config/cloudinaryConfig");
const mongoose = require("mongoose");


const isNaturallyITEG = (course) => {
  if (!course || typeof course !== "string") return false;
  const c = course.trim().toLowerCase();
  return c.includes("bca") || c.includes("diploma");
};

// ✅ Create Student
exports.createStudent = async (req, res) => {
  try {
    const { subDepartmentId, session, year, academicYear, sessionId: inputSessionId } = req.body;

    // Validate subDepartment
    const subDept = await SubDepartment.findById(subDepartmentId).populate("departmentId");
    if (!subDept) return res.status(404).json({ message: "SubDepartment not found" });

    // 1️⃣ First Level (lowest order) under this subDepartment
    const firstLevel = await Level.findOne({ subDepartmentId, isActive: true }).sort({ order: 1 });
    if (!firstLevel) return res.status(400).json({ message: "No active level found for this subDepartment. Please configure levels first." });

    // 2️⃣ First SubLevel (lowest order) under that Level
    const firstSubLevel = await SubLevel.findOne({ levelId: firstLevel._id, isActive: true }).sort({ order: 1 });
    if (!firstSubLevel) return res.status(400).json({ message: "No active sub-level found for this level. Please configure sub-levels first." });

    // 3️⃣ Determine Session (Find or auto-create from session/year string, or fallback to latest active session)
    let targetSessionId = null;
    const sessionYearInput = (year && /^\d{4}$/.test(String(year).trim())) ? String(year).trim() : null;
    const sessionInput = inputSessionId || session || sessionYearInput || (academicYear && /^\d{4}$/.test(String(academicYear).trim()) ? String(academicYear).trim() : null);
    if (sessionInput) {
      targetSessionId = await findOrCreateSessionByName(sessionInput);
    }

    if (!targetSessionId) {
      const latestSession = await Session.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (!latestSession) return res.status(400).json({ message: "No active session found" });
      targetSessionId = latestSession._id;
    }

    const targetSession = await Session.findById(targetSessionId);

    // 4️⃣ Latest active SyllabusVersion for this session + level + sublevel (or fallback to any active for level+sublevel)
    let latestSyllabus = await SyllabusVersion.findOne({
      sessionId: targetSessionId,
      levelId: firstLevel._id,
      subLevelId: firstSubLevel._id,
      status: "active",
      isActive: true
    }).sort({ createdAt: -1 });

    if (!latestSyllabus) {
      latestSyllabus = await SyllabusVersion.findOne({
        levelId: firstLevel._id,
        subLevelId: firstSubLevel._id,
        status: "active",
        isActive: true
      }).sort({ createdAt: -1 });
    }

    // Determine course default if not provided
    const allowedCourses = (subDept.allowedCourses || []).length > 0
      ? subDept.allowedCourses
      : (subDept.departmentId?.allowedCourses || []).map(c => c.courseName).filter(Boolean);
    const resolvedCourse = req.body.course || allowedCourses[0] || "General";

    // Auto-generate PR Key if not provided
    let prkey = req.body.prkey ? String(req.body.prkey).trim() : "";
    if (!prkey) {
      const cleanCourse = (resolvedCourse || "STU").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      const sessionYear = targetSession?.name || new Date().getFullYear().toString();
      prkey = `${cleanCourse}${sessionYear}${Date.now().toString().slice(-4)}`;
    }

    // Duplicate check
    const existing = await Student.findOne({ prkey });
    if (existing) return res.status(409).json({ message: `Student with PR Key / Roll Number '${prkey}' already exists` });

    // Hash password (use provided or default ssism@123)
    const rawPassword = req.body.password ? String(req.body.password).trim() : "ssism@123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Calculate student batch year based on session and department/course duration
    let batchYear = req.body.batchYear;
    if (!batchYear) {
      try {
        batchYear = await calculateBatchYear({
          sessionId: targetSessionId,
          session: targetSession,
          subDepartmentId,
          course: resolvedCourse
        });
      } catch (e) {
        batchYear = `${targetSession?.name || "2025"}-${parseInt(targetSession?.name || "2025", 10) + 3}`;
      }
    }

    // Determine Year (e.g. 1st Year, 2nd Year, 3rd Year, 4th Year)
    let resolvedYear = req.body.year;
    if (!resolvedYear || /^\d{4}$/.test(String(resolvedYear).trim())) {
      const sName = targetSession?.name || "";
      if (sName.includes("2024")) resolvedYear = "3rd Year";
      else if (sName.includes("2025")) resolvedYear = "2nd Year";
      else if (sName.includes("2026")) resolvedYear = "1st Year";
      else if (sName.includes("2023")) resolvedYear = "4th Year";
      else resolvedYear = "1st Year";
    }

    const resolvedWithITEG = isNaturallyITEG(resolvedCourse) ? true : Boolean(req.body.withITEG);

    const student = new Student({
      ...req.body,
      prkey,
      password: hashedPassword,
      course: resolvedCourse,
      parentMobile: req.body.parentMobile || req.body.studentMobile,
      address: req.body.address || req.body.village || "Local",
      village: req.body.village || req.body.address || "Local",
      batchYear,
      year: resolvedYear,
      withITEG: resolvedWithITEG,
      sessionId: targetSessionId,
      currentLevelId: firstLevel._id,
      currentSubLevelId: firstSubLevel._id,
      syllabusVersionId: latestSyllabus ? latestSyllabus._id : null
    });

    await student.save();

    // 5️⃣ Auto-assign tasks of this syllabus version to the student (if syllabus exists)
    let taskAssignmentResult = null;
    if (latestSyllabus) {
      try {
        taskAssignmentResult = await assignTasksToStudent(student._id, latestSyllabus._id);
      } catch (taskErr) {
        console.error("Task assignment warning on student create:", taskErr.message);
      }
    }

    return res.status(201).json({
      message: "Student created successfully",
      data: student,
      meta: {
        sessionName: targetSession ? targetSession.name : "N/A",
        levelName: firstLevel.name,
        subLevelName: firstSubLevel.name,
        syllabusVersion: latestSyllabus ? latestSyllabus.version : "None",
        tasksAssigned: taskAssignmentResult ? taskAssignmentResult.totalTasks : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Import Students via Excel (.xlsx/.xls/.csv) or JSON array
exports.importStudentsExcel = async (req, res) => {
  try {
    const { subDepartmentId, sessionId: inputSessionId } = req.body;

    if (!subDepartmentId) {
      return res.status(400).json({ success: false, message: "subDepartmentId is required" });
    }

    // Check faculty access if applicable
    if (req.allowedSubDeptIds && !req.allowedSubDeptIds.some(id => id.toString() === subDepartmentId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied for this sub-department" });
    }

    const subDept = await SubDepartment.findById(subDepartmentId).populate("departmentId");
    if (!subDept) return res.status(404).json({ success: false, message: "SubDepartment not found" });

    // 1️⃣ First active Level under this subDepartment
    const firstLevel = await Level.findOne({ subDepartmentId, isActive: true }).sort({ order: 1 });
    if (!firstLevel) {
      return res.status(400).json({
        success: false,
        message: `No active Level found for ${subDept.name}. Please configure levels in Department Hierarchy first.`
      });
    }

    // 2️⃣ First active SubLevel under that Level
    const firstSubLevel = await SubLevel.findOne({ levelId: firstLevel._id, isActive: true }).sort({ order: 1 });
    if (!firstSubLevel) {
      return res.status(400).json({
        success: false,
        message: `No active SubLevel found for level ${firstLevel.name}. Please configure sub-levels first.`
      });
    }

    // 3️⃣ Target Session
    let targetSessionId = null;
    if (inputSessionId) {
      targetSessionId = await findOrCreateSessionByName(inputSessionId);
    }
    if (!targetSessionId) {
      const latestSession = await Session.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (!latestSession) {
        return res.status(400).json({ success: false, message: "No active academic session found in the system" });
      }
      targetSessionId = latestSession._id;
    }
    const targetSession = await Session.findById(targetSessionId);

    // 4️⃣ Latest active SyllabusVersion (optional)
    let latestSyllabus = await SyllabusVersion.findOne({
      sessionId: targetSessionId,
      levelId: firstLevel._id,
      subLevelId: firstSubLevel._id,
      status: "active",
      isActive: true
    }).sort({ createdAt: -1 });

    if (!latestSyllabus) {
      latestSyllabus = await SyllabusVersion.findOne({
        levelId: firstLevel._id,
        subLevelId: firstSubLevel._id,
        status: "active",
        isActive: true
      }).sort({ createdAt: -1 });
    }

    // 5️⃣ Extract Raw Rows from req.file (Excel buffer) or req.body.students
    let rawRows = [];
    if (req.file && req.file.buffer) {
      // Primary Method: SheetJS (XLSX) supports .xlsx, .xls, .csv, and avoids "not a zip file" crashes
      try {
        const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetName = wb.SheetNames[0];
        if (sheetName) {
          const ws = wb.Sheets[sheetName];
          const sheetJson = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
          rawRows = sheetJson.map((r, i) => ({ ...r, _excelRow: i + 2 }));
        }
      } catch (xlsxErr) {
        console.warn("SheetJS parse failed, falling back to ExcelJS:", xlsxErr.message);
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(req.file.buffer);
          const worksheet = workbook.worksheets[0];
          if (worksheet) {
            const headers = [];
            worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
              headers[colNumber] = String(cell.value || "").trim();
            });
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
              if (rowNumber === 1) return;
              const rowData = {};
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const headerName = headers[colNumber];
                if (headerName) {
                  let val = cell.value;
                  if (val && typeof val === "object") {
                    if (val.result !== undefined) val = val.result;
                    else if (val.text !== undefined) val = val.text;
                  }
                  rowData[headerName] = val !== undefined && val !== null ? String(val).trim() : "";
                }
              });
              if (Object.values(rowData).some(v => v !== "")) {
                rawRows.push({ ...rowData, _excelRow: rowNumber });
              }
            });
          }
        } catch (exceljsErr) {
          console.error("ExcelJS fallback also failed:", exceljsErr.message);
        }
      }
    }

    // Secondary Method: If file parsing was empty or failed, use pre-parsed students array if provided
    if (rawRows.length === 0) {
      if (Array.isArray(req.body.students)) {
        rawRows = req.body.students.map((r, i) => ({ ...r, _excelRow: i + 2 }));
      } else if (typeof req.body.students === "string") {
        try {
          const parsed = JSON.parse(req.body.students);
          if (Array.isArray(parsed)) rawRows = parsed.map((r, i) => ({ ...r, _excelRow: i + 2 }));
        } catch (e) {
          // ignore JSON parse error
        }
      }
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ success: false, message: "No student records could be read from the uploaded file or data" });
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ success: false, message: "No student records found in the uploaded file" });
    }

    // Helper: Normalize header keys
    const normalizeKey = (k) => String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // Allowed courses for this subdepartment
    const allowedCourses = (subDept.allowedCourses || []).length > 0
      ? subDept.allowedCourses
      : (subDept.departmentId?.allowedCourses || []).map(c => c.courseName).filter(Boolean);
    const defaultCourse = allowedCourses[0] || "General";

    // Pre-fetch all existing PR keys in MongoDB
    const existingStudents = await Student.find({}, "prkey").lean();
    const existingPrkeySet = new Set(existingStudents.map(s => String(s.prkey || "").toLowerCase()));

    // Default Year for this import batch
    let defaultYear = req.body.year;
    if (!defaultYear || /^\d{4}$/.test(String(defaultYear).trim())) {
      const sName = targetSession?.name || "";
      if (sName.includes("2024")) defaultYear = "3rd Year";
      else if (sName.includes("2025")) defaultYear = "2nd Year";
      else if (sName.includes("2026")) defaultYear = "1st Year";
      else if (sName.includes("2023")) defaultYear = "4th Year";
      else defaultYear = "1st Year";
    }

    const seenInFilePrkeys = new Set();
    const validStudentsToInsert = [];
    const skippedDetails = [];
    const errorDetails = [];

    for (const raw of rawRows) {
      const rowNumber = raw._excelRow || "N/A";
      const normalizedRow = {};

      for (const [key, val] of Object.entries(raw)) {
        if (key.startsWith("_")) continue;
        const nk = normalizeKey(key);
        if (["prkey", "rollno", "enrollmentno", "prn", "studentid", "admissionno", "scholarno"].includes(nk)) normalizedRow.prkey = val;
        else if (["password", "pass", "pwd"].includes(nk)) normalizedRow.password = val;
        else if (["firstname", "first", "fname"].includes(nk)) normalizedRow.firstName = val;
        else if (["lastname", "last", "lname", "surname"].includes(nk)) normalizedRow.lastName = val;
        else if (["fullname", "name", "studentname"].includes(nk)) normalizedRow.fullName = val;
        else if (["fathername", "father", "guardianname"].includes(nk)) normalizedRow.fatherName = val;
        else if (["studentmobile", "mobile", "mobileno", "phoneno", "contact", "studentphone"].includes(nk)) normalizedRow.studentMobile = val;
        else if (["parentmobile", "fatherphone", "fathermobile", "parentphone", "guardianmobile"].includes(nk)) normalizedRow.parentMobile = val;
        else if (["course", "degree", "branch", "stream"].includes(nk)) normalizedRow.course = val;
        else if (["gender", "sex"].includes(nk)) normalizedRow.gender = val;
        else if (["email", "emailid"].includes(nk)) normalizedRow.email = val;
        else if (["address", "residentialaddress"].includes(nk)) normalizedRow.address = val;
        else if (["village", "city", "town"].includes(nk)) normalizedRow.village = val;
        else if (["aadhar", "aadharcard", "aadharno"].includes(nk)) normalizedRow.aadharCard = val;
        else if (["category", "caste"].includes(nk)) normalizedRow.category = val;
        else if (["track", "techno", "technology"].includes(nk)) normalizedRow.technology = val;
        else if (["percent12", "12thpercent", "12percentage", "12thpercentage"].includes(nk)) normalizedRow.percent12 = val;
        else if (["percent10", "10thpercent", "10percentage", "10thpercentage"].includes(nk)) normalizedRow.percent10 = val;
        else if (["year12", "12thyear", "12passoutyear"].includes(nk)) normalizedRow.year12 = val;
        else if (["year", "academicyear", "currentyear", "classyear", "studyingyear"].includes(nk)) normalizedRow.year = val;
        else if (["withiteg", "iteg", "with_iteg", "isiteg", "withitegyesno"].includes(nk) || nk.includes("iteg")) {
          const v = String(val || "").toLowerCase().trim();
          normalizedRow.withITEG = ["yes", "y", "true", "1", "iteg", "with iteg"].includes(v);
        }
      }

      // If full name provided without first/last split
      if (!normalizedRow.firstName && normalizedRow.fullName) {
        const parts = String(normalizedRow.fullName).trim().split(/\s+/);
        normalizedRow.firstName = parts[0] || "";
        normalizedRow.lastName = parts.slice(1).join(" ") || parts[0];
      }

      let prkey = String(normalizedRow.prkey || "").trim();
      const firstName = String(normalizedRow.firstName || "").trim();
      const lastName = String(normalizedRow.lastName || "").trim() || firstName;
      const fatherName = String(normalizedRow.fatherName || "").trim();
      const studentMobile = String(normalizedRow.studentMobile || "").trim();
      const course = String(normalizedRow.course || "").trim() || defaultCourse;

      // Auto-generate PR Key if not provided in Excel row
      if (!prkey) {
        const cleanCourse = (course || "STU").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        const sessionYear = targetSession?.name || new Date().getFullYear().toString();
        prkey = `${cleanCourse}${sessionYear}${String(1001 + validStudentsToInsert.length).padStart(4, "0")}`;
      }

      // Validation
      const missingFields = [];
      if (!firstName) missingFields.push("First Name");
      if (!fatherName) missingFields.push("Father Name");
      if (!studentMobile) missingFields.push("Student Mobile");

      if (missingFields.length > 0) {
        errorDetails.push({
          row: rowNumber,
          prkey: prkey || "N/A",
          name: `${firstName} ${lastName}`.trim() || "N/A",
          reason: `Missing mandatory field(s): ${missingFields.join(", ")}`
        });
        continue;
      }

      const lowerPrkey = prkey.toLowerCase();

      // Check duplicates in file
      if (seenInFilePrkeys.has(lowerPrkey)) {
        skippedDetails.push({
          row: rowNumber,
          prkey,
          name: `${firstName} ${lastName}`,
          reason: "Duplicate PR Key / Roll Number inside uploaded Excel sheet"
        });
        continue;
      }
      seenInFilePrkeys.add(lowerPrkey);

      // Check duplicates in database
      if (existingPrkeySet.has(lowerPrkey)) {
        skippedDetails.push({
          row: rowNumber,
          prkey,
          name: `${firstName} ${lastName}`,
          reason: "Student with this PR Key / Roll Number already exists in database"
        });
        continue;
      }

      // Hash password (custom provided or default ssism@123)
      const rawPassword = String(normalizedRow.password || "").trim() || "ssism@123";
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // Compute batch year
      let batchYear = null;
      try {
        batchYear = await calculateBatchYear({
          sessionId: targetSessionId,
          session: targetSession,
          subDepartmentId,
          course
        });
      } catch (e) {
        batchYear = `${targetSession?.name || "2025"}-${parseInt(targetSession?.name || "2025", 10) + 3}`;
      }

      let studentYear = normalizedRow.year || defaultYear;
      if (/^\d+$/.test(String(studentYear).trim())) {
        const num = String(studentYear).trim();
        if (num === "1") studentYear = "1st Year";
        else if (num === "2") studentYear = "2nd Year";
        else if (num === "3") studentYear = "3rd Year";
        else if (num === "4") studentYear = "4th Year";
      }

      const newStudentDoc = {
        prkey,
        password: hashedPassword,
        firstName,
        lastName,
        fatherName,
        studentMobile,
        parentMobile: normalizedRow.parentMobile || studentMobile,
        email: normalizedRow.email || "",
        gender: normalizedRow.gender || "Other",
        address: normalizedRow.address || normalizedRow.village || "Local",
        village: normalizedRow.village || normalizedRow.address || "Local",
        course,
        year: studentYear,
        track: normalizedRow.technology || "",
        technology: normalizedRow.technology || "",
        aadharCard: normalizedRow.aadharCard || "",
        category: normalizedRow.category || "",
        percent12: normalizedRow.percent12 || "",
        percent10: normalizedRow.percent10 || "",
        year12: normalizedRow.year12 || "",
        subDepartmentId,
        sessionId: targetSessionId,
        batchYear,
        currentLevelId: firstLevel._id,
        currentSubLevelId: firstSubLevel._id,
        syllabusVersionId: latestSyllabus ? latestSyllabus._id : null,
        withITEG: isNaturallyITEG(normalizedRow.course) ? true : Boolean(normalizedRow.withITEG),
        status: "Active"
      };

      validStudentsToInsert.push(newStudentDoc);
    }

    let insertedStudents = [];
    if (validStudentsToInsert.length > 0) {
      insertedStudents = await Student.insertMany(validStudentsToInsert, { ordered: false });

      // Auto-assign tasks if syllabus exists
      if (latestSyllabus) {
        try {
          const studentIds = insertedStudents.map(s => s._id);
          await assignTasksToMultipleStudents(studentIds, latestSyllabus._id);
        } catch (taskErr) {
          console.error("Bulk task assignment warning:", taskErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${rawRows.length} records: ${insertedStudents.length} imported, ${skippedDetails.length} skipped, ${errorDetails.length} errors`,
      summary: {
        total: rawRows.length,
        imported: insertedStudents.length,
        skipped: skippedDetails.length,
        errors: errorDetails.length
      },
      skippedDetails,
      errorDetails,
      meta: {
        sessionName: targetSession?.name || "N/A",
        subDepartmentName: subDept.name,
        levelName: firstLevel.name,
        subLevelName: firstSubLevel.name,
        syllabusVersion: latestSyllabus ? latestSyllabus.version : "None"
      }
    });

  } catch (error) {
    console.error("Error in importStudentsExcel:", error);
    return res.status(500).json({ success: false, message: "Server error during Excel import", error: error.message });
  }
};


// ✅ Download Sample Excel Template for Students
exports.downloadSampleExcel = async (req, res) => {
  try {
    const { subDepartmentId } = req.query;
    let allowedCourses = ["BCA", "B.Tech", "MCA", "BBA", "B.Sc"];
    let subDeptName = "Department";

    if (subDepartmentId) {
      const subDept = await SubDepartment.findById(subDepartmentId).populate("departmentId");
      if (subDept) {
        subDeptName = subDept.name;
        if ((subDept.allowedCourses || []).length > 0) {
          allowedCourses = subDept.allowedCourses;
        } else if (subDept.departmentId?.allowedCourses?.length > 0) {
          allowedCourses = subDept.departmentId.allowedCourses.map(c => c.courseName).filter(Boolean);
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SSES Student Management";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Students");
    sheet.columns = [
      { header: "PR Key / Roll No / Enrollment No", key: "prkey", width: 22 },
      { header: "Password (Default: ssism@123)", key: "password", width: 22 },
      { header: "First Name*", key: "firstName", width: 16 },
      { header: "Last Name*", key: "lastName", width: 16 },
      { header: "Father Name*", key: "fatherName", width: 22 },
      { header: "Student Mobile*", key: "studentMobile", width: 18 },
      { header: "Parent Mobile", key: "parentMobile", width: 18 },
      { header: "Course*", key: "course", width: 16 },
      { header: "Academic Year (1st Year / 2nd Year / 3rd Year)", key: "year", width: 25 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Email", key: "email", width: 24 },
      { header: "Address", key: "address", width: 26 },
      { header: "Village/City", key: "village", width: 16 },
      { header: "Aadhar Card", key: "aadharCard", width: 18 },
      { header: "Category", key: "category", width: 12 },
      { header: "12th Percentage", key: "percent12", width: 16 },
      { header: "10th Percentage", key: "percent10", width: 16 },
    ];

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF97316" } // Orange-500
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 28;

    // Add 2 Sample Rows
    const sampleCourse1 = allowedCourses[0] || "BCA";
    const sampleCourse2 = allowedCourses[1] || allowedCourses[0] || "B.Tech";

    sheet.addRow({
      prkey: "0827CS241001",
      password: "Student@123",
      firstName: "Rahul",
      lastName: "Sharma",
      fatherName: "Suresh Sharma",
      studentMobile: "9876543210",
      parentMobile: "9876543211",
      course: sampleCourse1,
      year: "2nd Year",
      gender: "Male",
      email: "rahul.sharma@example.com",
      address: "123 Vijay Nagar",
      village: "Indore",
      aadharCard: "123456789012",
      category: "GEN",
      percent12: "82.5%",
      percent10: "88.0%"
    });

    sheet.addRow({
      prkey: "0827CS241002",
      password: "",
      firstName: "Priya",
      lastName: "Patel",
      fatherName: "Ramesh Patel",
      studentMobile: "9123456780",
      parentMobile: "9123456781",
      course: sampleCourse2,
      gender: "Female",
      email: "priya.patel@example.com",
      address: "45 Navlakha",
      village: "Indore",
      aadharCard: "987654321098",
      category: "OBC",
      percent12: "85.0%",
      percent10: "90.2%"
    });

    // Instructions Sheet
    const guideSheet = workbook.addWorksheet("Guidelines");
    guideSheet.columns = [
      { header: "Field", key: "field", width: 26 },
      { header: "Required?", key: "required", width: 14 },
      { header: "Description & Allowed Values", key: "desc", width: 60 }
    ];

    const guideHeader = guideSheet.getRow(1);
    guideHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    guideHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF374151" } // Dark Slate
    };
    guideHeader.height = 26;

    guideSheet.addRow({ field: "PR Key / Roll No / Enrollment No", required: "OPTIONAL", desc: "Unique student identifier. Can be College Roll No or Enrollment No. If left empty, system auto-generates." });
    guideSheet.addRow({ field: "Password", required: "OPTIONAL", desc: "Portal login password. If left blank, defaults to 'ssism@123'." });
    guideSheet.addRow({ field: "First Name*", required: "YES", desc: "Student's given name." });
    guideSheet.addRow({ field: "Last Name*", required: "YES", desc: "Student's surname (or leave as first name)." });
    guideSheet.addRow({ field: "Father Name*", required: "YES", desc: "Father's or guardian's name." });
    guideSheet.addRow({ field: "Student Mobile*", required: "YES", desc: "10-digit mobile number of student." });
    guideSheet.addRow({ field: "Parent Mobile", required: "NO", desc: "Parent mobile number. Defaults to student mobile if left empty." });
    guideSheet.addRow({ field: "Course*", required: "YES", desc: `Allowed courses for this department (${subDeptName}): ${allowedCourses.join(", ")}` });
    guideSheet.addRow({ field: "Academic Year", required: "NO", desc: "1st Year, 2nd Year, 3rd Year, or 4th Year. If left empty, calculated from session." });
    guideSheet.addRow({ field: "Gender", required: "NO", desc: "Male, Female, or Other." });
    guideSheet.addRow({ field: "Address", required: "NO", desc: "Residential address." });
    guideSheet.addRow({ field: "Village/City", required: "NO", desc: "Village or city name." });
    guideSheet.addRow({ field: "Aadhar Card", required: "NO", desc: "12-digit Aadhar number." });
    guideSheet.addRow({ field: "Category", required: "NO", desc: "GEN, OBC, SC, ST, etc." });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="students_import_template_${subDeptName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating sample Excel:", error);
    return res.status(500).json({ success: false, message: "Error generating sample template", error: error.message });
  }
};


// ✅ Get All Students (with department-based access control)
exports.getAllStudents = async (req, res) => {
  try {
    const { sessionId, currentLevelId, currentSubLevelId, status, subDepartmentId, year } = req.query;

    let subDeptFilter = req.subDeptFilter ? { ...req.subDeptFilter } : null;

    if (!subDeptFilter && subDepartmentId) {
      const subDept = await SubDepartment.findById(subDepartmentId).populate("departmentId").lean();
      const isIteg = String(subDept?.departmentId?.name || "").toUpperCase().includes("ITEG") || String(subDept?.name || "").toUpperCase().includes("ITEG");
      subDeptFilter = isIteg
        ? { $or: [{ subDepartmentId }, { withITEG: true }] }
        : { subDepartmentId };
    }

    const andConditions = [];
    if (subDeptFilter) andConditions.push(subDeptFilter);
    if (sessionId) andConditions.push({ sessionId });
    if (currentLevelId) andConditions.push({ currentLevelId });
    if (currentSubLevelId) andConditions.push({ currentSubLevelId });
    if (year) andConditions.push({ year });
    if (status) {
      andConditions.push({ status });
    } else {
      andConditions.push({ status: { $nin: ["Dummy", "Dropped"] } });
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    const students = await Student.find(filter)
      .populate({
        path: "subDepartmentId",
        select: "name departmentId",
        populate: {
          path: "departmentId",
          select: "name code allowedCourses"
        }
      })
      .populate("sessionId", "name startDate endDate status isActive")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .sort({ createdAt: -1 })
      .lean();

    // Fallback batch calculation for any older records without batchYear
    for (const st of students) {
      if (!st.batchYear) {
        st.batchYear = await calculateBatchYear({
          session: st.sessionId,
          subDepartmentId: st.subDepartmentId?._id || st.subDepartmentId,
          departmentId: st.subDepartmentId?.departmentId?._id || st.subDepartmentId?.departmentId,
          course: st.course
        });
      }
    }

    return res.status(200).json({ count: students.length, data: students });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: "subDepartmentId",
        select: "name departmentId",
        populate: {
          path: "departmentId",
          select: "name code reportConfig logo allowedCourses"
        }
      })
      .populate("sessionId", "name startDate endDate status isActive")
      .populate("syllabusVersionId", "version title")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order");

    if (!student) return res.status(404).json({ message: "Student not found" });

    // Resolve student's actual technology from database
    let actualTech = "Technology Not Updated";
    if (Array.isArray(student.technologies) && student.technologies.filter(Boolean).length > 0) {
      actualTech = student.technologies.filter(Boolean).join(" | ");
    } else if (Array.isArray(student.technology) && student.technology.filter(Boolean).length > 0) {
      actualTech = student.technology.filter(Boolean).join(" | ");
    } else {
      const techVal = student.techno || student.technology || student.track;
      if (techVal && typeof techVal === "string" && techVal.trim()) {
        actualTech = techVal.trim();
      }
    }

    // Attach placement readiness
    const StudentPlacement = require("../../models/placement/StudentPlacement");
    const placement = await StudentPlacement.findOne({ studentId: req.params.id })
      .select("readinessStatus placedInfo PlacementinterviewRecord resumeURL offerLetter commitmentApplication");

    // Attach overall task progress (all non-extra tasks)
    const allTasks = await StudentTask.find({ studentId: req.params.id, isExtra: false });
    const overallTotal     = allTasks.length;
    const overallCompleted = allTasks.filter(t => t.status === "completed").length;
    const overallPct       = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    const studentObj = student.toObject();
    studentObj.technology = actualTech;
    studentObj.techno = student.techno || student.technology || student.track || (actualTech !== "Technology Not Updated" ? actualTech : "");
    studentObj.track = student.track || (actualTech !== "Technology Not Updated" ? actualTech : "");

    // Ensure batchYear is computed if missing
    if (!studentObj.batchYear) {
      studentObj.batchYear = await calculateBatchYear({
        session: student.sessionId,
        subDepartmentId: student.subDepartmentId?._id || student.subDepartmentId,
        departmentId: student.subDepartmentId?.departmentId?._id || student.subDepartmentId?.departmentId,
        course: student.course
      });
    }

    return res.status(200).json({
      data: {
        ...studentObj,
        placement: placement || null,
        overallProgress: { total: overallTotal, completed: overallCompleted, percentage: overallPct },
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update Student Elective Technology
exports.updateTechnology = async (req, res) => {
  try {
    const { techno, technology, track, technologies } = req.body;
    const techVal = techno || technology || track || (Array.isArray(technologies) ? technologies.join(" | ") : null);
    if (!techVal) return res.status(400).json({ message: "Technology field is required" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.techno = techVal;
    student.technology = techVal;
    student.track = techVal;
    if (Array.isArray(technologies)) {
      student.technologies = technologies;
    }
    await student.save();

    return res.status(200).json({ message: "Technology updated successfully", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



// ✅ Update Student Basic Info
exports.updateStudent = async (req, res) => {
  try {
    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) return res.status(404).json({ message: "Student not found" });

    const allowedFields = [
      "firstName", "lastName", "fatherName", "email", "studentMobile",
      "parentMobile", "gender", "dob", "aadharCard", "address", "track",
      "village", "stream", "course", "category", "subject12", "year12",
      "percent12", "percent10", "status", "isFTP", "batchYear", "year", "withITEG"
    ];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    if (isNaturallyITEG(updateData.course || existingStudent.course)) {
      updateData.withITEG = true;
    }

    const sessionInput = req.body.sessionId || req.body.session || (req.body.year && /^\d{4}$/.test(String(req.body.year).trim()) ? req.body.year : null);
    if (sessionInput) {
      const targetSessionId = await findOrCreateSessionByName(sessionInput);
      if (targetSessionId) {
        updateData.sessionId = targetSessionId;
      }
    }

    // If course, sessionId, or subDepartmentId was updated (and batchYear wasn't explicitly passed), recalculate batchYear
    if (req.body.batchYear === undefined && (updateData.course || updateData.sessionId)) {
      updateData.batchYear = await calculateBatchYear({
        sessionId: updateData.sessionId || existingStudent.sessionId,
        subDepartmentId: existingStudent.subDepartmentId,
        course: updateData.course || existingStudent.course
      });
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    return res.status(200).json({ message: "Student updated successfully", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Update Profile Image
exports.updateProfileImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "Image is required" });

    // Allow direct HTTP/HTTPS URL
    if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      const student = await Student.findById(req.params.id);
      if (!student) return res.status(404).json({ message: "Student not found" });
      student.image = image;
      await student.save();
      return res.status(200).json({ message: "Profile image updated successfully", imageURL: student.image });
    }

    // Support all valid base64 image formats (PNG, JPEG, JPG, WEBP, GIF, AVIF, SVG, etc.)
    if (!/^data:image\/[a-zA-Z0-9+.-]+;(?:[^;]+;)*base64,/i.test(image)) {
      return res.status(400).json({ message: "Invalid image format. Must be a valid base64 encoded image (PNG, JPEG, WEBP, GIF, etc.)." });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "student_profiles",
      public_id: `student_${req.params.id}`,
      overwrite: true,
      resource_type: "image",
    });

    student.image = uploadResponse.secure_url;
    await student.save();
    return res.status(200).json({ message: "Profile image updated successfully", imageURL: student.image });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Upload Document (image or pdf)
exports.uploadDocument = async (req, res) => {
  try {
    const { title, fileData, fileType } = req.body;
    if (!title || !fileData || !fileType)
      return res.status(400).json({ message: "title, fileData, and fileType are required" });
    if (!["image", "pdf"].includes(fileType))
      return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });


    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    const uploadOptions = {
      folder: "student_documents",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `doc_${req.params.id}_${Date.now()}`,
    };


    const uploadResponse = await cloudinary.uploader.upload(fileData, uploadOptions);


    const doc = {
      title,
      fileURL: uploadResponse.secure_url,
      fileType,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    };


    student.documents.push(doc);
    await student.save();


    return res.status(201).json({ message: "Document uploaded successfully", data: doc });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Delete Document
exports.deleteDocument = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    const docIndex = student.documents.findIndex(d => d._id.toString() === req.params.docId);
    if (docIndex === -1) return res.status(404).json({ message: "Document not found" });


    student.documents.splice(docIndex, 1);
    await student.save();
    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Update Permission Details
exports.updatePermission = async (req, res) => {
  try {
    const { imageURL, remark, approved_by } = req.body;
    if (!imageURL || !approved_by) return res.status(400).json({ message: "imageURL and approved_by are required" });
    if (!["super admin", "admin", "faculty"].includes(approved_by))
      return res.status(400).json({ message: "Invalid approved_by role" });


    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    const uploadResponse = await cloudinary.uploader.upload(imageURL, { folder: "permission_applications" });


    student.permissionDetails = {
      imageURL: uploadResponse.secure_url,
      remark: remark || "",
      approved_by,
      uploadDate: new Date(),
    };
    await student.save();
    return res.status(200).json({ message: "Permission updated successfully", data: student.permissionDetails });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Students with Permission (filterable by status)
exports.getPermissionStudents = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const validStatuses = ["pending", "approved", "rejected"];
    const statusFilter = validStatuses.includes(status) ? status : "pending";

    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    filter["permissionDetails"] = { $ne: null };
    filter["permissionDetails.status"] = statusFilter;

    const students = await Student.find(filter)
      .select("prkey firstName lastName email studentMobile permissionDetails currentLevelId currentSubLevelId subDepartmentId")
      .populate("currentLevelId", "name")
      .populate("currentSubLevelId", "name")
      .sort({ updatedAt: -1 });
    return res.status(200).json({ count: students.length, data: students });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Approve or Reject Leave Permission (legacy single permission workflow)
exports.updatePermissionStatus = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const validStatuses = ["approved", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(", ")}` });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.permissionDetails) {
      return res.status(400).json({ message: "No permission request found for this student" });
    }

    student.permissionDetails.status = status;
    if (remark !== undefined) student.permissionDetails.remark = remark;
    await student.save();

    return res.status(200).json({
      message: `Permission ${status} successfully`,
      data: student.permissionDetails,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Tasks (level-wise / sublevel-wise)
exports.getStudentTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { subLevelId, status } = req.query;


    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    const filter = {
      studentId: id,
    };
    if (subLevelId === "all") {
      // Return all tasks across all sublevels/syllabus versions
    } else if (subLevelId) {
      filter.$or = [{ subLevelId }, { isExtra: true }];
    } else if (student.syllabusVersionId) {
      filter.$or = [{ syllabusVersionId: student.syllabusVersionId }, { isExtra: true }];
    }
    if (status) filter.status = status;


    const tasks = await StudentTask.find(filter)
      .populate("subLevelId", "name")
      .sort({ assignedAt: -1, createdAt: -1 });


    // Group by subject
    const grouped = {};
    tasks.forEach(t => {
      const subLevelName = t.subLevelId?.name || "";
      const key = subLevelName ? `${t.subjectName || "Other"} (${subLevelName})` : (t.subjectName || "Other");
      if (!grouped[key]) grouped[key] = { subjectId: t.subjectId, tasks: [] };
      grouped[key].tasks.push(t);
    });


    return res.status(200).json({
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === "completed").length,
      pendingTasks: tasks.filter(t => t.status === "pending").length,
      inProgressTasks: tasks.filter(t => t.status === "inProgress").length,
      groupedBySubject: grouped,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Tasks by SubLevel
exports.getStudentTasksBySubLevel = async (req, res) => {
  try {
    const { id, subLevelId } = req.params;


    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    const tasks = await StudentTask.find({
      studentId: id,
      subLevelId,
    }).sort({ subjectName: 1, topicName: 1 });


    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "inProgress").length,
      averageMarks: 0,
    };


    const completedWithMarks = tasks.filter(t => t.status === "completed" && t.marks !== null);
    if (completedWithMarks.length > 0) {
      stats.averageMarks = parseFloat(
        (completedWithMarks.reduce((sum, t) => sum + t.marks, 0) / completedWithMarks.length).toFixed(2)
      );
    }


    return res.status(200).json({ stats, tasks });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Task History
exports.getStudentTaskHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskId, subLevelId, page = 1, limit = 20 } = req.query;


    const filter = { studentId: id };
    if (taskId) filter.taskId = taskId;
    if (subLevelId) filter.subLevelId = subLevelId;


    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [history, total] = await Promise.all([
      StudentTaskHistory.find(filter).sort({ changedAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentTaskHistory.countDocuments(filter),
    ]);


    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: history,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Progress Snapshots
exports.getStudentProgressSnapshots = async (req, res) => {
  try {
    const { id } = req.params;
    const { subLevelId, scope, page = 1, limit = 20 } = req.query;


    const filter = { studentId: id };
    if (subLevelId) filter.subLevelId = subLevelId;
    if (scope) filter.snapshotScope = scope;


    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [snapshots, total] = await Promise.all([
      StudentProgressSnapshot.find(filter).sort({ changedAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentProgressSnapshot.countDocuments(filter),
    ]);


    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: snapshots,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Promote Student to Next SubLevel (Manual or Auto-triggered)
// ✅ Get Student Activity Feed
exports.getStudentActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { studentId: id };
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [activity, total] = await Promise.all([
      StudentEventLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentEventLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: activity,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get leave permission requests from the history-based permissions array.
// Department filtering is handled by departmentFilter middleware.
exports.getLeaveRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const validStatuses = ["pending", "approved", "rejected", "all"];
    const statusFilter = validStatuses.includes(status) ? status : "pending";

    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    filter["permissions.0"] = { $exists: true };
    if (statusFilter !== "all") filter["permissions.status"] = statusFilter;

    const isFacultyOnly = req.user && req.user.role === "faculty";

    const students = await Student.find(filter)
      .select("prkey firstName lastName image email studentMobile permissions currentLevelId currentSubLevelId subDepartmentId")
      .populate("subDepartmentId", "name departmentId")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .populate("permissions.assignedFacultyId", "name role position email")
      .sort({ updatedAt: -1 });

    const requests = students.flatMap((student) => {
      const studentObj = student.toObject();
      return (studentObj.permissions || [])
        .filter((permission) => {
          const matchesStatus = statusFilter === "all" || permission.status === statusFilter;
          if (!matchesStatus) return false;

          // If the logged-in user is just a faculty member, they only see leave requests assigned to them
          if (isFacultyOnly) {
            const assignedId = permission.assignedFacultyId?._id || permission.assignedFacultyId;
            return assignedId && assignedId.toString() === req.user.id.toString();
          }
          return true;
        })
        .map((permission) => ({
          ...permission,
          student: {
            _id: studentObj._id,
            prkey: studentObj.prkey,
            firstName: studentObj.firstName,
            lastName: studentObj.lastName,
            image: studentObj.image,
            email: studentObj.email,
            studentMobile: studentObj.studentMobile,
            subDepartmentId: studentObj.subDepartmentId,
            currentLevelId: studentObj.currentLevelId,
            currentSubLevelId: studentObj.currentSubLevelId,
          },
        }));
    }).sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));

    return res.status(200).json({ count: requests.length, data: requests });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Dummy Students
exports.getDummyStudents = async (req, res) => {
  try {
    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    filter.status = { $in: ["Dummy", "Dropped"] };

    const students = await Student.find(filter)
      .select("prkey firstName lastName email studentMobile course status dummyDetails currentLevelId currentSubLevelId subDepartmentId")
      .populate("subDepartmentId", "name departmentId")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .sort({ "dummyDetails.markedAt": -1, updatedAt: -1 });

    return res.status(200).json({ count: students.length, data: students });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.promoteStudent = async (req, res) => {
  try {
    const result = await promoteToNextSubLevel(req.params.id, req.user);
    return res.status(200).json({
      message: result.completedAllLevels
        ? "Student completed all levels and is ready for placement"
        : result.promotedToNewLevel
        ? "Student promoted to next level"
        : "Student promoted to next sub-level",
      data: result,
    });
  } catch (error) {
    const status = error.statusCode
      || (error.message.includes("not found") ? 404
      : error.message.includes("already completed") ? 400
      : error.message.includes("Only active") ? 400
      : 500);
    return res.status(status).json({ message: error.message });
  }
};


// ✅ Update Readiness Status
exports.updateReadinessStatus = async (req, res) => {
  try {
    const { readinessStatus } = req.body;
    const validStatuses = ["Ready", "Not Ready", "In Progress", "Ready for Interview"];
    if (!readinessStatus || !validStatuses.includes(readinessStatus))
      return res.status(400).json({ message: `readinessStatus must be one of: ${validStatuses.join(", ")}` });


    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { readinessStatus },
      { new: true, runValidators: true }
    ).select("_id prkey firstName lastName readinessStatus");


    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({ message: "Readiness status updated", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Update Placement Readiness Status
// Updates StudentPlacement.readinessStatus.
// Creates a StudentPlacement record if one doesn't exist yet.
// This is the correct endpoint for toggling placement readiness from the student profile.
exports.updatePlacementReadiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { readinessStatus } = req.body;

    const validStatuses = ["Not Ready", "In Progress", "Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"];
    if (!readinessStatus || !validStatuses.includes(readinessStatus)) {
      return res.status(400).json({ message: `readinessStatus must be one of: ${validStatuses.join(", ")}` });
    }

    const student = await Student.findById(id).select("subDepartmentId status");
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "Dropped") {
      return res.status(400).json({ message: "Cannot update readiness for a dropped student" });
    }

    const StudentPlacement = require("../../models/placement/StudentPlacement");

    const placement = await StudentPlacement.findOneAndUpdate(
      { studentId: id },
      {
        $set: { readinessStatus },
        $setOnInsert: { studentId: id, subDepartmentId: student.subDepartmentId }
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Placement readiness updated successfully",
      data: { studentId: id, readinessStatus: placement.readinessStatus },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ HOD Move Student to "Ready for Placement" after Level 2A
exports.moveToReadyForPlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const actorRole = (req.user?.role || "").toLowerCase();

    // 1. Role permission check: HOD, SuperAdmin, Admin
    const allowedRoles = ["hod", "superadmin", "admin"];
    if (!allowedRoles.includes(actorRole)) {
      return res.status(403).json({ success: false, message: "Unauthorized. Only HOD or Admin can move student to Ready for Placement." });
    }

    // 2. Find student
    const student = await Student.findById(id)
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order levelId");

    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    if (student.status !== "Active") {
      return res.status(400).json({ success: false, message: "Only active students can be moved to Ready for Placement" });
    }

    // 3. Verify student has completed Level 2A
    const StudentLevelProgress = require("../../models/student/StudentLevelProgress");
    const SubLevel = require("../../models/department/SubLevel");
    const StudentEventLog = require("../../models/student/StudentEventLog");
    const StudentPlacement = require("../../models/placement/StudentPlacement");

    // Find SubLevel matching 2A
    const subLevel2A = await SubLevel.findOne({
      name: { $regex: /2A/i },
      isActive: true,
    });

    let completedLevel2A = false;

    if (subLevel2A) {
      const progress2A = await StudentLevelProgress.findOne({
        studentId: id,
        subLevelId: subLevel2A._id,
        status: "completed",
      });
      if (progress2A) {
        completedLevel2A = true;
      }
    }

    // Secondary check: if current sublevel is past 2A (e.g., 2B, 2C, or higher order)
    if (!completedLevel2A && student.currentSubLevelId) {
      const curSubName = (student.currentSubLevelId.name || "").toUpperCase();
      const curLevelOrder = student.currentLevelId?.order || 0;
      if (curSubName.includes("2B") || curSubName.includes("2C") || curLevelOrder > 2) {
        completedLevel2A = true;
      } else if (subLevel2A && student.currentSubLevelId.order > subLevel2A.order && (student.currentSubLevelId.levelId?.toString() === subLevel2A.levelId?.toString() || curLevelOrder >= 2)) {
        completedLevel2A = true;
      }
    }

    if (!completedLevel2A) {
      return res.status(400).json({
        success: false,
        message: "Student has not completed Level 2A yet. Cannot move to Ready for Placement.",
      });
    }

    // 4. Prevent duplicate status changes
    let placement = await StudentPlacement.findOne({ studentId: id });
    if (placement && ["Ready for Placement", "Ready for Drive", "Ready for Interview", "Placed"].includes(placement.readinessStatus)) {
      return res.status(400).json({
        success: false,
        message: `Student is already in "${placement.readinessStatus}" stage or beyond.`,
      });
    }

    // 5. Update or create StudentPlacement status
    if (!placement) {
      placement = new StudentPlacement({
        studentId: id,
        subDepartmentId: student.subDepartmentId,
        readinessStatus: "Ready for Placement",
      });
    } else {
      placement.readinessStatus = "Ready for Placement";
    }
    await placement.save();

    // 6. Log audit event
    await StudentEventLog.create({
      studentId: id,
      type: "promotion",
      action: "moved_to_ready_for_placement",
      title: "Moved to Ready for Placement",
      description: `HOD (${req.user?.name || "Authorized User"}) moved student to Ready for Placement after Level 2A completion`,
      createdBy: req.user?.id || req.user?._id || null,
      createdByName: req.user?.name || "",
      createdByRole: req.user?.role || "",
    });

    return res.status(200).json({
      success: true,
      message: "Student moved to Ready for Placement successfully",
      data: {
        studentId: id,
        readinessStatus: placement.readinessStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Assign Extra Task to Individual Student (outside syllabus)
// Extra tasks appear only on that student's profile.
// They do not affect syllabus progress or auto-promotion.
exports.assignExtraTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, maxMarks, subjectName, topicName, notes, priority, timeDays, measurablePoints, dueDate } = req.body;

    if (!title) return res.status(400).json({ success: false, message: "Task title is required" });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    if (student.status !== "Active") return res.status(400).json({ success: false, message: "Only active students can receive extra tasks" });

    const extraTaskId = new mongoose.Types.ObjectId();
    const extraTask = await StudentTask.create({
      studentId: student._id,
      // syllabus fields are null for extra tasks
      sessionId: student.sessionId || null,
      levelId: student.currentLevelId || null,
      subLevelId: student.currentSubLevelId || null,
      syllabusVersionId: student.syllabusVersionId || null,
      taskId: extraTaskId,
      subjectId: new mongoose.Types.ObjectId(),
      topicId: new mongoose.Types.ObjectId(),
      subTopicId: null,
      subjectName: subjectName || "Extra",
      topicName: topicName || "Extra Task",
      subTopicName: null,
      taskNodeType: "topic",
      title: title.trim(),
      description: description || "",
      type: type || "assignment",
      priority: priority || "medium",
      mandatory: false,
      maxMarks: typeof maxMarks === "number" ? maxMarks : 5,
      timeDays: timeDays ? Number(timeDays) : null,
      measurablePoints: measurablePoints || "",
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || "",
      assignedType: "manual",
      assignedBy: req.user?.id || req.user?._id || null,
      assignedByName: req.user?.name || "",
      assignedByRole: req.user?.role || "",
      assignedAt: new Date(),
      isExtra: true,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Extra task assigned successfully",
      data: extraTask,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Get Extra Tasks for a Student
exports.getExtraTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const tasks = await StudentTask.find({
      studentId: id,
      isExtra: true,
      isActive: true,
    }).sort({ assignedAt: -1 });

    return res.status(200).json({
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      pending: tasks.filter(t => t.status === "pending").length,
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Upload Extra Document (with remark)
exports.uploadExtraDocument = async (req, res) => {
  try {
    const { title, fileData, fileType, remark } = req.body;
    if (!title || !fileData || !fileType)
      return res.status(400).json({ message: "title, fileData, and fileType are required" });
    if (!["image", "pdf"].includes(fileType))
      return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "student_extra_documents",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `extradoc_${req.params.id}_${Date.now()}`,
    });

    const doc = {
      title,
      fileURL: uploadResponse.secure_url,
      fileType,
      remark: remark || "",
      isExtra: true,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    };

    student.documents.push(doc);
    await student.save();
    return res.status(201).json({ message: "Extra document uploaded successfully", data: doc });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Extra Documents
exports.getExtraDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("documents");
    if (!student) return res.status(404).json({ message: "Student not found" });
    const extraDocs = student.documents.filter(d => d.isExtra === true);
    return res.status(200).json({ count: extraDocs.length, data: extraDocs });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Apply for Permission (student-initiated flow)
exports.applyPermission = async (req, res) => {
  try {
    const { reason, fromDate, toDate, imageURL, assignedFacultyId } = req.body;
    if (!reason || !fromDate || !toDate)
      return res.status(400).json({ message: "reason, fromDate, toDate are required" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    let uploadedImageURL = "";
    if (imageURL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const uploadResponse = await cloudinary.uploader.upload(imageURL, { folder: "permission_applications" });
      uploadedImageURL = uploadResponse.secure_url;
    }

    const permission = {
      imageURL: uploadedImageURL,
      reason,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      status: "pending",
      uploadDate: new Date(),
      assignedFacultyId: assignedFacultyId || null
    };

    student.permissions.push(permission);
    await student.save();
    const addedPermission = student.permissions[student.permissions.length - 1];

    await StudentEventLog.create({
      studentId: student._id,
      type: "permission",
      action: "leave_request_submitted",
      title: "Leave request submitted",
      description: reason,
      meta: {
        permissionId: addedPermission._id,
        status: "pending",
        fromDate: permission.fromDate,
        toDate: permission.toDate,
        hasDocument: Boolean(uploadedImageURL),
        assignedFacultyId: addedPermission.assignedFacultyId,
      },
      createdBy: req.user?.id || req.user?._id || null,
      createdByName: req.user?.name || `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      createdByRole: req.user?.role || "student",
    });

    return res.status(201).json({
      message: "Permission applied successfully",
      data: addedPermission,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Permission History
exports.getPermissions = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select("permissions")
      .populate("permissions.assignedFacultyId", "name role position email");
    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({
      count: student.permissions.length,
      data: student.permissions.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Approve / Reject Permission
exports.resolvePermission = async (req, res) => {
  try {
    const { status, remark } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const permission = student.permissions.id(req.params.permissionId);
    if (!permission) return res.status(404).json({ message: "Permission not found" });
    if (permission.status !== "pending")
      return res.status(400).json({ message: "Permission already resolved" });

    // Role and Assignment Validation
    const isAuthorized = 
      ["superadmin", "hod", "admin"].includes(req.user.role) ||
      (permission.assignedFacultyId && permission.assignedFacultyId.toString() === req.user.id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: "You are not authorized to resolve this leave request. Only the assigned faculty member, HOD, or Superadmin can resolve it." 
      });
    }

    permission.status = status;
    permission.remark = remark || "";
    permission.approvedBy = req.user?.name || "";
    permission.approvedAt = new Date();

    await student.save();
    await StudentEventLog.create({
      studentId: student._id,
      type: "permission",
      action: `leave_request_${status}`,
      title: `Leave request ${status}`,
      description: remark || permission.reason || "",
      meta: {
        permissionId: permission._id,
        status,
        reason: permission.reason,
        remark: remark || "",
        fromDate: permission.fromDate,
        toDate: permission.toDate,
      },
      createdBy: req.user?.id || req.user?._id || null,
      createdByName: req.user?.name || "",
      createdByRole: req.user?.role || "",
    });

    return res.status(200).json({ message: `Permission ${status}`, data: permission });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Mark Student as Dropped (with application document upload)
exports.markDropped = async (req, res) => {
  try {
    const { remark, fileData, fileType } = req.body;
    if (!remark) return res.status(400).json({ message: "remark is required" });
    if (!fileData || !fileType) return res.status(400).json({ message: "Application document is required" });
    if (!["image", "pdf"].includes(fileType)) return res.status(400).json({ message: "fileType must be image or pdf" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "Dropped") return res.status(400).json({ message: "Student is already dropped" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "drop_applications",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `drop_${req.params.id}_${Date.now()}`,
    });

    // Store document in student.documents with isExtra: false
    student.documents.push({
      title: `Drop Application`,
      fileURL: uploadResponse.secure_url,
      fileType,
      remark,
      isExtra: false,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    });

    student.status = "Dropped";
    await student.save();

    return res.status(200).json({
      message: "Student marked as Dropped",
      data: { studentId: student._id, status: student.status },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Student Dashboard Stats (department-aware)
// ✅ Mark Student as Dummy (separate from dropped and leave permission)
exports.markDummy = async (req, res) => {
  try {
    const { reason, remark, fileData, fileType } = req.body;
    if (!reason) return res.status(400).json({ message: "reason is required" });
    if (!fileData || !fileType) return res.status(400).json({ message: "Application document is required" });
    if (!["image", "pdf"].includes(fileType)) return res.status(400).json({ message: "fileType must be image or pdf" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "Dummy") return res.status(400).json({ message: "Student is already marked as dummy" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "dummy_applications",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `dummy_${req.params.id}_${Date.now()}`,
    });

    student.dummyDetails = {
      reason,
      remark: remark || "",
      applicationURL: uploadResponse.secure_url,
      applicationType: fileType,
      markedBy: req.user?._id || null,
      markedByName: req.user?.name || "",
      markedAt: new Date(),
    };

    student.documents.push({
      title: "Dummy Student Application",
      fileURL: uploadResponse.secure_url,
      fileType,
      remark: remark || reason,
      isExtra: false,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    });

    student.status = "Dummy";
    await student.save();

    return res.status(200).json({
      message: "Student marked as Dummy",
      data: { studentId: student._id, status: student.status, dummyDetails: student.dummyDetails },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const base = req.subDeptFilter ? { ...req.subDeptFilter } : {};

    const [total, active, placed, dropped, dummy] = await Promise.all([
      Student.countDocuments(base),
      Student.countDocuments({ ...base, status: "Active" }),
      Student.countDocuments({ ...base, status: "Placed" }),
      Student.countDocuments({ ...base, status: "Dropped" }),
      Student.countDocuments({ ...base, status: "Dummy" }),
    ]);
    return res.status(200).json({ total, active, placed, dropped, dummy });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getSubLevelStudentsProgress = async (req, res) => {
  try {
    const { subLevelId } = req.params;

    const students = await Student.find({
      currentSubLevelId: subLevelId,
      status: { $nin: ["Dummy", "Dropped"] },
    })
      .populate("currentSubLevelId", "name")
      .select("firstName lastName prkey status currentSubLevelId image attendanceRate");

    const studentIds = students.map(s => s._id);

    const tasks = await StudentTask.find({
      studentId: { $in: studentIds },
      subLevelId: subLevelId,
      isExtra: false,
      isActive: true
    }).select("studentId subjectId subjectName status");

    const tasksByStudent = {};
    studentIds.forEach(id => {
      tasksByStudent[id.toString()] = [];
    });
    tasks.forEach(t => {
      const sIdStr = t.studentId.toString();
      if (tasksByStudent[sIdStr]) {
        tasksByStudent[sIdStr].push(t);
      }
    });

    const data = students.map(student => {
      const sIdStr = student._id.toString();
      const sTasks = tasksByStudent[sIdStr] || [];

      const total = sTasks.length;
      const completed = sTasks.filter(t => t.status === "completed").length;
      const inProgress = sTasks.filter(t => t.status === "inProgress").length;
      const pending = sTasks.filter(t => t.status === "pending").length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const subjectsMap = {};
      sTasks.forEach(t => {
        const subName = t.subjectName || "Unknown";
        if (!subjectsMap[subName]) {
          subjectsMap[subName] = [];
        }
        subjectsMap[subName].push(t);
      });

      const subjectProgress = Object.entries(subjectsMap).map(([subjectName, subTasks]) => {
        const subTotal = subTasks.length;
        const subCompleted = subTasks.filter(t => t.status === "completed").length;
        const subInProgress = subTasks.filter(t => t.status === "inProgress").length;

        let status = "pending";
        if (subCompleted === subTotal && subTotal > 0) {
          status = "completed";
        } else if (subCompleted > 0 || subInProgress > 0) {
          status = "inProgress";
        }

        return { subjectName, status };
      });

      return {
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        image: student.image,
        level: student.currentSubLevelId?.name || "—",
        prkey: student.prkey,
        currentStatus: student.status,
        attendanceRate: student.attendanceRate ?? 100,
        taskProgress: { completed, total, percentage },
        subjectProgress,
        statusCounters: { pending, inProgress, completed }
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Student Level History (Admin / Faculty)
exports.getStudentLevelHistory = async (req, res) => {
  try {
    const StudentLevelProgress = require("../../models/student/StudentLevelProgress");
    const history = await StudentLevelProgress.find({ studentId: req.params.id })
      .populate("levelId", "name order")
      .populate("subLevelId", "name order")
      .populate("sessionId", "name")
      .sort({ createdAt: 1 });

    return res.status(200).json({ count: history.length, data: history });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
