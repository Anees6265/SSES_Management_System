/* eslint-disable no-unused-vars */
/**
 * Professional Institutional Avatar Catalog
 * SSES Management System
 * 
 * Avatars are hosted securely on Cloudinary CDN:
 * https://res.cloudinary.com/doqjunyqo/image/upload/sses_avatars/
 */
import cloudinaryMap from "./cloudinaryAvatarMap.json";

// Cloudinary CDN Base URL helper
export function getAvatarCloudinaryUrl(filename) {
  if (!filename) return "";
  return cloudinaryMap[filename] || `https://res.cloudinary.com/doqjunyqo/image/upload/sses_avatars/${filename}`;
}

// Universal Helper: Encodes SVG to Base64 Data URI
export function svgToBase64DataUri(svgString) {
  if (!svgString) return "";
  try {
    const cleanSvg = svgString.trim();
    const encoded = typeof window !== "undefined" && typeof window.btoa === "function"
      ? window.btoa(unescape(encodeURIComponent(cleanSvg)))
      : (typeof Buffer !== "undefined" ? Buffer.from(cleanSvg).toString("base64") : "");
    if (encoded) {
      return `data:image/svg+xml;base64,${encoded}`;
    }
    return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
  } catch (err) {
    console.warn("Base64 conversion failed, falling back to URL-encoded URI", err);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
  }
}

// Check if a profileImage string is an Avatar
export function isAvatarImage(url) {
  if (!url || typeof url !== "string") return false;
  return (
    url.includes("sses_avatars") ||
    url.startsWith("data:image/") ||
    url.includes("/avatars/") ||
    url.includes("avatar") ||
    url.includes("dicebear")
  );
}

// Curated Background Color Palettes (Facebook / WhatsApp / Teams style)
export const BACKGROUND_PALETTES = [
  {
    id: "orange",
    name: "Campus Orange",
    from: "#f97316",
    to: "#ea580c",
    previewHex: "#f97316",
    border: "border-orange-500",
    ring: "ring-orange-500"
  },
  {
    id: "navy",
    name: "Executive Navy",
    from: "#1e3a8a",
    to: "#0f172a",
    previewHex: "#1e3a8a",
    border: "border-blue-900",
    ring: "ring-blue-900"
  },
  {
    id: "blue",
    name: "Academic Royal",
    from: "#0284c7",
    to: "#0369a1",
    previewHex: "#0284c7",
    border: "border-sky-600",
    ring: "ring-sky-600"
  },
  {
    id: "indigo",
    name: "Modern Indigo",
    from: "#4f46e5",
    to: "#3730a3",
    previewHex: "#4f46e5",
    border: "border-indigo-600",
    ring: "ring-indigo-600"
  },
  {
    id: "emerald",
    name: "Emerald Green",
    from: "#059669",
    to: "#047857",
    previewHex: "#059669",
    border: "border-emerald-600",
    ring: "ring-emerald-600"
  },
  {
    id: "teal",
    name: "Teal Breeze",
    from: "#0d9488",
    to: "#0f766e",
    previewHex: "#0d9488",
    border: "border-teal-600",
    ring: "ring-teal-600"
  },
  {
    id: "purple",
    name: "Royal Violet",
    from: "#7c3aed",
    to: "#6d28d9",
    previewHex: "#7c3aed",
    border: "border-purple-600",
    ring: "ring-purple-600"
  },
  {
    id: "rose",
    name: "Coral Rose",
    from: "#e11d48",
    to: "#be123c",
    previewHex: "#e11d48",
    border: "border-rose-600",
    ring: "ring-rose-600"
  },
  {
    id: "amber",
    name: "Warm Amber",
    from: "#d97706",
    to: "#b45309",
    previewHex: "#d97706",
    border: "border-amber-600",
    ring: "ring-amber-600"
  },
  {
    id: "slate",
    name: "Charcoal Slate",
    from: "#334155",
    to: "#1e293b",
    previewHex: "#334155",
    border: "border-slate-700",
    ring: "ring-slate-700"
  }
];

