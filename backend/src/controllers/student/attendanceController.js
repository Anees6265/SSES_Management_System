const Student = require("../../models/student/Student");

exports.getOverallAttendanceStats = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      gender = "",
      status = "",
      sortBy = "firstName",
      sortOrder = "asc",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Base filter — respect department filter from middleware
    const baseFilter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    if (gender && gender !== "all") baseFilter.gender = { $regex: new RegExp(gender, "i") };
    if (status && status !== "all") baseFilter.status = status;

    const sortObj = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const totalStudents = await Student.countDocuments(baseFilter);

    const students = await Student.find(baseFilter)
      .select("prkey firstName lastName fatherName email studentMobile gender status currentLevelId currentSubLevelId subDepartmentId")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .populate("subDepartmentId", "name")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const overallStats = await Student.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          maleCount: { $sum: { $cond: [{ $eq: [{ $toLower: "$gender" }, "male"] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: [{ $toLower: "$gender" }, "female"] }, 1, 0] } },
          activeCount: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
          placedCount: { $sum: { $cond: [{ $eq: ["$status", "Placed"] }, 1, 0] } },
        },
      },
    ]);

    const stats = overallStats[0] || {
      totalStudents: 0,
      maleCount: 0,
      femaleCount: 0,
      activeCount: 0,
      placedCount: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalStudents / limitNum),
          totalStudents,
          hasNextPage: pageNum < Math.ceil(totalStudents / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
        statistics: stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance statistics",
      error: error.message,
    });
  }
};
