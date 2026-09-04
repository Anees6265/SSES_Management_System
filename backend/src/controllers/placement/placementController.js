const mongoose = require("mongoose");
const Student = require("../../models/student/Student");
const StudentPlacement = require("../../models/placement/StudentPlacement");
const Company = require("../../models/company/company");
const PlacementDrive = require("../../models/placement/PlacementDrive");
const PlacementInterview = require("../../models/placement/PlacementInterview");
const cloudinary = require("../../config/cloudinaryConfig");
const { withTransaction } = require("../../utils/withTransaction");

// ── Helper: build placement filter respecting dept access ────
const placementFilter = (req, extra = {}) => ({
  ...(req.subDeptFilter || {}),
  ...extra,
});

// 0. GET READY STUDENTS
exports.getReadyStudents = async (req, res) => {
  try {
    const { status, technology, search, subDepartmentId } = req.query;

    const queryFilter = {};
    if (subDepartmentId) {
      queryFilter.subDepartmentId = subDepartmentId;
    }

    if (status === "Ready for Placement") {
      queryFilter.readinessStatus = { $in: ["Ready", "Ready for Placement"] };
    } else if (status === "Ready for Drive") {
      queryFilter.readinessStatus = { $in: ["Ready for Interview", "Ready for Drive"] };
    } else if (status === "Interview") {
      queryFilter["PlacementinterviewRecord.status"] = { $in: ["Scheduled", "Ongoing"] };
    } else if (status === "Selected") {
      queryFilter["PlacementinterviewRecord.status"] = "Selected";
      queryFilter.placedInfo = null;
    } else if (status === "Placed") {
      queryFilter.placedInfo = { $ne: null };
    } else if (!status || status === "all") {
      queryFilter.readinessStatus = { $in: ["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"] };
    } else {
      queryFilter.readinessStatus = status;
    }

    const filter = placementFilter(req, queryFilter);

    const placements = await StudentPlacement.find(filter)
      .populate({
        path: "studentId",
        select: "firstName lastName prkey course studentMobile image track email status currentLevelId currentSubLevelId sessionId documents",
        populate: [
          { path: "currentLevelId", select: "name order" },
          { path: "currentSubLevelId", select: "name order" },
          { path: "sessionId", select: "name" }
        ]
      })
      .lean();

    let data = placements
      .filter((p) => p.studentId)
      .map((p) => {
        let stdStatus = p.readinessStatus;
        if (p.placedInfo) {
          stdStatus = "Placed";
        } else if (stdStatus === "Ready") {
          stdStatus = "Ready for Placement";
        } else if (stdStatus === "Ready for Interview") {
          stdStatus = "Ready for Drive";
        }

        return {
          _id: p.studentId._id,
          studentId: p.studentId._id,
          firstName: p.studentId.firstName,
          lastName: p.studentId.lastName,
          prkey: p.studentId.prkey,
          course: p.studentId.course,
          studentMobile: p.studentId.studentMobile,
          email: p.studentId.email,
          image: p.studentId.image,
          technology: (
            (Array.isArray(p.studentId.technologies) && p.studentId.technologies.filter(Boolean).length > 0)
              ? p.studentId.technologies.filter(Boolean).join(" | ")
              : (Array.isArray(p.studentId.technology) && p.studentId.technology.filter(Boolean).length > 0)
                ? p.studentId.technology.filter(Boolean).join(" | ")
                : (p.studentId.techno || p.studentId.technology || p.studentId.track || "Technology Not Updated")
          ),
          techno: p.studentId.techno || p.studentId.technology || p.studentId.track || "",
          track: p.studentId.track || "",

          currentLevel: p.studentId.currentLevelId?.name || "—",
          currentSubLevel: p.studentId.currentSubLevelId?.name || "—",
          sessionName: p.studentId.sessionId?.name || "—",
          readinessStatus: stdStatus,
          rawReadinessStatus: p.readinessStatus,
          resumeURL: p.resumeURL || p.studentId.documents?.find((d) => (d.title || "").toLowerCase().includes("resume") || d.fileType === "pdf")?.fileURL || "",
          hasResume: Boolean(p.resumeURL || p.studentId.documents?.some((d) => (d.title || "").toLowerCase().includes("resume"))),
          PlacementinterviewRecord: p.PlacementinterviewRecord,
          placedInfo: p.placedInfo,
        };
      });

    // Technology filter
    if (technology && technology !== "All") {
      data = data.filter((d) => (d.technology || "").toLowerCase().includes(technology.toLowerCase()));
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) =>
          `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
          d.prkey?.toLowerCase().includes(q) ||
          d.studentMobile?.includes(q) ||
          d.technology?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 1. CREATE/SCHEDULE INTERVIEW
exports.createInterview = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { companyName, hrEmail, hrContact, location, jobProfile, scheduleDate } = req.body;

    if (!companyName || !hrEmail || !location || !jobProfile || !scheduleDate) {
      return res.status(400).json({
        message: "Missing required fields: companyName, hrEmail, location, jobProfile, scheduleDate",
      });
    }

    const placement = await StudentPlacement.findOne(
      placementFilter(req, { studentId })
    );
    if (!placement || !["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"].includes(placement.readinessStatus)) {
      return res.status(400).json({ message: "Student not ready for placement or access denied" });
    }

    let company = await Company.findOne({ companyName });
    if (!company) {
      company = new Company({ companyName, hrEmail, hrContact: hrContact || "", location });
      await company.save();
    } else {
      company.hrEmail = hrEmail;
      company.hrContact = hrContact || company.hrContact;
      company.location = location;
      await company.save();
    }

    const newInterview = {
      companyRef: company._id,
      jobProfile,
      status: "Scheduled",
      scheduleDate: new Date(scheduleDate),
      rounds: [],
    };

    placement.PlacementinterviewRecord.push(newInterview);
    await placement.save();

    res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      data: { interview: newInterview, company },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. UPDATE INTERVIEW STATUS
exports.updateInterviewStatus = async (req, res) => {
  try {
    const { studentId, interviewId } = req.params;
    const { status, rescheduleDate } = req.body;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    interview.status = status;
    if (status === "Rescheduled" && rescheduleDate) {
      interview.rescheduleDate = new Date(rescheduleDate);
    }

    await placement.save();
    res.json({ success: true, message: "Interview status updated", data: interview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const StudentEventLog = require("../../models/student/StudentEventLog");

// ── Helper: Audit Logging for Placement Actions ───────────────
const logPlacementEvent = async ({ studentId, action, title, description, meta, req }) => {
  try {
    if (!studentId) return;
    await StudentEventLog.create({
      studentId,
      type: "placement",
      action,
      title,
      description: description || "",
      meta: meta || {},
      createdBy: req?.user?._id || null,
      createdByName: req?.user?.name || req?.user?.email || "Placement Officer",
      createdByRole: req?.user?.role || "placement_officer"
    });
  } catch (err) {
    console.error("Failed to log placement audit event:", err);
  }
};

// 3. ADD INTERVIEW ROUND (Enforces Sequential Round Rule)
exports.addInterviewRound = async (req, res) => {
  try {
    const { studentId, interviewId } = req.params;
    const { roundName, date, time, mode, feedback, result, interviewer, location } = req.body;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    // Sequential Round Validation Rule: Cannot add round if previous round was failed/rejected
    if (interview.rounds && interview.rounds.length > 0) {
      const prevRound = interview.rounds[interview.rounds.length - 1];
      const isPrevFailed = prevRound.result === "Not Cleared" || prevRound.result === "Failed" || prevRound.result === "Rejected";

      if (isPrevFailed) {
        return res.status(400).json({
          success: false,
          message: `Cannot schedule ${roundName || "next round"}. Candidate did not clear previous round (${prevRound.roundName}).`
        });
      }
    }

    const newRoundNumber = (interview.rounds?.length || 0) + 1;
    const finalRoundName = roundName || `Round ${newRoundNumber}`;

    const newRound = {
      roundName: finalRoundName,
      date: new Date(date || Date.now()),
      time: time || "",
      mode: mode || "Offline",
      interviewer: interviewer || "",
      location: location || "",
      feedback: feedback || "",
      status: "Scheduled",
      result: result || "Pending",
    };

    interview.rounds.push(newRound);
    interview.status = "Scheduled";
    await placement.save();

    // Log Activity Audit Event
    await logPlacementEvent({
      studentId: placement.studentId,
      action: "Round Scheduled",
      title: `${finalRoundName} Scheduled`,
      description: `${finalRoundName} for ${interview.companyName || 'Company'} scheduled for ${new Date(date || Date.now()).toLocaleDateString()} at ${time || 'TBD'}`,
      meta: {
        company: interview.companyName || "Company",
        round: finalRoundName,
        date: date || new Date(),
        time,
        mode
      },
      req
    });

    res.json({ success: true, message: `${finalRoundName} scheduled successfully`, data: newRound });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3b. MARK INTERVIEW / ROUND AS CONDUCTED
exports.markInterviewConducted = async (req, res) => {
  try {
    const { studentId, interviewId } = req.params;
    const { roundId, actualDate, actualTime, interviewer, remarks } = req.body;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    let targetRound = null;
    if (roundId) {
      targetRound = interview.rounds.id(roundId);
    } else if (interview.rounds && interview.rounds.length > 0) {
      targetRound = interview.rounds[interview.rounds.length - 1];
    }

    const conductedAt = actualDate ? new Date(actualDate) : new Date();

    if (targetRound) {
      targetRound.status = "Conducted";
      targetRound.conductedDate = conductedAt;
      if (actualTime) targetRound.conductedTime = actualTime;
      if (interviewer) targetRound.interviewer = interviewer;
      if (remarks) targetRound.conductedRemarks = remarks;
    }

    interview.status = "Conducted";
    interview.conductedDate = conductedAt;
    if (remarks) interview.statusRemark = remarks;

    await placement.save();

    // Log Activity Audit Event
    await logPlacementEvent({
      studentId: placement.studentId,
      action: "Interview Conducted",
      title: `Interview Conducted — ${targetRound ? targetRound.roundName : 'Round'}`,
      description: `Interview actually conducted on ${conductedAt.toLocaleDateString()} at ${actualTime || targetRound?.time || 'Scheduled Time'}. ${remarks || ''}`,
      meta: {
        company: interview.companyName || "Company",
        round: targetRound ? targetRound.roundName : "Round 1",
        conductedDate: conductedAt,
        conductedTime: actualTime,
        interviewer
      },
      req
    });

    res.json({ success: true, message: "Interview marked as Conducted", data: interview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. RESCHEDULE INTERVIEW (Preserves Complete History)
exports.rescheduleInterview = async (req, res) => {
  try {
    const { studentId, interviewId } = req.params;
    const { rescheduleDate, newDate, newTime, originalDate, originalTime, reason, rescheduledBy } = req.body;
    const dateValue = rescheduleDate || newDate;

    if (!dateValue) return res.status(400).json({ message: "rescheduleDate is required" });

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    const prevDate = originalDate ? new Date(originalDate) : (interview.scheduleDate || new Date());
    const prevTime = originalTime || (interview.rounds?.[0]?.time || "");
    const updatedDate = new Date(dateValue);

    interview.status = "Rescheduled";
    interview.rescheduleDate = updatedDate;
    interview.scheduleDate = updatedDate;
    if (reason) interview.statusRemark = reason;

    if (interview.rounds && interview.rounds.length > 0) {
      const activeRound = interview.rounds[interview.rounds.length - 1];
      activeRound.status = "Rescheduled";
      activeRound.date = updatedDate;
      if (newTime) activeRound.time = newTime;

      if (!Array.isArray(activeRound.rescheduleHistory)) activeRound.rescheduleHistory = [];
      activeRound.rescheduleHistory.push({
        originalDate: prevDate,
        originalTime: prevTime,
        newDate: updatedDate,
        newTime: newTime || "",
        reason: reason || "Rescheduled by Placement Officer",
        rescheduledBy: req.user?.name || req.user?.email || rescheduledBy || "Placement Officer",
        updatedAt: new Date(),
      });
    }

    if (!Array.isArray(interview.rescheduleHistory)) {
      interview.rescheduleHistory = [];
    }

    interview.rescheduleHistory.push({
      originalDate: prevDate,
      originalTime: prevTime,
      newDate: updatedDate,
      newTime: newTime || "",
      reason: reason || "Rescheduled by Placement Officer",
      rescheduledBy: req.user?.name || req.user?.email || rescheduledBy || "Placement Officer",
      updatedAt: new Date(),
    });

    await placement.save();

    // Log Activity Audit Event
    await logPlacementEvent({
      studentId: placement.studentId,
      action: "Interview Rescheduled",
      title: "Interview Rescheduled",
      description: `Rescheduled from ${prevDate.toLocaleDateString()} to ${updatedDate.toLocaleDateString()}. Reason: ${reason || "Not specified"}`,
      meta: {
        company: interview.companyName || "Company",
        originalDate: prevDate,
        originalTime: prevTime,
        newDate: updatedDate,
        newTime,
        reason
      },
      req
    });

    res.json({ success: true, message: "Interview rescheduled successfully", data: interview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4b. CANCEL INTERVIEW
exports.cancelInterview = async (req, res) => {
  try {
    const { studentId, interviewId } = req.params;
    const { reason, cancellationReason, statusRemark } = req.body;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    const finalReason = cancellationReason || reason || "Interview cancelled by Placement Officer";
    interview.status = "Cancelled";
    interview.cancellationReason = finalReason;
    interview.statusRemark = statusRemark || finalReason;
    await placement.save();

    // Log Activity Audit Event
    await logPlacementEvent({
      studentId: placement.studentId,
      action: "Interview Cancelled",
      title: "Interview Cancelled",
      description: `Cancelled. Reason: ${finalReason}`,
      meta: {
        company: interview.companyName || "Company",
        reason: finalReason
      },
      req
    });

    res.json({ success: true, message: "Interview cancelled successfully", data: interview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4c. UPDATE FINAL INTERVIEW RESULT / OFFER / JOINING (Requires Conducted State)
exports.updateFinalResult = async (req, res) => {
  try {
    const { studentId, interviewId } = req.params;
    const { status, roundResult, roundId, notJoiningReason, notJoiningRemarks, statusRemark, salary, joiningDate } = req.body;

    const validStatuses = [
      "Scheduled", "Interview Scheduled",
      "Rescheduled", "Interview Rescheduled",
      "Conducted", "Interview Conducted",
      "Result Pending",
      "Ongoing", "Interview In Progress",
      "Selected", "Not Selected",
      "Offer Received", "Offer Accepted", "Offer Declined",
      "Did Not Join", "Placed", "Cancelled", "OnHold"
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview record not found" });

    let activeRound = null;
    if (roundId) activeRound = interview.rounds.id(roundId);
    else if (interview.rounds && interview.rounds.length > 0) activeRound = interview.rounds[interview.rounds.length - 1];

    // Require Conducted status before recording round result
    if (activeRound && roundResult) {
      if (activeRound.status !== "Conducted" && !activeRound.conductedDate && interview.status !== "Conducted") {
        return res.status(400).json({
          success: false,
          message: "Interview must be marked as Conducted before recording result."
        });
      }
      activeRound.result = roundResult;
      activeRound.status = ["Cleared", "Passed"].includes(roundResult) ? "Cleared" : "Not Cleared";
    }

    const finalStatus = status || (roundResult === "Cleared" ? "Ongoing" : roundResult === "Not Cleared" ? "Not Selected" : interview.status);
    interview.status = finalStatus;
    if (statusRemark) interview.statusRemark = statusRemark;

    if (["Did Not Join", "Offer Declined"].includes(finalStatus)) {
      interview.notJoiningReason = notJoiningReason || "";
      interview.notJoiningRemarks = notJoiningRemarks || statusRemark || "";
    }

    if (finalStatus === "Placed") {
      const company = await Company.findById(interview.companyRef);
      placement.placedInfo = {
        companyRef: interview.companyRef,
        interviewRecordId: interview._id,
        companyName: company?.companyName || "Company",
        salary: Number(salary) || 0,
        location: company?.location || "Offline",
        jobProfile: interview.jobProfile,
        jobType: "Full-Time",
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        placedDate: new Date(),
      };
      await Student.findByIdAndUpdate(studentId, { status: "Placed" });
      placement.readinessStatus = "Placed";
    }

    await placement.save();

    // Log Activity Audit Event
    await logPlacementEvent({
      studentId: placement.studentId,
      action: "Result Recorded",
      title: `Result Recorded — ${roundResult || finalStatus}`,
      description: `Result for ${activeRound ? activeRound.roundName : 'Interview'}: ${roundResult || finalStatus}. ${statusRemark || ''}`,
      meta: {
        company: interview.companyName || "Company",
        round: activeRound ? activeRound.roundName : "Round 1",
        result: roundResult || finalStatus,
        statusRemark
      },
      req
    });

    res.json({ success: true, message: `Interview status updated to "${finalStatus}" successfully`, data: interview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. GET SELECTED STUDENTS
exports.getSelectedStudents = async (req, res) => {
  try {
    const filter = placementFilter(req, {
      "PlacementinterviewRecord.status": "Selected",
      placedInfo: null,
    });

    const placements = await StudentPlacement.find(filter)
      .populate("studentId", "firstName lastName prkey course studentMobile image")
      .populate("PlacementinterviewRecord.companyRef", "companyName location")
      .lean();

    const data = placements.map((p) => ({
      _id: p.studentId?._id,
      firstName: p.studentId?.firstName,
      lastName: p.studentId?.lastName,
      name: p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "—",
      prkey: p.studentId?.prkey,
      course: p.studentId?.course,
      studentMobile: p.studentId?.studentMobile,
      image: p.studentId?.image,
      readinessStatus: p.readinessStatus,
      selectedInterviews: p.PlacementinterviewRecord.filter((i) => i.status === "Selected"),
      PlacementinterviewRecord: p.PlacementinterviewRecord,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 6. CONFIRM PLACEMENT
exports.confirmPlacement = async (req, res) => {
  try {
    const { studentId, companyName, salary, location, jobProfile, jobType = "Full-Time", joiningDate } = req.body;

    if (!studentId || !companyName || !salary || !location || !jobProfile) {
      return res.status(400).json({
        message: "Missing required fields: studentId, companyName, salary, location, jobProfile",
      });
    }

    // Pre-flight checks before opening transaction
    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });
    if (placement.placedInfo) return res.status(400).json({ message: "Student is already placed" });

    // Upload documents to Cloudinary BEFORE transaction — Cloudinary is external,
    // cannot be rolled back, so do it outside the DB transaction
    const { offerLetter, commitmentApplication } = req.body;
    let offerLetterURL = null;
    let applicationURL = null;

    if (offerLetter) {
      const r = await cloudinary.uploader.upload(offerLetter, {
        folder: "placement-documents/offer-letters",
        resource_type: "auto",
        public_id: `${studentId}_offer_${Date.now()}`,
      });
      offerLetterURL = r.secure_url;
    }

    if (commitmentApplication) {
      const r = await cloudinary.uploader.upload(commitmentApplication, {
        folder: "placement-documents/applications",
        resource_type: "auto",
        public_id: `${studentId}_application_${Date.now()}`,
      });
      applicationURL = r.secure_url;
    }

    // Resolve company and interview record
    const selectedInterview = placement.PlacementinterviewRecord.find(
      (i) => i.status === "Selected" && i.jobProfile === jobProfile
    );

    let companyRef;
    let interviewRecordId = null;

    if (selectedInterview) {
      companyRef = selectedInterview.companyRef;
      interviewRecordId = selectedInterview._id;
    } else {
      let company = await Company.findOne({ companyName });
      if (!company) {
        company = new Company({ companyName, headOffice: location, hrEmail: "", hrContact: "" });
        await company.save();
      }
      companyRef = company._id;
    }

    const placedInfoPayload = {
      companyRef,
      interviewRecordId,
      companyName,
      salary,
      location,
      jobProfile,
      jobType,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      offerLetterURL,
      applicationURL,
    };

    // Atomic write — placement.placedInfo + Student.status = "Placed" together
    // If either fails, both are rolled back (on replica set) or both run (standalone)
    await withTransaction(async (session) => {
      placement.placedInfo = placedInfoPayload;
      await placement.save({ session });
      await Student.findByIdAndUpdate(
        studentId,
        { status: "Placed" },
        { session }
      );
    });

    res.json({
      success: true,
      message: selectedInterview
        ? "Student placement confirmed from interview process"
        : "Student placement confirmed directly",
      data: placedInfoPayload,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. GET PLACED STUDENTS
exports.getPlacedStudents = async (req, res) => {
  try {
    const filter = placementFilter(req, { placedInfo: { $ne: null } });

    const placements = await StudentPlacement.find(filter)
      .populate("studentId", "firstName lastName prkey course email studentMobile image")
      .populate("placedInfo.companyRef", "companyName location companyLogo")
      .lean();

    const data = placements.map((p) => ({
      _id: p.studentId?._id,
      firstName: p.studentId?.firstName,
      lastName: p.studentId?.lastName,
      prkey: p.studentId?.prkey,
      course: p.studentId?.course,
      email: p.studentId?.email,
      studentMobile: p.studentId?.studentMobile,
      image: p.studentId?.image,
      readinessStatus: p.readinessStatus,
      placedInfo: p.placedInfo,
      PlacementinterviewRecord: p.PlacementinterviewRecord,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 8. UPDATE JOB TYPE
exports.updateJobType = async (req, res) => {
  try {
    const { studentId, interviewId, newJobType, newJobProfile, internshipEndDate } = req.body;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interview = placement.PlacementinterviewRecord.id(interviewId);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    interview.internshipToJobUpdate = {
      isIntern: newJobType === "Internship",
      internshipEndDate: internshipEndDate || "",
      updatedJobProfile: newJobProfile || interview.jobProfile,
    };

    if (placement.placedInfo && placement.placedInfo.interviewRecordId?.toString() === interviewId) {
      placement.placedInfo.jobType = newJobType;
      placement.placedInfo.jobProfile = newJobProfile || placement.placedInfo.jobProfile;
    }

    await placement.save();
    res.json({ success: true, message: "Job type updated successfully", data: interview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 9. UPDATE PLACEMENT INFO
exports.updatePlacementInfo = async (req, res) => {
  try {
    const { id } = req.params; // studentId
    const allowedFields = ["salary", "location", "jobProfile", "jobType", "joiningDate"];
    const updateData = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updateData[`placedInfo.${f}`] = req.body[f];
    });

    const placement = await StudentPlacement.findOneAndUpdate(
      placementFilter(req, { studentId: id }),
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    res.json({ success: true, message: "Placement info updated", data: placement.placedInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 10. CREATE PLACEMENT POST
exports.createPlacementPost = async (req, res) => {
  try {
    const { studentId, position, companyName, location, hrEmail, companyLogo, headOffice, studentImage } = req.body;

    if (!studentId || !position || !companyName || !headOffice) {
      return res.status(400).json({ message: "Missing required fields: studentId, position, companyName, headOffice" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    let company = await Company.findOne({ companyName });

    if (!company) {
      if (!companyLogo) return res.status(400).json({ message: "Company logo is required for new company" });
      let logoURL = companyLogo;
      if (companyLogo.startsWith("data:image/")) {
        const r = await cloudinary.uploader.upload(companyLogo, { folder: "company-logos", resource_type: "image" });
        logoURL = r.secure_url;
      }
      company = new Company({
        companyName,
        companyLogo: logoURL,
        headOffice,
        location: location || headOffice,
        hrEmail: hrEmail || "not-provided@example.com",
      });
      await company.save();
    } else {
      if (companyLogo?.startsWith("data:image/")) {
        const r = await cloudinary.uploader.upload(companyLogo, { folder: "company-logos", resource_type: "image" });
        company.companyLogo = r.secure_url;
        await company.save();
      }
    }

    let finalStudentImage = studentImage || student.image;
    if (!finalStudentImage) return res.status(400).json({ message: "Student image is required" });
    if (finalStudentImage.startsWith("data:image/")) {
      const r = await cloudinary.uploader.upload(finalStudentImage, { folder: "student-images", resource_type: "image" });
      finalStudentImage = r.secure_url;
    }

    res.status(200).json({
      success: true,
      message: "Placement post data prepared successfully",
      data: {
        student: { id: student._id, name: `${student.firstName} ${student.lastName}`, course: student.course, image: finalStudentImage },
        company: { id: company._id, name: company.companyName, logo: company.companyLogo, headOffice: company.headOffice },
        position,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 11. UPDATE PLACEMENT POST
exports.updatePlacementPost = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { position, companyName, headOffice, companyLogo, studentImage } = req.body;

    if (!position || !companyName || !headOffice) {
      return res.status(400).json({ message: "Missing required fields: position, companyName, headOffice" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const company = await Company.findOne({ companyName });
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (companyLogo?.startsWith("data:image/")) {
      const r = await cloudinary.uploader.upload(companyLogo, { folder: "company-logos", resource_type: "image" });
      company.companyLogo = r.secure_url;
    }
    company.headOffice = headOffice;
    await company.save();

    let finalStudentImage = student.image;
    if (studentImage?.startsWith("data:image/")) {
      const r = await cloudinary.uploader.upload(studentImage, { folder: "student-images", resource_type: "image" });
      finalStudentImage = r.secure_url;
      student.image = finalStudentImage;
      await student.save();
    }

    const placement = await StudentPlacement.findOne({ studentId });
    if (placement?.placedInfo) {
      placement.placedInfo.jobProfile = position;
      await placement.save();
    }

    res.status(200).json({
      success: true,
      message: "Placement post updated successfully",
      data: {
        student: { id: student._id, name: `${student.firstName} ${student.lastName}`, image: finalStudentImage, course: student.course },
        company: { id: company._id, name: company.companyName, logo: company.companyLogo, headOffice: company.headOffice },
        position,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 12. CREATE COMPANY (WITH DUPLICATE PREVENTION & VALIDATION)
exports.createCompany = async (req, res) => {
  try {
    const {
      companyName,
      companyLogo,
      website,
      companyEmail,
      companyContact,
      hrEmail,
      hrContact,
      address,
      city,
      state,
      country,
      location,
      industry,
      companyType,
      description,
      contactPersonName,
      designation,
      contactPersonEmail,
      contactPersonPhone,
      status
    } = req.body;

    // 1. Mandatory field validation
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ success: false, message: "Company Name is required." });
    }

    // 2. Email format validation
    const emailToValidate = companyEmail || contactPersonEmail || hrEmail;
    if (emailToValidate && emailToValidate.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailToValidate.trim())) {
        return res.status(400).json({ success: false, message: "Please enter a valid email address." });
      }
    }

    // 3. Normalized Duplicate Prevention Check
    const trimmedName = companyName.trim();
    const norm = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const existingCompany = await Company.findOne({
      $or: [
        { normalizedName: norm },
        { companyName: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") } }
      ]
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: "A company with this name already exists.",
        existingCompany
      });
    }

    const newCompany = new Company({
      companyName: trimmedName,
      normalizedName: norm,
      companyLogo: companyLogo || "",
      website: website ? website.trim() : "",
      companyEmail: companyEmail ? companyEmail.trim() : (hrEmail ? hrEmail.trim() : ""),
      companyContact: companyContact ? companyContact.trim() : (hrContact ? hrContact.trim() : ""),
      hrEmail: hrEmail ? hrEmail.trim() : (contactPersonEmail ? contactPersonEmail.trim() : (companyEmail ? companyEmail.trim() : "")),
      hrContact: hrContact ? hrContact.trim() : (contactPersonPhone ? contactPersonPhone.trim() : (companyContact ? companyContact.trim() : "")),
      address: address ? address.trim() : "",
      city: city ? city.trim() : "",
      state: state ? state.trim() : "",
      country: country ? country.trim() : "",
      location: location ? location.trim() : ([city, state, country].filter(Boolean).join(", ") || "Not provided"),
      headOffice: address ? address.trim() : "",
      industry: industry ? industry.trim() : "IT Services",
      companyType: companyType || "IT Services",
      description: description ? description.trim() : "",
      contactPersonName: contactPersonName ? contactPersonName.trim() : "",
      designation: designation ? designation.trim() : "",
      contactPersonEmail: contactPersonEmail ? contactPersonEmail.trim() : "",
      contactPersonPhone: contactPersonPhone ? contactPersonPhone.trim() : "",
      status: status || "Active"
    });

    await newCompany.save();

    res.status(201).json({
      success: true,
      message: "Company added successfully.",
      data: newCompany
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: "A company with this name already exists."
      });
    }
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 12b. CHECK COMPANY DUPLICATE
exports.checkCompanyDuplicate = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || !name.trim()) {
      return res.status(200).json({ success: true, exists: false });
    }

    const trimmedName = name.trim();
    const norm = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const existingCompany = await Company.findOne({
      $or: [
        { normalizedName: norm },
        { companyName: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") } }
      ]
    });

    if (existingCompany) {
      return res.status(200).json({
        success: true,
        exists: true,
        existingCompany
      });
    }

    res.status(200).json({ success: true, exists: false });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 13. GET ALL COMPANIES (WITH SEARCH, INDUSTRY, LOCATION, STATUS FILTERS)
exports.getAllCompanies = async (req, res) => {
  try {
    const { status, search, industry, location } = req.query;
    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (industry && industry !== "All") {
      filter.industry = { $regex: new RegExp(industry, "i") };
    }

    if (location && location !== "All") {
      filter.location = { $regex: new RegExp(location, "i") };
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { hrEmail: { $regex: q, $options: "i" } },
        { companyEmail: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { contactPersonName: { $regex: q, $options: "i" } },
        { industry: { $regex: q, $options: "i" } }
      ];
    }

    const companies = await Company.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 13b. GET COMPANY BY ID (WITH PLACEMENT DRIVES & STUDENT STATS)
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    // Fetch placement drives for this company
    const drives = await PlacementDrive.find({
      $or: [
        { companyRef: company._id },
        { companyName: { $regex: new RegExp("^" + company.companyName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") } }
      ]
    }).sort({ driveDate: -1 });

    const driveIds = drives.map(d => d._id);

    // Calculate Placement & Student Stats
    const totalDrives = drives.length;

    // Shortlisted students count
    const shortlistedSet = new Set();
    drives.forEach(d => {
      if (Array.isArray(d.shortlistedStudents)) {
        d.shortlistedStudents.forEach(sid => shortlistedSet.add(sid.toString()));
      }
    });

    // Student Placement records for this company
    const studentPlacements = await StudentPlacement.find({
      $or: [
        { companyRef: company._id },
        { "placedInfo.companyName": { $regex: new RegExp("^" + company.companyName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") } }
      ]
    }).populate("studentId", "firstName lastName email studentMobile profileImage course stream");

    // Interviews count
    let interviewingCount = 0;
    let selectedCount = 0;
    if (PlacementInterview) {
      const interviews = await PlacementInterview.find({
        $or: [
          { companyRef: company._id },
          { driveId: { $in: driveIds } },
          { companyName: { $regex: new RegExp("^" + company.companyName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") } }
        ]
      });
      interviewingCount = interviews.filter(i => ["Scheduled", "Ongoing", "Rescheduled"].includes(i.status)).length;
      selectedCount = interviews.filter(i => i.status === "Selected").length;
    }

    const placedCount = studentPlacements.filter(p => p.placementStatus === "Placed" || p.placedInfo?.jobProfile).length;
    const totalStudents = Math.max(shortlistedSet.size, studentPlacements.length, placedCount);

    res.status(200).json({
      success: true,
      data: {
        company,
        drives,
        studentPlacements,
        stats: {
          totalDrives,
          totalStudents,
          shortlisted: shortlistedSet.size,
          interviewing: interviewingCount,
          selected: selectedCount,
          placed: placedCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 13c. GET COMPANY BY NAME
exports.getCompanyByName = async (req, res) => {
  try {
    const company = await Company.findOne({
      $or: [
        { companyName: req.params.companyName },
        { normalizedName: req.params.companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") }
      ]
    });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 13d. UPDATE COMPANY
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const {
      companyName,
      companyLogo,
      website,
      companyEmail,
      companyContact,
      hrEmail,
      hrContact,
      address,
      city,
      state,
      country,
      location,
      industry,
      companyType,
      description,
      contactPersonName,
      designation,
      contactPersonEmail,
      contactPersonPhone,
      status
    } = req.body;

    if (companyName && companyName.trim()) {
      const trimmedName = companyName.trim();
      const norm = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check collision with another company
      const collision = await Company.findOne({
        _id: { $ne: req.params.id },
        $or: [
          { normalizedName: norm },
          { companyName: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") } }
        ]
      });

      if (collision) {
        return res.status(409).json({
          success: false,
          message: "Another company with this name already exists."
        });
      }

      company.companyName = trimmedName;
      company.normalizedName = norm;
    }

    if (companyLogo !== undefined) company.companyLogo = companyLogo;
    if (website !== undefined) company.website = website.trim();
    if (companyEmail !== undefined) company.companyEmail = companyEmail.trim();
    if (companyContact !== undefined) company.companyContact = companyContact.trim();
    if (hrEmail !== undefined) company.hrEmail = hrEmail.trim();
    if (hrContact !== undefined) company.hrContact = hrContact.trim();
    if (address !== undefined) company.address = address.trim();
    if (city !== undefined) company.city = city.trim();
    if (state !== undefined) company.state = state.trim();
    if (country !== undefined) company.country = country.trim();
    if (location !== undefined) company.location = location.trim();
    if (industry !== undefined) company.industry = industry.trim();
    if (companyType !== undefined) company.companyType = companyType;
    if (description !== undefined) company.description = description.trim();
    if (contactPersonName !== undefined) company.contactPersonName = contactPersonName.trim();
    if (designation !== undefined) company.designation = designation.trim();
    if (contactPersonEmail !== undefined) company.contactPersonEmail = contactPersonEmail.trim();
    if (contactPersonPhone !== undefined) company.contactPersonPhone = contactPersonPhone.trim();
    if (status !== undefined) company.status = status;

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company updated successfully.",
      data: company
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 13e. TOGGLE COMPANY ACTIVE/INACTIVE STATUS
exports.toggleCompanyStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const newStatus = req.body.status || (company.status === "Active" ? "Inactive" : "Active");
    company.status = newStatus;
    await company.save();

    res.status(200).json({
      success: true,
      message: `Company status changed to ${newStatus}.`,
      data: company
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// 14. UPLOAD PLACEMENT DOCUMENTS
exports.uploadPlacementDocuments = async (req, res) => {
  try {
    const { studentId, offerLetter, commitmentApplication, uploadedBy } = req.body;

    if (!studentId || !offerLetter || !commitmentApplication || !uploadedBy) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });
    if (!placement.placedInfo) return res.status(400).json({ message: "Student is not placed yet" });
    if (placement.offerLetter && placement.commitmentApplication) {
      return res.status(400).json({ message: "Documents already uploaded" });
    }

    placement.offerLetter = offerLetter;
    placement.commitmentApplication = commitmentApplication;
    placement.documentsUploadedBy = uploadedBy;
    placement.documentsUploadedAt = new Date();
    await placement.save();

    res.status(200).json({ success: true, message: "Placement documents uploaded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 15. GET PLACEMENT DOCUMENTS
exports.getPlacementDocuments = async (req, res) => {
  try {
    const { studentId } = req.params;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }))
      .populate("studentId", "firstName lastName")
      .select("studentId offerLetter commitmentApplication documentsUploadedBy documentsUploadedAt");

    if (!placement) return res.status(404).json({ message: "No documents found or access denied" });

    res.status(200).json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 16. GET STUDENT INTERVIEW HISTORY
exports.getStudentInterviewHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }))
      .populate("PlacementinterviewRecord.companyRef")
      .populate("studentId", "firstName lastName");

    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const interviews = placement.PlacementinterviewRecord.map((i) => ({
      _id: i._id,
      jobProfile: i.jobProfile,
      status: i.status,
      scheduleDate: i.scheduleDate,
      rescheduleDate: i.rescheduleDate,
      rounds: i.rounds,
      company: i.companyRef
        ? { _id: i.companyRef._id, companyName: i.companyRef.companyName, location: i.companyRef.location, companyLogo: i.companyRef.companyLogo }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        studentName: placement.studentId ? `${placement.studentId.firstName} ${placement.studentId.lastName}` : "—",
        totalInterviews: interviews.length,
        interviews,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 17. GET PLACED STUDENTS BY COMPANY
exports.getPlacedStudentsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const filter = placementFilter(req, { "placedInfo.companyRef": companyId });

    const placements = await StudentPlacement.find(filter)
      .populate("studentId", "firstName lastName email studentMobile course stream")
      .populate("placedInfo.companyRef", "companyName companyLogo location")
      .lean();

    res.status(200).json({
      success: true,
      company: company.companyName,
      totalPlaced: placements.length,
      students: placements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 18. UPLOAD RESUME BASE64
exports.uploadResumeBase64 = async (req, res) => {
  try {
    const { studentId, resumeBase64 } = req.body;
    if (!studentId || !resumeBase64) return res.status(400).json({ message: "studentId and resumeBase64 are required" });

    const placement = await StudentPlacement.findOne(placementFilter(req, { studentId }));
    if (!placement) return res.status(404).json({ message: "Student placement not found or access denied" });

    const result = await cloudinary.uploader.upload(resumeBase64, {
      folder: "student-resumes",
      resource_type: "auto",
      public_id: `${studentId}_resume_${Date.now()}`,
    });

    placement.resumeURL = result.secure_url;
    await placement.save();

    res.json({ success: true, message: "Resume uploaded successfully", resumeURL: result.secure_url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