// Curated Category Tabs
export const AVATAR_CATEGORIES = [
  { id: "all", label: "🌟 All" },
  { id: "pixar", label: "✨ 3D Pixar" },
  { id: "executive", label: "👔 Executive" },
  { id: "faculty", label: "🎓 Academic & Faculty" },
  { id: "placement", label: "💼 Placement & HR" },
  { id: "tech", label: "⚡ Tech & Coord." },
  { id: "minimal", label: "👤 Minimalist" },
  { id: "memoji", label: "🎨 3D Memojis" },
];

/* ─── MINIMALIST SILHOUETTE SVG GENERATORS ─── */
function createSilhouetteSvg(id, bg, type = "exec-male") {
  const gradId = `sil-grad-${id}`;
  const fromColor = bg?.from || "#f97316";
  const toColor = bg?.to || "#ea580c";

  if (type === "exec-male") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${fromColor}" />
          <stop offset="100%" stop-color="${toColor}" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#${gradId})" />
      <path d="M22 120 C22 88 38 84 60 84 C82 84 98 88 98 120 Z" fill="#0f172a" />
      <polygon points="60,84 49,99 71,99" fill="#ffffff" />
      <polygon points="57,96 63,96 65,116 60,120 55,116" fill="#f97316" />
      <rect x="54" y="66" width="12" height="20" fill="#ffffff" opacity="0.25" />
      <ellipse cx="60" cy="52" rx="21" ry="23" fill="#0f172a" />
      <path d="M39 48 C38 32 48 24 60 24 C72 24 82 32 81 48 C76 36 68 31 58 31 C48 31 42 36 39 48 Z" fill="#1e293b" />
    </svg>`.replace(/\s+/g, " ");
  }

  if (type === "exec-female") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${fromColor}" />
          <stop offset="100%" stop-color="${toColor}" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#${gradId})" />
      <path d="M24 120 C24 90 38 85 60 85 C82 85 96 90 96 120 Z" fill="#0f172a" />
      <path d="M48 85 Q60 102 72 85 Z" fill="#ffffff" />
      <circle cx="60" cy="93" r="2.5" fill="#f8fafc" />
      <ellipse cx="60" cy="52" rx="20" ry="22" fill="#0f172a" />
      <path d="M36 48 C34 30 46 23 60 23 C74 23 86 30 84 48 C86 64 84 72 78 75 C74 70 74 56 72 50 C68 34 52 34 48 50 C46 56 46 70 42 75 C36 72 34 64 36 48 Z" fill="#1e293b" />
    </svg>`.replace(/\s+/g, " ");
  }

  if (type === "faculty") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${fromColor}" />
          <stop offset="100%" stop-color="${toColor}" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#${gradId})" />
      <path d="M22 120 C22 88 38 84 60 84 C82 84 98 88 98 120 Z" fill="#0f172a" />
      <path d="M49 84 Q60 96 71 84 Z" fill="#ffffff" />
      <rect x="54" y="66" width="12" height="20" fill="#ffffff" opacity="0.2" />
      <ellipse cx="60" cy="52" rx="21" ry="23" fill="#0f172a" />
      <circle cx="50" cy="51" r="7.5" fill="none" stroke="#ffffff" stroke-width="2" />
      <circle cx="70" cy="51" r="7.5" fill="none" stroke="#ffffff" stroke-width="2" />
      <line x1="57.5" y1="51" x2="62.5" y2="51" stroke="#ffffff" stroke-width="2" />
    </svg>`.replace(/\s+/g, " ");
  }

  // Generic / Faceless
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${fromColor}" />
        <stop offset="100%" stop-color="${toColor}" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#${gradId})" />
    <path d="M24 120 C24 92 40 86 60 86 C80 86 96 92 96 120 Z" fill="#0f172a" />
    <ellipse cx="60" cy="52" rx="21" ry="23" fill="#0f172a" />
  </svg>`.replace(/\s+/g, " ");
}

