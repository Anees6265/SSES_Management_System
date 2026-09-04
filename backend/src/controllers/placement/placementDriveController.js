const PlacementDrive = require("../../models/placement/PlacementDrive");
const StudentPlacement = require("../../models/placement/StudentPlacement");
const Company = require("../../models/company/company");
const Student = require("../../models/student/Student");
const StudentEventLog = require("../../models/student/StudentEventLog");

// 1. CREATE PLACEMENT DRIVE
exports.createDrive = async (req, res) => {
  try {
    const {
      companyName,
      companyLogo,
      companyWebsite,
      jobRole,
      technology,
      jobDescription,
      jobDescriptionURL,
      requiredSkills,
      packageCTC,
      jobLocation,
      workMode,
      driveDate,
      applicationDeadline,
      selectionProcess,
      vacancies,
      eligibleSubDepartments,
      eligibleTechnologies,
      minimumCriteria,
      subDepartmentId
    } = req.body;

    if (!companyName || !jobRole || !packageCTC || !jobLocation || !driveDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields: companyName, jobRole, packageCTC, jobLocation, driveDate"
      });
    }

    let company = await Company.findOne({ companyName });
    if (!company) {
      company = new Company({ companyName, location: jobLocation, hrEmail: "hr@" + companyName.toLowerCase().replace(/\s+/g, "") + ".com" });
      await company.save();
    }

    const drive = new PlacementDrive({
      companyRef: company._id,
      companyName,
      companyLogo: companyLogo || "",
      companyWebsite: companyWebsite || "",
      jobRole,
      technology: technology || "",
      jobDescription: jobDescription || "",
      jobDescriptionURL: jobDescriptionURL || "",
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? requiredSkills.split(",") : []),
      packageCTC,
      jobLocation,
      workMode: workMode || "WFO",
      driveDate: new Date(driveDate),
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      selectionProcess: selectionProcess || "",
      vacancies: vacancies || 1,
      eligibleSubDepartments: eligibleSubDepartments || [],
      eligibleTechnologies: Array.isArray(eligibleTechnologies) ? eligibleTechnologies : [],
      minimumCriteria: minimumCriteria || "",
      subDepartmentId: subDepartmentId || (req.user?.subDepartmentId || null),
      createdBy: req.user?._id || req.user?.id
    });

    await drive.save();

    res.status(201).json({
      success: true,
      message: "Placement Drive created successfully",
      data: drive
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET ALL DRIVES (Department-Filtered)
exports.getAllDrives = async (req, res) => {
  try {
    const filter = req.subDeptFilter || {};
    const drives = await PlacementDrive.find(filter)
      .populate("shortlistedStudents", "firstName lastName prkey email studentMobile techno technology technologies track course")
      .sort({ driveDate: -1 })
      .lean();

    res.json({ success: true, count: drives.length, data: drives });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. GET DRIVE BY ID
exports.getDriveById = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id)
      .populate("shortlistedStudents", "firstName lastName prkey email studentMobile techno technology technologies track course currentLevelId currentSubLevelId")
      .populate("resumeSharedStudents.studentId", "firstName lastName prkey email techno technology technologies track course")
      .lean();

    if (!drive) return res.status(404).json({ success: false, message: "Drive not found" });

    // Format candidate technology
    if (Array.isArray(drive.shortlistedStudents)) {
      drive.shortlistedStudents = drive.shortlistedStudents.map(student => {
        let actualTech = "Technology Not Updated";
        if (Array.isArray(student.technologies) && student.technologies.filter(Boolean).length > 0) {
          actualTech = student.technologies.filter(Boolean).join(" | ");
        } else if (Array.isArray(student.technology) && student.technology.filter(Boolean).length > 0) {
          actualTech = student.technology.filter(Boolean).join(" | ");
        } else {
          const t = student.techno || student.technology || student.track;
          if (t && typeof t === "string" && t.trim()) actualTech = t.trim();
        }
        return {
          ...student,
          technology: actualTech,
          techno: student.techno || student.technology || student.track || (actualTech !== "Technology Not Updated" ? actualTech : ""),
          track: student.track || (actualTech !== "Technology Not Updated" ? actualTech : "")
        };
      });
    }

    res.json({ success: true, data: drive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 4. SHORTLIST STUDENTS FOR DRIVE
exports.shortlistStudents = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "studentIds array is required" });
    }

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) return res.status(404).json({ success: false, message: "Drive not found" });

    // Append student IDs uniquely
    const currentList = drive.shortlistedStudents.map(id => id.toString());
    studentIds.forEach(id => {
      if (!currentList.includes(id.toString())) {
        drive.shortlistedStudents.push(id);
      }
    });

    await drive.save();

    res.json({
      success: true,
      message: `Shortlisted ${studentIds.length} students for ${drive.companyName} drive`,
      data: drive
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. BULK / SINGLE RESUME SHARING
exports.shareResumes = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "studentIds array is required" });
    }

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) return res.status(404).json({ success: false, message: "Drive not found" });

    const sharedBy = req.user?.name || req.user?.email || "Placement Officer";
    const placements = await StudentPlacement.find({ studentId: { $in: studentIds } });

    const placementMap = {};
    placements.forEach(p => {
      placementMap[p.studentId.toString()] = p.resumeURL;
    });

    const sharedResults = [];
    for (const sId of studentIds) {
      const existingShareIndex = drive.resumeSharedStudents.findIndex(
        item => item.studentId.toString() === sId.toString()
      );

      const resumeURL = placementMap[sId.toString()] || "";

      if (existingShareIndex > -1) {
        drive.resumeSharedStudents[existingShareIndex].sharedAt = new Date();
        drive.resumeSharedStudents[existingShareIndex].sharedBy = sharedBy;
        drive.resumeSharedStudents[existingShareIndex].status = "Shared";
        drive.resumeSharedStudents[existingShareIndex].resumeURL = resumeURL;
        sharedResults.push(drive.resumeSharedStudents[existingShareIndex]);
      } else {
        const newShare = {
          studentId: sId,
          resumeURL,
          sharedAt: new Date(),
          sharedBy,
          status: "Shared"
        };
        drive.resumeSharedStudents.push(newShare);
        sharedResults.push(newShare);
      }

      // Log event
      await StudentEventLog.create({
        studentId: sId,
        type: "placement",
        action: "resume_shared",
        title: `Resume Shared with ${drive.companyName}`,
        description: `Resume shared for drive "${drive.jobRole}" by ${sharedBy}`,
        createdBy: req.user?._id || req.user?.id,
        createdByName: sharedBy,
        createdByRole: req.user?.role || "placement_officer"
      }).catch(() => {});
    }

    await drive.save();

    res.json({
      success: true,
      message: `Resumes shared successfully for ${studentIds.length} candidate(s)`,
      data: drive.resumeSharedStudents
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. UPDATE RESUME SHARE STATUS (e.g., Company Reviewed, Shortlisted for Interview)
exports.updateResumeShareStatus = async (req, res) => {
  try {
    const { driveId, studentId } = req.params;
    const { status } = req.body;

    const validStatuses = ["Not Shared", "Shared", "Company Reviewed", "Shortlisted for Interview"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) return res.status(404).json({ success: false, message: "Drive not found" });

    const shareItem = drive.resumeSharedStudents.find(
      item => item.studentId.toString() === studentId.toString()
    );

    if (!shareItem) {
      return res.status(404).json({ success: false, message: "Resume share record not found for this candidate" });
    }

    shareItem.status = status;
    await drive.save();

    res.json({ success: true, message: "Resume share status updated", data: shareItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
