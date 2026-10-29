/**
 * FTP (Fast Track Program) Domain Configuration
 * Department-wise FTP domains and detection helpers.
 */

export const FTP_DOMAINS_BY_DEPARTMENT = {
  ITEG: [
    "MERN Stack",
    "Python Full Stack",
    "Java Full Stack",
    "App Development",
    "Testing",
    "Devops",
    "MEAN Stack",
    "AI/ML",
  ],
  MEG: [
    "Data Analytics",
    "Digital Marketing",
    "US GAAP",
    "CA",
    "Salesforce",
    "Cat",
  ],
  BEG: [
    "Pharmaceutical Industry",
    "Hospital Training",
    "Teaching / Academia",
  ],
  BTECH: [
    "MERN Stack",
    "Python Full Stack",
    "Java Full Stack",
    "App Development",
    "Testing",
    "Devops",
    "MEAN Stack",
    "AI/ML",
  ],
};

export const DEPARTMENT_FTP_LABELS = {
  ITEG: "Tech (ITEG)",
  MEG: "Management (MEG)",
  BEG: "Science (BEG)",
  BTECH: "TECH (B.Tech)",
};

/**
 * Detects the FTP department key (ITEG, MEG, BEG, BTECH) for a student
 * based on subdepartment, department, course, or ssismGroup.
 */
export const getStudentDepartmentKey = (student = {}) => {
  const deptCode = (
    student?.subDepartmentId?.departmentId?.code ||
    student?.subDepartmentId?.code ||
    student?.departmentId?.code ||
    student?.ssismGroup ||
    ""
  ).toUpperCase();

  const deptName = (
    student?.subDepartmentId?.departmentId?.name ||
    student?.subDepartmentId?.name ||
    student?.departmentId?.name ||
    student?.department ||
    ""
  ).toUpperCase();

  const courseUpper = (student?.course || student?.subDepartmentId?.name || "").toUpperCase();

  // 1. Check B.Tech (Engineering / SSEC / CSE / B.Tech)
  if (
    deptCode.includes("BTECH") ||
    deptCode.includes("B.TECH") ||
    deptCode.includes("CSE") ||
    deptCode.includes("SSEC") ||
    deptName.includes("B.TECH") ||
    deptName.includes("BTECH") ||
    deptName.includes("ENGINEERING") ||
    courseUpper.includes("B.TECH") ||
    courseUpper.includes("BTECH") ||
    courseUpper === "CSE"
  ) {
    return "BTECH";
  }

  // 2. Check Science (BEG - Bio / Biotech / Microbiology / Science)
  if (
    deptCode.includes("BEG") ||
    deptName.includes("BEG") ||
    deptName.includes("SCIENCE") ||
    deptName.includes("BIO") ||
    deptName.includes("MICRO") ||
    courseUpper.includes("BIO") ||
    courseUpper.includes("MICRO") ||
    courseUpper.includes("BSC") ||
    courseUpper.includes("B.SC")
  ) {
    return "BEG";
  }

  // 3. Check Management (MEG - Management / Commerce / BBA / MBA / B.Com)
  if (
    deptCode.includes("MEG") ||
    deptName.includes("MEG") ||
    deptName.includes("MANAGEMENT") ||
    deptName.includes("COMMERCE") ||
    ["BBA", "BCOM", "B.COM", "MBA", "MCOM", "M.COM"].some((c) => courseUpper.includes(c))
  ) {
    return "MEG";
  }

  // 4. Default: Tech (ITEG - BCA, Diploma, Tech, etc.)
  return "ITEG";
};

/**
 * Returns available FTP domain options for a given student
 */
export const getFtpDomainsForStudent = (student = {}) => {
  const deptKey = getStudentDepartmentKey(student);
  return FTP_DOMAINS_BY_DEPARTMENT[deptKey] || FTP_DOMAINS_BY_DEPARTMENT.ITEG;
};

/**
 * Returns human-readable department label for a given student
 */
export const getDepartmentLabelForStudent = (student = {}) => {
  const deptKey = getStudentDepartmentKey(student);
  return DEPARTMENT_FTP_LABELS[deptKey] || "Tech (ITEG)";
};

