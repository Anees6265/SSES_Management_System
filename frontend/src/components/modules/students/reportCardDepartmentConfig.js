/**
 * Department-specific configuration for Student Report Cards
 * Handles tailored interview readiness, mock assessments, growth areas, and subject defaults
 * for BEG (Bio), MEG (Management), B.Tech (Engineering), and ITEG (IT).
 */

export const detectDepartment = (student = {}, reportCardData = {}) => {
  const templateType = reportCardData?.templateType || "";
  const deptCode = (
    student?.subDepartmentId?.departmentId?.code ||
    student?.departmentId?.code ||
    student?.department ||
    ""
  ).toUpperCase();
  const deptName = (
    student?.subDepartmentId?.departmentId?.name ||
    student?.subDepartmentId?.name ||
    student?.department ||
    ""
  ).toUpperCase();
  const courseUpper = (student?.course || student?.subDepartmentId?.name || "").toUpperCase();

  // 1. BEG (Bio / Biotechnology / Microbiology / Biology)
  if (
    templateType === "BEG_CUTOFF" ||
    deptCode.includes("BEG") ||
    deptName.includes("BEG") ||
    deptName.includes("BIO") ||
    deptName.includes("MICRO") ||
    courseUpper.includes("BIO") ||
    courseUpper.includes("MICRO")
  ) {
    return "BEG";
  }

  // 2. MEG (Management / BBA / MBA / Commerce / B.Com)
  if (
    templateType === "MEG_WEIGHTED" ||
    deptCode.includes("MEG") ||
    deptName.includes("MEG") ||
    deptName.includes("MANAGEMENT") ||
    deptName.includes("COMMERCE") ||
    ["BBA", "BCOM", "MBA", "MCOM"].some(c => courseUpper.includes(c))
  ) {
    return "MEG";
  }

  // 3. B.Tech (Engineering / SSEC / CSE / Mechanical / Civil / Electrical)
  if (
    templateType === "BTECH_STAGE" ||
    deptCode.includes("CSE") ||
    deptCode.includes("BTECH") ||
    deptCode.includes("SSEC") ||
    deptCode.includes("ENG") ||
    deptName.includes("ENGINEERING") ||
    deptName.includes("B.TECH") ||
    deptName.includes("BTECH") ||
    deptName.includes("SSEC") ||
    courseUpper.includes("B.TECH") ||
    courseUpper.includes("BTECH") ||
    courseUpper.includes("ENGINEERING")
  ) {
    return "BTECH";
  }

  // 4. Default: ITEG (IT / Computer Science / BCA / MCA)
  return "ITEG";
};

