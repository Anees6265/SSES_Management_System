import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2,
  Users,
  ChevronRight,
  Info
} from "lucide-react";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { 
  useGetAllSubdepartmentsQuery, 
  useGetAllSessionsQuery,
  useCreateNewStudentMutation,
  useImportStudentsExcelMutation
} from "../../../redux/api/authApi";
import InputField from "../../shared/form-fields/InputField";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import Loader from "../../shared/loader/Loader";

const manualStudentValidationSchema = Yup.object({
  prkey: Yup.string().nullable(),
  password: Yup.string().min(6, "Password must be at least 6 characters").nullable(),
  firstName: Yup.string().required("First Name is required"),
  lastName: Yup.string().required("Last Name is required"),
  fatherName: Yup.string().required("Father's Name is required"),
  studentMobile: Yup.string()
    .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
    .required("Student Mobile is required"),
  parentMobile: Yup.string()
    .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
    .nullable(),
  email: Yup.string().email("Invalid email address").nullable(),
  course: Yup.string().required("Course is required"),
  subDepartmentId: Yup.string().required("Sub-Department is required"),
  sessionId: Yup.string().required("Academic Session is required"),
  year: Yup.string().required("Academic Year is required"),
  gender: Yup.string(),
  address: Yup.string(),
  village: Yup.string(),
  category: Yup.string(),
  technology: Yup.string(),
});

const normalizeKey = (k) => String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const isNaturallyITEG = (c) => {
  const s = String(c || "").trim().toLowerCase();
  return s.includes("bca") || s.includes("diploma");
};

