import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Line,
  Circle,
  G,
} from "@react-pdf/renderer";

import collegeLogo from "../../../assets/images/logo-ssism.png";
import itegLogo from "../../../assets/images/iteg-logo.png";
import megLogo from "../../../assets/images/meg-logo.png";
import begLogo from "../../../assets/images/beg-logo.png";
import ssecLogo from "../../../assets/images/ssec-logo.png";
import profileIcon from "../../../assets/icons/StuReportprofile_icon.png";
import courseIcon from "../../../assets/icons/StuReportCourse_icon.png";
import mailIcon from "../../../assets/icons/StuReportMail_icon.png";
import fatherIcon from "../../../assets/icons/StuReportFather_icon.png";
import contactIcon from "../../../assets/icons/StuReport_Phone.png";
import addressIcon from "../../../assets/icons/StuReportAddress_icon.png";
import { detectDepartment, DEPARTMENT_CONFIGS, mapInterviewItemName, getDepartmentLogo } from "./reportCardDepartmentConfig";

const translateLevelName = (name) => {
  if (!name) return "";
  const cleaned = name.trim().toLowerCase();
  if (cleaned.includes("level 1") || cleaned.includes("1a") || cleaned.includes("1b") || cleaned.includes("1c")) return "1st Year";
  if (cleaned.includes("level 2") || cleaned.includes("2a") || cleaned.includes("2b") || cleaned.includes("2c")) return "2nd Year";
  if (cleaned.includes("level 3") || cleaned.includes("3a") || cleaned.includes("3b") || cleaned.includes("3c")) return "3rd Year";
  if (cleaned.includes("level 4") || cleaned.includes("4a") || cleaned.includes("4b") || cleaned.includes("4c")) return "4th Year";

  const numMatch = name.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    if (num === "1") return "1st Year";
    if (num === "2") return "2nd Year";
    if (num === "3") return "3rd Year";
    if (num === "4") return "4th Year";
    return `${num}th Year`;
  }
  return name;
};

/* =================== Software Theme Styles (Orange & Slate) =================== */
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 14,
    fontFamily: "Helvetica",
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#EA580C",
    borderBottomStyle: "solid",
  },

  /* Section/Card */
  section: {
    marginBottom: 8,
    padding: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 6,
  },

  /* Info grid */
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCell: { width: "33.3333%", paddingRight: 4, marginBottom: 5 },
  infoTop: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  icon: { width: 11, height: 11, marginRight: 5 },
  label: { fontSize: 8.5, color: "#64748B", fontWeight: "bold" },
  value: { fontSize: 9.5, color: "#0F172A" },

  /* Level Progress */
  levelWrap: { paddingVertical: 4 },

  /* Two-column main row for legacy view */
  mainRow: { flexDirection: "row", gap: 8, marginBottom: 6, width: "100%" },
  leftCol30: {
    width: "28%",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E2E8F0",
    padding: 8,
    minWidth: 0,
  },
  rightCol60: {
    width: "68%",
    flexDirection: "column",
  },

  rightTopRow: {
    flexDirection: "row",
    marginBottom: 6,
    justifyContent: "space-between",
    alignItems: "stretch",
    minHeight: 110,
  },
  rightTopCol: {
    flex: 1,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
    minWidth: 0,
    justifyContent: "flex-start",
  },
  rightTopColLeftGap: {
    marginRight: 8,
  },

  rightBottomRow: { width: "100%", marginTop: 4 },
  coCardsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  coCard: {
    width: "31%",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  coCardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    textAlign: "center",
    marginBottom: 3,
  },
  coCardCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#EA580C",
    textAlign: "center",
  },

  /* Progress list */
  skillRow: { marginBottom: 7 },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  small: { fontSize: 8.5, color: "#475569" },
  barTrack: {
    height: 7,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: 7, backgroundColor: "#EA580C" },

  /* Soft skills */
  softRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  softLeft: { fontSize: 9, color: "#334155" },
  softRight: { fontSize: 9, fontWeight: "bold" },

  /* Career readiness pills */
  readinessRow: { flexDirection: "row", justifyContent: "space-between" },
  pill: {
    width: "23%",
    backgroundColor: "#FFF7ED",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#FED7AA",
    alignItems: "center",
  },
  pillLabel: { fontSize: 8, color: "#C2410C", marginBottom: 4, textAlign: "center", fontWeight: "bold" },
  pillValue: { fontSize: 9.5, fontWeight: "bold", color: "#9A3412", textAlign: "center" },

  /* Footer */
  footer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#0F172A",
    borderRadius: 6,
    borderTopWidth: 2,
    borderTopColor: "#EA580C",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerColumn: {
    width: "33%",
  },
  footerHeading: {
    fontSize: 8,
    color: "#FB923C",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  footerValue: {
    fontSize: 9.5,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

/* =================== Helpers =================== */
const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoCell}>
    <View style={styles.infoTop}>
      <Image src={icon} style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>{value || "—"}</Text>
  </View>
);

