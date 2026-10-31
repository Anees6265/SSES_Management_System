import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Clean string helper
 */
const safeStr = (val, fallback = "—") => {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s.length > 0 ? s : fallback;
};

/**
 * Export selected students to Excel (.xlsx)
 */
export const exportStudentsToExcel = (students = [], options = {}) => {
  if (!students || students.length === 0) return;

  const defaultFilename = `students_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const filename = options.filename || defaultFilename;

  const data = students.map((s, idx) => {
    const courseUpper = (s.course || "").toUpperCase();
    const courseWithIteg =
      s.withITEG &&
      !courseUpper.includes("ITEG") &&
      !courseUpper.includes("BCA") &&
      !courseUpper.includes("DIPLOMA")
        ? `${courseUpper} (+ ITEG)`
        : courseUpper;

    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.fullName || "—";
    const levelName = s.currentSubLevelId?.name || s.currentLevelId?.name || "—";
    const domain = s.ftpDomain || s.domain || (s.track && s.track !== "Technology Not Updated" ? s.track : "—");

    return {
      "S.No.": idx + 1,
      "Student Name": fullName,
      "PR Key": safeStr(s.prkey),
      "Student ID / Reg No": safeStr(s.studentId || s.registrationNo || s.enrollmentNo),
      "Father's Name": safeStr(s.fatherName),
      "Mobile": safeStr(s.studentMobile),
      "Course": safeStr(courseWithIteg),
      "Year": safeStr(s.year, "1st Year"),
      "Level": safeStr(levelName),
      "Status": safeStr(s.status, "Active"),
      "UI/UX Student": s.isUIUX ? "Yes" : "No",
      "FTP Student": s.isFTP ? "Yes" : "No",
      "Domain": safeStr(domain),
      "Session": safeStr(s.sessionId?.name),
      "District": safeStr(s.district),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths for clean readability
  ws["!cols"] = [
    { wch: 7 },  // S.No.
    { wch: 22 }, // Student Name
    { wch: 14 }, // PR Key
    { wch: 18 }, // Student ID / Reg No
    { wch: 20 }, // Father's Name
    { wch: 14 }, // Mobile
    { wch: 16 }, // Course
    { wch: 12 }, // Year
    { wch: 10 }, // Level
    { wch: 12 }, // Status
    { wch: 12 }, // FTP Student
    { wch: 22 }, // Domain
    { wch: 16 }, // Session
    { wch: 14 }, // District
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, filename);
};

/**
 * Export selected students to PDF (.pdf)
 */
export const exportStudentsToPDF = (students = [], options = {}) => {
  if (!students || students.length === 0) return;

  const defaultFilename = `students_export_${new Date().toISOString().slice(0, 10)}.pdf`;
  const filename = options.filename || defaultFilename;
  const title = options.title || "Student Progress Information Report";
  const subTitle = options.subTitle || "";

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Header Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(249, 115, 22); // Orange #F97316
  doc.text("SANT SINGAJI EDUCATIONAL SOCIETY", 14, 12);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(title, 14, 18);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // Slate-500
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const subMeta = subTitle ? `${subTitle}  |  ` : "";
  doc.text(`${subMeta}Total Students: ${students.length}  |  Generated on: ${dateStr}`, 14, 23);

  const head = [
    [
      "S.No.",
      "Student Name",
      "PR Key",
      "Father's Name",
      "Mobile",
      "Course",
      "Year / Level",
      "Status",
      "FTP",
      "Domain",
      "Session",
    ],
  ];

  const body = students.map((s, idx) => {
    const courseUpper = (s.course || "").toUpperCase();
    const courseText =
      s.withITEG &&
      !courseUpper.includes("ITEG") &&
      !courseUpper.includes("BCA") &&
      !courseUpper.includes("DIPLOMA")
        ? `${courseUpper} (+ITEG)`
        : courseUpper;
    const yearLevel = `${s.year || "1st Year"} / ${s.currentSubLevelId?.name || s.currentLevelId?.name || "—"}`;
    const domainText = s.ftpDomain || s.domain || (s.track && s.track !== "Technology Not Updated" ? s.track : "—");
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.fullName || "—";

    return [
      idx + 1,
      fullName,
      safeStr(s.prkey),
      safeStr(s.fatherName),
      safeStr(s.studentMobile),
      safeStr(courseText),
      yearLevel,
      safeStr(s.status, "Active"),
      s.isFTP ? "Yes" : "No",
      safeStr(domainText),
      safeStr(s.sessionId?.name),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 26,
    margin: { left: 10, right: 10, bottom: 12 },
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [249, 115, 22], // Primary Orange
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" }, // S.No.
      1: { cellWidth: 40 }, // Name
      2: { cellWidth: 20 }, // PR Key
      3: { cellWidth: 32 }, // Father
      4: { cellWidth: 24, halign: "center" }, // Mobile
      5: { cellWidth: 26 }, // Course
      6: { cellWidth: 26, halign: "center" }, // Year/Level
      7: { cellWidth: 20, halign: "center" }, // Status
      8: { cellWidth: 14, halign: "center" }, // FTP
      9: { cellWidth: 35 }, // Domain
      10: { cellWidth: 28, halign: "center" }, // Session
    },
    alternateRowStyles: {
      fillColor: [255, 248, 243], // Very subtle orange-tint background
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(pageStr, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 6);
    },
  });

  doc.save(filename);
};



/**
 * Helper to safely extract cell text from a row and column
 */
const extractCellValue = (row, col) => {
  if (typeof col.exportValue === "function") {
    const customVal = col.exportValue(row);
    if (customVal !== undefined && customVal !== null) return String(customVal).trim();
  }
  if (typeof col.accessorFn === "function") {
    const customVal = col.accessorFn(row);
    if (customVal !== undefined && customVal !== null) return String(customVal).trim();
  }

  const key = col.key || col.id || col.accessorKey;
  let val = row[key];

  if ((val === null || val === undefined) && row.raw) val = row.raw[key];
  if ((val === null || val === undefined) && row.student) val = row.student[key];

  // Specific student/person name extraction
  if (key === "student" || key === "name" || key === "fullName" || key === "candidate") {
    if (typeof val === "string" && val.trim()) return val.trim();
    if (row.firstName || row.lastName) return `${row.firstName || ""} ${row.lastName || ""}`.trim();
    if (row.raw?.firstName || row.raw?.lastName) return `${row.raw.firstName || ""} ${row.raw.lastName || ""}`.trim();
    if (row.student?.firstName || row.student?.lastName) return `${row.student.firstName || ""} ${row.student.lastName || ""}`.trim();
  }

  // Department name extraction
  if (key === "department" && (val === null || val === undefined)) {
    if (row.student?.subDepartmentId?.name) return row.student.subDepartmentId.name;
    if (row.subDepartmentId?.name) return row.subDepartmentId.name;
    if (row.department?.name) return row.department.name;
  }

  // Applied / Upload Date extraction
  if ((key === "applied" || key === "appliedDate" || key === "uploadDate") && (val === null || val === undefined)) {
    const d = row.uploadDate || row.createdAt;
    if (d) return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Assigned Faculty extraction
  if ((key === "assignedTo" || key === "assignedFacultyId") && (val === null || val === undefined)) {
    if (row.assignedFacultyId?.name) return row.assignedFacultyId.name;
  }

  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return val.name || val.title || val.label || val.email || "—";
  return String(val).trim() || "—";
};

/**
 * Generic export to Excel for any table
 */
export const exportGenericToExcel = (data = [], columns = [], options = {}) => {
  if (!data || data.length === 0) return;

  const validCols = columns.filter(
    (c) => c && c.key !== "select" && c.key !== "action" && c.id !== "select" && c.id !== "action" && c.key !== "taskboard" && c.id !== "taskboard" && c.id !== "extra"
  );

  const formatted = data.map((row, idx) => {
    const item = { "S.No.": idx + 1 };
    validCols.forEach((col) => {
      if (col.key === "sno" || col.id === "sno") return;
      const headerLabel = col.label || col.header || col.key || "Field";
      const cleanHeader = typeof headerLabel === "string" ? headerLabel : (col.key || "Field");
      item[cleanHeader] = extractCellValue(row, col);
    });
    return item;
  });

  const ws = XLSX.utils.json_to_sheet(formatted);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, options.filename || `export_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Generic export to PDF for any table
 */
export const exportGenericToPDF = (data = [], columns = [], options = {}) => {
  if (!data || data.length === 0) return;

  const validCols = columns.filter(
    (c) => c && c.key !== "select" && c.key !== "action" && c.id !== "select" && c.id !== "action" && c.key !== "taskboard" && c.id !== "taskboard" && c.id !== "extra"
  );

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(249, 115, 22);
  doc.text("SANT SINGAJI EDUCATIONAL SOCIETY", 14, 12);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(options.title || "Data Report", 14, 18);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Total Records: ${data.length}  |  Generated on: ${dateStr}`, 14, 23);

  const headers = [
    [
      "S.No.",
      ...validCols
        .filter((c) => c.key !== "sno" && c.id !== "sno")
        .map((c) => {
          const headerLabel = c.label || c.header || c.key || "Field";
          return typeof headerLabel === "string" ? headerLabel : (c.key || "Field");
        }),
    ],
  ];

  const body = data.map((row, idx) => {
    const r = [idx + 1];
    validCols.forEach((col) => {
      if (col.key === "sno" || col.id === "sno") return;
      r.push(extractCellValue(row, col));
    });
    return r;
  });

  autoTable(doc, {
    head: headers,
    body: body,
    startY: 26,
    margin: { left: 10, right: 10, bottom: 12 },
    theme: "striped",
    styles: {
      fontSize: validCols.length > 9 ? 6.5 : 8,
      cellPadding: validCols.length > 9 ? 1.8 : 2.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [255, 248, 243],
    },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(pageStr, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 6);
    },
  });

  doc.save(options.filename || `export_${new Date().toISOString().slice(0, 10)}.pdf`);
};
