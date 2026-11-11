const mongoose = require("mongoose");
const SupportTicket = require("../../models/support/SupportTicket");
const User = require("../../models/user/user");
const cloudinary = require("../../config/cloudinaryConfig");
const {
  DEVELOPERS,
  isDeveloperUser,
  canManageSupportTickets,
  resolveRecipientsForTarget,
} = require("../../config/supportTeam");
const {
  sendSupportTicketEmail,
  sendSupportStatusUpdateEmail,
} = require("../../services/emailService");
const { createNotification } = require("../../services/notificationService");
const { logActivity } = require("../../services/activityLoggerService");

const IMAGE_DATA_URI_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i;
const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];
const VALID_TYPES = ["bug", "ui_ux", "data_issue", "access_issue", "feature_request", "direct_query", "other"];

const hydrateActor = async (reqUser) => {
  const userId = reqUser?.id || reqUser?._id;
  let dbUser = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    dbUser = await User.findById(userId)
      .select("name email role position department departmentId mobileNo")
      .lean();
  }
  return {
    userId: dbUser?._id || userId,
    name: dbUser?.name || reqUser?.name || "Portal User",
    email: String(dbUser?.email || reqUser?.email || "").trim().toLowerCase(),
    role: String(dbUser?.role || reqUser?.role || "").trim().toLowerCase(),
    position: dbUser?.position || "",
    department: dbUser?.department || reqUser?.department || "",
    departmentId: dbUser?.departmentId || reqUser?.departmentId || null,
    mobileNo: dbUser?.mobileNo || "",
  };
};

const generateUniqueTicketCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;
  const latest = await SupportTicket.findOne({ ticketCode: new RegExp(`^${prefix}\\d+$`) })
    .sort({ createdAt: -1 })
    .select("ticketCode")
    .lean();

  let nextNum = 1;
  if (latest?.ticketCode) {
    const tail = Number(latest.ticketCode.replace(prefix, ""));
    if (!Number.isNaN(tail) && tail >= 1) {
      nextNum = tail + 1;
    }
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

const uploadScreenshots = async (screenshotsInput = [], ticketCode) => {
  if (!Array.isArray(screenshotsInput) || screenshotsInput.length === 0) {
    return [];
  }

  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  if (hasCloudinary) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  const uploaded = [];
  const items = screenshotsInput.slice(0, 3);

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    if (!raw || typeof raw !== "string" || !IMAGE_DATA_URI_RE.test(raw)) continue;

    if (hasCloudinary) {
      try {
        const res = await cloudinary.uploader.upload(raw, {
          folder: "support_screenshots",
          public_id: `${ticketCode}_shot_${i + 1}_${Date.now()}`,
          resource_type: "image",
        });
        uploaded.push({ url: res.secure_url });
        continue;
      } catch (err) {
        console.warn("Support screenshot Cloudinary upload failed:", err.message);
      }
    }

    // Fallback when Cloudinary is unavailable: keep bounded data URI (< 2MB)
    if (raw.length <= 2 * 1024 * 1024) {
      uploaded.push({ url: raw });
    }
  }

  return uploaded;
};

const buildScopeFilter = (actor, requestedScope = "auto") => {
  const userIdStr = actor.userId ? String(actor.userId) : null;
  const mineOnly = { "reportedBy.userId": actor.userId };

  if (requestedScope === "mine") return mineOnly;

  const isGlobalResolver = actor.role === "superadmin" || isDeveloperUser(actor);
  if (isGlobalResolver) return {};

  if (actor.role === "hod") {
    const orList = [{ "reportedBy.userId": actor.userId }];
    if (actor.departmentId) {
      orList.push({ "reportedBy.departmentId": actor.departmentId });
    }
    if (actor.department) {
      orList.push({ "reportedBy.department": new RegExp(`^${actor.department}$`, "i") });
    }
    orList.push({ "reportedBy.department": "" });
    return { $or: orList };
  }

  return userIdStr ? mineOnly : { _id: null };
};

