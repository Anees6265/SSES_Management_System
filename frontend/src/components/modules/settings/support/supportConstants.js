export const PORTAL_DEVELOPERS = [
  {
    id: "anees",
    name: "Anees Khan",
    initials: "AK",
    role: "Lead Full-Stack Developer & Deployment Lead",
    badge: "Full-Stack + Deployment",
    mobile: "6265598762",
    displayMobile: "+91 62655 98762",
    telHref: "tel:+916265598762",
    whatsappHref: "https://wa.me/916265598762",
    email: "aneeskhan@ssism.org",
    mailtoHref: "mailto:aneeskhan@ssism.org",
    availability: "Mon–Sat · 9:00 AM – 7:00 PM IST",
    responseSla: "Priority Response (< 2 hrs)",
    specialties: [
      "Full-Stack Architecture",
      "Server Deployment & DevOps",
      "APIs, Auth & Security",
      "Database & Performance",
    ],
    bio: "Portal co-developer leading end-to-end architecture, backend APIs, cloud server deployment, production releases, and critical hotfixes.",
    accent: "orange",
  },
  {
    id: "himanshu",
    name: "Himanshu Vishwakarma",
    initials: "HV",
    role: "Lead Full-Stack Developer",
    badge: "Full-Stack Engineering",
    mobile: "9589391454",
    displayMobile: "+91 95893 91454",
    telHref: "tel:+919589391454",
    whatsappHref: "https://wa.me/919589391454",
    email: "himanshuvish@ssism.org",
    mailtoHref: "mailto:himanshuvish@ssism.org",
    availability: "Mon–Sat · 9:00 AM – 7:00 PM IST",
    responseSla: "Priority Response (< 2 hrs)",
    specialties: [
      "Full-Stack Engineering",
      "UI/UX & Frontend Systems",
      "Academics & Task Workflows",
      "Reports & Placement Modules",
    ],
    bio: "Portal co-developer driving full-stack feature development, academic & syllabus modules, interactive UI workflows, and rapid bug resolution.",
    accent: "indigo",
  },
];

export const ISSUE_TYPES = [
  { value: "bug", label: "Bug / Error", desc: "Crash, API error, or broken action" },
  { value: "ui_ux", label: "UI / Alignment", desc: "Layout, mobile view, or display issue" },
  { value: "data_issue", label: "Data Mismatch", desc: "Wrong count, missing record, or Excel import" },
  { value: "access_issue", label: "Access / Role", desc: "Login, permission, or session timeout issue" },
  { value: "feature_request", label: "Feature Request", desc: "New workflow or enhancement suggestion" },
  { value: "other", label: "General Query", desc: "Other question or technical help" },
];

export const PORTAL_MODULES = [
  "Task Management",
  "Curriculum & Syllabus",
  "Student Progress & Profiles",
  "Student Task Board",
  "Departments & Levels",
  "Placement & Drives",
  "Report Cards & Marks",
  "Authentication & Session",
  "User Management & Permissions",
  "Activity Logs & Notifications",
  "Dashboard & Analytics",
  "Other",
].map((m) => ({ value: m, label: m }));

export const SEVERITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    hint: "Minor visual tweak or general question",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activePill: "bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  {
    value: "medium",
    label: "Medium",
    hint: "Feature issue with workaround available",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    activePill: "bg-amber-50 text-amber-700 border-amber-500 ring-2 ring-amber-500/20",
    dot: "bg-amber-500",
  },
  {
    value: "high",
    label: "High",
    hint: "Core module blocked for faculty or students",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
    activePill: "bg-orange-50 text-orange-700 border-orange-500 ring-2 ring-orange-500/20",
    dot: "bg-orange-500",
  },
  {
    value: "critical",
    label: "Critical",
    hint: "Server down, login blocked, or data loss risk",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    activePill: "bg-rose-50 text-rose-700 border-rose-500 ring-2 ring-rose-500/20",
    dot: "bg-rose-500",
  },
];

export const STATUS_META = {
  open: {
    label: "Open",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  resolved: {
    label: "Resolved",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

export const SEVERITY_META = Object.fromEntries(
  SEVERITY_OPTIONS.map((s) => [s.value, s])
);

export const FAQ_ITEMS = [
  {
    category: "Bulk Excel Upload",
    q: "How can I preserve the exact row order when uploading Tasks or Syllabus via Excel?",
    a: "The portal saves and displays rows in the exact sequence they appear in your Excel sheet (from Row 1 to the final row). Ensure the 'Subject' and 'Topic' column headers match the downloadable template and avoid leaving blank rows.",
  },
  {
    category: "Task Board & Evaluation",
    q: "How do I assign a single task or bulk Excel upload only to specific students?",
    a: "In the Add Task or Bulk Excel Upload screen, choose 'Specific Students' under Target Audience, filter or search to select the desired students, and submit. Those tasks will sync exclusively to the selected students' Task Boards.",
  },
  {
    category: "Task Board & Evaluation",
    q: "If I delete a task from one student's Task Board, will it affect other students?",
    a: "No. Removing a task from a student's Task Board deletes it only for that specific student. Other students' Task Boards and the Master Task Database remain untouched.",
  },
  {
    category: "Permissions & Roles",
    q: "What actions are permitted for Faculty, Placement Officers, and Coordinators?",
    a: "Department-scoped roles (HOD, Faculty, Placement Officer, and Coordinator) can create, edit, assign, and evaluate tasks within their assigned department. Support ticket status management and resolution are restricted to SuperAdmin, Portal Developers, and Department HODs.",
  },
  {
    category: "Session & Login",
    q: "How does the 'Continue Session' modal extend my login without signing out?",
    a: "A session warning appears 2 minutes before your token expires. Clicking 'Continue Session' requests a fresh 1-hour authentication token from the backend and updates your active session seamlessly without interrupting your work.",
  },
  {
    category: "Promotion & Reports",
    q: "How do student counts and level transfers work when marking a student for the UI/UX track?",
    a: "When marked for UI/UX, the student moves from their regular sub-level (e.g., 1B) into the UI/UX specialization track, and department/level headcounts automatically stay accurate without double-counting.",
  },
];

export const captureEnvironmentInfo = () => {
  if (typeof window === "undefined") {
    return { browser: "", platform: "", screenResolution: "", userAgent: "" };
  }
  const ua = navigator.userAgent || "";
  let browser = "Unknown Browser";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/")) browser = "Google Chrome";
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";

  return {
    browser,
    platform: navigator.platform || "Web",
    screenResolution: `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`,
    userAgent: ua.slice(0, 300),
  };
};

export const formatRelativeDate = (dateInput) => {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "—";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