/* ─── 44 CURATED HIGH-QUALITY CLOUDINARY AVATARS ─── */
export const AVATAR_LIST = [
  // ── 1. 3D PIXAR STUDIO CHARACTERS ──
  {
    id: "pixar-f-suit",
    name: "Corporate Leader",
    roleTag: "Super Admin / Admin",
    category: "pixar",
    gender: "female",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_female_suit.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-f-glasses",
    name: "Academic Lecturer",
    roleTag: "Faculty / HOD",
    category: "pixar",
    gender: "female",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_female_glasses.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-m-exec",
    name: "Executive Officer",
    roleTag: "Super Admin / Admin",
    category: "pixar",
    gender: "male",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_male_executive.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-m-dean",
    name: "Dean of Academics",
    roleTag: "Super Admin / Leadership",
    category: "pixar",
    gender: "male",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_male_dean.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-f-dir",
    name: "Operations Director",
    roleTag: "Admin / HOD",
    category: "pixar",
    gender: "female",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_female_director.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-m-prof",
    name: "Senior Professor",
    roleTag: "Faculty / Mentor",
    category: "pixar",
    gender: "male",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_male_professor.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-m-tech",
    name: "Project Tech Lead",
    roleTag: "Coordinator / Tech",
    category: "pixar",
    gender: "male",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_male_tech.jpg"),
    hasTransparentBg: false
  },
  {
    id: "pixar-f-tech",
    name: "Placement Officer",
    roleTag: "Placement Officer",
    category: "pixar",
    gender: "female",
    type: "pixar",
    src: getAvatarCloudinaryUrl("pixar_female_tech.jpg"),
    hasTransparentBg: false
  },

  // ── 2. EXECUTIVE SUITS & LEADERSHIP ──
  {
    id: "exec-teams-1",
    name: "Executive Director",
    roleTag: "Super Admin / Leadership",
    category: "executive",
    gender: "male",
    type: "teams",
    src: getAvatarCloudinaryUrl("teams_1.png"),
    hasTransparentBg: true
  },
  {
    id: "exec-teams-9",
    name: "Campus Registrar",
    roleTag: "Admin / Executive",
    category: "executive",
    gender: "male",
    type: "teams",
    src: getAvatarCloudinaryUrl("teams_9.png"),
    hasTransparentBg: true
  },
  {
    id: "exec-memo-1",
    name: "Senior Administrator",
    roleTag: "Super Admin / Admin",
    category: "executive",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_1.png"),
    hasTransparentBg: true
  },
  {
    id: "exec-memo-20",
    name: "Campus Director",
    roleTag: "Super Admin / HOD",
    category: "executive",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_20.png"),
    hasTransparentBg: true
  },
  {
    id: "exec-memo-17",
    name: "Operations Lead",
    roleTag: "Admin / HOD",
    category: "executive",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_17.png"),
    hasTransparentBg: true
  },
  {
    id: "exec-upstream-8",
    name: "Executive Chancellor",
    roleTag: "Super Admin",
    category: "executive",
    gender: "male",
    type: "upstream",
    src: getAvatarCloudinaryUrl("upstream_8.png"),
    hasTransparentBg: true
  },

  // ── 3. ACADEMIC & FACULTY ──
  {
    id: "fac-memo-8",
    name: "CS Professor",
    roleTag: "Faculty / HOD",
    category: "faculty",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_8.png"),
    hasTransparentBg: true
  },
  {
    id: "fac-memo-2",
    name: "Management Faculty",
    roleTag: "Faculty / HOD",
    category: "faculty",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_2.png"),
    hasTransparentBg: true
  },
  {
    id: "fac-teams-2",
    name: "Senior Mentor",
    roleTag: "Faculty",
    category: "faculty",
    gender: "female",
    type: "teams",
    src: getAvatarCloudinaryUrl("teams_2.png"),
    hasTransparentBg: true
  },
  {
    id: "fac-memo-16",
    name: "Research Faculty",
    roleTag: "Faculty / Research",
    category: "faculty",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_16.png"),
    hasTransparentBg: true
  },
  {
    id: "fac-teams-7",
    name: "Associate Professor",
    roleTag: "Faculty",
    category: "faculty",
    gender: "male",
    type: "teams",
    src: getAvatarCloudinaryUrl("teams_7.png"),
    hasTransparentBg: true
  },
  {
    id: "fac-memo-19",
    name: "Faculty Mentor",
    roleTag: "Faculty / Coordinator",
    category: "faculty",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_19.png"),
    hasTransparentBg: true
  },
  {
    id: "fac-upstream-3",
    name: "Department Head",
    roleTag: "HOD / Faculty",
    category: "faculty",
    gender: "male",
    type: "upstream",
    src: getAvatarCloudinaryUrl("upstream_3.png"),
    hasTransparentBg: true
  },

  // ── 4. TRAINING & PLACEMENT ──
  {
    id: "place-memo-5",
    name: "Placement Director",
    roleTag: "Placement Officer",
    category: "placement",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_5.png"),
    hasTransparentBg: true
  },
  {
    id: "place-memo-32",
    name: "Corporate Lead",
    roleTag: "Placement Officer",
    category: "placement",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_32.png"),
    hasTransparentBg: true
  },
  {
    id: "place-teams-5",
    name: "Corporate Relations",
    roleTag: "Placement Officer",
    category: "placement",
    gender: "male",
    type: "teams",
    src: getAvatarCloudinaryUrl("teams_5.png"),
    hasTransparentBg: true
  },
  {
    id: "place-memo-18",
    name: "Career Advisor",
    roleTag: "Placement Officer",
    category: "placement",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_18.png"),
    hasTransparentBg: true
  },
  {
    id: "place-upstream-4",
    name: "Industry Liaison",
    roleTag: "Placement Officer",
    category: "placement",
    gender: "male",
    type: "upstream",
    src: getAvatarCloudinaryUrl("upstream_4.png"),
    hasTransparentBg: true
  },

  // ── 5. TECH & COORDINATORS ──
  {
    id: "tech-upstream-1",
    name: "Bearded Tech Lead",
    roleTag: "Coordinator / IT",
    category: "tech",
    gender: "male",
    type: "upstream",
    src: getAvatarCloudinaryUrl("upstream_1.png"),
    hasTransparentBg: true
  },
  {
    id: "tech-memo-4",
    name: "Systems Coordinator",
    roleTag: "Coordinator",
    category: "tech",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_4.png"),
    hasTransparentBg: true
  },
  {
    id: "tech-memo-14",
    name: "Technical Lead",
    roleTag: "Coordinator / Tech",
    category: "tech",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_14.png"),
    hasTransparentBg: true
  },
  {
    id: "tech-memo-30",
    name: "Academic Coordinator",
    roleTag: "Coordinator",
    category: "tech",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_30.png"),
    hasTransparentBg: true
  },
  {
    id: "tech-teams-3",
    name: "Digital Lead",
    roleTag: "Coordinator / Admin",
    category: "tech",
    gender: "male",
    type: "teams",
    src: getAvatarCloudinaryUrl("teams_3.png"),
    hasTransparentBg: true
  },
  {
    id: "tech-memo-28",
    name: "Systems Analyst",
    roleTag: "Coordinator",
    category: "tech",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_28.png"),
    hasTransparentBg: true
  },

  // ── 6. MINIMALIST SILHOUETTES ──
  {
    id: "sil-exec-m",
    name: "Executive Suit & Tie",
    roleTag: "Super Admin / Admin",
    category: "minimal",
    gender: "male",
    type: "svg",
    hasTransparentBg: false,
    getSvg: (bg) => createSilhouetteSvg("sil-exec-m", bg, "exec-male")
  },
  {
    id: "sil-exec-f",
    name: "Executive Blazer",
    roleTag: "Admin / HOD",
    category: "minimal",
    gender: "female",
    type: "svg",
    hasTransparentBg: false,
    getSvg: (bg) => createSilhouetteSvg("sil-exec-f", bg, "exec-female")
  },
  {
    id: "sil-faculty",
    name: "Academic Scholar",
    roleTag: "Faculty / Leadership",
    category: "minimal",
    gender: "male",
    type: "svg",
    hasTransparentBg: false,
    getSvg: (bg) => createSilhouetteSvg("sil-faculty", bg, "faculty")
  },
  {
    id: "sil-faceless",
    name: "Faceless Leader",
    roleTag: "All Roles",
    category: "minimal",
    gender: "male",
    type: "svg",
    hasTransparentBg: false,
    getSvg: (bg) => createSilhouetteSvg("sil-faceless", bg, "faceless")
  },

  // ── 7. MORE 3D MEMOJIS & CHARACTERS ──
  {
    id: "memo-6",
    name: "Creative Mentor",
    roleTag: "Faculty / Coordinator",
    category: "memoji",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_6.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-7",
    name: "Smart Researcher",
    roleTag: "Faculty",
    category: "memoji",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_7.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-10",
    name: "Department Lead",
    roleTag: "Coordinator",
    category: "memoji",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_10.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-11",
    name: "Operations Specialist",
    roleTag: "Admin",
    category: "memoji",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_11.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-13",
    name: "Senior Advisor",
    roleTag: "HOD / Faculty",
    category: "memoji",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_13.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-15",
    name: "Placement Lead",
    roleTag: "Placement Officer",
    category: "memoji",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_15.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-25",
    name: "Student Mentor",
    roleTag: "Faculty",
    category: "memoji",
    gender: "female",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_25.png"),
    hasTransparentBg: true
  },
  {
    id: "memo-35",
    name: "IT Director",
    roleTag: "Admin / IT",
    category: "memoji",
    gender: "male",
    type: "memoji",
    src: getAvatarCloudinaryUrl("memo_35.png"),
    hasTransparentBg: true
  }
];

