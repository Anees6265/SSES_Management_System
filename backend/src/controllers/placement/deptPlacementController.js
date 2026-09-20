const Student = require("../../models/student/Student");
const StudentPlacement = require("../../models/placement/StudentPlacement");
const SubDepartment = require("../../models/department/SubDepartment");
const PlacementDrive = require("../../models/placement/PlacementDrive");
const Session = require("../../models/Session");
const mongoose = require("mongoose");
const { GLOBAL_ROLES } = require("../../middlewares/departmentFilter");

const toId = (id) => new mongoose.Types.ObjectId(id);

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getLastNMonths = (n = 7) => {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      monthNum: d.getMonth() + 1, // 1-12
      month: MONTH_NAMES[d.getMonth()]
    });
  }
  return result;
};

const VALID_FILTER = (subDepartmentId) => ({
  subDepartmentId: toId(subDepartmentId),
  status: { $nin: ["Dropped", "Dummy"] },
  isFTP: false,
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

// ── 8. Department Monthly Trend ──────────────────────────────
exports.getDeptMonthlyTrend = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const months = getLastNMonths(7);
    const startDate = new Date(months[0].year, months[0].monthNum - 1, 1);

    const placedAgg = await StudentPlacement.aggregate([
      {
        $match: {
          subDepartmentId: toId(id),
          "placedInfo.placedDate": { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$placedInfo.placedDate" },
            month: { $month: "$placedInfo.placedDate" }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const placedMap = {};
    placedAgg.forEach((p) => {
      placedMap[`${p._id.year}-${p._id.month}`] = p.count;
    });

    const data = months.map((m) => ({
      month: m.month,
      placed: placedMap[`${m.year}-${m.monthNum}`] || 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 9. Department Full Dashboard ─────────────────────────────
exports.getDeptFullDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccessSubDept(req, id)) return res.status(403).json({ message: "Access denied to this department" });

    const subDept = await SubDepartment.findById(id).select("name code departmentId").lean();
    const deptMeta = {
      name: subDept?.name || `Department #${id}`,
      code: subDept?.code || subDept?.name || "DEPT",
    };

    // 1. Overview
    const [totalStudents, readyStudentsCount, interviewRunning, placedStudents] = await Promise.all([
      Student.countDocuments(VALID_FILTER(id)),
      StudentPlacement.countDocuments({ subDepartmentId: toId(id), readinessStatus: { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] } }),
      StudentPlacement.countDocuments({ subDepartmentId: toId(id), "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing", "Interview Scheduled", "Interview In Progress"] } }),
      StudentPlacement.countDocuments({ subDepartmentId: toId(id), placedInfo: { $ne: null } }),
    ]);
    const placementPercentage = totalStudents > 0
      ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(2))
      : 0;

    const overview = { totalStudents, readyStudents: readyStudentsCount, interviewRunning, placedStudents, placementPercentage };

    // 2. Funnel
    const filter = { subDepartmentId: toId(id) };
    const [readyPlacement, readyDrive, interview, selected, placed] = await Promise.all([
      StudentPlacement.countDocuments({ ...filter, readinessStatus: { $in: ["Ready", "Ready for Placement"] } }),
      StudentPlacement.countDocuments({ ...filter, readinessStatus: { $in: ["Ready for Interview", "Ready for Drive"] } }),
      StudentPlacement.countDocuments({ ...filter, "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing", "Interview Scheduled", "Interview In Progress"] } }),
      StudentPlacement.countDocuments({ ...filter, "PlacementinterviewRecord.status": "Selected", placedInfo: null }),
      placedStudents,
    ]);
    const funnel = { ready: readyPlacement + readyDrive, readyPlacement, readyDrive, interview, selected, placed };

    // 3. Status Breakdown
    const breakdownAgg = await StudentPlacement.aggregate([
      { $match: { subDepartmentId: toId(id) } },
      { $group: { _id: "$readinessStatus", count: { $sum: 1 } } },
    ]);
    const statusMap = { "Not Ready": 0, "In Progress": 0, "Ready": 0, "Ready for Interview": 0, "Ready for Placement": 0, "Ready for Drive": 0 };
    breakdownAgg.forEach((b) => { if (b._id) statusMap[b._id] = b.count; });

    const breakdown = {
      notReady: statusMap["Not Ready"],
      inProgress: statusMap["In Progress"],
      readyForPlacement: statusMap["Ready"] + statusMap["Ready for Placement"],
      readyForDrive: statusMap["Ready for Interview"] + statusMap["Ready for Drive"],
      ready: statusMap["Ready"] + statusMap["Ready for Placement"],
      readyForInterview: statusMap["Ready for Interview"] + statusMap["Ready for Drive"],
      interview,
      selected,
      placed,
    };

    // 4. Alerts
    const readyButNoInterview = await StudentPlacement.countDocuments({
      subDepartmentId: toId(id),
      readinessStatus: { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] },
      $or: [
        { PlacementinterviewRecord: { $size: 0 } },
        { PlacementinterviewRecord: { $not: { $elemMatch: { status: { $in: ["Scheduled", "Ongoing", "Selected", "Interview Scheduled"] } } } } },
      ],
    });

    const rejectionData = await StudentPlacement.aggregate([
      { $match: { subDepartmentId: toId(id) } },
      { $project: { rejectedCount: { $size: { $filter: { input: "$PlacementinterviewRecord", cond: { $in: ["$$this.status", ["RejectedByCompany", "RejectedByStudent"]] } } } } } },
      { $match: { rejectedCount: { $gte: 2 } } },
      { $count: "total" },
    ]);
    const multipleRejections = rejectionData[0]?.total || 0;

    const alerts = { readyButNoInterview, multipleRejections, placementPercentage };

    // 5. Ready Students
    const readyDocs = await StudentPlacement.find({
      subDepartmentId: toId(id),
      readinessStatus: { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] },
    })
      .limit(20)
      .populate("studentId", "firstName lastName prkey image currentLevelId")
      .lean();

    const readyStudents = readyDocs.map((p) => {
      const activeInterview = p.PlacementinterviewRecord?.find((i) =>
        ["Scheduled", "Ongoing", "Selected", "Interview Scheduled"].includes(i.status)
      );
      return {
        studentId: p.studentId?._id || p._id,
        name: p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "—",
        prkey: p.studentId?.prkey || "—",
        readinessStatus: p.readinessStatus,
        interviewStatus: activeInterview?.status || null,
        hasInterview: !!activeInterview,
        lastActivity: p.updatedAt,
      };
    });

    // 6. Recent Placements
    const recentDocs = await StudentPlacement.find({
      subDepartmentId: toId(id),
      placedInfo: { $ne: null },
    })
      .sort({ "placedInfo.placedDate": -1 })
      .limit(15)
      .populate("studentId", "firstName lastName prkey image")
      .lean();

    const recentPlacements = recentDocs.map((p) => ({
      studentId: p.studentId?._id || p._id,
      studentName: p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "—",
      prkey: p.studentId?.prkey || "—",
      companyName: p.placedInfo?.companyName || "—",
      salary: p.placedInfo?.salary || 0,
      placedDate: p.placedInfo?.placedDate,
    }));

    // 7. Top Companies
    const topCompanies = await StudentPlacement.aggregate([
      { $match: { subDepartmentId: toId(id), placedInfo: { $ne: null } } },
      { $group: { _id: "$placedInfo.companyName", hires: { $sum: 1 }, totalHires: { $sum: 1 }, avgSalary: { $avg: "$placedInfo.salary" } } },
      { $sort: { hires: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, companyName: "$_id", hires: 1, totalHires: 1, avgSalary: { $round: ["$avgSalary", 0] } } },
    ]);

    // 8. Monthly Trend
    const months = getLastNMonths(7);
    const startDate = new Date(months[0].year, months[0].monthNum - 1, 1);
    const placedAgg = await StudentPlacement.aggregate([
      {
        $match: {
          subDepartmentId: toId(id),
          "placedInfo.placedDate": { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$placedInfo.placedDate" },
            month: { $month: "$placedInfo.placedDate" }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    const placedMap = {};
    placedAgg.forEach((p) => {
      placedMap[`${p._id.year}-${p._id.month}`] = p.count;
    });
    const monthlyTrend = months.map((m) => ({
      month: m.month,
      placed: placedMap[`${m.year}-${m.monthNum}`] || 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        deptMeta,
        overview,
        funnel,
        breakdown,
        alerts,
        readyStudents,
        recentPlacements,
        topCompanies,
        monthlyTrend,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 10. Global Placement Dashboard ───────────────────────────
exports.getGlobalPlacementDashboard = async (req, res) => {
  try {
    const { sessionId, subDepartmentId } = req.query;

    const studentFilter = {
      status: { $nin: ["Dropped", "Dummy"] },
      isFTP: false,
    };

    if (subDepartmentId && subDepartmentId !== "All") {
      studentFilter.subDepartmentId = toId(subDepartmentId);
    } else if (!GLOBAL_ROLES.includes(req.user.role) && req.allowedSubDeptIds) {
      studentFilter.subDepartmentId = { $in: req.allowedSubDeptIds };
    }

    if (sessionId && sessionId !== "all" && sessionId !== "") {
      if (mongoose.Types.ObjectId.isValid(sessionId)) {
        studentFilter.sessionId = toId(sessionId);
      } else {
        const cleanSessionName = sessionId.replace(/^AY\s*/i, "").trim();
        const matchedSession = await Session.findOne({ name: new RegExp(cleanSessionName, "i") }).select("_id").lean();
        if (matchedSession) {
          studentFilter.sessionId = matchedSession._id;
        }
      }
    }

    // Matching student IDs
    const matchingStudentIds = await Student.find(studentFilter).distinct("_id");
    const totalStudents = matchingStudentIds.length;

    // Placement filter
    const placementFilter = {};
    if (subDepartmentId && subDepartmentId !== "All") {
      placementFilter.subDepartmentId = toId(subDepartmentId);
    } else if (!GLOBAL_ROLES.includes(req.user.role) && req.allowedSubDeptIds) {
      placementFilter.subDepartmentId = { $in: req.allowedSubDeptIds };
    }
    if (studentFilter.sessionId) {
      placementFilter.studentId = { $in: matchingStudentIds };
    }

    // 1. Overview counts
    const [readyStudents, interviewRunning, totalPlaced] = await Promise.all([
      StudentPlacement.countDocuments({
        ...placementFilter,
        readinessStatus: { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] }
      }),
      StudentPlacement.countDocuments({
        ...placementFilter,
        "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing", "Interview Scheduled", "Interview In Progress"] }
      }),
      StudentPlacement.countDocuments({
        ...placementFilter,
        placedInfo: { $ne: null }
      }),
    ]);

    const placementPercentage = totalStudents > 0
      ? parseFloat(((totalPlaced / totalStudents) * 100).toFixed(2))
      : 0;

    const overview = {
      totalStudents,
      readyStudents,
      interviewRunning,
      totalPlaced,
      placementPercentage
    };

    // 2. Funnel counts
    const [readyPlacement, readyDrive, funnelInterview, funnelSelected] = await Promise.all([
      StudentPlacement.countDocuments({
        ...placementFilter,
        readinessStatus: { $in: ["Ready", "Ready for Placement"] }
      }),
      StudentPlacement.countDocuments({
        ...placementFilter,
        readinessStatus: { $in: ["Ready for Interview", "Ready for Drive"] }
      }),
      interviewRunning,
      StudentPlacement.countDocuments({
        ...placementFilter,
        "PlacementinterviewRecord.status": "Selected",
        placedInfo: null
      }),
    ]);

    const funnel = {
      ready: readyStudents,
      readyPlacement,
      readyDrive,
      interview: funnelInterview,
      selected: funnelSelected,
      placed: totalPlaced
    };

    // 3. Departments performance
    const subDeptQuery = { isActive: true };
    if (!GLOBAL_ROLES.includes(req.user.role) && req.allowedSubDeptIds) {
      subDeptQuery._id = { $in: req.allowedSubDeptIds };
    }
    const allSubDepts = await SubDepartment.find(subDeptQuery).select("_id name code").lean();

    const studentDeptAgg = await Student.aggregate([
      { $match: studentFilter },
      { $group: { _id: "$subDepartmentId", total: { $sum: 1 } } }
    ]);
    const studentDeptMap = {};
    studentDeptAgg.forEach((s) => { if (s._id) studentDeptMap[s._id.toString()] = s.total; });

    const placedDeptAgg = await StudentPlacement.aggregate([
      { $match: { ...placementFilter, placedInfo: { $ne: null } } },
      { $group: { _id: "$subDepartmentId", placed: { $sum: 1 } } }
    ]);
    const placedDeptMap = {};
    placedDeptAgg.forEach((p) => { if (p._id) placedDeptMap[p._id.toString()] = p.placed; });

    const departments = allSubDepts.map((sd) => {
      const deptTotal = studentDeptMap[sd._id.toString()] || 0;
      const deptPlaced = placedDeptMap[sd._id.toString()] || 0;
      const pct = deptTotal > 0 ? parseFloat(((deptPlaced / deptTotal) * 100).toFixed(1)) : 0;
      return {
        subDepartmentId: sd._id.toString(),
        subDepartmentName: sd.name,
        subDepartmentCode: sd.code || sd.name,
        totalStudents: deptTotal,
        placedStudents: deptPlaced,
        placementPercentage: pct,
      };
    }).sort((a, b) => b.totalStudents - a.totalStudents);

    // 4. Alerts
    const studentsReadyButNoInterview = await StudentPlacement.countDocuments({
      ...placementFilter,
      readinessStatus: { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] },
      $or: [
        { PlacementinterviewRecord: { $size: 0 } },
        { PlacementinterviewRecord: { $not: { $elemMatch: { status: { $in: ["Scheduled", "Ongoing", "Selected", "Interview Scheduled"] } } } } }
      ]
    });

    const deptsWithStudents = departments.filter((d) => d.totalStudents > 0);
    let lowestPerformingDepartment = null;
    if (deptsWithStudents.length > 0) {
      const sortedByRate = [...deptsWithStudents].sort((a, b) => a.placementPercentage - b.placementPercentage);
      lowestPerformingDepartment = {
        subDepartmentId: sortedByRate[0].subDepartmentId,
        name: sortedByRate[0].subDepartmentName,
        placementPercentage: sortedByRate[0].placementPercentage
      };
    }

    const alerts = {
      studentsReadyButNoInterview,
      lowestPerformingDepartment
    };

    // 5. Companies
    const companies = await StudentPlacement.aggregate([
      { $match: { ...placementFilter, placedInfo: { $ne: null } } },
      {
        $group: {
          _id: "$placedInfo.companyName",
          totalHires: { $sum: 1 },
          hires: { $sum: 1 },
          avgSalary: { $avg: "$placedInfo.salary" }
        }
      },
      { $sort: { totalHires: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          companyName: "$_id",
          totalHires: 1,
          hires: 1,
          avgSalary: { $round: ["$avgSalary", 0] }
        }
      }
    ]);

    // 6. CTC Package Highlights
    const salaryAgg = await StudentPlacement.aggregate([
      { $match: { ...placementFilter, placedInfo: { $ne: null }, "placedInfo.salary": { $gt: 0 } } },
      {
        $group: {
          _id: null,
          highestSalary: { $max: "$placedInfo.salary" },
          avgSalary: { $avg: "$placedInfo.salary" }
        }
      }
    ]);

    const highestPackage = salaryAgg[0]?.highestSalary || 0;
    const averageSalary = Math.round(salaryAgg[0]?.avgSalary || 0);

    let highestPackageCompany = "—";
    if (highestPackage > 0) {
      const topOffer = await StudentPlacement.findOne({
        ...placementFilter,
        "placedInfo.salary": highestPackage
      }).select("placedInfo.companyName").lean();
      highestPackageCompany = topOffer?.placedInfo?.companyName || "—";
    }

    const driveCountQuery = {};
    if (subDepartmentId && subDepartmentId !== "All") {
      driveCountQuery.$or = [
        { subDepartmentId: toId(subDepartmentId) },
        { eligibleSubDepartments: toId(subDepartmentId) }
      ];
    }
    const drivesConducted = await PlacementDrive.countDocuments(driveCountQuery);

    const packageHighlights = {
      highestPackage,
      highestPackageCompany,
      averageSalary,
      drivesConducted,
      acceptanceRate: totalStudents > 0 ? parseFloat(((totalPlaced / totalStudents) * 100).toFixed(1)) : 0
    };

    // 7. Monthly Trend
    const months = getLastNMonths(7);
    const startDate = new Date(months[0].year, months[0].monthNum - 1, 1);

    const [placedMonthlyAgg, driveMonthlyAgg] = await Promise.all([
      StudentPlacement.aggregate([
        {
          $match: {
            ...placementFilter,
            "placedInfo.placedDate": { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$placedInfo.placedDate" },
              month: { $month: "$placedInfo.placedDate" }
            },
            count: { $sum: 1 }
          }
        }
      ]),
      PlacementDrive.aggregate([
        {
          $match: {
            ...driveCountQuery,
            driveDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$driveDate" },
              month: { $month: "$driveDate" }
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const placedMap = {};
    placedMonthlyAgg.forEach((p) => {
      placedMap[`${p._id.year}-${p._id.month}`] = p.count;
    });

    const drivesMap = {};
    driveMonthlyAgg.forEach((d) => {
      drivesMap[`${d._id.year}-${d._id.month}`] = d.count;
    });

    const monthlyTrend = months.map((m) => ({
      month: m.month,
      placed: placedMap[`${m.year}-${m.monthNum}`] || 0,
      drives: drivesMap[`${m.year}-${m.monthNum}`] || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        overview,
        funnel,
        departments,
        companies,
        alerts,
        monthlyTrend,
        packageHighlights,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

