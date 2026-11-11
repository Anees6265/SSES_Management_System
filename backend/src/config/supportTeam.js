const DEVELOPERS = [
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

const DEVELOPER_EMAILS = new Set(DEVELOPERS.map((d) => d.email.toLowerCase()));

const isDeveloperUser = (user = {}) => {
  const email = String(user?.email || "").trim().toLowerCase();
  if (email && DEVELOPER_EMAILS.has(email)) return true;
  const name = String(user?.name || "").trim().toLowerCase();
  return name === "anees khan" || name === "himanshu vishwakarma";
};

const canManageSupportTickets = (user = {}) => {
  const role = String(user?.role || "").trim().toLowerCase();
  if (["superadmin", "hod"].includes(role)) return true;
  return isDeveloperUser(user);
};

const resolveRecipientsForTarget = (target = "both") => {
  if (target === "anees") return [DEVELOPERS[0]];
  if (target === "himanshu") return [DEVELOPERS[1]];
  return DEVELOPERS;
};

module.exports = {
  DEVELOPERS,
  DEVELOPER_EMAILS,
  isDeveloperUser,
  canManageSupportTickets,
  resolveRecipientsForTarget,
};

