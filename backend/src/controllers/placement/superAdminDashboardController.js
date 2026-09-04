const Student = require("../../models/student/Student");
const StudentPlacement = require("../../models/placement/StudentPlacement");
const SubDepartment = require("../../models/department/SubDepartment");

// ── Valid placement students filter ─────────────────────────
// Active + not on permission leave + isFTP false (placement eligible)
const VALID_STUDENT_FILTER = {
  status: "Active",
  isFTP: false,
  permissionDetails: null,
};

// ── 1. Overview ──────────────────────────────────────────────
exports.getOverview = async (req, res) => {
  try {
    // Total valid placement-eligible students
    const totalStudents = await Student.countDocuments(VALID_STUDENT_FILTER);

    // Ready students (from StudentPlacement)
    const readyStudents = await StudentPlacement.countDocuments({
      readinessStatus: { $in: ["Ready", "Ready for Interview"] },
    });

    // Interviews currently running
    const interviewRunning = await StudentPlacement.countDocuments({
      "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing"] },
    });

    // Total placed — includes ALL students (any year) with placedInfo
    const totalPlaced = await StudentPlacement.countDocuments({
      placedInfo: { $ne: null },
    });

    const placementPercentage =
      totalStudents > 0
        ? parseFloat(((totalPlaced / totalStudents) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        readyStudents,
        interviewRunning,
        totalPlaced,
        placementPercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 2. Department-wise breakdown ─────────────────────────────
exports.getDepartmentStats = async (req, res) => {
  try {
    // Valid students grouped by subDepartment
    const studentsByDept = await Student.aggregate([
      { $match: VALID_STUDENT_FILTER },
      {
        $group: {
          _id: "$subDepartmentId",
          totalStudents: { $sum: 1 },
        },
      },
    ]);

    // Placed students grouped by subDepartment
    const placedByDept = await StudentPlacement.aggregate([
      { $match: { placedInfo: { $ne: null } } },
      {
        $group: {
          _id: "$subDepartmentId",
          placedStudents: { $sum: 1 },
        },
      },
    ]);

    // Merge both
    const placedMap = {};
    placedByDept.forEach((d) => {
      placedMap[d._id?.toString()] = d.placedStudents;
    });

    // Get subDepartment names
    const subDeptIds = studentsByDept.map((d) => d._id);
    const subDepts = await SubDepartment.find({ _id: { $in: subDeptIds } })
      .select("name departmentId")
      .lean();
    const subDeptMap = {};
    subDepts.forEach((s) => { subDeptMap[s._id.toString()] = s; });

    const result = studentsByDept
      .map((d) => {
        const placed = placedMap[d._id?.toString()] || 0;
        const pct = d.totalStudents > 0
          ? parseFloat(((placed / d.totalStudents) * 100).toFixed(2))
          : 0;
        return {
          subDepartmentId: d._id,
          subDepartmentName: subDeptMap[d._id?.toString()]?.name || "",
          totalStudents: d.totalStudents,
          placedStudents: placed,
          placementPercentage: pct,
        };
      })
      .sort((a, b) => b.placementPercentage - a.placementPercentage);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 3. Placement Funnel ──────────────────────────────────────
exports.getPlacementFunnel = async (req, res) => {
  try {
    const [ready, interview, selected, placed] = await Promise.all([
      // Ready = readinessStatus Ready or Ready for Interview
      StudentPlacement.countDocuments({
        readinessStatus: { $in: ["Ready", "Ready for Interview"] },
      }),
      // Interview running = Scheduled or Ongoing
      StudentPlacement.countDocuments({
        "PlacementinterviewRecord.status": { $in: ["Scheduled", "Ongoing"] },
      }),
      // Selected = interview status Selected but not yet placed
      StudentPlacement.countDocuments({
        "PlacementinterviewRecord.status": "Selected",
        placedInfo: null,
      }),
      // Placed = placedInfo exists
      StudentPlacement.countDocuments({
        placedInfo: { $ne: null },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { ready, interview, selected, placed },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. Top Companies ─────────────────────────────────────────
exports.getTopCompanies = async (req, res) => {
  try {
    const topCompanies = await StudentPlacement.aggregate([
      { $match: { placedInfo: { $ne: null } } },
      {
        $group: {
          _id: "$placedInfo.companyName",
          totalHires: { $sum: 1 },
          avgSalary: { $avg: "$placedInfo.salary" },
        },
      },
      { $sort: { totalHires: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          companyName: "$_id",
          totalHires: 1,
          avgSalary: { $round: ["$avgSalary", 0] },
        },
      },
    ]);

    return res.status(200).json({ success: true, data: topCompanies });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 5. Alerts ────────────────────────────────────────────────
exports.getAlerts = async (req, res) => {
  try {
    // Students who are Ready but have NO interview scheduled
    const studentsReadyButNoInterview = await StudentPlacement.countDocuments({
      readinessStatus: { $in: ["Ready", "Ready for Interview"] },
      $or: [
        { PlacementinterviewRecord: { $size: 0 } },
        {
          PlacementinterviewRecord: {
            $not: {
              $elemMatch: {
                status: { $in: ["Scheduled", "Ongoing", "Selected"] },
              },
            },
          },
        },
      ],
    });

    // Lowest performing department by placement %
    const deptStats = await StudentPlacement.aggregate([
      { $match: { placedInfo: { $ne: null } } },
      {
        $group: {
          _id: "$subDepartmentId",
          placedStudents: { $sum: 1 },
        },
      },
    ]);

    const studentCounts = await Student.aggregate([
      { $match: VALID_STUDENT_FILTER },
      { $group: { _id: "$subDepartmentId", totalStudents: { $sum: 1 } } },
    ]);

    const placedMap = {};
    deptStats.forEach((d) => { placedMap[d._id?.toString()] = d.placedStudents; });

    let lowestDept = null;
    let lowestPct = Infinity;

    for (const dept of studentCounts) {
      const placed = placedMap[dept._id?.toString()] || 0;
      const pct = dept.totalStudents > 0 ? (placed / dept.totalStudents) * 100 : 0;
      if (pct < lowestPct) {
        lowestPct = pct;
        lowestDept = dept._id;
      }
    }

    // Get name of lowest dept
    let lowestDeptName = "";
    if (lowestDept) {
      const subDept = await SubDepartment.findById(lowestDept).select("name");
      lowestDeptName = subDept?.name || "";
    }

    return res.status(200).json({
      success: true,
      data: {
        studentsReadyButNoInterview,
        lowestPerformingDepartment: {
          subDepartmentId: lowestDept,
          name: lowestDeptName,
          placementPercentage: lowestPct === Infinity ? 0 : parseFloat(lowestPct.toFixed(2)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