export const DEPARTMENT_CONFIGS = {
  BEG: {
    name: "Bio Excellence Group (BEG)",
    shortName: "BEG",
    interviewSubtitle: "Laboratory methodology, biosafety standards, scientific articulation & research viva composure",
    interviewSectionTitle: "7. Bio-Sciences Interview & Lab Viva Evaluation",
    interviewItems: [
      { itemName: "Laboratory Protocol & Technique Depth", value: 4.2, maxMarks: 5 },
      { itemName: "Scientific Communication & Articulation", value: 4.0, maxMarks: 5 },
      { itemName: "Biosafety, QC & Laboratory Compliance", value: 4.1, maxMarks: 5 },
      { itemName: "Experimental Analysis & Problem Solving", value: 3.9, maxMarks: 5 },
      { itemName: "Technical Viva & Research Defense", value: 4.0, maxMarks: 5 },
      { itemName: "Overall Bio-Science Recommendation", value: 4.1, maxMarks: 5 }
    ],
    mockGrowthAreas: [
      "Advanced instrumental analysis (HPLC & Spectrophotometry) & biochemical assay troubleshooting",
      "Pharma/QC regulatory mock interview composure and standard operating procedure (SOP) articulation",
      "Scientific research viva confidence and protocol methodology defense under time constraints"
    ],
    strengths: "Aseptic laboratory techniques, Biochemical analysis, Scientific documentation, Strict protocol adherence",
    defaultSubjects: [
      { itemName: "Microbiology & Microbial Genetics", value: "Outstanding", score: 46, maxMarks: 50, remark: "4.75" },
      { itemName: "Biochemistry & Molecular Biology", value: "Excellent", score: 43, maxMarks: 50, remark: "4.45" },
      { itemName: "Immunology & Medical Diagnostics", value: "Excellent", score: 28, maxMarks: 30, remark: "4.60" },
      { itemName: "Bioprocess & Fermentation Tech", value: "Very Good", score: 24, maxMarks: 25, remark: "4.50" }
    ]
  },
  MEG: {
    name: "Management Excellence Group (MEG)",
    shortName: "MEG",
    interviewSubtitle: "Business acumen, domain depth, corporate communication & executive composure",
    interviewSectionTitle: "7. Management Interview & Mock Assessment",
    interviewItems: [
      { itemName: "Business & Domain Knowledge", value: 4.0, maxMarks: 5 },
      { itemName: "Business Communication & Articulation", value: 4.0, maxMarks: 5 },
      { itemName: "Confidence & Executive Presence", value: 3.8, maxMarks: 5 },
      { itemName: "Case Analysis & Problem Solving", value: 4.1, maxMarks: 5 },
      { itemName: "Commercial Acumen & Practical Logic", value: 4.0, maxMarks: 5 },
      { itemName: "Overall Managerial Recommendation", value: 4.0, maxMarks: 5 }
    ],
    mockGrowthAreas: [
      "Financial modeling, data analytics & spreadsheet simulation practice",
      "Executive mock interview composure and structured case answering (STAR framework)",
      "Strategic marketing & corporate case competition readiness"
    ],
    strengths: "Strategic business thinking, Case analysis, Professional networking, Team leadership",
    defaultSubjects: [
      { itemName: "Principles & Practice of Management", value: "Outstanding", score: 48, maxMarks: 50, remark: "4.80" },
      { itemName: "Financial Accounting & Reporting", value: "Excellent", score: 44, maxMarks: 50, remark: "4.40" },
      { itemName: "Business Communication & Soft Skills", value: "Excellent", score: 27, maxMarks: 30, remark: "4.50" },
      { itemName: "Business Economics", value: "Very Good", score: 23, maxMarks: 25, remark: "4.60" }
    ]
  },
  BTECH: {
    name: "Sant Singaji Engineering College (B.Tech)",
    shortName: "B.Tech",
    interviewSubtitle: "Engineering fundamentals, system architecture, technical viva & problem-solving under pressure",
    interviewSectionTitle: "7. Engineering Viva & Mock Assessment",
    interviewItems: [
      { itemName: "Engineering Fundamentals & Core Concepts", value: 4.1, maxMarks: 5 },
      { itemName: "System Design & Technical Architecture", value: 4.0, maxMarks: 5 },
      { itemName: "Analytical Problem Solving & Troubleshooting", value: 4.2, maxMarks: 5 },
      { itemName: "Technical Viva & Project Defense", value: 3.9, maxMarks: 5 },
      { itemName: "Engineering Practical & Tool Proficiency", value: 4.0, maxMarks: 5 },
      { itemName: "Overall Engineering Recommendation", value: 4.1, maxMarks: 5 }
    ],
    mockGrowthAreas: [
      "Complex system architecture, circuit/load analysis & design calculations",
      "Technical viva confidence and rapid engineering troubleshooting under pressure",
      "Capstone engineering prototype demonstration and technical defense"
    ],
    strengths: "Engineering fundamentals, Mathematical modeling, Technical design & CAD, System troubleshooting",
    defaultSubjects: [
      { itemName: "Data Structures & Algorithms", value: "Outstanding", score: 47, maxMarks: 50, remark: "4.85" },
      { itemName: "Operating Systems & System Architecture", value: "Excellent", score: 44, maxMarks: 50, remark: "4.50" },
      { itemName: "Database Management Systems", value: "Excellent", score: 28, maxMarks: 30, remark: "4.65" },
      { itemName: "Computer Networks & Security", value: "Very Good", score: 23, maxMarks: 25, remark: "4.40" }
    ]
  },
  ITEG: {
    name: "Information Technology & Emerging Growth (ITEG)",
    shortName: "ITEG",
    interviewSubtitle: "Technical depth, data structures, coding fluency, articulate communication & live coding composure",
    interviewSectionTitle: "7. Technical Interview & Mock Assessment",
    interviewItems: [
      { itemName: "Core CS & Technical Knowledge", value: 4.0, maxMarks: 5 },
      { itemName: "Data Structures & Problem Solving", value: 4.1, maxMarks: 5 },
      { itemName: "Technical Communication & Articulation", value: 4.0, maxMarks: 5 },
      { itemName: "Confidence & Live Coding Composure", value: 3.8, maxMarks: 5 },
      { itemName: "Answer Quality & Architectural Precision", value: 4.0, maxMarks: 5 },
      { itemName: "Overall Technical Recommendation", value: 4.0, maxMarks: 5 }
    ],
    mockGrowthAreas: [
      "Advanced system design and complex algorithmic interview practice (LeetCode / HackerRank)",
      "Live coding mock interview confidence and structured answering under time limits",
      "Deep-dive portfolio projects demonstrating end-to-end architectures"
    ],
    strengths: "Problem solving, Full stack development, Clean code structuring, Logical thinking",
    defaultSubjects: [
      { itemName: "Python Programming", value: "Excellent", score: 92, maxMarks: 100, remark: "4.12" },
      { itemName: "Data Structures & Algorithms", value: "Very Good", score: 45, maxMarks: 50, remark: "3.90" },
      { itemName: "Full Stack Web Development", value: "Excellent", score: 78, maxMarks: 80, remark: "4.35" },
      { itemName: "Database Systems (SQL & MongoDB)", value: "Good", score: 38, maxMarks: 50, remark: "3.80" }
    ]
  }
};

export const mapInterviewItemName = (itemName, deptType) => {
  if (!itemName) return "";
  if (itemName === "Technical Knowledge") {
    if (deptType === "MEG") return "Business & Domain Knowledge";
    if (deptType === "BEG") return "Laboratory Protocol & Technique Depth";
    if (deptType === "BTECH") return "Engineering Fundamentals & Core Concepts";
    return "Core CS & Technical Knowledge";
  }
  if (itemName === "Problem Solving") {
    if (deptType === "MEG") return "Case Analysis & Problem Solving";
    if (deptType === "BEG") return "Experimental Analysis & Problem Solving";
    if (deptType === "BTECH") return "Analytical Problem Solving & Troubleshooting";
    return "Data Structures & Problem Solving";
  }
  if (itemName === "Communication") {
    if (deptType === "MEG") return "Business Communication & Articulation";
    if (deptType === "BEG") return "Scientific Communication & Articulation";
    return "Technical Communication & Articulation";
  }
  if (itemName === "Overall Interview Rating" || itemName === "Overall Interview Recommendation") {
    if (deptType === "MEG") return "Overall Managerial Recommendation";
    if (deptType === "BEG") return "Overall Bio-Science Recommendation";
    if (deptType === "BTECH") return "Overall Engineering Recommendation";
    return "Overall Technical Recommendation";
  }
  return itemName;
};
