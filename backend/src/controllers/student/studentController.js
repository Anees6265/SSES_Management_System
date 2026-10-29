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
const { findOrCreateSessionByName, findOrCreateSessionFromBatch } = require("../../utils/sessionHelper");
const { calculateBatchYear, resolveCourseDuration } = require("../../utils/batchHelper");
const { resolveStudentDepartmentHierarchy, normalizeStr } = require("../../utils/departmentHelper");
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

// 🗓️ Helper to robustly parse date of birth from strings, numbers, or dates
const parseDOB = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const s = String(val).trim();
  if (!s) return null;

  // Handle Excel numeric date serial (e.g., 38000)
  if (/^\d{4,6}$/.test(s)) {
    const num = parseInt(s, 10);
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Standard Date parse (YYYY-MM-DD etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
};

// ✅ Create Student
exports.createStudent = async (req, res) => {
  try {
    const { subDepartmentId, session, year, academicYear, sessionId: inputSessionId } = req.body;

    // Validate Student Mobile (Strict 10 digits)
    const cleanStudentMobile = String(req.body.studentMobile || req.body.mobileNumber || "").trim();
    if (!/^[0-9]{10}$/.test(cleanStudentMobile)) {
      return res.status(400).json({ message: "Student mobile number must be exactly 10 digits" });
    }

    // Parent Mobile / Father Contact Number (fallback to studentMobile if not provided)
    let cleanParentMobile = String(req.body.parentMobile || req.body.fatherContactNumber || "").trim();
    if (!cleanParentMobile) {
      cleanParentMobile = cleanStudentMobile;
    } else if (!/^[0-9]{10}$/.test(cleanParentMobile)) {
      return res.status(400).json({ message: "Father / Parent contact number must be exactly 10 digits" });
    }

    // Validate Student Email (Flexible format to support external connections)
    const cleanEmail = String(req.body.email || req.body.emailId || "").trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Student email must be a valid email address (e.g. name@ssism.org or student@gmail.com)" });
    }

    // 1️⃣ Resolve Department Hierarchy (from ssismGroup, course, year, or subDepartmentId)
    const rawStudentYear = req.body.year || req.body.currentYear || "1st Year";
    const hierarchy = await resolveStudentDepartmentHierarchy({
      ssismGroup: req.body.ssismGroup || req.body.group,
      course: req.body.course || req.body.branch || req.body["Branch/Course"],
      branch: req.body.branch || req.body["Branch/Course"],
      year: rawStudentYear,
      fallbackSubDepartmentId: subDepartmentId
    });
    const subDept = hierarchy.subDepartment;
    const firstLevel = hierarchy.firstLevel;
    const firstSubLevel = hierarchy.firstSubLevel;
    const resolvedDeptName = hierarchy.department.name;
    const targetSubDeptId = subDept._id;

    // Determine course default if not provided
    const allowedCourses = (subDept.allowedCourses || []).length > 0
      ? subDept.allowedCourses
      : (subDept.departmentId?.allowedCourses || []).map(c => c.courseName).filter(Boolean);
    const resolvedCourse = req.body.course || req.body.branch || req.body["Branch/Course"] || allowedCourses[0] || "General";
    const resolvedBranch = req.body.branch || req.body["Branch/Course"] || resolvedCourse;

    // 3️⃣ Determine Session: Auto-created & linked based on student Batch (e.g., 2024, 2025, 2026) and Course Duration
    const batchInput = req.body.batch || req.body.batchYear || req.body.session || session || year || academicYear;
    const targetSessionId = await findOrCreateSessionFromBatch(batchInput, inputSessionId, {
      course: resolvedCourse,
      departmentId: hierarchy.department._id,
      subDepartmentId: targetSubDeptId
    });
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

    // Names resolution
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    let fullName = String(req.body.fullName || "").trim();
    if (!fullName && firstName) {
      fullName = `${firstName} ${lastName}`.trim();
    }

    // Auto-generate or resolve PR Key / Student ID
    let studentId = req.body.studentId ? String(req.body.studentId).trim() : "";
    let prkey = req.body.prkey ? String(req.body.prkey).trim() : studentId;
    if (!prkey) {
      const cleanCourse = (resolvedCourse || "STU").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      const sessionYear = targetSession?.name || new Date().getFullYear().toString();
      prkey = `${cleanCourse}${sessionYear}${Date.now().toString().slice(-4)}`;
    }
    if (!studentId) {
      studentId = prkey;
    }

    // Duplicate check on prkey
    const existing = await Student.findOne({ prkey });
    if (existing) return res.status(409).json({ message: `Student with PR Key / Roll Number / Student ID '${prkey}' already exists` });

    // Hash password (use provided or default ssism@123)
    const rawPassword = req.body.password ? String(req.body.password).trim() : "ssism@123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Calculate student batch year based on session and department/course duration
    let batchYear = req.body.batchYear || req.body.batch;
    if (!batchYear || /^\d{4}$/.test(String(batchYear).trim())) {
      try {
        batchYear = await calculateBatchYear({
          sessionId: targetSessionId,
          session: targetSession,
          subDepartmentId: targetSubDeptId,
          departmentId: hierarchy.department._id,
          course: resolvedCourse
        });
      } catch (e) {
        batchYear = `${targetSession?.name || "2025"}-${parseInt(targetSession?.name || "2025", 10) + 3}`;
      }
    }

    // Determine Year (e.g. 1st Year, 2nd Year, 3rd Year, 4th Year)
    let resolvedYear = req.body.year || req.body.currentYear;
    if (!resolvedYear || /^\d{4}$/.test(String(resolvedYear).trim())) {
      const sName = targetSession?.name || "";
      if (sName.includes("2024")) resolvedYear = "3rd Year";
      else if (sName.includes("2025")) resolvedYear = "2nd Year";
      else if (sName.includes("2026")) resolvedYear = "1st Year";
      else if (sName.includes("2023")) resolvedYear = "4th Year";
      else resolvedYear = "1st Year";
    }

    const resolvedWithITEG = isNaturallyITEG(resolvedCourse) ? true : Boolean(req.body.withITEG);
    const parsedDob = parseDOB(req.body.dob);
    const dobString = req.body.dobString || (req.body.dob ? String(req.body.dob) : "");

    const student = new Student({
      ...req.body,
      prkey,
      studentId,
      registrationNo: req.body.registrationNo || "",
      enrollmentNo: req.body.enrollmentNo || "",
      firstName,
      lastName,
      fullName,
      fatherName: req.body.fatherName || "",
      email: cleanEmail,
      studentMobile: cleanStudentMobile,
      parentMobile: cleanParentMobile,
      fatherContactNumber: cleanParentMobile,
      password: hashedPassword,
      branch: resolvedBranch,
      course: resolvedCourse,
      year: resolvedYear,
      currentYear: req.body.currentYear || resolvedYear,
      currentSemester: req.body.currentSemester || "",
      batch: req.body.batch || batchYear || "",
      batchYear,
      gender: req.body.gender || "",
      category: req.body.category || "",
      dob: parsedDob,
      dobString,
      aadharNo: req.body.aadharNo || req.body.aadharCard || "",
      aadharCard: req.body.aadharNo || req.body.aadharCard || "",
      fullAddress: req.body.fullAddress || req.body.address || req.body.village || "Local",
      address: req.body.fullAddress || req.body.address || req.body.village || "Local",
      village: req.body.village || req.body.fullAddress || req.body.address || "Local",
      tehsil: req.body.tehsil || "",
      district: req.body.district || "",
      pincode: req.body.pincode || "",
      trackBus: req.body.trackBus || "",
      sponsorshipType: req.body.sponsorshipType || req.body.sponshershipType || "",
      ssismGroup: req.body.ssismGroup || resolvedDeptName,
      withITEG: resolvedWithITEG,
      sessionId: targetSessionId,
      subDepartmentId: targetSubDeptId,
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



    // Check faculty access if applicable and subDepartmentId provided
    if (subDepartmentId && req.allowedSubDeptIds && !req.allowedSubDeptIds.some(id => id.toString() === subDepartmentId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied for this sub-department" });
    }

    // 1️⃣ Target Session: Auto-created & resolved based on Batch (e.g. 2024, 2025, 2026)
    const defaultBatchInput = req.body.batch || req.body.batchYear || req.body.year || new Date().getFullYear();
    const defaultSessionId = await findOrCreateSessionFromBatch(defaultBatchInput, inputSessionId);
    const defaultSession = await Session.findById(defaultSessionId);

    // Caches to avoid duplicate DB lookups across rows
    const sessionCache = new Map();
    sessionCache.set(String(defaultBatchInput).trim(), { id: defaultSessionId, doc: defaultSession });

    const hierarchyCache = new Map();

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

    // Allowed courses for this subdepartment (if subDepartmentId provided)
    let defaultCourse = "General";
    if (subDepartmentId) {
      try {
        const sDeptDoc = await SubDepartment.findById(subDepartmentId).populate("departmentId");
        if (sDeptDoc) {
          const allowed = (sDeptDoc.allowedCourses || []).length > 0
            ? sDeptDoc.allowedCourses
            : (sDeptDoc.departmentId?.allowedCourses || []).map(c => c.courseName).filter(Boolean);
          if (allowed.length > 0) defaultCourse = allowed[0];
        }
      } catch (err) {
        console.warn("SubDepartment lookup error:", err.message);
      }
    }

    // Pre-fetch all existing PR keys & student IDs in MongoDB
    const existingStudents = await Student.find({}, "prkey studentId").lean();
    const existingPrkeySet = new Set(
      existingStudents.flatMap(s => [
        s.prkey ? String(s.prkey).toLowerCase() : null,
        s.studentId ? String(s.studentId).toLowerCase() : null
      ]).filter(Boolean)
    );

    // Default Year for this import batch
    let defaultYear = req.body.year;
    if (!defaultYear || /^\d{4}$/.test(String(defaultYear).trim())) {
      const sName = defaultSession?.name || "";
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
        const cleanVal = val !== undefined && val !== null ? String(val).trim() : "";

        if (["studentid", "prkey", "rollno", "admissionno", "scholarno"].includes(nk)) {
          normalizedRow.studentId = cleanVal;
          if (!normalizedRow.prkey) normalizedRow.prkey = cleanVal;
        } else if (["registrationno", "regno", "registrationnumber"].includes(nk)) {
          normalizedRow.registrationNo = cleanVal;
        } else if (["enrollmentno", "enrollmentnumber", "enrno", "prn"].includes(nk)) {
          normalizedRow.enrollmentNo = cleanVal;
        } else if (["firstname", "first", "fname"].includes(nk)) {
          normalizedRow.firstName = cleanVal;
        } else if (["lastname", "last", "lname", "surname"].includes(nk)) {
          normalizedRow.lastName = cleanVal;
        } else if (["fullname", "studentname", "name"].includes(nk)) {
          normalizedRow.fullName = cleanVal;
        } else if (["branchcourse", "branch", "course", "degree", "stream"].includes(nk)) {
          normalizedRow.branch = cleanVal;
          normalizedRow.course = cleanVal;
        } else if (["currentyear", "academicyear", "year", "studyingyear", "classyear"].includes(nk)) {
          normalizedRow.currentYear = cleanVal;
          normalizedRow.year = cleanVal;
        } else if (["currentsemester", "semester", "sem", "currentsem"].includes(nk)) {
          normalizedRow.currentSemester = cleanVal;
        } else if (["batch", "batchyear"].includes(nk)) {
          normalizedRow.batch = cleanVal;
          normalizedRow.batchYear = cleanVal;
        } else if (["mobilenumber", "studentmobile", "mobile", "mobileno", "phoneno", "contact", "studentphone", "phone"].includes(nk)) {
          normalizedRow.studentMobile = cleanVal;
        } else if (["fathercontactnumber", "fathermobile", "parentmobile", "fatherphone", "parentphone", "guardianmobile"].includes(nk)) {
          normalizedRow.fatherContactNumber = cleanVal;
          normalizedRow.parentMobile = cleanVal;
        } else if (["emailid", "email", "emailaddress", "mailid"].includes(nk)) {
          normalizedRow.email = cleanVal;
        } else if (["fathername", "father", "guardianname"].includes(nk)) {
          normalizedRow.fatherName = cleanVal;
        } else if (["gender", "sex"].includes(nk)) {
          normalizedRow.gender = cleanVal;
        } else if (["category", "caste"].includes(nk)) {
          normalizedRow.category = cleanVal;
        } else if (["dob", "dateofbirth", "birthdate"].includes(nk)) {
          normalizedRow.dob = cleanVal;
        } else if (["aadharno", "aadhar", "aadharcard", "aadharnumber"].includes(nk)) {
          normalizedRow.aadharNo = cleanVal;
          normalizedRow.aadharCard = cleanVal;
        } else if (["fulladdress", "address", "residentialaddress"].includes(nk)) {
          normalizedRow.fullAddress = cleanVal;
          normalizedRow.address = cleanVal;
        } else if (["village", "city", "town"].includes(nk)) {
          normalizedRow.village = cleanVal;
        } else if (["tehsil", "taluka"].includes(nk)) {
          normalizedRow.tehsil = cleanVal;
        } else if (["district", "dist"].includes(nk)) {
          normalizedRow.district = cleanVal;
        } else if (["pincode", "postalcode", "zipcode", "pin"].includes(nk)) {
          normalizedRow.pincode = cleanVal;
        } else if (["trackbus", "busroute", "busno", "transport", "bus"].includes(nk)) {
          normalizedRow.trackBus = cleanVal;
        } else if (["sponshershiptype", "sponsorshiptype", "sponsorship"].includes(nk)) {
          normalizedRow.sponsorshipType = cleanVal;
        } else if (["ssismgroup", "group", "department", "dept", "ssismdept", "division"].includes(nk)) {
          normalizedRow.ssismGroup = cleanVal;
        } else if (["password", "pass", "pwd"].includes(nk)) {
          normalizedRow.password = cleanVal;
        } else if (["withiteg", "iteg", "with_iteg", "isiteg", "withitegyesno"].includes(nk) || nk.includes("iteg")) {
          const v = String(cleanVal || "").toLowerCase().trim();
          normalizedRow.withITEG = ["yes", "y", "true", "1", "iteg", "with iteg"].includes(v);
        }
      }

      // If full name provided without first/last split
      if (!normalizedRow.firstName && normalizedRow.fullName) {
        const parts = String(normalizedRow.fullName).trim().split(/\s+/);
        normalizedRow.firstName = parts[0] || "";
        normalizedRow.lastName = parts.slice(1).join(" ") || "";
      } else if (normalizedRow.firstName && !normalizedRow.fullName) {
        normalizedRow.fullName = `${normalizedRow.firstName} ${normalizedRow.lastName || ""}`.trim();
      }

      let prkey = String(normalizedRow.prkey || normalizedRow.studentId || "").trim();
      const firstName = String(normalizedRow.firstName || "").trim();
      const lastName = String(normalizedRow.lastName || "").trim();
      const fullName = String(normalizedRow.fullName || `${firstName} ${lastName}`).trim();
      const fatherName = String(normalizedRow.fatherName || "").trim();
      const studentMobile = String(normalizedRow.studentMobile || "").trim();
      // Resolve student year
      const rawYearStr = String(normalizedRow.currentYear || normalizedRow.year || defaultYear || "").trim();
      let studentYear = "1st Year";
      if (/^(1|1st|i)$/i.test(rawYearStr) || rawYearStr.toLowerCase().includes("1st")) studentYear = "1st Year";
      else if (/^(2|2nd|ii)$/i.test(rawYearStr) || rawYearStr.toLowerCase().includes("2nd")) studentYear = "2nd Year";
      else if (/^(3|3rd|iii)$/i.test(rawYearStr) || rawYearStr.toLowerCase().includes("3rd")) studentYear = "3rd Year";
      else if (/^(4|4th|iv)$/i.test(rawYearStr) || rawYearStr.toLowerCase().includes("4th")) studentYear = "4th Year";
      else if (rawYearStr) studentYear = rawYearStr;

      // Resolve Department & SubDepartment hierarchy (from ssismGroup, course, and year)
      const rowGroup = normalizedRow.ssismGroup || normalizedRow.group || req.body.ssismGroup || "";
      const rowCourse = normalizedRow.course || normalizedRow.branch || "";
      const rowBranch = normalizedRow.branch || rowCourse;

      const hierKey = `${normalizeStr(rowGroup)}_${normalizeStr(rowCourse)}_${normalizeStr(rowBranch)}`;
      let hierarchy;
      if (hierarchyCache.has(hierKey)) {
        hierarchy = hierarchyCache.get(hierKey);
      } else {
        hierarchy = await resolveStudentDepartmentHierarchy({
          ssismGroup: rowGroup,
          course: rowCourse,
          branch: rowBranch,
          fallbackSubDepartmentId: subDepartmentId
        });
        hierarchyCache.set(hierKey, hierarchy);
      }

      const rowSubDept = hierarchy.subDepartment;
      const rowLevel = hierarchy.firstLevel;
      const rowSubLevel = hierarchy.firstSubLevel;
      const resolvedDeptName = hierarchy.department.name;

      const course = rowCourse || (rowSubDept.allowedCourses && rowSubDept.allowedCourses[0]) || "General";

      // Auto-generate PR Key if not provided in Excel row
      if (!prkey) {
        const cleanCourse = (course || "STU").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        const sessionYear = defaultSession?.name || new Date().getFullYear().toString();
        prkey = `${cleanCourse}${sessionYear}${String(1001 + validStudentsToInsert.length).padStart(4, "0")}`;
      }

      const studentId = normalizedRow.studentId || prkey;

      // Validation
      const missingFields = [];
      if (!firstName && !fullName) missingFields.push("First Name / Full Name");
      if (!studentMobile) missingFields.push("Mobile Number");

      if (missingFields.length > 0) {
        errorDetails.push({
          row: rowNumber,
          prkey: prkey || "N/A",
          name: fullName || `${firstName} ${lastName}`.trim() || "N/A",
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
          name: fullName || `${firstName} ${lastName}`,
          reason: "Duplicate Student ID / PR Key inside uploaded Excel sheet"
        });
        continue;
      }
      seenInFilePrkeys.add(lowerPrkey);

      // Check duplicates in database
      if (existingPrkeySet.has(lowerPrkey)) {
        skippedDetails.push({
          row: rowNumber,
          prkey,
          name: fullName || `${firstName} ${lastName}`,
          reason: "Student with this Student ID / PR Key already exists in database"
        });
        continue;
      }

      // Hash password (custom provided or default ssism@123)
      const rawPassword = String(normalizedRow.password || "").trim() || "ssism@123";
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // Resolve Session for this row's specific batch (auto-created if not exists)
      const rowBatchInput = normalizedRow.batch || normalizedRow.batchYear || req.body.batch || defaultBatchInput;
      const cleanBatchKey = String(rowBatchInput || defaultBatchInput).trim();
      const rowDeptId = hierarchy?.department?._id || departmentId;
      const rowSubDeptId = rowSubDept?._id || subDepartmentId;

      const duration = await resolveCourseDuration({
        departmentId: rowDeptId,
        subDepartmentId: rowSubDeptId,
        course
      });

      const sessionCacheKey = `${cleanBatchKey}_${duration}`;

      let rowSessionId = defaultSessionId;
      let rowSession = defaultSession;

      if (sessionCache.has(sessionCacheKey)) {
        const cached = sessionCache.get(sessionCacheKey);
        rowSessionId = cached.id;
        rowSession = cached.doc;
      } else {
        rowSessionId = await findOrCreateSessionFromBatch(cleanBatchKey, null, {
          course,
          departmentId: rowDeptId,
          subDepartmentId: rowSubDeptId,
          duration
        });
        rowSession = await Session.findById(rowSessionId);
        sessionCache.set(sessionCacheKey, { id: rowSessionId, doc: rowSession });
      }

      // Compute batch year
      let batchYear = normalizedRow.batchYear || normalizedRow.batch;
      if (!batchYear || /^\d{4}$/.test(String(batchYear).trim())) {
        try {
          batchYear = await calculateBatchYear({
            sessionId: rowSessionId,
            session: rowSession,
            subDepartmentId: rowSubDeptId,
            departmentId: rowDeptId,
            course
          });
        } catch (e) {
          const startY = parseInt(cleanBatchKey.match(/\b(20\d\d)\b/)?.[1] || "2025", 10);
          batchYear = `${startY} - ${startY + duration}`;
        }
      }

      const parsedDob = parseDOB(normalizedRow.dob);

      const newStudentDoc = {
        prkey,
        studentId,
        registrationNo: normalizedRow.registrationNo || "",
        enrollmentNo: normalizedRow.enrollmentNo || "",
        password: hashedPassword,
        firstName,
        lastName,
        fullName,
        fatherName,
        studentMobile,
        parentMobile: normalizedRow.fatherContactNumber || normalizedRow.parentMobile || studentMobile,
        fatherContactNumber: normalizedRow.fatherContactNumber || normalizedRow.parentMobile || "",
        email: normalizedRow.email || "",
        gender: normalizedRow.gender || "Other",
        category: normalizedRow.category || "",
        dob: parsedDob,
        dobString: String(normalizedRow.dob || ""),
        aadharCard: normalizedRow.aadharNo || normalizedRow.aadharCard || "",
        aadharNo: normalizedRow.aadharNo || normalizedRow.aadharCard || "",
        address: normalizedRow.fullAddress || normalizedRow.address || normalizedRow.village || "Local",
        fullAddress: normalizedRow.fullAddress || normalizedRow.address || normalizedRow.village || "Local",
        village: normalizedRow.village || normalizedRow.address || "Local",
        tehsil: normalizedRow.tehsil || "",
        district: normalizedRow.district || "",
        pincode: normalizedRow.pincode || "",
        trackBus: normalizedRow.trackBus || "",
        sponsorshipType: normalizedRow.sponsorshipType || "",
        ssismGroup: normalizedRow.ssismGroup || resolvedDeptName,
        branch: normalizedRow.branch || course,
        course,
        year: studentYear,
        currentYear: studentYear,
        currentSemester: normalizedRow.currentSemester || "",
        batch: normalizedRow.batch || cleanBatchKey || batchYear || "",
        batchYear,
        track: normalizedRow.technology || "",
        technology: normalizedRow.technology || "",
        percent12: normalizedRow.percent12 || "",
        percent10: normalizedRow.percent10 || "",
        year12: normalizedRow.year12 || "",
        subDepartmentId: rowSubDept._id,
        sessionId: rowSessionId,
        currentLevelId: rowLevel._id,
        currentSubLevelId: rowSubLevel._id,
        syllabusVersionId: null,
        withITEG: isNaturallyITEG(course) ? true : Boolean(normalizedRow.withITEG),
        status: "Active"
      };

      validStudentsToInsert.push(newStudentDoc);
    }

    let insertedStudents = [];
    if (validStudentsToInsert.length > 0) {
      insertedStudents = await Student.insertMany(validStudentsToInsert, { ordered: false });

      // Auto-assign tasks if syllabus exists
      if (typeof latestSyllabus !== "undefined" && latestSyllabus) {
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
        sessionName: defaultSession?.name || "Auto-Created",
        subDepartmentName: subDepartmentId ? "Assigned Sub-Department" : "Auto-detected from SSISM Group",
        totalProcessed: rawRows.length
      }
    });

  } catch (error) {
    console.error("Error in importStudentsExcel:", error);
    return res.status(500).json({ success: false, message: "Server error during Excel import", error: error.message });
  }
};


// ✅ Download Sample Excel Template for Students (26 Requested Fields)
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
      { header: "Student ID", key: "studentId", width: 18 },
      { header: "Registration No.", key: "registrationNo", width: 20 },
      { header: "Enrollment no.", key: "enrollmentNo", width: 20 },
      { header: "First Name", key: "firstName", width: 16 },
      { header: "Last Name", key: "lastName", width: 16 },
      { header: "Full Name", key: "fullName", width: 22 },
      { header: "Branch/Course", key: "branchCourse", width: 18 },
      { header: "Current Year", key: "currentYear", width: 16 },
      { header: "Current Semester", key: "currentSemester", width: 18 },
      { header: "Batch", key: "batch", width: 16 },
      { header: "Mobile Number", key: "studentMobile", width: 18 },
      { header: "Father contact Number", key: "fatherContactNumber", width: 22 },
      { header: "email Id", key: "email", width: 25 },
      { header: "father Name", key: "fatherName", width: 22 },
      { header: "gender", key: "gender", width: 12 },
      { header: "category", key: "category", width: 14 },
      { header: "DOB", key: "dob", width: 16 },
      { header: "Aadhar No.", key: "aadharNo", width: 18 },
      { header: "Full Address", key: "fullAddress", width: 30 },
      { header: "Village", key: "village", width: 18 },
      { header: "Tehsil", key: "tehsil", width: 16 },
      { header: "District", key: "district", width: 16 },
      { header: "Pincode", key: "pincode", width: 14 },
      { header: "Track Bus", key: "trackBus", width: 16 },
      { header: "Sponshership Type", key: "sponsorshipType", width: 20 },
      { header: "SSISM Group", key: "ssismGroup", width: 16 },
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
      studentId: "STU2025001",
      registrationNo: "REG20250101",
      enrollmentNo: "ENR20250045",
      firstName: "Rahul",
      lastName: "Sharma",
      fullName: "Rahul Sharma",
      branchCourse: "BCA",
      currentYear: "1st Year",
      currentSemester: "1st Sem",
      batch: "2025-2028",
      studentMobile: "9876543210",
      fatherContactNumber: "9876543211",
      email: "rahul.sharma@ssism.org",
      fatherName: "Suresh Sharma",
      gender: "Male",
      category: "GEN",
      dob: "2004-05-15",
      aadharNo: "123456789012",
      fullAddress: "123 Vijay Nagar, Near Main Market",
      village: "Indore",
      tehsil: "Indore",
      district: "Indore",
      pincode: "452010",
      trackBus: "Route No 12",
      sponsorshipType: "Regular",
      ssismGroup: "ITEG"
    });

    sheet.addRow({
      studentId: "STU2025002",
      registrationNo: "REG20250102",
      enrollmentNo: "ENR20250046",
      firstName: "Priya",
      lastName: "Patel",
      fullName: "Priya Patel",
      branchCourse: "B.Tech",
      currentYear: "2nd Year",
      currentSemester: "3rd Sem",
      batch: "2024-2027",
      studentMobile: "9123456780",
      fatherContactNumber: "9123456781",
      email: "priya.patel@ssism.org",
      fatherName: "Ramesh Patel",
      gender: "Female",
      category: "OBC",
      dob: "2003-11-20",
      aadharNo: "987654321098",
      fullAddress: "45 Navlakha, AB Road",
      village: "Indore",
      tehsil: "Indore",
      district: "Indore",
      pincode: "452001",
      trackBus: "Route No 05",
      sponsorshipType: "Scholarship",
      ssismGroup: "MEG"
    });

    sheet.addRow({
      studentId: "STU2025003",
      registrationNo: "REG20250103",
      enrollmentNo: "ENR20250047",
      firstName: "Aman",
      lastName: "Verma",
      fullName: "Aman Verma",
      branchCourse: "B.Tech",
      currentYear: "1st Year",
      currentSemester: "1st Sem",
      batch: "2025-2029",
      studentMobile: "9812345670",
      fatherContactNumber: "9812345671",
      email: "aman.verma@ssism.org",
      fatherName: "Rajesh Verma",
      gender: "Male",
      category: "GEN",
      dob: "2005-02-14",
      aadharNo: "112233445566",
      fullAddress: "12 MG Road",
      village: "Ujjain",
      tehsil: "Ujjain",
      district: "Ujjain",
      pincode: "456001",
      trackBus: "Route No 01",
      sponsorshipType: "Regular",
      ssismGroup: "BEG"
    });

    sheet.addRow({
      studentId: "STU2025004",
      registrationNo: "REG20250104",
      enrollmentNo: "ENR20250048",
      firstName: "Sneha",
      lastName: "Gupta",
      fullName: "Sneha Gupta",
      branchCourse: "B.Tech",
      currentYear: "3rd Year",
      currentSemester: "5th Sem",
      batch: "2023-2027",
      studentMobile: "9988776655",
      fatherContactNumber: "9988776654",
      email: "sneha.gupta@ssism.org",
      fatherName: "Anil Gupta",
      gender: "Female",
      category: "GEN",
      dob: "2002-09-08",
      aadharNo: "998877665544",
      fullAddress: "78 Palasia",
      village: "Indore",
      tehsil: "Indore",
      district: "Indore",
      pincode: "452001",
      trackBus: "Route No 08",
      sponsorshipType: "Regular",
      ssismGroup: "B.TECH"
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

    guideSheet.addRow({ field: "Student ID", required: "OPTIONAL", desc: "Unique student identifier. If left empty, system auto-generates." });
    guideSheet.addRow({ field: "Registration No.", required: "OPTIONAL", desc: "College/Admission Registration Number." });
    guideSheet.addRow({ field: "Enrollment no.", required: "OPTIONAL", desc: "University Enrollment Number." });
    guideSheet.addRow({ field: "First Name", required: "YES", desc: "Student's given first name." });
    guideSheet.addRow({ field: "Last Name", required: "OPTIONAL", desc: "Student's surname." });
    guideSheet.addRow({ field: "Full Name", required: "OPTIONAL", desc: "Student's complete name (auto-built if left empty)." });
    guideSheet.addRow({ field: "Branch/Course", required: "YES", desc: "Degree / Course (e.g. BCA, B.Tech, MCA, BBA, B.Sc)." });
    guideSheet.addRow({ field: "Current Year", required: "NO", desc: "1st Year, 2nd Year, 3rd Year, or 4th Year (routes student year-wise)." });
    guideSheet.addRow({ field: "Current Semester", required: "NO", desc: "1st Sem, 2nd Sem, 3rd Sem, 4th Sem, 5th Sem, 6th Sem, etc." });
    guideSheet.addRow({ field: "Batch", required: "RECOMMENDED", desc: "Admission Batch Year (e.g. 2024, 2025, 2026). Session is automatically created." });
    guideSheet.addRow({ field: "Mobile Number", required: "YES", desc: "10-digit mobile number of student." });
    guideSheet.addRow({ field: "Father contact Number", required: "NO", desc: "10-digit contact number of father or parent." });
    guideSheet.addRow({ field: "email Id", required: "NO", desc: "Student email address." });
    guideSheet.addRow({ field: "father Name", required: "NO", desc: "Father or guardian's full name." });
    guideSheet.addRow({ field: "gender", required: "NO", desc: "Male, Female, or Other." });
    guideSheet.addRow({ field: "category", required: "NO", desc: "GEN, OBC, SC, ST, etc." });
    guideSheet.addRow({ field: "DOB", required: "NO", desc: "Date of Birth (YYYY-MM-DD or DD/MM/YYYY)." });
    guideSheet.addRow({ field: "Aadhar No.", required: "NO", desc: "12-digit Aadhar card number." });
    guideSheet.addRow({ field: "Full Address", required: "NO", desc: "Full residential address." });
    guideSheet.addRow({ field: "Village", required: "NO", desc: "Village or city name." });
    guideSheet.addRow({ field: "Tehsil", required: "NO", desc: "Tehsil / Taluka name." });
    guideSheet.addRow({ field: "District", required: "NO", desc: "District name." });
    guideSheet.addRow({ field: "Pincode", required: "NO", desc: "6-digit postal pincode." });
    guideSheet.addRow({ field: "Track Bus", required: "NO", desc: "Bus route name or bus number." });
    guideSheet.addRow({ field: "Sponshership Type", required: "NO", desc: "Regular, Scholarship, Management, TFW, etc." });
    guideSheet.addRow({ field: "SSISM Group", required: "RECOMMENDED", desc: "Department Name / Code (e.g. ITEG, MEG, BEG, B.TECH). Routes data to respective department!" });

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
    const { sessionId, currentLevelId, currentSubLevelId, status, subDepartmentId, year, isFTP, ftpDomain } = req.query;

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
    if (currentLevelId && mongoose.Types.ObjectId.isValid(currentLevelId)) {
      andConditions.push({ currentLevelId });
    }
    if (currentSubLevelId) {
      if (Array.isArray(currentSubLevelId)) {
        const validIds = currentSubLevelId.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length > 0) andConditions.push({ currentSubLevelId: { $in: validIds } });
      } else if (typeof currentSubLevelId === "string" && currentSubLevelId.includes(",")) {
        const validIds = currentSubLevelId.split(",").filter(id => mongoose.Types.ObjectId.isValid(id.trim()));
        if (validIds.length > 0) andConditions.push({ currentSubLevelId: { $in: validIds } });
      } else if (mongoose.Types.ObjectId.isValid(currentSubLevelId)) {
        andConditions.push({ currentSubLevelId });
      }
    }
    if (year) andConditions.push({ year });
    if (isFTP !== undefined) {
      andConditions.push({ isFTP: isFTP === "true" || isFTP === true });
    }
    if (ftpDomain) {
      andConditions.push({ ftpDomain });
    }
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
      "studentId", "registrationNo", "enrollmentNo", "firstName", "lastName", "fullName",
      "branch", "course", "currentYear", "year", "currentSemester", "batch", "batchYear",
      "studentMobile", "fatherContactNumber", "parentMobile", "email", "fatherName",
      "gender", "category", "dob", "dobString", "aadharNo", "aadharCard",
      "fullAddress", "address", "village", "tehsil", "district", "pincode",
      "trackBus", "sponsorshipType", "ssismGroup", "track", "techno", "technology",
      "status", "isFTP", "ftpDomain", "domain", "withITEG", "percent12", "percent10", "year12"
    ];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    // Sync names
    if (updateData.firstName && updateData.lastName && !updateData.fullName) {
      updateData.fullName = `${updateData.firstName} ${updateData.lastName}`.trim();
    }

    if (updateData.studentMobile !== undefined) {
      const clean = String(updateData.studentMobile).trim();
      if (!/^[0-9]{10}$/.test(clean)) {
        return res.status(400).json({ message: "Student mobile number must be exactly 10 digits" });
      }
      updateData.studentMobile = clean;
    }

    if (updateData.fatherContactNumber !== undefined || updateData.parentMobile !== undefined) {
      const clean = String(updateData.fatherContactNumber || updateData.parentMobile || "").trim();
      if (clean && !/^[0-9]{10}$/.test(clean)) {
        return res.status(400).json({ message: "Father / Parent contact number must be exactly 10 digits" });
      }
      if (clean) {
        updateData.parentMobile = clean;
        updateData.fatherContactNumber = clean;
      }
    }

    if (updateData.email !== undefined) {
      const clean = String(updateData.email).trim().toLowerCase();
      if (clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return res.status(400).json({ message: "Student email must be a valid email address (e.g. name@ssism.org or name@gmail.com)" });
      }
      updateData.email = clean;
    }

    if (updateData.dob !== undefined) {
      updateData.dob = parseDOB(updateData.dob);
      updateData.dobString = req.body.dobString || (req.body.dob ? String(req.body.dob) : "");
    }

    if (updateData.fullAddress !== undefined) {
      updateData.address = updateData.fullAddress;
    } else if (updateData.address !== undefined) {
      updateData.fullAddress = updateData.address;
    }

    if (updateData.aadharNo !== undefined) {
      updateData.aadharCard = updateData.aadharNo;
    } else if (updateData.aadharCard !== undefined) {
      updateData.aadharNo = updateData.aadharCard;
    }

    if (updateData.currentYear !== undefined) {
      updateData.year = updateData.currentYear;
    } else if (updateData.year !== undefined) {
      updateData.currentYear = updateData.year;
    }

    if (updateData.batch !== undefined) {
      updateData.batchYear = updateData.batch;
    } else if (updateData.batchYear !== undefined) {
      updateData.batch = updateData.batchYear;
    }

    if (updateData.branch !== undefined && !updateData.course) {
      updateData.course = updateData.branch;
    }

    if (updateData.studentId !== undefined && !existingStudent.prkey) {
      updateData.prkey = updateData.studentId;
    }

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
      updateData.batch = updateData.batchYear;
    }

    if (updateData.status && updateData.status !== "Dummy") {
      updateData.dummyDetails = null;
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
      filter.$or = [{ subLevelId }, { isExtra: true }, { isGeneralTask: true }];
    } else {
      const orConditions = [{ isExtra: true }, { isGeneralTask: true }];
      if (student.currentSubLevelId) {
        orConditions.push({ subLevelId: student.currentSubLevelId });
      }
      if (student.syllabusVersionId) {
        orConditions.push({ syllabusVersionId: student.syllabusVersionId });
      }
      filter.$or = orConditions;
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