/**
 * Composites Avatar with Background Color into a high-res Data URI
 * Or returns direct Cloudinary URL for 3D Pixar
 */
export async function getAvatarCompositeDataUri(avatar, bgPalette) {
  if (!avatar) return "";

  // 1. If it's an SVG avatar (e.g. Minimalist Silhouettes), render clean SVG
  if (avatar.type === "svg" && typeof avatar.getSvg === "function") {
    const svgStr = avatar.getSvg(bgPalette);
    return svgToBase64DataUri(svgStr);
  }

  // 2. If it's 3D Pixar, it's ALREADY an ultra-high-res Cloudinary CDN URL!
  if (avatar.type === "pixar" && avatar.src) {
    return avatar.src;
  }

  // 3. Browser Canvas Compositing for transparent avatars (Memoji, Teams, Upstream)
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 400;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(avatar.src || "");
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw background gradient circle
          const grad = ctx.createLinearGradient(0, 0, size, size);
          grad.addColorStop(0, bgPalette?.from || "#f97316");
          grad.addColorStop(1, bgPalette?.to || "#ea580c");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();

          // Draw image inside circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
          ctx.clip();
          const pad = 36;
          ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
          ctx.restore();

          // Return high-quality JPEG Data URI (backend automatically uploads to Cloudinary user_profiles)
          const dataUri = canvas.toDataURL("image/jpeg", 0.92);
          resolve(dataUri);
        } catch (err) {
          console.warn("Canvas compositing failed, returning Cloudinary URL", err);
          resolve(avatar.src || "");
        }
      };

      img.onerror = (err) => {
        console.warn("Image load failed, returning Cloudinary URL", err);
        resolve(avatar.src || "");
      };

      img.src = avatar.src;
    });
  }

  return avatar.src || "";
}

/**
 * Synchronous Fallback helper
 */
export function generateAvatarDataUri(avatarId, bgId = "orange") {
  const avatar = AVATAR_LIST.find((a) => a.id === avatarId) || AVATAR_LIST[0];
  const bg = BACKGROUND_PALETTES.find((b) => b.id === bgId) || BACKGROUND_PALETTES[0];

  if (avatar.type === "svg" && typeof avatar.getSvg === "function") {
    return svgToBase64DataUri(avatar.getSvg(bg));
  }
  return avatar.src || "";
}
