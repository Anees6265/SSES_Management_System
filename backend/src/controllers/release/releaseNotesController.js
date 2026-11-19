const ReleaseNote = require("../../models/release/ReleaseNote");
const cloudinary = require("../../config/cloudinaryConfig");

/**
 * Strict authorization check: Only authorized developers and Super Admin can create/edit release notes
 */
const isAuthorizedReleaseEditor = (user = {}) => {
  const role = String(user?.role || "").toLowerCase().trim();
  const userName = String(user?.name || "").toLowerCase().trim();
  const userEmail = String(user?.email || "").toLowerCase().trim();

  if (role === "superadmin" || role === "super_admin") return true;

  return (
    userName.includes("anees") ||
    userName.includes("himanshu") ||
    userName.includes("nilesh") ||
    userEmail.includes("anees") ||
    userEmail.includes("himanshu") ||
    userEmail.includes("nilesh")
  );
};

/**
 * Format DB document into consistent API response shape matching frontend contract
 */
const formatReleaseDoc = (doc) => ({
  id: doc.releaseId || `release-${doc._id}`,
  dbId: doc._id,
  version: doc.version,
  title: doc.title,
  date: doc.date,
  author: doc.author || "SSES Product Team",
  developer: doc.developer || doc.author || "Anees Khan",
  badge: doc.badge || "Production",
  archiveMonth: doc.archiveMonth,
  features: Array.isArray(doc.features) ? doc.features : [],
  bugFixes: Array.isArray(doc.bugFixes) ? doc.bugFixes : [],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * Upload base64 image to Cloudinary (blocks SVG for security)
 */
const uploadBase64ImageToCloud = async (base64String, filename) => {
  let cleanBase64 = base64String;
  let mimeType = "image/png";

  if (base64String.includes(";base64,")) {
    const parts = base64String.split(";base64,");
    mimeType = parts[0].split(":")[1] || "image/png";
    cleanBase64 = parts[1];
  }

  if (mimeType.toLowerCase().includes("svg")) {
    throw new Error("SVG images are not allowed for security reasons");
  }

  const uploadResult = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${cleanBase64}`,
    {
      folder: "release_notes",
      public_id: filename,
      resource_type: "image",
      overwrite: true,
    }
  );

  return uploadResult.secure_url || uploadResult.url;
};

/**
 * Process features: upload any new base64 screenshots to Cloudinary, preserve existing URLs
 */
const processReleaseFeatures = async (features = [], version = "") => {
  const safeVersion = version.replace(/[^a-zA-Z0-9]/g, "_");
  const processedFeatures = [];

  for (let i = 0; i < features.length; i++) {
    const feat = features[i];
    let imageUrl = feat.image || "";

    if (feat.imageBase64 && feat.imageBase64.startsWith("data:image")) {
      const customName = `RN_${safeVersion}_feat_${i + 1}_${Date.now()}`;
      try {
        imageUrl = await uploadBase64ImageToCloud(feat.imageBase64, customName);
      } catch (err) {
        console.error("Cloudinary upload failed for release screenshot:", err.message);
        throw err;
      }
    }

    processedFeatures.push({
      title: feat.title || "",
      description: feat.description || "",
      image: imageUrl || undefined,
      imageCaption: feat.imageCaption || feat.title || "",
    });
  }

  return processedFeatures;
};

/**
 * GET /api/release-notes
 * Fetch all release notes (visible to all staff roles)
 */
exports.getReleaseNotes = async (req, res) => {
  try {
    const notes = await ReleaseNote.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notes.map(formatReleaseDoc),
    });
  } catch (error) {
    console.error("Error in getReleaseNotes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch release notes",
      error: error.message,
    });
  }
};

/**
 * POST /api/release-notes
 * Add a new release note (Only authorized developers / Super Admin)
 */
exports.addReleaseNote = async (req, res) => {
  try {
    if (!isAuthorizedReleaseEditor(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: Only authorized developers can publish release notes.",
      });
    }

    const {
      version,
      title,
      date,
      developer,
      author,
      badge,
      archiveMonth,
      features = [],
      bugFixes = [],
    } = req.body;

    if (!version || !title || !date) {
      return res.status(400).json({
        success: false,
        message: "Version, title, and date are required fields.",
      });
    }

    const devName = developer || author || req.user?.name || "Anees Khan";
    const normalizedVersion = version.startsWith("v") ? version : `v${version}`;
    const cleanTag = version.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const releaseId = `release-${cleanTag}-${Date.now().toString().slice(-4)}`;

    const processedFeatures = await processReleaseFeatures(features, version);
    const cleanedBugFixes = (Array.isArray(bugFixes) ? bugFixes : [])
      .map((b) => (typeof b === "string" ? b.trim() : ""))
      .filter(Boolean);

    const newNote = new ReleaseNote({
      releaseId,
      version: normalizedVersion,
      title: title.trim(),
      date: date.trim(),
      developer: devName.trim(),
      author: devName.trim(),
      badge: (badge || "Production").trim(),
      archiveMonth: (archiveMonth || date).trim(),
      features: processedFeatures,
      bugFixes: cleanedBugFixes,
    });

    await newNote.save();

    console.log(
      `Release note ${newNote.version} published by ${devName} (${req.user?.name || req.user?.role || "admin"})`
    );

    return res.status(201).json({
      success: true,
      message: "Release note published successfully",
      data: formatReleaseDoc(newNote),
    });
  } catch (error) {
    console.error("Error in addReleaseNote:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create release note",
      error: error.message,
    });
  }
};

/**
 * PUT /api/release-notes/:id
 * Edit an existing release note (Only authorized developers / Super Admin)
 */
exports.updateReleaseNote = async (req, res) => {
  try {
    if (!isAuthorizedReleaseEditor(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: Only authorized developers can edit release notes.",
      });
    }

    const { id } = req.params;

    // Search by ObjectId or custom releaseId
    let existing = null;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      existing = await ReleaseNote.findById(id);
    }
    if (!existing) {
      existing = await ReleaseNote.findOne({ releaseId: id });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Release note not found.",
      });
    }

    const {
      version,
      title,
      date,
      developer,
      author,
      badge,
      archiveMonth,
      features = [],
      bugFixes = [],
    } = req.body;

    if (!version || !title || !date) {
      return res.status(400).json({
        success: false,
        message: "Version, title, and date are required fields.",
      });
    }

    const devName = developer || author || existing.developer || "Anees Khan";
    const normalizedVersion = version.startsWith("v") ? version : `v${version}`;
    const processedFeatures = await processReleaseFeatures(features, version);
    const cleanedBugFixes = (Array.isArray(bugFixes) ? bugFixes : [])
      .map((b) => (typeof b === "string" ? b.trim() : ""))
      .filter(Boolean);

    existing.version = normalizedVersion;
    existing.title = title.trim();
    existing.date = date.trim();
    existing.developer = devName.trim();
    existing.author = devName.trim();
    existing.badge = (badge || existing.badge || "Production").trim();
    existing.archiveMonth = (archiveMonth || date).trim();
    existing.features = processedFeatures;
    existing.bugFixes = cleanedBugFixes;

    await existing.save();

    console.log(
      `Release note ${existing.version} updated by ${devName} (${req.user?.name || req.user?.role || "admin"})`
    );

    return res.status(200).json({
      success: true,
      message: "Release note updated successfully",
      data: formatReleaseDoc(existing),
    });
  } catch (error) {
    console.error("Error in updateReleaseNote:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update release note",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/release-notes/:id
 * Delete a release note (Only authorized developers / Super Admin)
 */
exports.deleteReleaseNote = async (req, res) => {
  try {
    if (!isAuthorizedReleaseEditor(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: Only authorized developers can delete release notes.",
      });
    }

    const { id } = req.params;
    let note = null;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      note = await ReleaseNote.findByIdAndDelete(id);
    }
    if (!note) {
      note = await ReleaseNote.findOneAndDelete({ releaseId: id });
    }

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Release note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Release note deleted successfully",
      data: { id: note._id, releaseId: note.releaseId },
    });
  } catch (error) {
    console.error("Error in deleteReleaseNote:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete release note",
      error: error.message,
    });
  }
};