const ProgressBar = ({ percent }) => (
  <View style={styles.barTrack}>
    <View
      style={[
        styles.barFill,
        { width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%` },
      ]}
    />
  </View>
);

const SoftItem = ({ title, status }) => (
  <View style={styles.softRow}>
    <Text style={styles.softLeft}>{title}</Text>
    <Text
      style={[
        styles.softRight,
        {
          color:
            status === "Excellent"
              ? "#059669"
              : status === "Good"
              ? "#2563EB"
              : status === "Average"
              ? "#D97706"
              : "#DC2626",
        },
      ]}
    >
      {status}
    </Text>
  </View>
);

const softStatus = (score, max) => {
  const pct = (Number(score || 0) / Number(max || 1)) * 100;
  if (pct >= 90) return "Excellent";
  if (pct >= 70) return "Good";
  if (pct >= 50) return "Average";
  return "Poor";
};

/* Level steps array */
const LEVEL_STEPS = ["1A", "1B", "1C", "2A", "2B", "2C"];

/* =================== Level Timeline Component =================== */
const LevelTimeline = ({ currentLevel = "" }) => {
  const steps = LEVEL_STEPS;
  const currentLevelUpper = String(currentLevel || "1A").toUpperCase();
  const foundIdx = steps.findIndex((s) => s.toUpperCase() === currentLevelUpper);
  const currentIdx = foundIdx !== -1 ? foundIdx : 0;

  const width = 480;
  const padding = 20;
  const yCenter = 15;
  const circleRadius = 11;
  const lineStrokeWidth = 3;

  const innerWidth = width - padding * 2;
  const pts = steps.map((_, i) => padding + (i * innerWidth) / (steps.length - 1));
  const progressLineEnd = pts[currentIdx];

  return (
    <View style={styles.levelWrap}>
      <Svg width={width} height="46" viewBox={`0 0 ${width} 46`}>
        <Line
          x1={pts[0]}
          y1={yCenter}
          x2={pts[steps.length - 1]}
          y2={yCenter}
          stroke="#E2E8F0"
          strokeWidth={lineStrokeWidth}
        />
        <Line
          x1={pts[0]}
          y1={yCenter}
          x2={progressLineEnd}
          y2={yCenter}
          stroke="#10B981"
          strokeWidth={lineStrokeWidth}
        />

        {pts.map((x, i) => {
          const isPassed = i < currentIdx;
          const isCurrent = i === currentIdx;

          const circleFill = isPassed ? "#10B981" : isCurrent ? "#EA580C" : "#E2E8F0";
          const labelColor = isCurrent ? "#EA580C" : "#475569";

          return (
            <G key={i}>
              <Circle
                cx={x}
                cy={yCenter}
                r={circleRadius}
                fill={circleFill}
                stroke={isCurrent ? "#FB923C" : "none"}
                strokeWidth={isCurrent ? 1.5 : 0}
              />

              {isPassed && (
                <Text
                  x={x}
                  y={yCenter + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="white"
                  fontWeight="bold"
                >
                  ✓
                </Text>
              )}

              {!isPassed && (
                <Text
                  x={x}
                  y={yCenter + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isCurrent ? "white" : "#64748B"}
                  fontWeight={isCurrent ? "bold" : "normal"}
                >
                  {steps[i]}
                </Text>
              )}

              <Text
                x={x}
                y={yCenter + 22}
                textAnchor="middle"
                fontSize="8"
                fill={labelColor}
                fontWeight={isCurrent ? "bold" : "normal"}
              >
                {steps[i]}
              </Text>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

/* =================== Main Component =================== */
const StudentReportPDF = ({ studentData = {}, reportCardData = {} }) => {
  const technicalSkills =
    reportCardData?.technicalSkills?.map((s) => ({
      name: s?.skillName || "Skill",
      percent: Math.round(Number(s?.totalPercentage || 0)),
    })) || [];

  const softCats = reportCardData?.softSkills?.categories || [];
  const discCats = reportCardData?.discipline?.categories || [];

  const co = reportCardData?.coCurricular || [];
  const coCounts = ["Certificate", "Project", "Sports"].map((c) => ({
    title: c,
    count: co.filter((x) => (x?.category || "").toLowerCase() === c.toLowerCase())
      .length,
  }));

  const deptType = detectDepartment(studentData, reportCardData);
  const deptConfig = DEPARTMENT_CONFIGS[deptType] || DEPARTMENT_CONFIGS.ITEG;
  const isMeg = deptType === "MEG";
  const isBeg = deptType === "BEG";
  const isBTech = deptType === "BTECH";

  const deptLogo = getDepartmentLogo(deptType);
  const collegeName = isBTech ? "SANT SINGAJI ENGINEERING COLLEGE" : "SANT SINGAJI INSTITUTE OF SCIENCE AND MANAGEMENT";

  const currentLevelDisplay = studentData?.currentSubLevelId?.name || studentData?.currentLevel || "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Banner - Software Orange Theme */}
        <View style={{ borderBottomWidth: 2, borderBottomColor: "#EA580C", paddingBottom: 8, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {/* College Logo (Left) */}
            <View style={{ width: 70, height: 50, alignItems: "center", justifyContent: "center" }}>
              <Image src={collegeLogo} style={{ width: 55, height: 48, objectFit: "contain" }} />
            </View>

            {/* Institution Title & Details (Center) */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#0F172A", textTransform: "uppercase", textAlign: "center" }}>
                {collegeName}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#EA580C", marginTop: 2, textAlign: "center", textTransform: "uppercase" }}>
                STUDENT PERFORMANCE REPORT CARD
              </Text>
              <Text style={{ fontSize: 7.5, color: "#475569", marginTop: 1, textAlign: "center" }}>
                Department of {studentData?.subDepartmentId?.departmentId?.name || (isBTech ? "Computer Science & Engineering" : isBeg ? "Bio Excellence Group (BEG)" : isMeg ? "Management Excellence Group (MEG)" : "Information Technology & Emerging Growth (ITEG)")}
              </Text>
            </View>

            {/* Department Logo (Right) */}
            <View style={{ width: 80, height: 50, alignItems: "center", justifyContent: "center" }}>
              <Image src={deptLogo} style={{ width: 75, height: 46, objectFit: "contain" }} />
            </View>
          </View>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4, marginTop: 6, fontSize: 7, color: "#475569" }}>
            <Text>Academic Session: {studentData?.sessionId?.name || studentData?.session || "—"}</Text>
            <Text>Batch Year: {studentData?.batchYear || reportCardData?.batchYear || "—"}</Text>
            <Text>Department: {studentData?.subDepartmentId?.departmentId?.code || studentData?.subDepartmentId?.departmentId?.name || (isBTech ? "B.Tech" : isBeg ? "BEG" : isMeg ? "MEG" : "ITEG")}</Text>
            <Text>Course / Level: {studentData?.course || "—"}{currentLevelDisplay ? ` (${currentLevelDisplay})` : ""}</Text>
          </View>
        </View>

        {!reportCardData?.dynamicSections?.length ? (
          <>
            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.infoGrid}>
                <InfoItem
                  icon={profileIcon}
                  label="Full Name"
                  value={`${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "—"}
                />
                <InfoItem icon={mailIcon} label="Email" value={studentData?.email} />
                <InfoItem icon={contactIcon} label="Contact Number" value={studentData?.studentMobile} />
                <InfoItem icon={courseIcon} label="Course" value={studentData?.course} />
                <InfoItem icon={fatherIcon} label="Father's Name" value={studentData?.fatherName} />
                <InfoItem icon={profileIcon} label="Mother's Name" value={studentData?.motherName} />
                <InfoItem icon={addressIcon} label="Track" value={studentData?.track} />
              </View>
            </View>

            {/* Level Progress */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Level Progress</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={[styles.value, { fontSize: 10 }]}>
                  Current Level: <Text style={{ fontWeight: "bold", color: "#EA580C" }}>{currentLevelDisplay ? `Level ${currentLevelDisplay}` : "—"}</Text>
                </Text>
                {currentLevelDisplay && (
                  <Text style={[styles.small, { color: "#64748B" }]}>
                    Progress: {Math.round(((LEVEL_STEPS.findIndex(s => s === currentLevelDisplay) + 1) / LEVEL_STEPS.length) * 100)}% Complete
                  </Text>
                )}
              </View>
              <LevelTimeline currentLevel={currentLevelDisplay} />
            </View>
          </>
        ) : (
          /* 1. Student Basic Information */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Student Basic Information</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { label: "Student Name", value: `${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "—" },
                { label: "Enrollment No.", value: studentData?.enrollmentNo || studentData?.admissionNo || "—" },
                { label: "Father's Name", value: studentData?.fatherName || "—" },
                { label: "Mother's Name", value: studentData?.motherName || "—" },
                { label: "Department", value: studentData?.subDepartmentId?.departmentId?.name || deptConfig.name || "ITEG" },
                { label: "Course", value: studentData?.course || "—" },
                { label: "Session / Batch", value: `${studentData?.sessionId?.name || studentData?.session || "—"}${studentData?.batchYear || reportCardData?.batchYear ? ` (${studentData?.batchYear || reportCardData?.batchYear})` : ""}` },
                { label: "Current Year / Level", value: `${studentData?.year || translateLevelName(studentData?.currentLevelId?.name || studentData?.currentLevel) || "—"}${studentData?.currentLevelId?.name ? ` (${studentData.currentLevelId.name})` : ""}` },
                { label: "Current Sub-Level", value: studentData?.currentSubLevelId?.name || studentData?.currentLevel || "—" }
              ].map((info, idx) => (
                <View key={idx} style={{ width: "25%", marginBottom: 5, paddingRight: 4 }}>
                  <Text style={{ fontSize: 7, color: "#64748B", fontWeight: "bold", textTransform: "uppercase" }}>{info.label}</Text>
                  <Text style={{ fontSize: 8.5, color: "#0F172A", marginTop: 1.5, fontWeight: "bold" }}>{info.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4, marginTop: 4, fontSize: 7, color: "#64748B" }}>
              <Text>Report Generated By: {reportCardData?.generatedByName && reportCardData.generatedByName.toLowerCase() !== "system" ? (reportCardData.generatedByName.startsWith("Prof.") ? reportCardData.generatedByName : `Prof. ${reportCardData.generatedByName}`) : "Faculty Evaluator"}</Text>
              <Text>Generated On: {reportCardData?.createdAt ? new Date(reportCardData.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
            </View>
          </View>
        )}

        {reportCardData?.dynamicSections?.length > 0 ? (
          (() => {
            const getSection = (type) => reportCardData.dynamicSections.find(s => s.sectionType === type);
            
            const levelProgress = getSection("LevelProgressTable");
            const subjectPerformance = getSection("SubjectPerformanceTable");
            const softSkills = getSection("SoftSkillsRating");
            const interview = getSection("InterviewRating");
            const hasResumeInProfile = Boolean(
              studentData?.placement?.resumeURL ||
              studentData?.resumeURL ||
              studentData?.resume ||
              studentData?.resumeUrl ||
              studentData?.resume_url ||
              studentData?.studentPlacement?.resumeURL ||
              studentData?.documents?.some(d => (d?.title || "").toLowerCase().includes("resume") && (d?.fileURL || d?.url))
            );
            const careerReadinessRaw = getSection("CareerStatus") || (reportCardData?.careerReadiness ? {
              sectionName: "Career Readiness",
              items: [
                { itemName: "Resume", value: (reportCardData.careerReadiness.resumeStatus === "Uploaded" || reportCardData.careerReadiness.resumeStatus === "Created" || hasResumeInProfile) ? "Created" : "Not created" },
                { itemName: "LinkedIn", value: reportCardData.careerReadiness.linkedinStatus || "Not created" },
                { itemName: "Aptitude", value: reportCardData.careerReadiness.aptitudeStatus || "In Progress" },
                { itemName: "Placement Ready", value: reportCardData.careerReadiness.placementReady || "Not Ready" }
              ]
            } : null);
            const careerReadiness = careerReadinessRaw ? {
              ...careerReadinessRaw,
              items: (careerReadinessRaw.items || []).map(item => {
                const nameLower = (item.itemName || "").toLowerCase();
                if (nameLower.includes("resume") && hasResumeInProfile) {
                  return { ...item, value: "Created" };
                }
                return item;
              })
            } : null;
            const strengthsImprovement = getSection("StrengthsImprovement");
            let overallPerformance = getSection("OverallPerformanceSummary");
            const hasLegacyDummy = !overallPerformance || overallPerformance.items?.some(i => 
              (i.itemName === "Overall Rating" && (i.value === 4.02 || i.value === "4.02")) ||
              (i.itemName === "Subject Performance" && (i.value === 4.1 || i.value === "4.10" || i.value === 4.10))
            );

            let overallVal = 0;
            if (hasLegacyDummy) {
              const subjs = subjectPerformance?.items || [];
              const gradedSubjs = subjs.filter(s => s.remark && s.remark !== "—" && !isNaN(parseFloat(s.remark)) && parseFloat(s.remark) > 0);
              const avgSubj = gradedSubjs.length > 0 ? Number((gradedSubjs.reduce((a, b) => a + parseFloat(b.remark), 0) / gradedSubjs.length).toFixed(2)) : 0;

              const softs = softSkills?.items || [];
              const gradedSoft = softs.filter(s => s.value && !isNaN(parseFloat(s.value)) && parseFloat(s.value) > 0);
              const avgSoft = gradedSoft.length > 0 ? Number((gradedSoft.reduce((a, b) => a + parseFloat(b.value), 0) / gradedSoft.length).toFixed(2)) : 0;

              const ints = (interview?.items || []).filter(s => s.value && !isNaN(parseFloat(s.value)) && parseFloat(s.value) > 0);
              const avgInt = ints.length > 0 ? Number((ints.reduce((a, b) => a + parseFloat(b.value), 0) / ints.length).toFixed(2)) : 0;

              const scComponents = [avgSubj, avgSoft, avgInt].filter(v => v > 0);
              overallVal = scComponents.length > 0 ? Number((scComponents.reduce((a, b) => a + b, 0) / scComponents.length).toFixed(2)) : 0;

              let overallRemark = reportCardData?.overallGrade || (overallVal >= 4.0 ? "Excellent" : overallVal >= 3.0 ? "Good" : "Pending Evaluation");

              overallPerformance = {
                sectionName: "Overall Performance",
                items: [
                  { itemName: "Subject Performance", value: avgSubj },
                  { itemName: "Soft Skills", value: avgSoft },
                  { itemName: "Interview", value: avgInt },
                  { itemName: "Discipline", value: 0 },
                  { itemName: "Overall Rating", value: overallVal, remark: overallRemark }
                ]
              };
            } else {
              const savedVal = overallPerformance?.items?.find(i => (i.itemName || "").toLowerCase().includes("overall rating"))?.value;
              overallVal = parseFloat(savedVal) || 0;
            }

            return (
              <View style={{ gap: 7 }}>
                {/* 2. Overall Performance - Software Slate & Orange Accent */}
                {overallPerformance && (
                  <View style={{ backgroundColor: "#0F172A", padding: 9, borderRadius: 6, color: "#FFFFFF", borderWidth: 1, borderColor: "#1E293B" }} wrap={false}>
                    <Text style={{ fontSize: 9.5, fontWeight: "bold", color: "#FB923C", textAlign: "center", textTransform: "uppercase", marginBottom: 5 }}>
                      2. Overall Performance
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      {overallPerformance.items.map((item, idx) => {
                        if (item.itemName === "Overall Rating" || item.itemName === "Performance Level") return null;
                        return (
                          <View key={idx} style={{ width: "23%", backgroundColor: "rgba(255, 255, 255, 0.08)", padding: 4, borderRadius: 4, alignItems: "center" }}>
                            <Text style={{ fontSize: 7, color: "#E2E8F0" }}>{item.itemName}</Text>
                            <Text style={{ fontSize: 8.5, fontWeight: "bold", marginTop: 2, color: "#FFFFFF" }}>{item.value || 0} / 5</Text>
                          </View>
                        );
                      })}
                    </View>
                    {(() => {
                      const ratingItem = overallPerformance.items.find(i => i.itemName === "Overall Rating");
                      const levelItem = overallPerformance.items.find(i => i.itemName === "Performance Level") || ratingItem;
                      return (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.15)", paddingTop: 4, marginTop: 2 }}>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#FB923C" }}>
                            Overall Rating: {ratingItem?.value && Number(ratingItem.value) > 0 ? `${ratingItem.value} / 5` : "—"}
                          </Text>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#FED7AA" }}>
                            Performance Level: {levelItem?.remark || levelItem?.value || "Under Evaluation"}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}

                {/* 3. Level / Sub-Level Progress */}
                {levelProgress && levelProgress.items && levelProgress.items.length > 0 && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>3. Level / Sub-Level Progress</Text>
                    <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 4, fontWeight: "bold", fontSize: 7.5 }}>
                      <Text style={{ width: "30%", color: "#334155" }}>Level</Text>
                      <Text style={{ width: "20%", textAlign: "center", color: "#334155" }}>Sub-Level</Text>
                      <Text style={{ width: "20%", textAlign: "center", color: "#334155" }}>Status</Text>
                      <Text style={{ width: "30%", textAlign: "center", color: "#334155" }}>Performance (Rating / 5)</Text>
                    </View>
                    {levelProgress.items.map((item, idx) => {
                      const levelNum = (item.itemName || "").match(/\d+/)?.[0] || item.maxMarks;
                      const levelTitle = levelNum ? `Level ${levelNum}` : "Level Progress";
                      return (
                        <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", padding: 3.5, fontSize: 7.5 }}>
                          <Text style={{ width: "30%", color: "#475569" }}>{levelTitle}</Text>
                          <Text style={{ width: "20%", textAlign: "center", color: "#EA580C", fontWeight: "bold" }}>{item.itemName}</Text>
                          <Text style={{ width: "20%", textAlign: "center", color: "#334155" }}>{item.value || "—"}</Text>
                          <Text style={{ width: "30%", textAlign: "center", fontWeight: "bold", color: "#0F172A" }}>
                            {item.remark && item.remark !== "—" ? `${item.remark} / 5` : "—"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 4. Subject-wise Performance */}
                {subjectPerformance && subjectPerformance.items && subjectPerformance.items.length > 0 && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>{isMeg ? "4. Subject-wise Performance & Academic Modules" : "4. Subject-wise Performance & Technical Modules"}</Text>
                    <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 4, fontWeight: "bold", fontSize: 7.5 }}>
                      <Text style={{ width: "30%", color: "#334155" }}>Subject</Text>
                      <Text style={{ width: "15%", textAlign: "center", color: "#334155" }}>Total Tasks</Text>
                      <Text style={{ width: "15%", textAlign: "center", color: "#334155" }}>Evaluated</Text>
                      <Text style={{ width: "20%", textAlign: "center", color: "#334155" }}>Average Rating</Text>
                      <Text style={{ width: "20%", textAlign: "center", color: "#334155" }}>Performance</Text>
                    </View>
                    {subjectPerformance.items.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", padding: 3.5, fontSize: 7.5 }}>
                        <Text style={{ width: "30%", fontWeight: "bold", color: "#0F172A" }}>{item.itemName}</Text>
                        <Text style={{ width: "15%", textAlign: "center", color: "#475569" }}>{item.maxMarks ?? "—"}</Text>
                        <Text style={{ width: "15%", textAlign: "center", color: "#475569" }}>{item.score ?? "—"}</Text>
                        <Text style={{ width: "20%", textAlign: "center", fontWeight: "bold", color: "#EA580C" }}>
                          {item.remark && item.remark !== "—" ? `${item.remark} / 5` : "—"}
                        </Text>
                        <Text style={{ width: "20%", textAlign: "center", color: "#334155" }}>{item.value || "—"}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 5. Academic Performance (SGPA & CGPA) */}
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>
                    {isBTech
                      ? "5. Academic Performance (Semester SGPA & Year-Wise CGPA — B.Tech 4-Year Scheme)"
                      : "5. Academic Performance (University SGPA & CGPA)"}
                  </Text>
                  {isBTech ? (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: "70%" }}>
                        <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 3, fontWeight: "bold", fontSize: 7 }}>
                          <Text style={{ width: "28%", color: "#334155" }}>Academic Year</Text>
                          <Text style={{ width: "24%", textAlign: "center", color: "#334155" }}>Sem A SGPA</Text>
                          <Text style={{ width: "24%", textAlign: "center", color: "#334155" }}>Sem B SGPA</Text>
                          <Text style={{ width: "24%", textAlign: "center", color: "#334155" }}>Year CGPA</Text>
                        </View>
                        {[
                          { year: "1st Year", sA: "Sem 1", sB: "Sem 2" },
                          { year: "2nd Year", sA: "Sem 3", sB: "Sem 4" },
                          { year: "3rd Year", sA: "Sem 5", sB: "Sem 6" },
                          { year: "4th Year", sA: "Sem 7", sB: "Sem 8" },
                        ].map((item, idx) => {
                          const sems = reportCardData.academicPerformance?.semesterWiseSGPA || [];
                          const semAObj = sems.find(s => s.semester === item.sA);
                          const semBObj = sems.find(s => s.semester === item.sB);
                          const valA = semAObj && semAObj.sgpa > 0 ? Number(semAObj.sgpa).toFixed(2) : "0.00";
                          const valB = semBObj && semBObj.sgpa > 0 ? Number(semBObj.sgpa).toFixed(2) : "0.00";
                          const numA = parseFloat(valA) || 0;
                          const numB = parseFloat(valB) || 0;
                          const active = [numA, numB].filter(v => v > 0);
                          const yrCgpa = active.length > 0 ? (active.reduce((a, b) => a + b, 0) / active.length).toFixed(2) : "0.00";

                          return (
                            <View key={idx} style={{ flexDirection: "row", borderBottomWidth: idx === 3 ? 0 : 1, borderBottomColor: "#F1F5F9", padding: 3, fontSize: 7 }}>
                              <Text style={{ width: "28%", fontWeight: "bold", color: "#0F172A" }}>{item.year}</Text>
                              <Text style={{ width: "24%", textAlign: "center", color: "#475569" }}>{item.sA}: {valA}</Text>
                              <Text style={{ width: "24%", textAlign: "center", color: "#475569" }}>{item.sB}: {valB}</Text>
                              <Text style={{ width: "24%", textAlign: "center", fontWeight: "bold", color: "#2563EB" }}>{yrCgpa}</Text>
                            </View>
                          );
                        })}
                      </View>
                      <View style={{ width: "26%", backgroundColor: "#0F172A", padding: 8, borderRadius: 6, alignItems: "center", justifyContent: "center", borderTopWidth: 2, borderTopColor: "#EA580C" }}>
                        <Text style={{ fontSize: 7, color: "#94A3B8" }}>Cumulative CGPA</Text>
                        <Text style={{ fontSize: 15, color: "#FFFFFF", fontWeight: "bold", marginTop: 2 }}>
                          {reportCardData.academicPerformance?.cgpa ? Number(reportCardData.academicPerformance.cgpa).toFixed(2) : "0.00"}
                        </Text>
                        <Text style={{ fontSize: 6, color: "#FB923C", marginTop: 2 }}>4-Year Aggregate</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: "65%" }}>
                        <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 4, fontWeight: "bold", fontSize: 7.5 }}>
                          <Text style={{ width: "70%", color: "#334155" }}>Academic Year</Text>
                          <Text style={{ width: "30%", textAlign: "center", color: "#334155" }}>SGPA</Text>
                        </View>
                        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", padding: 3.5, fontSize: 7.5 }}>
                          <Text style={{ width: "70%", color: "#0F172A" }}>First Year (FY)</Text>
                          <Text style={{ width: "30%", textAlign: "center", color: "#334155" }}>
                            {reportCardData.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ? Number(reportCardData.academicPerformance.yearWiseSGPA.find(y => y.year === "FY").sgpa).toFixed(2) : (reportCardData.academicPerformance?.firstYearSgpa || "0.00")}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", padding: 3.5, fontSize: 7.5 }}>
                          <Text style={{ width: "70%", color: "#0F172A" }}>Second Year (SY)</Text>
                          <Text style={{ width: "30%", textAlign: "center", color: "#334155" }}>
                            {reportCardData.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ? Number(reportCardData.academicPerformance.yearWiseSGPA.find(y => y.year === "SY").sgpa).toFixed(2) : (reportCardData.academicPerformance?.secondYearSgpa || "0.00")}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", padding: 3.5, fontSize: 7.5 }}>
                          <Text style={{ width: "70%", color: "#0F172A" }}>Third Year (TY)</Text>
                          <Text style={{ width: "30%", textAlign: "center", color: "#334155" }}>
                            {reportCardData.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ? Number(reportCardData.academicPerformance.yearWiseSGPA.find(y => y.year === "TY").sgpa).toFixed(2) : (reportCardData.academicPerformance?.thirdYearSgpa || "0.00")}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: "30%", backgroundColor: "#0F172A", padding: 10, borderRadius: 6, alignItems: "center", justifyContent: "center", borderTopWidth: 2, borderTopColor: "#EA580C" }}>
                        <Text style={{ fontSize: 7.5, color: "#94A3B8" }}>Overall CGPA</Text>
                        <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "bold", marginTop: 2 }}>
                          {reportCardData.academicPerformance?.cgpa ? Number(reportCardData.academicPerformance.cgpa).toFixed(2) : "0.00"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* 6. Soft Skills & Behavioural Evaluation */}
                {softSkills && (() => {
                  const hasSyllabus = softSkills.hasSyllabusTasks || softSkills.items?.some(i => i.isFromSyllabus || i.completedTasks !== undefined);
                  return (
                    <View style={styles.section} wrap={false}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <Text style={styles.sectionTitle}>6. Soft Skills & Behavioural Evaluation</Text>
                        {hasSyllabus && (
                          <Text style={{ fontSize: 7, fontWeight: "bold", color: "#C2410C", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 }}>
                            Subject: {softSkills.subjectName || "Soft Skills"}
                          </Text>
                        )}
                      </View>

                      {hasSyllabus ? (
                        <View style={{ gap: 5 }}>
                          {softSkills.items.map((item, idx) => {
                            const completed = item.completedTasks !== undefined ? item.completedTasks : item.score;
                            const total = item.totalTasks || 5;
                            const pct = item.completionPercentage !== undefined
                              ? item.completionPercentage
                              : (total > 0 && completed !== undefined ? Math.min(Math.round((completed / total) * 100), 100) : 0);

                            return (
                              <View key={idx} style={{ backgroundColor: "#F8FAFC", padding: 5, borderRadius: 4, borderWidth: 1, borderColor: "#E2E8F0" }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", width: "55%" }}>
                                    <Text style={{ fontSize: 8, color: "#EA580C", marginRight: 4 }}>•</Text>
                                    <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#0F172A" }}>{item.itemName}</Text>
                                  </View>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                    {item.completedTasks !== undefined && (
                                      <Text style={{ fontSize: 7, color: "#475569" }}>
                                        {item.completedTasks}/{item.totalTasks} Tasks ({pct}%)
                                      </Text>
                                    )}
                                    {item.totalMaxMarks > 0 && (
                                      <Text style={{ fontSize: 7, color: "#059669", fontWeight: "bold", backgroundColor: "#ECFDF5", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
                                        Marks: {item.obtainedMarks}/{item.totalMaxMarks}
                                      </Text>
                                    )}
                                    {item.remark && (
                                      <Text style={{ fontSize: 7, color: "#C2410C", fontWeight: "bold", backgroundColor: "#FFF7ED", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
                                        {item.remark}
                                      </Text>
                                    )}
                                    <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#EA580C" }}>
                                      {item.value} / 5
                                    </Text>
                                  </View>
                                </View>
                                {/* Task Completion Progress Bar */}
                                <View style={{ width: "100%", height: 3, backgroundColor: "#E2E8F0", borderRadius: 2, overflow: "hidden" }}>
                                  <View style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, height: 3, backgroundColor: "#EA580C", borderRadius: 2 }} />
                                </View>
                              </View>
                            );
                          })}
                          <Text style={{ fontSize: 6.5, color: "#94A3B8", textAlign: "right", marginTop: 2, fontStyle: "italic" }}>
                            * Ratings & progress automatically calculated based on live task completion
                          </Text>
                        </View>
                      ) : (
                        <>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            {softSkills.items.map((item, idx) => (
                              <View key={idx} style={{ width: "48%", backgroundColor: "#F8FAFC", padding: 5, borderRadius: 4, borderWidth: 1, borderColor: "#E2E8F0" }}>
                                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#334155" }}>{item.itemName}</Text>
                                <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#EA580C", marginTop: 2 }}>{item.value} / 5</Text>
                              </View>
                            ))}
                          </View>
                          <Text style={{ fontSize: 6.5, color: "#94A3B8", textAlign: "center", marginTop: 5, fontStyle: "italic" }}>
                            Evaluation Method: Faculty Observation & Interview
                          </Text>
                        </>
                      )}
                    </View>
                  );
                })()}

                {/* 7. Interview Evaluation / Readiness */}
                {interview && interview.items && interview.items.length > 0 && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>{deptConfig.interviewSectionTitle || "7. Interview Readiness & Mock Assessment"}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {interview.items.map((item, idx) => (
                        <View key={idx} style={{ width: "48%", backgroundColor: "#F8FAFC", padding: 5, borderRadius: 4, borderWidth: 1, borderColor: "#E2E8F0" }}>
                          <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#334155" }}>{mapInterviewItemName(item.itemName, deptType)}</Text>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#EA580C", marginTop: 2 }}>
                            {item.value && Number(item.value) > 0 ? `${item.value} / 5` : (item.value || "—")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 8. Career Readiness */}
                {careerReadiness && careerReadiness.items && careerReadiness.items.length > 0 && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>8. Career Readiness</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                      {careerReadiness.items.map((item, idx) => (
                        <View key={idx} style={{ width: "23%", backgroundColor: "#FFF7ED", padding: 5, borderRadius: 4, borderWidth: 1, borderColor: "#FED7AA", alignItems: "center" }}>
                          <Text style={{ fontSize: 7, fontWeight: "bold", color: "#C2410C" }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#9A3412", marginTop: 2 }}>{item.value || "Not Started"}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 10. Certifications */}
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>10. Certifications</Text>
                  <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 4, fontWeight: "bold", fontSize: 7.5 }}>
                    <Text style={{ width: "30%", color: "#334155" }}>Issuing Authority / Domain</Text>
                    <Text style={{ width: "40%", color: "#334155" }}>Certificate Title</Text>
                    <Text style={{ width: "30%", color: "#334155" }}>Remark / Score</Text>
                  </View>
                  {reportCardData.coCurricular && reportCardData.coCurricular.length > 0 ? (
                    reportCardData.coCurricular.map((act, idx) => (
                      <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", padding: 3.5, fontSize: 7.5 }}>
                        <Text style={{ width: "30%", color: "#475569" }}>{act.category || "Certification"}</Text>
                        <Text style={{ width: "40%", fontWeight: "bold", color: "#0F172A" }}>{act.title}</Text>
                        <Text style={{ width: "30%", color: "#475569" }}>{act.remark || "—"}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 7.5, color: "#94A3B8", textAlign: "center", padding: 5 }}>No certifications recorded.</Text>
                  )}
                </View>

                {/* 11. Strengths & Areas for Improvement (Only actual recorded data) */}
                {strengthsImprovement && strengthsImprovement.items && strengthsImprovement.items.length > 0 && strengthsImprovement.items.some(i => i.value && i.value.trim() && i.value !== "—") && (
                  <View style={{ flexDirection: "row", gap: 7 }} wrap={false}>
                    {strengthsImprovement.items.filter(i => i.value && i.value.trim() && i.value !== "—").map((item, idx) => {
                      const isStrength = (item.itemName || "").toLowerCase().includes("strength");
                      return (
                        <View key={idx} style={{ flex: 1, backgroundColor: isStrength ? "#F0FDF4" : "#FFFBEB", padding: 7, borderRadius: 5, borderWidth: 1, borderColor: isStrength ? "#BBF7D0" : "#FDE68A" }}>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: isStrength ? "#166534" : "#92400E", marginBottom: 3 }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 7.5, color: "#334155", lineHeight: 1.3 }}>{item.value}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 12. Faculty / Mentor Feedback */}
                <View style={styles.section} wrap={false}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <Text style={styles.sectionTitle}>12. Faculty / Mentor Feedback</Text>
                    {overallVal > 0 && (
                      <Text style={{ fontSize: 8, fontWeight: "bold", color: "#EA580C" }}>
                        Rating: {overallVal.toFixed(1)} / 5.0 (Recommended for Placement)
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 8, color: "#334155", fontStyle: "italic", lineHeight: 1.35 }}>
                    "{reportCardData.facultyRemark || "No faculty feedback recorded."}"
                  </Text>
                </View>
              </View>
            );
          })()
        ) : (
          <>
            {/* ======= CUSTOM TWO-COLUMN SECTION (Legacy View) ======= */}
            <View style={styles.mainRow}>
              {/* LEFT: 28% - Technical Skills */}
              <View style={styles.leftCol30}>
                <Text style={styles.sectionTitle}>Technical Skills</Text>
                {(technicalSkills.length ? technicalSkills : [{ name: "N/A", percent: 0 }]).map(
                  (s, i) => (
                    <View key={i} style={styles.skillRow}>
                      <View style={styles.skillHeader}>
                        <Text style={styles.small}>{s.name}</Text>
                        <Text style={styles.small}>{s.percent}%</Text>
                      </View>
                      <ProgressBar percent={s.percent} />
                    </View>
                  )
                )}
              </View>

              {/* RIGHT: 68% - Soft + Discipline side-by-side; Bottom: Certifications cards */}
              <View style={styles.rightCol60}>
                <View style={styles.rightTopRow}>
                  <View style={[styles.rightTopCol, styles.rightTopColLeftGap]}>
                    <Text style={styles.sectionTitle}>Soft Skills</Text>
                    {softCats.length ? (
                      softCats.map((c, i) => (
                        <SoftItem
                          key={i}
                          title={c?.title || "Skill"}
                          status={softStatus(c?.score, c?.maxMarks)}
                        />
                      ))
                    ) : (
                      <Text style={styles.small}>N/A</Text>
                    )}
                  </View>

                  <View style={styles.rightTopCol}>
                    <Text style={styles.sectionTitle}>Discipline</Text>
                    {discCats.length ? (
                      discCats.map((c, i) => {
                        const pct = ((Number(c?.score || 0) / Number(c?.maxMarks || 10)) * 100) || 0;
                        return (
                          <View key={i} style={styles.skillRow}>
                            <View style={styles.skillHeader}>
                              <Text style={styles.small}>{c?.title || "Metric"}</Text>
                              <Text style={styles.small}>
                                {c?.score}/{c?.maxMarks}
                              </Text>
                            </View>
                            <ProgressBar percent={pct} />
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.small}>N/A</Text>
                    )}
                  </View>
                </View>

                {/* Bottom: Certifications cards */}
                <View style={styles.rightBottomRow}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Certifications</Text>
                    <View style={styles.coCardsWrap}>
                      {coCounts.map((c) => (
                        <View key={c.title} style={styles.coCard}>
                          <Text style={styles.coCardTitle}>{c.title}</Text>
                          <Text style={styles.coCardCount}>{c.count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Career Readiness */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Career Readiness</Text>
              <View style={styles.readinessRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Resume</Text>
                  <Text style={styles.pillValue}>
                    {reportCardData?.careerReadiness?.resumeStatus || "Not created"}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>LinkedIn</Text>
                  <Text style={styles.pillValue}>
                    {reportCardData?.careerReadiness?.linkedinStatus || "Need to improve"}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Aptitude</Text>
                  <Text style={styles.pillValue}>
                    {reportCardData?.careerReadiness?.aptitudeStatus || "In-progress"}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Placement</Text>
                  <Text style={styles.pillValue}>
                    {reportCardData?.careerReadiness?.placementReady || "Not-ready"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Academic Performance (Legacy Fallback) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isBTech ? "Academic Performance (4-Year B.Tech)" : "Academic Performance"}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { title: "Current Level", val: currentLevelDisplay ? `Level ${currentLevelDisplay}` : "—" },
                  ...(isBTech ? [
                    { title: "1st Year CGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "1st Year" || y.year === "FY")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "1st Year" || y.year === "FY")?.sgpa).toFixed(2) : "0.00" },
                    { title: "2nd Year CGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "2nd Year" || y.year === "SY")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "2nd Year" || y.year === "SY")?.sgpa).toFixed(2) : "0.00" },
                    { title: "3rd Year CGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "3rd Year" || y.year === "TY")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "3rd Year" || y.year === "TY")?.sgpa).toFixed(2) : "0.00" },
                    { title: "4th Year CGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "4th Year" || y.year === "Final Year")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "4th Year" || y.year === "Final Year")?.sgpa).toFixed(2) : "0.00" },
                  ] : [
                    { title: "1st Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY").sgpa).toFixed(2) : "0.00" },
                    { title: "2nd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY").sgpa).toFixed(2) : "0.00" },
                    { title: "3rd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ? Number(reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY").sgpa).toFixed(2) : "0.00" },
                  ]),
                  { title: "CGPA", val: reportCardData?.academicPerformance?.cgpa ? Number(reportCardData.academicPerformance.cgpa).toFixed(2) : "0.00" },
                ].map((it, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: isBTech ? "15.5%" : "19.2%",
                      backgroundColor: "#FFFFFF",
                      borderRadius: 6,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "#E2E8F0",
                      paddingVertical: 7,
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text style={{ fontSize: 8, color: "#64748B", textAlign: "center", marginBottom: 3 }}>
                      {it.title}
                    </Text>
                    <Text style={{ fontSize: 10.5, fontWeight: "bold", textAlign: "center", color: "#0F172A" }}>
                      {it.val}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Footer: Evaluation Stage, Academic Status, and Grade - Rendered once at the end */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Evaluation Stage</Text>
            <Text style={styles.footerValue}>
              {reportCardData?.finalStatus || (studentData?.currentSubLevelId?.name ? `Level ${studentData.currentSubLevelId.name}` : (studentData?.currentLevelId?.name || "Level Progress"))}
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Academic Status</Text>
            <Text style={styles.footerValue}>
              {reportCardData?.result || studentData?.status || "In Progress"}
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Overall Grade</Text>
            <Text style={styles.footerValue}>
              {reportCardData?.overallGrade ? `${reportCardData.overallGrade} Grade` : "Under Evaluation"}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default StudentReportPDF;