const AddStudentModal = ({ isOpen, onClose, defaultSubDepartmentId, onStudentAdded }) => {
  const [activeTab, setActiveTab] = useState("excel"); // "excel" | "manual"
  const [selectedSubDeptId, setSelectedSubDeptId] = useState(defaultSubDepartmentId || "");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    if (defaultSubDepartmentId) {
      setSelectedSubDeptId(defaultSubDepartmentId);
    } else {
      setSelectedSubDeptId("");
    }
  }, [defaultSubDepartmentId, isOpen]);
  
  // Excel File State
  const [excelFile, setExcelFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationStats, setValidationStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);

  // Queries
  const { data: subDeptsRes = {}, isLoading: isLoadingSubDepts } = useGetAllSubdepartmentsQuery();
  const subDepartments = subDeptsRes.data || [];

  const { data: sessionsRes = {}, isLoading: isLoadingSessions } = useGetAllSessionsQuery(true);
  const sessions = sessionsRes.data || [];

  // Mutations
  const [createNewStudent, { isLoading: isCreatingManual }] = useCreateNewStudentMutation();
  const [importStudentsExcel, { isLoading: isImportingExcel }] = useImportStudentsExcelMutation();

  // Selected subdepartment object
  const currentSubDept = useMemo(() => {
    const targetId = selectedSubDeptId || defaultSubDepartmentId;
    if (!targetId) return null;
    return subDepartments.find(sd => sd._id === targetId) || null;
  }, [subDepartments, selectedSubDeptId, defaultSubDepartmentId]);

  // Allowed courses for the selected subdepartment
  const allowedCourses = useMemo(() => {
    if (!currentSubDept) return [];
    if (currentSubDept.allowedCourses && currentSubDept.allowedCourses.length > 0) {
      return currentSubDept.allowedCourses;
    }
    const deptCourses = currentSubDept.departmentId?.allowedCourses || [];
    return deptCourses.map(c => c.courseName).filter(Boolean);
  }, [currentSubDept]);

  // Active session fallback
  const activeSessionId = useMemo(() => {
    if (selectedSessionId) return selectedSessionId;
    const active = sessions.find(s => s.isActive) || sessions[0];
    return active?._id || "";
  }, [sessions, selectedSessionId]);

  // Active year calculation and smart fallback based on session
  const activeYear = useMemo(() => {
    if (selectedYear) return selectedYear;
    const s = sessions.find(sess => sess._id === activeSessionId);
    const name = s?.name || "";
    if (name.includes("2024")) return "3rd Year";
    if (name.includes("2025")) return "2nd Year";
    if (name.includes("2026")) return "1st Year";
    if (name.includes("2023")) return "4th Year";
    return "1st Year";
  }, [selectedYear, sessions, activeSessionId]);

  const handleSessionChange = (newSessionId) => {
    setSelectedSessionId(newSessionId);
    const s = sessions.find(sess => sess._id === newSessionId);
    const name = s?.name || "";
    if (name.includes("2024")) setSelectedYear("3rd Year");
    else if (name.includes("2025")) setSelectedYear("2nd Year");
    else if (name.includes("2026")) setSelectedYear("1st Year");
    else if (name.includes("2023")) setSelectedYear("4th Year");
    else setSelectedYear("1st Year");
  };

  if (!isOpen) return null;

  // ── Download Sample Excel Template ──────────────────────────
  const handleDownloadSample = () => {
    try {
      const coursesList = allowedCourses.length > 0 ? allowedCourses : ["BCA", "B.Tech", "MCA", "BBA"];
      const deptName = currentSubDept?.name || "Department";

      const sampleData = [
        [
          "PR Key / Roll No (Optional)",
          "Password (Default: ssism@123)",
          "First Name*",
          "Last Name*",
          "Father Name*",
          "Student Mobile*",
          "Parent Mobile",
          "Course*",
          "Academic Year (1st Year / 2nd Year / 3rd Year)",
          "Gender",
          "Email",
          "Address",
          "Village/City",
          "Aadhar Card",
          "Category",
          "12th Percentage",
          "10th Percentage"
        ],
        [
          "0827CS241001",
          "Student@123",
          "Rahul",
          "Sharma",
          "Suresh Sharma",
          "9876543210",
          "9876543211",
          coursesList[0] || "BCA",
          "2nd Year",
          "Male",
          "rahul.sharma@example.com",
          "123 Vijay Nagar",
          "Indore",
          "123456789012",
          "GEN",
          "82.5%",
          "88.0%"
        ],
        [
          "",
          "",
          "Priya",
          "Patel",
          "Ramesh Patel",
          "9123456780",
          "9123456781",
          coursesList[1] || coursesList[0] || "B.Tech",
          "3rd Year",
          "Female",
          "priya.patel@example.com",
          "45 Navlakha",
          "Indore",
          "987654321098",
          "OBC",
          "85.0%",
          "90.2%"
        ]
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      ws["!cols"] = [
        { wch: 25 }, // PR Key / Roll No
        { wch: 25 }, // Password
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 22 }, // Father Name
        { wch: 18 }, // Student Mobile
        { wch: 18 }, // Parent Mobile
        { wch: 15 }, // Course
        { wch: 12 }, // Gender
        { wch: 25 }, // Email
        { wch: 25 }, // Address
        { wch: 16 }, // Village/City
        { wch: 18 }, // Aadhar
        { wch: 12 }, // Category
        { wch: 16 }, // 12th %
        { wch: 16 }, // 10th %
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Students");

      const guidelines = [
        ["STUDENT IMPORT & PORTAL LOGIN GUIDELINES"],
        [""],
        ["Columns marked with (*) are MANDATORY:"],
        ["1. First Name*     : Given name of the student."],
        ["2. Last Name*      : Surname of the student."],
        ["3. Father Name*    : Father or guardian's full name."],
        ["4. Student Mobile* : 10-digit mobile phone number (can also be used for login)."],
        [`5. Course*         : Must match department courses: [ ${coursesList.join(", ")} ]`],
        [""],
        ["LOGIN CREDENTIALS & SPECIAL OPTIONS:"],
        ["- PR Key / Roll No : (OPTIONAL) You can enter College Roll No, University Enrollment No,"],
        ["                     Scholar No, or leave BLANK. If blank, system will auto-generate a unique PR Key."],
        ["- Password          : (OPTIONAL) Initial password for student portal login."],
        ["                     If left blank, default password 'ssism@123' will be assigned."],
        ["- Student Login     : Students can log in at the portal using:"],
        ["                     (1) PR Key / Roll Number, OR"],
        ["                     (2) 10-digit Student Mobile Number, OR"],
        ["                     (3) Student Email,"],
        ["                     along with their set password."],
        [""],
        ["- Optional Columns:"],
        ["- Parent Mobile     : Defaults to Student Mobile if left empty."],
        ["- Address & Village : Defaults to 'Local' if left empty."],
        ["- Gender, Email, Aadhar Card, Category, 12th/10th Percentage"],
        [""],
        ["Department: " + deptName],
        ["Allowed Courses: " + coursesList.join(", ")]
      ];

      const wsGuide = XLSX.utils.aoa_to_sheet(guidelines);
      wsGuide["!cols"] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsGuide, "Guidelines");

      const safeName = deptName.replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `Student_Import_Template_${safeName}.xlsx`);
      toast.info("Sample template downloaded. Fill student records and upload.");
    } catch (err) {
      console.error("Download sample error:", err);
      toast.error("Failed to generate sample template");
    }
  };

  // ── Parse Excel File in Browser ─────────────────────────────
  const processExcelFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Please select a valid Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setExcelFile(file);
    setIsParsing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          toast.warning("The selected file contains no data rows");
          setParsedRows([]);
          setValidationStats({ total: 0, valid: 0, errors: 0 });
          setIsParsing(false);
          return;
        }

        // Validate each row
        const seenPrkeys = new Set();
        let validCount = 0;
        let errorCount = 0;

        const processed = rawJson.map((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          const normalized = {};

          for (const [key, val] of Object.entries(row)) {
            const nk = normalizeKey(key);
            if (["prkey", "rollno", "enrollmentno", "prn", "studentid", "scholarno", "admissionno"].includes(nk)) normalized.prkey = val;
            else if (["password", "pass", "pwd", "userpassword"].includes(nk)) normalized.password = val;
            else if (["firstname", "first", "fname"].includes(nk)) normalized.firstName = val;
            else if (["lastname", "last", "lname", "surname"].includes(nk)) normalized.lastName = val;
            else if (["fullname", "name", "studentname"].includes(nk)) normalized.fullName = val;
            else if (["fathername", "father", "guardianname"].includes(nk)) normalized.fatherName = val;
            else if (["studentmobile", "mobile", "mobileno", "phoneno", "contact", "studentphone"].includes(nk)) normalized.studentMobile = val;
            else if (["parentmobile", "fatherphone", "fathermobile", "parentphone", "guardianmobile"].includes(nk)) normalized.parentMobile = val;
            else if (["course", "degree", "branch", "stream"].includes(nk)) normalized.course = val;
            else if (["gender", "sex"].includes(nk)) normalized.gender = val;
            else if (["email", "emailid"].includes(nk)) normalized.email = val;
            else if (["address", "residentialaddress"].includes(nk)) normalized.address = val;
            else if (["village", "city", "town"].includes(nk)) normalized.village = val;
            else if (["aadhar", "aadharcard", "aadharno"].includes(nk)) normalized.aadharCard = val;
            else if (["category", "caste"].includes(nk)) normalized.category = val;
            else if (["track", "techno", "technology"].includes(nk)) normalized.technology = val;
            else if (["percent12", "12thpercent", "12percentage", "12thpercentage"].includes(nk)) normalized.percent12 = val;
            else if (["percent10", "10thpercent", "10percentage", "10thpercentage"].includes(nk)) normalized.percent10 = val;
            else if (["year12", "12thyear", "12passoutyear"].includes(nk)) normalized.year12 = val;
            else if (["year", "academicyear", "currentyear", "classyear"].includes(nk)) normalized.year = val;
            else if (["withiteg", "iteg", "with_iteg", "isiteg"].includes(nk)) {
              const v = String(val || "").toLowerCase().trim();
              normalized.withITEG = ["yes", "y", "true", "1", "iteg", "with iteg"].includes(v);
            }
          }

          if (!normalized.firstName && normalized.fullName) {
            const parts = String(normalized.fullName).trim().split(/\s+/);
            normalized.firstName = parts[0] || "";
            normalized.lastName = parts.slice(1).join(" ") || parts[0];
          }

          const prkey = String(normalized.prkey || "").trim();
          const rawPassword = String(normalized.password || "").trim();
          const firstName = String(normalized.firstName || "").trim();
          const lastName = String(normalized.lastName || "").trim() || firstName;
          const fatherName = String(normalized.fatherName || "").trim();
          const studentMobile = String(normalized.studentMobile || "").trim();
          const course = String(normalized.course || "").trim() || allowedCourses[0] || "General";

          const missing = [];
          // PR Key is optional (auto-generated if empty)
          if (!firstName) missing.push("First Name");
          if (!fatherName) missing.push("Father Name");
          if (!studentMobile) missing.push("Mobile");

          const lowerPr = prkey ? prkey.toLowerCase() : "";
          let isDuplicateInFile = false;
          if (lowerPr && seenPrkeys.has(lowerPr)) {
            isDuplicateInFile = true;
          } else if (lowerPr) {
            seenPrkeys.add(lowerPr);
          }

          let isValid = missing.length === 0 && !isDuplicateInFile;
          if (isValid) validCount++;
          else errorCount++;

          let errorMsg = "";
          if (missing.length > 0) errorMsg = `Missing: ${missing.join(", ")}`;
          else if (isDuplicateInFile) errorMsg = "Duplicate PR Key in file";

          return {
            _rowNumber: rowNum,
            prkey: prkey || "(Auto)",
            rawPrkey: prkey,
            password: rawPassword ? rawPassword : "ssism@123 (Default)",
            rawPassword: rawPassword,
            firstName,
            lastName,
            fatherName,
            studentMobile,
            parentMobile: normalized.parentMobile || studentMobile,
            course,
            year: normalized.year || selectedYear || "1st Year",
            gender: normalized.gender || "Other",
            address: normalized.address || normalized.village || "Local",
            village: normalized.village || normalized.address || "Local",
            email: normalized.email || "",
            technology: normalized.technology || "",
            aadharCard: normalized.aadharCard || "",
            category: normalized.category || "",
            percent12: normalized.percent12 || "",
            percent10: normalized.percent10 || "",
            withITEG: isNaturallyITEG(course) ? true : Boolean(normalized.withITEG),
            isValid,
            errorMsg
          };
        });

        setParsedRows(processed);
        setValidationStats({
          total: processed.length,
          valid: validCount,
          errors: errorCount
        });
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Failed to read Excel file. Please ensure it is not corrupted.");
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setExcelFile(null);
    setParsedRows([]);
    setValidationStats({ total: 0, valid: 0, errors: 0 });
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit Excel Import ─────────────────────────────────────
  const handleSubmitImport = async () => {
    const targetSubDeptId = selectedSubDeptId || defaultSubDepartmentId;
    if (!targetSubDeptId) {
      toast.error("Please select a sub-department");
      return;
    }
    if (!activeSessionId) {
      toast.error("Please select an academic session");
      return;
    }
    if (!excelFile && parsedRows.length === 0) {
      toast.error("Please upload an Excel file first");
      return;
    }

    try {
      let res;
      if (excelFile) {
        const formData = new FormData();
        formData.append("file", excelFile);
        formData.append("subDepartmentId", targetSubDeptId);
        formData.append("sessionId", activeSessionId);
        formData.append("year", activeYear);
        if (parsedRows && parsedRows.length > 0) {
          formData.append("students", JSON.stringify(parsedRows));
        }
        res = await importStudentsExcel(formData).unwrap();
      } else {
        res = await importStudentsExcel({
          subDepartmentId: targetSubDeptId,
          sessionId: activeSessionId,
          year: activeYear,
          students: parsedRows
        }).unwrap();
      }

      setImportResult(res);
      toast.success(res.message || "Students processed successfully!");
      if (onStudentAdded) onStudentAdded();
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to import students");
    }
  };

  // ── Submit Single Student Manual Form ───────────────────────
  const handleManualSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const finalPayload = {
        ...values,
        withITEG: isNaturallyITEG(values.course) ? true : Boolean(values.withITEG)
      };
      await createNewStudent(finalPayload).unwrap();
      toast.success(`Student ${values.firstName} ${values.lastName} added successfully!`);
      resetForm();
      if (onStudentAdded) onStudentAdded();
      onClose();
    } catch (err) {
      console.error("Manual create error:", err);
      toast.error(err?.data?.message || "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center font-bold shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                Add Students to Department
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {currentSubDept?.name ? `Target: ${currentSubDept.name}` : "Bulk import via Excel or add single student"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-150 bg-gray-50/70 px-5 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === "excel"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Excel Bulk Import</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === "manual"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <UserPlus size={16} />
            <span>Manual Single Entry</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Sub-Department, Session and Year Selectors (Common Context) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Sub-Department <span className="text-orange-500">*</span>
              </label>
              <select
                value={selectedSubDeptId || defaultSubDepartmentId || ""}
                onChange={(e) => {
                  setSelectedSubDeptId(e.target.value);
                  handleClearFile();
                }}
                disabled={Boolean(defaultSubDepartmentId)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs sm:text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-2xs"
              >
                <option value="">Select Sub Department</option>
                {subDepartments.map((sd) => (
                  <option key={sd._id} value={sd._id}>
                    {sd.name} ({sd.departmentId?.name || "Dept"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Academic Session <span className="text-orange-500">*</span>
              </label>
              <select
                value={activeSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs sm:text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
              >
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Academic Year <span className="text-orange-500">*</span>
              </label>
              <select
                value={activeYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs sm:text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          {/* ═══════════ TAB 1: EXCEL BULK IMPORT ═══════════ */}
          {activeTab === "excel" && (
            <div className="space-y-4">
              {/* Information Callout Banner for Login & PR Key */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-slate-700">
                    <p className="font-bold text-blue-950 text-xs sm:text-sm">
                      Login Credentials & PR Key Info:
                    </p>
                    <ul className="text-[11px] sm:text-xs text-slate-600 space-y-1 list-disc list-inside">
                      <li>
                        <b>PR Key / Roll No:</b> Aap Student ka <b>College Roll No</b>, <b>University Enrollment No</b>, ya <b>Scholar No</b> bhej sakte hain. Agar khali chodenge to system automatically unique ID generate kar dega.
                      </li>
                      <li>
                        <b>Password:</b> Excel sheet me 'Password' column me password de sakte hain. Agar khali rakhenge to default password <code className="bg-blue-150/70 text-blue-900 px-1 py-0.5 rounded font-mono font-bold">ssism@123</code> set ho jayega.
                      </li>
                      <li>
                        <b>Student Portal Login:</b> Students apne <b>PR Key / Roll No</b>, <b>Mobile Number</b>, ya <b>Email</b> kisi se bhi login kar sakte hain.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 1: Download Sample Template */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-orange-50/60 border border-orange-200/80 rounded-2xl p-4">
                <div className="flex items-start gap-2.5">
                  <FileSpreadsheet size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                      Step 1: Download Sample Excel Template
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Pre-configured with <span className="font-bold text-orange-600">Password</span> and optional <span className="font-bold text-orange-600">PR Key</span> columns for{" "}
                      <span className="font-bold text-gray-800">{currentSubDept?.name || "this department"}</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-2 h-9 px-3.5 bg-white hover:bg-orange-500 hover:text-white text-orange-600 border border-orange-300 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Download size={15} />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Drag & Drop Zone */}
              {!excelFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? "border-orange-500 bg-orange-50/50 scale-[0.99]"
                      : "border-gray-250 bg-gray-50/50 hover:bg-slate-50 hover:border-orange-300"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => e.target.files && processExcelFile(e.target.files[0])}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-800">
                      Drag & Drop your Excel or CSV file here, or <span className="text-orange-600 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium mt-1">
                      Supports .xlsx, .xls, .csv files up to 25 MB
                    </p>
                  </div>
                </div>
              ) : (
                /* Selected File Card & Stats */
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{excelFile.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                          {(excelFile.size / 1024).toFixed(1)} KB • {parsedRows.length} rows read
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Validation Stats Pills */}
                  {validationStats.total > 0 && (
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Rows</p>
                        <p className="text-base sm:text-lg font-black text-gray-800 mt-0.5">{validationStats.total}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Valid Rows</p>
                        <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">{validationStats.valid}</p>
                      </div>
                      <div className={`rounded-xl p-2.5 text-center border ${
                        validationStats.errors > 0
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      }`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider">Errors / Missing</p>
                        <p className="text-base sm:text-lg font-black mt-0.5">{validationStats.errors}</p>
                      </div>
                    </div>
                  )}

                  {/* In-Browser Preview Table */}
                  {parsedRows.length > 0 && (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Data Preview (First {Math.min(parsedRows.length, 10)} of {parsedRows.length} rows)
                        </span>
                        <span className="text-[11px] text-gray-400 font-semibold">
                          Students will be enrolled in Level 1 • SubLevel 1A
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-100/80 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Row</th>
                              <th className="px-3 py-2">PR Key / Roll No</th>
                              <th className="px-3 py-2">Student Name</th>
                              <th className="px-3 py-2">Mobile (Login)</th>
                              <th className="px-3 py-2">Password</th>
                              <th className="px-3 py-2">Course</th>
                              <th className="px-3 py-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {parsedRows.slice(0, 10).map((r) => (
                              <tr key={r._rowNumber} className={r.isValid ? "hover:bg-gray-50" : "bg-rose-50/50"}>
                                <td className="px-3 py-2 font-mono text-gray-400">#{r._rowNumber}</td>
                                <td className="px-3 py-2 font-mono font-bold text-gray-900">
                                  {r.prkey.startsWith("(") ? (
                                    <span className="text-[11px] text-orange-600 font-semibold italic">{r.prkey}</span>
                                  ) : (
                                    r.prkey
                                  )}
                                </td>
                                <td className="px-3 py-2 font-semibold text-gray-800">{r.firstName} {r.lastName}</td>
                                <td className="px-3 py-2 font-mono text-gray-600">{r.studentMobile || "—"}</td>
                                <td className="px-3 py-2 font-mono text-gray-500 text-[11px]">
                                  {r.password.includes("(Default)") ? (
                                    <span className="text-gray-400">{r.password}</span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold font-mono">•••• ({r.password})</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                      {r.course}
                                    </span>
                                    {r.withITEG && !isNaturallyITEG(r.course) && (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200 shadow-2xs">
                                        + ITEG
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {r.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                      <CheckCircle2 size={13} /> Ready
                                    </span>
                                  ) : (
                                    <span 
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 truncate max-w-[140px]"
                                      title={r.errorMsg}
                                    >
                                      <AlertCircle size={13} /> {r.errorMsg}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Post-Import Results Card */}
                  {importResult && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>{importResult.message}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-emerald-700">
                        <span>Imported: <b>{importResult.summary?.imported || 0}</b></span>
                        <span>•</span>
                        <span>Skipped Duplicates: <b>{importResult.summary?.skipped || 0}</b></span>
                        {importResult.summary?.errors > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">Errors: {importResult.summary?.errors}</span>
                          </>
                        )}
                      </div>

                      {importResult.skippedDetails?.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-emerald-200/60 max-h-28 overflow-y-auto">
                          <p className="font-bold text-gray-700 mb-1">Skipped Details:</p>
                          {importResult.skippedDetails.map((sk, idx) => (
                            <div key={idx} className="text-[11px] text-gray-500 py-0.5">
                              • Row #{sk.row} (PR: {sk.prkey}): {sk.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB 2: MANUAL SINGLE ENTRY ═══════════ */}
          {activeTab === "manual" && (
            <Formik
              initialValues={{
                prkey: "",
                password: "",
                withITEG: isNaturallyITEG(allowedCourses[0] || ""),
                firstName: "",
                lastName: "",
                fatherName: "",
                email: "",
                studentMobile: "",
                parentMobile: "",
                course: allowedCourses.length === 1 ? allowedCourses[0] : "",
                subDepartmentId: selectedSubDeptId || defaultSubDepartmentId || "",
                sessionId: activeSessionId,
                year: activeYear,
                gender: "Male",
                address: "",
                village: "",
                category: "GEN",
                technology: "",
              }}
              validationSchema={manualStudentValidationSchema}
              onSubmit={handleManualSubmit}
              enableReinitialize
            >
              {({ values, setFieldValue, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <InputField
                      label="PR Key / Roll No / Enrollment No (Optional)"
                      name="prkey"
                      placeholder="e.g. 0827CS241001 (auto-generated if empty)"
                    />

                    <InputField
                      label="Portal Password (Optional)"
                      name="password"
                      type="password"
                      placeholder="Default: ssism@123"
                    />

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Course *
                      </label>
                      <select
                        name="course"
                        value={values.course}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFieldValue("course", val);
                          if (isNaturallyITEG(val)) {
                            setFieldValue("withITEG", true);
                          }
                        }}
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs sm:text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="">{allowedCourses.length === 0 ? "Select Sub Department first" : "Select Course"}</option>
                        {allowedCourses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Academic Year *
                      </label>
                      <select
                        name="year"
                        value={values.year || activeYear}
                        onChange={(e) => {
                          setFieldValue("year", e.target.value);
                          setSelectedYear(e.target.value);
                        }}
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs sm:text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>

                    <InputField
                      label="First Name *"
                      name="firstName"
                      placeholder="e.g. Rahul"
                    />

                    <InputField
                      label="Last Name *"
                      name="lastName"
                      placeholder="e.g. Sharma"
                    />

                    <InputField
                      label="Father's Name *"
                      name="fatherName"
                      placeholder="e.g. Suresh Sharma"
                    />

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={values.gender}
                        onChange={(e) => setFieldValue("gender", e.target.value)}
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs sm:text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <InputField
                      label="Student Mobile (Login ID) *"
                      name="studentMobile"
                      placeholder="10-digit mobile number"
                    />

                    <InputField
                      label="Student Email (Login ID)"
                      name="email"
                      type="email"
                      placeholder="e.g. rahul@example.com"
                    />

                    <InputField
                      label="Parent Mobile"
                      name="parentMobile"
                      placeholder="Optional, defaults to student's"
                    />

                    <InputField
                      label="City / Village"
                      name="village"
                      placeholder="e.g. Indore"
                    />

                    <InputField
                      label="Address"
                      name="address"
                      placeholder="e.g. Vijay Nagar, Indore"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-150">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isCreatingManual}
                      className="px-5 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting || isCreatingManual ? "Adding Student..." : "Add Student"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </div>

        {/* Modal Footer (for Excel Tab) */}
        {activeTab === "excel" && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-gray-150 bg-gray-50/70 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-xl transition cursor-pointer"
            >
              {importResult ? "Close" : "Cancel"}
            </button>

            <button
              type="button"
              disabled={isImportingExcel || parsedRows.length === 0 || validationStats.valid === 0}
              onClick={handleSubmitImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImportingExcel ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing Students...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>
                    Import {validationStats.valid > 0 ? `${validationStats.valid} Students` : "from Excel"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddStudentModal;