const canModifyTicket = (actor, ticket) => {
  if (!canManageSupportTickets(actor)) return false;
  if (actor.role === "superadmin" || isDeveloperUser(actor)) return true;

  // HOD can manage own tickets or department tickets
  if (actor.role === "hod") {
    if (String(ticket.reportedBy?.userId) === String(actor.userId)) return true;
    if (
      actor.departmentId &&
      ticket.reportedBy?.departmentId &&
      String(ticket.reportedBy.departmentId) === String(actor.departmentId)
    ) {
      return true;
    }
    if (
      actor.department &&
      ticket.reportedBy?.department &&
      ticket.reportedBy.department.toLowerCase() === actor.department.toLowerCase()
    ) {
      return true;
    }
    if (!ticket.reportedBy?.department) return true;
  }

  return false;
};

// GET /api/support/developers
exports.getSupportOverview = async (req, res) => {
  try {
    const actor = await hydrateActor(req.user);
    return res.status(200).json({
      success: true,
      data: {
        developers: DEVELOPERS,
        canManageTickets: canManageSupportTickets(actor),
        isDeveloper: isDeveloperUser(actor),
        reporter: {
          name: actor.name,
          email: actor.email,
          role: actor.role,
          department: actor.department,
          mobileNo: actor.mobileNo,
        },
        systemHealth: {
          apiStatus: "Operational",
          databaseStatus: mongoose.connection.readyState === 1 ? "Connected" : "Degraded",
          uptimeSeconds: Math.floor(process.uptime()),
          serverTime: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/support/tickets
exports.getSupportTickets = async (req, res) => {
  try {
    const actor = await hydrateActor(req.user);
    const { status, severity, module, search, scope } = req.query;

    const baseScope = buildScopeFilter(actor, scope);
    const queryFilter = { ...baseScope };

    if (status && status !== "all" && VALID_STATUSES.includes(status)) {
      queryFilter.status = status;
    }
    if (severity && severity !== "all" && VALID_SEVERITIES.includes(severity)) {
      queryFilter.severity = severity;
    }
    if (module && module !== "all") {
      queryFilter.module = module;
    }
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      queryFilter.$and = [
        ...(queryFilter.$and || []),
        {
          $or: [
            { ticketCode: regex },
            { subject: regex },
            { description: regex },
            { module: regex },
            { "reportedBy.name": regex },
            { "reportedBy.email": regex },
          ],
        },
      ];
    }

    const [tickets, scopedAllTickets] = await Promise.all([
      SupportTicket.find(queryFilter).sort({ createdAt: -1 }).lean(),
      SupportTicket.find(baseScope).select("status severity").lean(),
    ]);

    const stats = {
      total: scopedAllTickets.length,
      open: scopedAllTickets.filter((t) => t.status === "open").length,
      in_progress: scopedAllTickets.filter((t) => t.status === "in_progress").length,
      resolved: scopedAllTickets.filter((t) => ["resolved", "closed"].includes(t.status)).length,
      criticalOpen: scopedAllTickets.filter(
        (t) => t.severity === "critical" && ["open", "in_progress"].includes(t.status)
      ).length,
    };

    return res.status(200).json({
      success: true,
      canManageTickets: canManageSupportTickets(actor),
      isDeveloper: isDeveloperUser(actor),
      stats,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/support/tickets (and /api/support/quick-mail)
exports.createSupportTicket = async (req, res) => {
  try {
    const actor = await hydrateActor(req.user);
    const {
      source = "bug_report",
      type = "bug",
      module = "Other",
      severity = "medium",
      subject,
      description,
      pageUrl = "",
      targetDeveloper = "both",
      screenshots = [],
      environmentInfo = {},
    } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ success: false, message: "Subject / Issue Title is required" });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: "Detailed description is required" });
    }

    const resolvedType = VALID_TYPES.includes(type) ? type : "bug";
    const resolvedSeverity = VALID_SEVERITIES.includes(severity) ? severity : "medium";
    const resolvedTarget = ["both", "anees", "himanshu"].includes(targetDeveloper)
      ? targetDeveloper
      : "both";
    const recipients = resolveRecipientsForTarget(resolvedTarget);

    let ticketCode = await generateUniqueTicketCode();
    const uploadedScreenshots = await uploadScreenshots(screenshots, ticketCode);

    const docPayload = {
      ticketCode,
      source: source === "direct_mail" ? "direct_mail" : "bug_report",
      type: source === "direct_mail" && !req.body.type ? "direct_query" : resolvedType,
      module: String(module || "Other").trim(),
      severity: resolvedSeverity,
      subject: String(subject).trim().slice(0, 200),
      description: String(description).trim().slice(0, 6000),
      pageUrl: String(pageUrl || "").trim().slice(0, 500),
      targetDeveloper: resolvedTarget,
      assignedToNames: recipients.map((r) => r.name),
      screenshots: uploadedScreenshots,
      environmentInfo: {
        browser: String(environmentInfo?.browser || "").slice(0, 200),
        platform: String(environmentInfo?.platform || "").slice(0, 120),
        screenResolution: String(environmentInfo?.screenResolution || "").slice(0, 60),
        userAgent: String(environmentInfo?.userAgent || req.headers["user-agent"] || "").slice(0, 400),
      },
      reportedBy: {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        department: actor.department,
        departmentId: actor.departmentId,
        mobileNo: actor.mobileNo,
      },
      status: "open",
    };

    let ticket;
    try {
      ticket = await SupportTicket.create(docPayload);
    } catch (createErr) {
      if (createErr?.code === 11000) {
        docPayload.ticketCode = `${ticketCode}-${Math.floor(10 + Math.random() * 90)}`;
        ticket = await SupportTicket.create(docPayload);
      } else {
        throw createErr;
      }
    }

    const emailResult = await sendSupportTicketEmail({
      ticket: ticket.toObject(),
      recipients,
      origin: req.headers.origin,
    });

    ticket.emailDelivery = {
      attempted: Boolean(emailResult?.attempted),
      sent: Boolean(emailResult?.sent),
      recipients: emailResult?.recipients || recipients.map((r) => r.email),
      error: emailResult?.error || "",
      sentAt: emailResult?.sent ? new Date() : null,
    };
    await ticket.save();

    // Notify SuperAdmin and HOD inside portal
    const notifTitle =
      ticket.source === "direct_mail"
        ? `Direct Mail from ${actor.name}`
        : `New Support Ticket ${ticket.ticketCode}`;
    const notifMsg = `[${resolvedSeverity.toUpperCase()}] ${ticket.subject} (Module: ${ticket.module})`;

    for (const targetRole of ["superadmin", "hod"]) {
      createNotification({
        title: notifTitle,
        message: notifMsg,
        type: resolvedSeverity === "critical" || resolvedSeverity === "high" ? "warning" : "info",
        category: "system",
        recipientRole: targetRole,
        actorId: actor.userId,
        actorName: actor.name,
        actorRole: actor.role,
        metadata: { ticketId: ticket._id, ticketCode: ticket.ticketCode, severity: resolvedSeverity },
      }).catch(() => {});
    }

    req._alreadyLoggedActivity = true;
    logActivity({
      req,
      user: actor,
      action: "CREATE",
      module: "System",
      description: `${actor.name} (${actor.role}) submitted support ticket ${ticket.ticketCode}: ${ticket.subject}`,
      status: "SUCCESS",
      severity: resolvedSeverity === "critical" ? "WARNING" : "INFO",
      meta: { ticketCode: ticket.ticketCode, targetDeveloper: resolvedTarget, emailSent: emailResult.sent },
    });

    return res.status(201).json({
      success: true,
      message: emailResult.sent
        ? `Ticket ${ticket.ticketCode} created & email sent to ${recipients.map((r) => r.name).join(" & ")}!`
        : `Ticket ${ticket.ticketCode} logged in Support Desk (email notification fallback saved).`,
      emailSent: Boolean(emailResult.sent),
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/support/tickets/:id/status
exports.updateSupportTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket ID" });
    }

    const actor = await hydrateActor(req.user);
    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Support ticket not found" });
    }

    if (!canModifyTicket(actor, ticket)) {
      return res.status(403).json({
        success: false,
        message: "Only SuperAdmin, Portal Developers, or Department HOD can update ticket status.",
      });
    }

    const { status, developerNote } = req.body;
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid ticket status" });
    }

    const prevStatus = ticket.status;
    if (status) ticket.status = status;
    if (developerNote !== undefined) {
      ticket.developerNote = String(developerNote || "").trim().slice(0, 3000);
    }

    if (["resolved", "closed"].includes(ticket.status)) {
      ticket.resolvedAt = ticket.resolvedAt || new Date();
      ticket.resolvedBy = {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      };
    } else if (["open", "in_progress"].includes(ticket.status)) {
      ticket.resolvedAt = null;
    }

    if (developerNote && String(developerNote).trim()) {
      ticket.comments.push({
        authorId: actor.userId,
        authorName: actor.name,
        authorEmail: actor.email,
        authorRole: actor.role,
        message: String(developerNote).trim(),
        isDeveloperReply: true,
      });
    }

    await ticket.save();

    if (ticket.reportedBy?.email && (prevStatus !== ticket.status || developerNote)) {
      sendSupportStatusUpdateEmail({
        ticket: ticket.toObject(),
        updatedBy: actor,
        comment: developerNote,
        origin: req.headers.origin,
      }).catch(() => {});
    }

    if (ticket.reportedBy?.userId && String(ticket.reportedBy.userId) !== String(actor.userId)) {
      createNotification({
        title: `Ticket ${ticket.ticketCode} Updated`,
        message: `Status changed to ${ticket.status.replace(/_/g, " ").toUpperCase()} by ${actor.name}`,
        type: ticket.status === "resolved" ? "success" : "info",
        category: "system",
        recipientId: ticket.reportedBy.userId,
        actorId: actor.userId,
        actorName: actor.name,
        actorRole: actor.role,
        metadata: { ticketId: ticket._id, ticketCode: ticket.ticketCode, status: ticket.status },
      }).catch(() => {});
    }

    req._alreadyLoggedActivity = true;
    logActivity({
      req,
      user: actor,
      action: "UPDATE",
      module: "System",
      description: `${actor.name} updated ticket ${ticket.ticketCode} status from ${prevStatus} to ${ticket.status}`,
      status: "SUCCESS",
      severity: "INFO",
    });

    return res.status(200).json({
      success: true,
      message: `Ticket ${ticket.ticketCode} updated successfully`,
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/support/tickets/:id/comments
exports.addSupportTicketComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket ID" });
    }

    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "Comment message is required" });
    }

    const actor = await hydrateActor(req.user);
    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Support ticket not found" });
    }

    const isOwner = String(ticket.reportedBy?.userId) === String(actor.userId);
    const isResolver = canModifyTicket(actor, ticket);

    if (!isOwner && !isResolver) {
      return res.status(403).json({ success: false, message: "Not authorized to comment on this ticket" });
    }

    ticket.comments.push({
      authorId: actor.userId,
      authorName: actor.name,
      authorEmail: actor.email,
      authorRole: actor.role,
      message: String(message).trim().slice(0, 3000),
      isDeveloperReply: isResolver,
    });

    await ticket.save();

    if (isResolver && !isOwner && ticket.reportedBy?.email) {
      sendSupportStatusUpdateEmail({
        ticket: ticket.toObject(),
        updatedBy: actor,
        comment: String(message).trim(),
        origin: req.headers.origin,
      }).catch(() => {});
    } else if (isOwner) {
      const recipients = resolveRecipientsForTarget(ticket.targetDeveloper);
      sendSupportTicketEmail({
        ticket: {
          ...ticket.toObject(),
          subject: `Follow-up Reply on ${ticket.ticketCode}: ${ticket.subject}`,
          description: `${actor.name} added a reply:\n\n${String(message).trim()}`,
        },
        recipients,
        origin: req.headers.origin,
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Reply added",
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

