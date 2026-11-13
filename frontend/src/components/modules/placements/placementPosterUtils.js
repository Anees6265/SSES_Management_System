import collegeLogo from "../../../assets/images/logo.png";
import campusBuildingBg from "../../../assets/images/singaji_building.jpg";
import profileDummy from "../../../assets/images/profileImgDummy.jpeg";
import itegLogo from "../../../assets/images/iteg-logo.png";
import begLogo from "../../../assets/images/beg-logo.png";
import megLogo from "../../../assets/images/meg-logo.png";
import ssecLogo from "../../../assets/images/ssec-logo.png";
import { detectDepartment } from "../students/reportCardDepartmentConfig";

export { collegeLogo, campusBuildingBg, profileDummy };

export const toTitleCase = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const smartCapitalize = (str = "") => {
  const s = String(str).trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const DEPARTMENT_META = {
  ITEG: { key: "ITEG", label: "ITEG", logo: itegLogo, isSquareLogo: false },
  BEG: { key: "BEG", label: "BEG", logo: begLogo, isSquareLogo: false },
  MEG: { key: "MEG", label: "MEG", logo: megLogo, isSquareLogo: false },
  BTECH: { key: "BTECH", label: "SSEC", logo: ssecLogo, isSquareLogo: true },
};

const matchExplicitDeptKey = (text = "") => {
  const upper = String(text).toUpperCase();
  if (!upper) return null;
  if (upper.includes("ITEG") || upper.includes("IT EXCELLENCE")) return "ITEG";
  if (upper.includes("BEG") || upper.includes("BIO")) return "BEG";
  if (upper.includes("MEG") || upper.includes("MANAGEMENT")) return "MEG";
  if (upper.includes("SSEC") || upper.includes("BTECH") || upper.includes("B.TECH") || upper.includes("ENGINEERING")) {
    return "BTECH";
  }
  return null;
};

/**
 * Resolve the department logo and short label for the placement poster.
 * Prioritizes the student's actual assigned Department/SubDepartment before course heuristics
 * (e.g. a BBA student enrolled under ITEG still displays the ITEG logo).
 */
export const resolvePlacementDepartment = (student = {}) => {
  const deptObj = student?.subDepartmentId?.departmentId || student?.departmentId || {};
  const explicitDeptText = [
    deptObj?.code,
    deptObj?.name,
    student?.department,
    student?.subDepartmentId?.name,
  ]
    .filter(Boolean)
    .join(" ");

  const explicitKey = matchExplicitDeptKey(explicitDeptText);
  const deptKey = explicitKey || detectDepartment(student) || "ITEG";
  const baseMeta = DEPARTMENT_META[deptKey] || DEPARTMENT_META.ITEG;

  // Use a short custom label only if an explicit department name/code exists outside the 4 standard groups
  let label = baseMeta.label;
  if (!explicitKey && deptObj?.code) {
    label = String(deptObj.code).toUpperCase();
  }

  return {
    ...baseMeta,
    label,
  };
};

const translateLevelToYear = (levelName = "") => {
  const cleaned = String(levelName).trim().toLowerCase();
  if (!cleaned) return "";
  if (cleaned.includes("level 1") || cleaned.startsWith("1")) return "1st Year";
  if (cleaned.includes("level 2") || cleaned.startsWith("2")) return "2nd Year";
  if (cleaned.includes("level 3") || cleaned.startsWith("3")) return "3rd Year";
  if (cleaned.includes("level 4") || cleaned.startsWith("4")) return "4th Year";
  return "";
};

const formatFatherDisplay = (fatherName = "") => {
  const cleaned = String(fatherName).trim();
  if (!cleaned) return "";
  const formatted = toTitleCase(cleaned);
  if (/^(mr|mrs|ms|shri|smt|late|dr)\b\.?/i.test(formatted)) {
    return formatted;
  }
  return `Mr. ${formatted}`;
};

export const formatPlacementPosterData = (student = {}, companyMap = {}) => {
  const placedInfo = student?.placedInfo || {};
  const rawCompanyName = placedInfo.companyName || student?.companyName || "";
  const compObj =
    (typeof placedInfo.companyRef === "object" ? placedInfo.companyRef : null) ||
    companyMap[rawCompanyName.toLowerCase().trim()] ||
    null;

  const fullName =
    [toTitleCase(student?.firstName), toTitleCase(student?.lastName)]
      .filter(Boolean)
      .join(" ") || "Student Name";

  const course = String(student?.course || "").trim();
  const rawYear =
    String(student?.year || student?.currentYear || "").trim() ||
    translateLevelToYear(student?.currentLevelName);

  const courseHasYear = /year/i.test(course);
  const courseParts = [course, !courseHasYear ? rawYear : ""].filter(Boolean);
  const courseYearLabel = courseParts.length > 0 ? `( ${courseParts.join(" ")} )` : "";

  const genderLower = String(student?.gender || "").trim().toLowerCase();
  const isFemale = genderLower === "female" || genderLower === "f" || genderLower === "girl";
  const relationPrefix = isFemale ? "Proud Daughter of" : "Proud Son of";

  const fatherDisplay = formatFatherDisplay(student?.fatherName);
  const locationPlace = String(
    student?.village || student?.tehsil || student?.district || student?.address || ""
  ).trim();

  const jobProfile = toTitleCase(placedInfo.jobProfile || student?.position || "Placed Candidate");
  const companyName = smartCapitalize(rawCompanyName || compObj?.companyName || "Recruiting Partner");
  const companyLocation = String(
    placedInfo.location || student?.headOffice || compObj?.headOffice || compObj?.location || ""
  ).trim();
  const companyHeadline = [companyName, companyLocation].filter(Boolean).join(", ");

  const companyLogo =
    compObj?.companyLogo || student?.companyLogo || placedInfo.companyLogo || "";

  return {
    fullName,
    courseYearLabel,
    relationPrefix,
    fatherDisplay,
    locationPlace,
    jobProfile,
    companyName,
    companyLocation,
    companyHeadline,
    companyLogo,
    studentImage: student?.image || profileDummy,
    department: resolvePlacementDepartment(student),
  };
};

