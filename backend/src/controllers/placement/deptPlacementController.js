const Student = require("../../models/student/Student");
const StudentPlacement = require("../../models/placement/StudentPlacement");
const mongoose = require("mongoose");
const { GLOBAL_ROLES } = require("../../middlewares/departmentFilter");

const toId = (id) => new mongoose.Types.ObjectId(id);

const VALID_FILTER = (subDepartmentId) => ({
  subDepartmentId: toId(subDepartmentId),
  status: "Active",
  isFTP: false,
  permissionDetails: null,
});

// Guard: faculty can only access their own allowed subDept IDs
const canAccessSubDept = (req, id) => {
  if (GLOBAL_ROLES.includes(req.user.role)) return true;
  if (!req.allowedSubDeptIds) return false;
  return req.allowedSubDeptIds.some((sid) => sid.toString() === id);
};

// ── 1. Overview ──────────────────────────────────────────────
exports.getDeptOverview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const [totalStudents, readyStudents, interviewRunning, placedStudents] = await Promise.all([
      Student.countDocuments(VALID_FILTER(id)),
      StudentPlacement.countDocuments({ subDepartmentId: toId(id), readinessStatus: { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] } }),
      StudentPlacement.countDocuments({ subDepartmentId: toId(id), "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing"] } }),
      StudentPlacement.countDocuments({ subDepartmentId: toId(id), placedInfo: { $ne: null } }),
    ]);

    const placementPercentage = totalStudents > 0
      ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(2))
      : 0;

    return res.status(200).json({ success: true, data: { totalStudents, readyStudents, interviewRunning, placedStudents, placementPercentage } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 2. Funnel ────────────────────────────────────────────────
exports.getDeptFunnel = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });
    const filter = { subDepartmentId: toId(id) };

    const [readyPlacement, readyDrive, interview, selected, placed] = await Promise.all([
      StudentPlacement.countDocuments({ ...filter, readinessStatus: { $in: ["Ready", "Ready for Placement"] } }),
      StudentPlacement.countDocuments({ ...filter, readinessStatus: { $in: ["Ready for Interview", "Ready for Drive"] } }),
      StudentPlacement.countDocuments({ ...filter, "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing"] } }),
      StudentPlacement.countDocuments({ ...filter, "PlacementinterviewRecord.status": "Selected", placedInfo: null }),
      StudentPlacement.countDocuments({ ...filter, placedInfo: { $ne: null } }),
    ]);

    return res.status(200).json({ success: true, data: { ready: readyPlacement + readyDrive, readyPlacement, readyDrive, interview, selected, placed } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 3. Status Breakdown ──────────────────────────────────────
exports.getDeptStatusBreakdown = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const breakdown = await StudentPlacement.aggregate([
      { $match: { subDepartmentId: toId(id) } },
      { $group: { _id: "$readinessStatus", count: { $sum: 1 } } },
    ]);

    const result = { "Not Ready": 0, "In Progress": 0, "Ready": 0, "Ready for Interview": 0, "Ready for Placement": 0, "Ready for Drive": 0 };
    breakdown.forEach((b) => { if (b._id) result[b._id] = b.count; });

    const interview = await StudentPlacement.countDocuments({
      subDepartmentId: toId(id),
      "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing"] },
    });
    const selected = await StudentPlacement.countDocuments({
      subDepartmentId: toId(id),
      "PlacementinterviewRecord.status": "Selected",
      placedInfo: null,
    });
    const placed = await StudentPlacement.countDocuments({
      subDepartmentId: toId(id),
      placedInfo: { $ne: null },
    });

    return res.status(200).json({
      success: true,
      data: {
        notReady: result["Not Ready"],
        inProgress: result["In Progress"],
        readyForPlacement: result["Ready"] + result["Ready for Placement"],
        readyForDrive: result["Ready for Interview"] + result["Ready for Drive"],
        ready: result["Ready"] + result["Ready for Placement"],
        readyForInterview: result["Ready for Interview"] + result["Ready for Drive"],
        interview,
        selected,
        placed,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. Alerts ────────────────────────────────────────────────
exports.getDeptAlerts = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const readyButNoInterview = await StudentPlacement.countDocuments({
      subDepartmentId: toId(id),
      readinessStatus: { $in: ["Ready", "Ready for Interview"] },
      $or: [
        { PlacementinterviewRecord: { $size: 0 } },
        { PlacementinterviewRecord: { $not: { $elemMatch: { status: { $in: ["Scheduled", "Ongoing", "Selected"] } } } } },
      ],
    });

    const rejectionData = await StudentPlacement.aggregate([
      { $match: { subDepartmentId: toId(id) } },
      { $project: { rejectedCount: { $size: { $filter: { input: "$PlacementinterviewRecord", cond: { $in: ["$$this.status", ["RejectedByCompany", "RejectedByStudent"]] } } } } } },
      { $match: { rejectedCount: { $gte: 2 } } },
      { $count: "total" },
    ]);
    const multipleRejections = rejectionData[0]?.total || 0;

    const totalStudents = await Student.countDocuments(VALID_FILTER(id));
    const placed = await StudentPlacement.countDocuments({ subDepartmentId: toId(id), placedInfo: { $ne: null } });
    const placementPercentage = totalStudents > 0 ? parseFloat(((placed / totalStudents) * 100).toFixed(2)) : 0;

    return res.status(200).json({ success: true, data: { readyButNoInterview, multipleRejections, placementPercentage } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 5. Ready Students ────────────────────────────────────────
exports.getDeptReadyStudents = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const placements = await StudentPlacement.find({
      subDepartmentId: toId(id),
      readinessStatus: { $in: ["Ready", "Ready for Interview"] },
    })
      .limit(15)
      .populate("studentId", "firstName lastName prkey")
      .lean();

    const data = placements.map((p) => {
      const activeInterview = p.PlacementinterviewRecord?.find((i) =>
        ["Scheduled", "Ongoing", "Selected"].includes(i.status)
      );
      return {
        studentId: p.studentId?._id,
        name: p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "—",
        prkey: p.studentId?.prkey,
        readinessStatus: p.readinessStatus,
        interviewStatus: activeInterview?.status || null,
        hasInterview: !!activeInterview,
        lastActivity: p.updatedAt,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 6. Recent Placements ─────────────────────────────────────
exports.getDeptRecentPlacements = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const placements = await StudentPlacement.find({
      subDepartmentId: toId(id),
      placedInfo: { $ne: null },
    })
      .sort({ "placedInfo.placedDate": -1 })
      .limit(10)
      .populate("studentId", "firstName lastName prkey")
      .lean();

    const data = placements.map((p) => ({
      studentId: p.studentId?._id,
      studentName: p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "—",
      prkey: p.studentId?.prkey,
      companyName: p.placedInfo?.companyName || "—",
      salary: p.placedInfo?.salary || 0,
      placedDate: p.placedInfo?.placedDate,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 7. Top Companies ─────────────────────────────────────────
exports.getDeptTopCompanies = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const companies = await StudentPlacement.aggregate([
      { $match: { subDepartmentId: toId(id), placedInfo: { $ne: null } } },
      { $group: { _id: "$placedInfo.companyName", hires: { $sum: 1 }, avgSalary: { $avg: "$placedInfo.salary" } } },
      { $sort: { hires: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, companyName: "$_id", hires: 1, avgSalary: { $round: ["$avgSalary", 0] } } },
    ]);

    return res.status(200).json({ success: true, data: companies });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
