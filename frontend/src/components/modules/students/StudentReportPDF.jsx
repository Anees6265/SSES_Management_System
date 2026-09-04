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

import logo from "../../../assets/images/doulLogo.png";
import profileIcon from "../../../assets/icons/StuReportprofile_icon.png";
import courseIcon from "../../../assets/icons/StuReportCourse_icon.png";
import mailIcon from "../../../assets/icons/StuReportMail_icon.png";
import fatherIcon from "../../../assets/icons/StuReportFather_icon.png";
import contactIcon from "../../../assets/icons/StuReport_Phone.png";
import addressIcon from "../../../assets/icons/StuReportAddress_icon.png";

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

/* =================== Styles =================== */
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 12,
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
    borderBottomColor: "#7335DD",
    borderBottomStyle: "solid",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 70,
    flexShrink: 0,
  },
  headerCenter: { flexGrow: 1, alignItems: "center", paddingHorizontal: 8 },
  headerRight: { minWidth: 120, alignItems: "flex-end" },

  logo: {
    width: 78,
    height: 52,
    objectFit: "contain",
    maxWidth: "100%",
  },

  title: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  subMuted: { fontSize: 9, color: "#6B7280" },
  subBold: { fontSize: 10, color: "#111827", fontWeight: "bold" },

  /* Section/Card */
  section: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },

  /* Info grid */
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCell: { width: "33.3333%", paddingRight: 4, marginBottom: 4 },
  infoTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  icon: { width: 11, height: 11, marginRight: 6 },
  label: { fontSize: 9, color: "#6B7280", fontWeight: "bold" },
  value: { fontSize: 10, color: "#111827" },

  /* Level Progress */
  levelWrap: { paddingVertical: 6 },
  levelLegend: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: { fontSize: 9, color: "#374151", textAlign: "center", width: 28 },

  /* Two-column main row: left = 28%, right = 68% (adjusted) */
  mainRow: { flexDirection: "row", gap: 8, marginBottom: 6, width: "100%" },
  leftCol30: {
    width: "28%",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    padding: 10,
    minWidth: 0,
  },
  rightCol60: {
    width: "68%",
    flexDirection: "column",
  },

  /* Top half inside right column: two columns (Soft | Discipline) */
  // make row stretch children and set a minHeight so both columns equalize
  rightTopRow: {
    flexDirection: "row",
    marginBottom: 6,
    justifyContent: "space-between",
    alignItems: "stretch", // important to equalize height
    minHeight: 120, // adjust this value if you want taller/shorter equal boxes
  },
  // give each column flex:1 so they share available height equally
  rightTopCol: {
    flex: 1,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    minWidth: 0,
    justifyContent: "flex-start", // content top-aligned
  },

  /* Add gap between the two top cols via marginRight on first */
  rightTopColLeftGap: {
    marginRight: 8,
  },

  /* Bottom half inside right column: Co-curricular cards */
  rightBottomRow: { width: "100%", marginTop: 6 },
  coCardsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  coCard: {
    width: "31%",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  coCardTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#374151",
    textAlign: "center",
    marginBottom: 4,
  },
  coCardCount: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center",
  },

  /* Progress list */
  skillRow: { marginBottom: 8 },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  small: { fontSize: 9, color: "#374151" },
  barTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: { height: 8, backgroundColor: "#7335DD" },

  /* Soft skills */
  softRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  softLeft: { fontSize: 9.5, color: "#374151" },
  softRight: { fontSize: 9.5, fontWeight: "bold" },

  /* Career readiness (4 in one row) */
  readinessRow: { flexDirection: "row", justifyContent: "space-between" },
  pill: {
    width: "23%",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
  },
  pillLabel: { fontSize: 9, color: "#6B7280", marginBottom: 6, textAlign: "center" },
  pillValue: { fontSize: 10, fontWeight: "bold", color: "#111827", textAlign: "center" },

/* Footer */
footer: {
  marginTop: 8,
  padding: 12,
  backgroundColor: "#7335DD",
  borderRadius: 8,
  flexDirection: "row",
  justifyContent: "space-between",
},

footerColumn: {
  width: "33%",
},

footerHeading: {
  fontSize: 10,
  color: "#FFFFFF",
  fontWeight: "bold",
  marginBottom: 4,
},

footerValue: {
  fontSize: 10,
  color: "#FFFFFF",
},

});

/* =================== Helpers =================== */
const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoCell}>
    <View style={styles.infoTop}>
      <Image src={icon} style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>{value || "N/A"}</Text>
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
const LevelTimeline = ({ currentLevel = "1A" }) => {
  const steps = LEVEL_STEPS;
  const currentLevelUpper = String(currentLevel || "1A").toUpperCase();
  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.toUpperCase() === currentLevelUpper)
  );

  const width = 480;
  const padding = 20;
  const yCenter = 15;
  const circleRadius = 12;
  const lineStrokeWidth = 3;

  const innerWidth = width - padding * 2;
  const pts = steps.map((_, i) => padding + (i * innerWidth) / (steps.length - 1));
  const progressLineEnd = pts[currentIdx];

  return (
    <View style={styles.levelWrap}>
      <Svg width={width} height="50" viewBox={`0 0 ${width} 50`}>
        <Line
          x1={pts[0]}
          y1={yCenter}
          x2={pts[steps.length - 1]}
          y2={yCenter}
          stroke="#E5E7EB"
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

          const circleFill = isPassed ? "#10B981" : isCurrent ? "#F59E0B" : "#E5E7EB";
          const labelColor = isCurrent ? "#F59E0B" : "#374151";

          return (
            <G key={i}>
              <Circle
                cx={x}
                cy={yCenter}
                r={circleRadius}
                fill={circleFill}
                stroke={isCurrent ? "#F59E0B" : "none"}
                strokeWidth={isCurrent ? 1 : 0}
              />

              {isPassed && (
                <Text
                  x={x}
                  y={yCenter + 4}
                  textAnchor="middle"
                  fontSize="12"
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
                  fontSize="10"
                  fill={isCurrent ? "white" : "#6B7280"}
                  fontWeight={isCurrent ? "bold" : "normal"}
                >
                  {steps[i]}
                </Text>
              )}

              <Text
                x={x}
                y={yCenter + 25}
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "#7335DD", paddingBottom: 8, marginBottom: 10 }}>
          <Image src={logo} style={{ width: 80, height: 50, objectFit: "contain", marginBottom: 4 }} />
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#111827", textTransform: "uppercase" }}>SANT SINGAJI INSTITUTE OF SCIENCE AND MANAGEMENT</Text>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#F59E0B", marginTop: 2 }}>STUDENT PERFORMANCE REPORT CARD</Text>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 4, marginTop: 4, fontSize: 7, color: "#4B5563" }}>
            <Text>Academic Session: {reportCardData?.batchYear || "2025–26"}</Text>
            <Text>Batch Year: {reportCardData?.batchYear || "2025–26"}</Text>
            <Text>Department: {studentData?.subDepartmentId?.departmentId?.code || studentData?.subDepartmentId?.departmentId?.name || "ITEG"}</Text>
            <Text>Course / Level: {studentData?.course || "N/A"} ({studentData?.currentSubLevelId?.name || studentData?.currentLevel || "1A"})</Text>
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
                  value={`${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "N/A"}
                />
                <InfoItem icon={mailIcon} label="Email" value={studentData?.email} />
                <InfoItem icon={contactIcon} label="Contact Number" value={studentData?.studentMobile} />
                <InfoItem icon={courseIcon} label="Course" value={studentData?.course} />
                <InfoItem icon={fatherIcon} label="Father's Name" value={studentData?.fatherName} />
                <InfoItem icon={addressIcon} label="Track" value={studentData?.track} />
              </View>
            </View>

            {/* Level Progress */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Level Progress</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={[styles.value, { fontSize: 11 }]}>
                  Current Level: <Text style={{ fontWeight: "bold", color: "#F59E0B" }}>Level {studentData?.currentSubLevelId?.name || studentData?.currentLevel || "1A"}</Text>
                </Text>
                <Text style={[styles.small, { color: "#6B7280" }]}>
                  Progress: {Math.round(((LEVEL_STEPS.findIndex(s => s === (studentData?.currentSubLevelId?.name || studentData?.currentLevel || "1A")) + 1) / LEVEL_STEPS.length) * 100)}% Complete
                </Text>
              </View>
              <LevelTimeline currentLevel={studentData?.currentSubLevelId?.name || studentData?.currentLevel || "1A"} />
            </View>
          </>
        ) : (
          /* 1. Student Basic Information */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Student Basic Information</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { label: "Student Name", value: `${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "N/A" },
                { label: "PR Key / Enrollment No.", value: studentData?.admissionNo || studentData?.enrollmentNo || "N/A" },
                { label: "Father's Name", value: studentData?.fatherName || "N/A" },
                { label: "Department", value: studentData?.subDepartmentId?.departmentId?.name || "ITEG" },
                { label: "Course", value: studentData?.course || "N/A" },
                { label: "Session", value: reportCardData?.batchYear || "2025–26" },
                { label: "Current Level", value: `${translateLevelName(studentData?.currentLevelId?.name) || "1st Year"} (${studentData?.currentLevelId?.name || "Level 1"})` },
                { label: "Current Sub-Level", value: studentData?.currentSubLevelId?.name || "1A" }
              ].map((info, idx) => (
                <View key={idx} style={{ width: "25%", marginBottom: 6, paddingRight: 4 }}>
                  <Text style={{ fontSize: 7, color: "#9CA3AF", fontWeight: "bold", textTransform: "uppercase" }}>{info.label}</Text>
                  <Text style={{ fontSize: 9, color: "#1F2937", marginTop: 2, fontWeight: "bold" }}>{info.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 4, marginTop: 4, fontSize: 7, color: "#6B7280" }}>
              <Text>Report Generated By: {reportCardData?.generatedByName || "Prof. Himanshu Vishwakarma"}</Text>
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
            const careerReadiness = getSection("CareerStatus");
            const attendanceDiscipline = getSection("AttendanceDiscipline");
            const strengthsImprovement = getSection("StrengthsImprovement");
            const overallPerformance = getSection("OverallPerformanceSummary");

            return (
              <View style={{ gap: 8 }}>
                {/* 2. Academic Performance */}
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>2. Academic Performance</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ width: "65%" }}>
                      <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, fontWeight: "bold", fontSize: 8 }}>
                        <Text style={{ width: "70%" }}>Academic Year</Text>
                        <Text style={{ width: "30%", textAlign: "center" }}>SGPA</Text>
                      </View>
                      {reportCardData.academicPerformance?.yearWiseSGPA?.map((y, idx) => (
                        <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 4, fontSize: 8 }}>
                          <Text style={{ width: "70%" }}>{y.year === "FY" ? "First Year" : y.year === "SY" ? "Second Year" : y.year === "TY" ? "Third Year" : y.year}</Text>
                          <Text style={{ width: "30%", textAlign: "center", fontWeight: "bold" }}>{y.sgpa || "N/A"}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ width: "30%", backgroundColor: "#7335DD", padding: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 8, color: "#FFFFFF", opacity: 0.9 }}>Overall CGPA</Text>
                      <Text style={{ fontSize: 18, color: "#FFFFFF", fontWeight: "bold", marginTop: 2 }}>{reportCardData.academicPerformance?.cgpa || "N/A"}</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Level / Sub-Level Progress */}
                {levelProgress && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>3. Level / Sub-Level Progress</Text>
                    <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, fontWeight: "bold", fontSize: 8 }}>
                      <Text style={{ width: "30%" }}>Level</Text>
                      <Text style={{ width: "20%", textAlign: "center" }}>Sub-Level</Text>
                      <Text style={{ width: "20%", textAlign: "center" }}>Status</Text>
                      <Text style={{ width: "30%", textAlign: "center" }}>Performance (Rating / 5)</Text>
                    </View>
                    {levelProgress.items.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 4, fontSize: 8 }}>
                        <Text style={{ width: "30%" }}>{item.maxMarks === 1 ? "Level 1" : "Level 2"}</Text>
                        <Text style={{ width: "20%", textAlign: "center", color: "#7335DD", fontWeight: "bold" }}>{item.itemName}</Text>
                        <Text style={{ width: "20%", textAlign: "center" }}>{item.value}</Text>
                        <Text style={{ width: "30%", textAlign: "center", fontWeight: "bold" }}>{item.remark !== "—" ? `${item.remark} / 5` : "—"}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 4. Subject-wise Performance */}
                {subjectPerformance && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>4. Subject-wise Performance</Text>
                    <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, fontWeight: "bold", fontSize: 8 }}>
                      <Text style={{ width: "30%" }}>Subject</Text>
                      <Text style={{ width: "15%", textAlign: "center" }}>Total Tasks</Text>
                      <Text style={{ width: "15%", textAlign: "center" }}>Evaluated</Text>
                      <Text style={{ width: "20%", textAlign: "center" }}>Average Rating</Text>
                      <Text style={{ width: "20%", textAlign: "center" }}>Performance</Text>
                    </View>
                    {subjectPerformance.items.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 4, fontSize: 8 }}>
                        <Text style={{ width: "30%", fontWeight: "bold" }}>{item.itemName}</Text>
                        <Text style={{ width: "15%", textAlign: "center" }}>{item.maxMarks}</Text>
                        <Text style={{ width: "15%", textAlign: "center" }}>{item.score}</Text>
                        <Text style={{ width: "20%", textAlign: "center", fontWeight: "bold" }}>{item.remark} / 5</Text>
                        <Text style={{ width: "20%", textAlign: "center" }}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 5. Soft Skills & Behavioural Evaluation */}
                {softSkills && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>5. Soft Skills & Behavioural Evaluation</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      {softSkills.items.map((item, idx) => (
                        <View key={idx} style={{ width: "47%", backgroundColor: "#F9FAFB", padding: 6, borderRadius: 4, borderWidth: 1, borderColor: "#E5E7EB" }}>
                          <Text style={{ fontSize: 8, fontWeight: "bold", color: "#374151" }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#7335DD", marginTop: 2 }}>{item.value} / 5</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={{ fontSize: 7, color: "#9CA3AF", textAlign: "center", marginTop: 6, fontStyle: "italic" }}>
                      Evaluation Method: Faculty Observation & Interview
                    </Text>
                  </View>
                )}

                {/* 6. Interview Evaluation */}
                {interview && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>6. Interview Evaluation</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      {interview.items.map((item, idx) => (
                        <View key={idx} style={{ width: "47%", backgroundColor: "#F9FAFB", padding: 6, borderRadius: 4, borderWidth: 1, borderColor: "#E5E7EB" }}>
                          <Text style={{ fontSize: 8, fontWeight: "bold", color: "#374151" }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#EA580C", marginTop: 2 }}>{item.value} / 5</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 7. Career Readiness */}
                {careerReadiness && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>7. Career Readiness</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {careerReadiness.items.map((item, idx) => (
                        <View key={idx} style={{ width: "23%", backgroundColor: "#EFF6FF", padding: 6, borderRadius: 4, borderWidth: 1, borderColor: "#BFDBFE", alignItems: "center" }}>
                          <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1D4ED8" }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#1E40AF", marginTop: 2 }}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 8. Attendance & Discipline */}
                {attendanceDiscipline && (
                  <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>8. Attendance & Discipline</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {attendanceDiscipline.items.map((item, idx) => (
                        <View key={idx} style={{ width: "23%", backgroundColor: "#F3F4F6", padding: 6, borderRadius: 4, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" }}>
                          <Text style={{ fontSize: 7, fontWeight: "bold", color: "#4B5563" }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#1F2937", marginTop: 2 }}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 9. Co-Curricular Activities */}
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>9. Co-Curricular Activities</Text>
                  <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, fontWeight: "bold", fontSize: 8 }}>
                    <Text style={{ width: "30%" }}>Category</Text>
                    <Text style={{ width: "40%" }}>Activity / Certificate</Text>
                    <Text style={{ width: "30%" }}>Remark</Text>
                  </View>
                  {reportCardData.coCurricular && reportCardData.coCurricular.length > 0 ? (
                    reportCardData.coCurricular.map((act, idx) => (
                      <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 4, fontSize: 8 }}>
                        <Text style={{ width: "30%" }}>{act.category}</Text>
                        <Text style={{ width: "40%" }}>{act.title}</Text>
                        <Text style={{ width: "30%" }}>{act.remark}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 8, color: "#9CA3AF", textAlign: "center", padding: 6 }}>No co-curricular activities recorded.</Text>
                  )}
                </View>

                {/* 10. Strengths & Areas for Improvement */}
                {strengthsImprovement && (
                  <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
                    {strengthsImprovement.items.map((item, idx) => (
                      <View key={idx} style={{ flex: 1, backgroundColor: idx === 0 ? "#ECFDF5" : "#FEF2F2", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: idx === 0 ? "#A7F3D0" : "#FCA5A5" }}>
                        <Text style={{ fontSize: 9, fontWeight: "bold", color: idx === 0 ? "#065F46" : "#991B1B", marginBottom: 3 }}>{item.itemName}</Text>
                        <Text style={{ fontSize: 8, color: "#374151", lineHeight: 1.3 }}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 11. Faculty / Mentor Feedback */}
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>11. Faculty / Mentor Feedback</Text>
                  <Text style={{ fontSize: 9, color: "#374151", fontStyle: "italic", lineHeight: 1.4 }}>
                    "{reportCardData.facultyRemark || "No comments provided yet."}"
                  </Text>
                </View>

                {/* 12. Overall Performance */}
                {overallPerformance && (
                  <View style={{ backgroundColor: "#312E81", padding: 12, borderRadius: 6, color: "#FFFFFF" }} wrap={false}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: "#F59E0B", textAlign: "center", textTransform: "uppercase", marginBottom: 6 }}>12. Overall Performance</Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      {overallPerformance.items.map((item, idx) => {
                        if (item.itemName === "Overall Rating" || item.itemName === "Performance Level") return null;
                        return (
                          <View key={idx} style={{ width: "23%", backgroundColor: "rgba(255, 255, 255, 0.1)", padding: 4, borderRadius: 4, alignItems: "center" }}>
                            <Text style={{ fontSize: 7, color: "#E0E7FF" }}>{item.itemName}</Text>
                            <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 2, color: "#FFFFFF" }}>{item.value} / 5</Text>
                          </View>
                        );
                      })}
                    </View>
                    {(() => {
                      const ratingItem = overallPerformance.items.find(i => i.itemName === "Overall Rating");
                      const levelItem = overallPerformance.items.find(i => i.itemName === "Performance Level") || ratingItem;
                      return (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.2)", paddingTop: 6, marginTop: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#F59E0B" }}>Overall Rating: {ratingItem?.value || "4.02"} / 5</Text>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#F59E0B" }}>Performance Level: {levelItem?.remark || levelItem?.value || "Excellent"}</Text>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            );
          })()
        ) : (
          <>
            {/* ======= CUSTOM TWO-COLUMN SECTION (28% | 68% with stacked rows on right) ======= */}
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

              {/* RIGHT: 68% - Top row: Soft + Discipline side-by-side; Bottom row: Co-curricular cards */}
              <View style={styles.rightCol60}>
                {/* Top half: Soft Skills + Discipline */}
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

                {/* Bottom half: Co-curricular heading + cards */}
                <View style={styles.rightBottomRow}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Co-Curricular Activities</Text>
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
          </>
        )}

        {/* Academic Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Performance</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[
              { title: "Current Level", val: `Level ${studentData?.currentSubLevelId?.name || studentData?.currentLevel || "1A"}` },
              { title: "1st Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ?? "N/A" },
              { title: "2nd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ?? "N/A" },
              { title: "3rd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ?? "N/A" },
              { title: "CGPA", val: reportCardData?.academicPerformance?.cgpa ?? "N/A" },
            ].map((it, idx) => (
              <View
                key={idx}
                style={{
                  width: "19.2%",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#E5E7EB",
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ fontSize: 9, color: "#6B7280", textAlign: "center", marginBottom: 4 }}>
                  {it.title}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center", color: "#111827" }}>
                  {it.val}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Faculty Feedback */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Faculty Feedback</Text>
          <Text style={styles.value}>
            {reportCardData?.facultyRemark || "No feedback available"}
          </Text>

          <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
            <Text style={styles.label}>
              Rating:{" "}
              <Text style={styles.value}>
                {(() => {
                  const g = (reportCardData?.overallGrade || "").toUpperCase();
                  if (g === "A+") return "5.0";
                  if (g === "A") return "4.5";
                  if (g === "B+") return "4.0";
                  if (g === "B") return "3.5";
                  if (g === "C+") return "3.0";
                  if (g === "C") return "2.5";
                  if (g === "D+") return "2.0";
                  if (g === "D") return "1.5";
                  if (g === "F") return "1.0";
                  return "3.0";
                })()} ★
              </Text>
            </Text>

            <Text style={styles.label}>
              Generated by:{" "}
              <Text style={styles.value}>
                {reportCardData?.generatedByName || "N/A"}
              </Text>
            </Text>
          </View>
        </View> */}

        {/* Footer */}
   <View style={styles.footer} fixed>
  <View style={styles.footerColumn}>
    <Text style={styles.footerHeading}>Final Status</Text>
    <Text style={styles.footerValue}>
      {reportCardData?.finalStatus || "Level 2A"}
    </Text>
  </View>

  <View style={styles.footerColumn}>
    <Text style={styles.footerHeading}>Result</Text>
    <Text style={styles.footerValue}>
      {reportCardData?.result || "2A"}
    </Text>
  </View>

  <View style={styles.footerColumn}>
    <Text style={styles.footerHeading}>Overall Grade</Text>
    <Text style={styles.footerValue}>
      {reportCardData?.overallGrade || "A"}
    </Text>
  </View>
</View>


      </Page>
    </Document>
  );
};

export default StudentReportPDF;



// import React from "react";
// import {
//   Document,
//   Page,
//   Text,
//   View,
//   StyleSheet,
//   Image,
//   Svg,
//   Line,
//   Circle,
//   G,
// } from "@react-pdf/renderer";

// import logo from "../../../assets/images/doulLogo.png";
// import profileIcon from "../../../assets/icons/StuReportprofile_icon.png";
// import courseIcon from "../../../assets/icons/StuReportCourse_icon.png";
// import mailIcon from "../../../assets/icons/StuReportMail_icon.png";
// import fatherIcon from "../../../assets/icons/StuReportFather_icon.png";
// import contactIcon from "../../../assets/icons/StuReport_Phone.png";
// import addressIcon from "../../../assets/icons/StuReportAddress_icon.png";

// /* =================== Styles =================== */
// const styles = StyleSheet.create({
//   page: {
//     flexDirection: "column",
//     backgroundColor: "#FFFFFF",
//     paddingTop: 12,
//     paddingHorizontal: 18,
//     paddingBottom: 12,
//     fontFamily: "Helvetica",
//   },

//   /* Header */
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//     paddingBottom: 6,
//     borderBottomWidth: 2,
//     borderBottomColor: "#7335DD",
//     borderBottomStyle: "solid",
//   },
//   headerLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     minWidth: 70,
//     flexShrink: 0,
//   },
//   headerCenter: { flexGrow: 1, alignItems: "center", paddingHorizontal: 8 },
//   headerRight: { minWidth: 120, alignItems: "flex-end" },

//   logo: {
//     width: 78,   // increased logo size a bit
//     height: 52,
//     objectFit: "contain",
//     maxWidth: "100%",
//   },

//   title: { fontSize: 18, fontWeight: "bold", color: "#111827" },
//   subMuted: { fontSize: 9, color: "#6B7280" },
//   subBold: { fontSize: 10, color: "#111827", fontWeight: "bold" },

//   /* Section/Card */
//   section: {
//     marginBottom: 8,
//     padding: 10,
//     backgroundColor: "#F9FAFB",
//     borderRadius: 6,
//     borderWidth: 1,
//     borderStyle: "solid",
//     borderColor: "#E5E7EB",
//   },
//   sectionTitle: {
//     fontSize: 12,
//     fontWeight: "bold",
//     color: "#111827",
//     marginBottom: 8,
//   },

//   /* Info grid */
//   infoGrid: { flexDirection: "row", flexWrap: "wrap" },
//   infoCell: { width: "33.3333%", paddingRight: 4, marginBottom: 4 },
//   infoTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
//   icon: { width: 11, height: 11, marginRight: 6 },
//   label: { fontSize: 9, color: "#6B7280", fontWeight: "bold" },
//   value: { fontSize: 10, color: "#111827" },

//   /* Level Progress */
//   levelWrap: { paddingVertical: 6 },
//   levelLegend: {
//     marginTop: 6,
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   badge: { fontSize: 9, color: "#374151", textAlign: "center", width: 28 },

//   /* Two-column main row: left = 28%, right = 68% (adjusted to allow wider right top columns) */
//   mainRow: { flexDirection: "row", gap: 8, marginBottom: 6, width: "100%" },
//   leftCol30: {
//     width: "28%", // slightly reduced to give more space to right column
//     backgroundColor: "#FFFFFF",
//     borderRadius: 6,
//     borderWidth: 1,
//     borderStyle: "solid",
//     borderColor: "#E5E7EB",
//     padding: 10,
//     minWidth: 0,
//   },
//   rightCol60: {
//     width: "68%", // increased to 68% so inner columns can be wider
//     flexDirection: "column",
//   },

//   /* Top half inside right column: two columns (Soft | Discipline) */
//   rightTopRow: {
//     flexDirection: "row",
//     marginBottom: 6,
//     // use space-between so gap exists between columns
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//   },
//   // increased width for each column so they appear larger; left + right + gap ~100% of rightCol
//   rightTopCol: {
//     width: "49%",           // give each column 49% of rightCol so there's 2% gap
//     paddingHorizontal: 8,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     padding: 10,
//     minWidth: 0,
//   },

//   /* Bottom half inside right column: Co-curricular cards */
//   rightBottomRow: { width: "100%", marginTop: 6 },
//   coCardsWrap: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     flexWrap: "wrap",
//   },
//   coCard: {
//     width: "31%", // slightly reduced so 3 fit with gaps
//     paddingVertical: 6,
//     paddingHorizontal: 6,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 5,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     marginBottom: 8,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   coCardTitle: {
//     fontSize: 10,
//     fontWeight: 700,
//     color: "#374151",
//     textAlign: "center",
//     marginBottom: 4,
//   },
//   coCardCount: {
//     fontSize: 16,
//     fontWeight: 700,
//     color: "#111827",
//     textAlign: "center",
//   },

//   /* Progress list */
//   skillRow: { marginBottom: 8 },
//   skillHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 4,
//   },
//   small: { fontSize: 9, color: "#374151" },
//   barTrack: {
//     height: 8,
//     backgroundColor: "#E5E7EB",
//     borderRadius: 5,
//     overflow: "hidden",
//   },
//   barFill: { height: 8, backgroundColor: "#7335DD" },

//   /* Soft skills */
//   softRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 8,
//   },
//   softLeft: { fontSize: 9.5, color: "#374151" },
//   softRight: { fontSize: 9.5, fontWeight: "bold" },

//   /* Career readiness (4 in one row) */
//   readinessRow: { flexDirection: "row", justifyContent: "space-between" },
//   pill: {
//     width: "23%",
//     backgroundColor: "#F3F4F6",
//     borderRadius: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 8,
//     borderWidth: 1,
//     borderStyle: "solid",
//     borderColor: "#E5E7EB",
//   },
//   pillLabel: { fontSize: 9, color: "#6B7280", marginBottom: 6, textAlign: "center" },
//   pillValue: { fontSize: 10, fontWeight: "bold", color: "#111827", textAlign: "center" },

//   /* Footer */
//   footer: {
//     marginTop: 8,
//     padding: 8,
//     backgroundColor: "#7335DD",
//     borderRadius: 6,
//   },
//   footerText: { fontSize: 10, color: "#FFFFFF", textAlign: "center" },
// });

// /* =================== Helpers =================== */
// const InfoItem = ({ icon, label, value }) => (
//   <View style={styles.infoCell}>
//     <View style={styles.infoTop}>
//       <Image src={icon} style={styles.icon} />
//       <Text style={styles.label}>{label}</Text>
//     </View>
//     <Text style={styles.value}>{value || "N/A"}</Text>
//   </View>
// );

// const ProgressBar = ({ percent }) => (
//   <View style={styles.barTrack}>
//     <View
//       style={[
//         styles.barFill,
//         { width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%` },
//       ]}
//     />
//   </View>
// );

// const SoftItem = ({ title, status }) => (
//   <View style={styles.softRow}>
//     <Text style={styles.softLeft}>{title}</Text>
//     <Text
//       style={[
//         styles.softRight,
//         {
//           color:
//             status === "Excellent"
//               ? "#059669"
//               : status === "Good"
//               ? "#2563EB"
//               : status === "Average"
//               ? "#D97706"
//               : "#DC2626",
//         },
//       ]}
//     >
//       {status}
//     </Text>
//   </View>
// );

// const softStatus = (score, max) => {
//   const pct = (Number(score || 0) / Number(max || 1)) * 100;
//   if (pct >= 90) return "Excellent";
//   if (pct >= 70) return "Good";
//   if (pct >= 50) return "Average";
//   return "Poor";
// };

// /* Level steps array */
// const LEVEL_STEPS = ["1A", "1B", "1C", "2A", "2B", "2C"];

// /* =================== Level Timeline Component =================== */
// const LevelTimeline = ({ currentLevel = "1A" }) => {
//   const steps = LEVEL_STEPS;
//   const currentLevelUpper = String(currentLevel || "1A").toUpperCase();
//   const currentIdx = Math.max(
//     0,
//     steps.findIndex((s) => s.toUpperCase() === currentLevelUpper)
//   );

//   const width = 480;
//   const padding = 20;
//   const yCenter = 15;
//   const circleRadius = 12;
//   const lineStrokeWidth = 3;

//   const innerWidth = width - padding * 2;
//   const pts = steps.map((_, i) => padding + (i * innerWidth) / (steps.length - 1));
//   const progressLineEnd = pts[currentIdx];

//   return (
//     <View style={styles.levelWrap}>
//       <Svg width={width} height="50" viewBox={`0 0 ${width} 50`}>
//         <Line
//           x1={pts[0]}
//           y1={yCenter}
//           x2={pts[steps.length - 1]}
//           y2={yCenter}
//           stroke="#E5E7EB"
//           strokeWidth={lineStrokeWidth}
//         />
//         <Line
//           x1={pts[0]}
//           y1={yCenter}
//           x2={progressLineEnd}
//           y2={yCenter}
//           stroke="#10B981"
//           strokeWidth={lineStrokeWidth}
//         />

//         {pts.map((x, i) => {
//           const isPassed = i < currentIdx;
//           const isCurrent = i === currentIdx;

//           const circleFill = isPassed ? "#10B981" : isCurrent ? "#F59E0B" : "#E5E7EB";
//           const labelColor = isCurrent ? "#F59E0B" : "#374151";

//           return (
//             <G key={i}>
//               <Circle
//                 cx={x}
//                 cy={yCenter}
//                 r={circleRadius}
//                 fill={circleFill}
//                 stroke={isCurrent ? "#F59E0B" : "none"}
//                 strokeWidth={isCurrent ? 1 : 0}
//               />

//               {isPassed && (
//                 <Text
//                   x={x}
//                   y={yCenter + 4}
//                   textAnchor="middle"
//                   fontSize="12"
//                   fill="white"
//                   fontWeight="bold"
//                 >
//                   ✓
//                 </Text>
//               )}

//               {!isPassed && (
//                 <Text
//                   x={x}
//                   y={yCenter + 3}
//                   textAnchor="middle"
//                   fontSize="10"
//                   fill={isCurrent ? "white" : "#6B7280"}
//                   fontWeight={isCurrent ? "bold" : "normal"}
//                 >
//                   {steps[i]}
//                 </Text>
//               )}

//               <Text
//                 x={x}
//                 y={yCenter + 25}
//                 textAnchor="middle"
//                 fontSize="8"
//                 fill={labelColor}
//                 fontWeight={isCurrent ? "bold" : "normal"}
//               >
//                 {steps[i]}
//               </Text>
//             </G>
//           );
//         })}
//       </Svg>
//     </View>
//   );
// };

// /* =================== Main Component =================== */
// const StudentReportPDF = ({ studentData = {}, reportCardData = {} }) => {
//   const technicalSkills =
//     reportCardData?.technicalSkills?.map((s) => ({
//       name: s?.skillName || "Skill",
//       percent: Math.round(Number(s?.totalPercentage || 0)),
//     })) || [];

//   const softCats = reportCardData?.softSkills?.categories || [];
//   const discCats = reportCardData?.discipline?.categories || [];

//   const co = reportCardData?.coCurricular || [];
//   const coCounts = ["Certificate", "Project", "Sports"].map((c) => ({
//     title: c,
//     count: co.filter((x) => (x?.category || "").toLowerCase() === c.toLowerCase())
//       .length,
//   }));

//   return (
//     <Document>
//       <Page size="A4" style={styles.page}>
//         {/* Header */}
//         <View style={styles.header}>
//           <View style={styles.headerLeft}>
//             <Image src={logo} style={styles.logo} />
//           </View>
//           <View style={styles.headerCenter}>
//             <Text style={styles.title}>Report Card</Text>
//           </View>
//           <View style={styles.headerRight}>
//             <Text style={styles.subMuted}>Academic Year</Text>
//             <Text style={styles.subBold}>Session 2024-25</Text>
//           </View>
//         </View>

//         {/* Personal Information */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Personal Information</Text>
//           <View style={styles.infoGrid}>
//             <InfoItem
//               icon={profileIcon}
//               label="Full Name"
//               value={`${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "N/A"}
//             />
//             <InfoItem icon={mailIcon} label="Email" value={studentData?.email} />
//             <InfoItem icon={contactIcon} label="Contact Number" value={studentData?.studentMobile} />
//             <InfoItem icon={courseIcon} label="Course" value={studentData?.course} />
//             <InfoItem icon={fatherIcon} label="Father's Name" value={studentData?.fatherName} />
//             <InfoItem icon={addressIcon} label="Current Level" value={`Level ${studentData?.currentLevel || "1A"}`} />
//           </View>
//         </View>

//         {/* Level Progress */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Level Progress</Text>
//           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
//             <Text style={[styles.value, { fontSize: 11 }]}>
//               Current Level: <Text style={{ fontWeight: "bold", color: "#F59E0B" }}>Level {studentData?.currentLevel || "1A"}</Text>
//             </Text>
//             <Text style={[styles.small, { color: "#6B7280" }]}>
//               Progress: {Math.round(((LEVEL_STEPS.findIndex(s => s === (studentData?.currentLevel || "1A")) + 1) / LEVEL_STEPS.length) * 100)}% Complete
//             </Text>
//           </View>
//           <LevelTimeline currentLevel={studentData?.currentLevel || "1A"} />
//         </View>

//         {/* ======= CUSTOM TWO-COLUMN SECTION (28% | 68% with stacked rows on right) ======= */}
//         <View style={styles.mainRow}>
//           {/* LEFT: 28% - Technical Skills */}
//           <View style={styles.leftCol30}>
//             <Text style={styles.sectionTitle}>Technical Skills</Text>
//             {(technicalSkills.length ? technicalSkills : [{ name: "N/A", percent: 0 }]).map(
//               (s, i) => (
//                 <View key={i} style={styles.skillRow}>
//                   <View style={styles.skillHeader}>
//                     <Text style={styles.small}>{s.name}</Text>
//                     <Text style={styles.small}>{s.percent}%</Text>
//                   </View>
//                   <ProgressBar percent={s.percent} />
//                 </View>
//               )
//             )}
//           </View>

//           {/* RIGHT: 68% - Top row: Soft + Discipline side-by-side; Bottom row: Co-curricular cards */}
//           <View style={styles.rightCol60}>
//             {/* Top half: Soft Skills + Discipline */}
//             <View style={styles.rightTopRow}>
//               <View style={styles.rightTopCol}>
//                 <Text style={styles.sectionTitle}>Soft Skills</Text>
//                 {softCats.length ? (
//                   softCats.map((c, i) => (
//                     <SoftItem
//                       key={i}
//                       title={c?.title || "Skill"}
//                       status={softStatus(c?.score, c?.maxMarks)}
//                     />
//                   ))
//                 ) : (
//                   <Text style={styles.small}>N/A</Text>
//                 )}
//               </View>

//               <View style={styles.rightTopCol}>
//                 <Text style={styles.sectionTitle}>Discipline</Text>
//                 {discCats.length ? (
//                   discCats.map((c, i) => {
//                     const pct = ((Number(c?.score || 0) / Number(c?.maxMarks || 10)) * 100) || 0;
//                     return (
//                       <View key={i} style={styles.skillRow}>
//                         <View style={styles.skillHeader}>
//                           <Text style={styles.small}>{c?.title || "Metric"}</Text>
//                           <Text style={styles.small}>
//                             {c?.score}/{c?.maxMarks}
//                           </Text>
//                         </View>
//                         <ProgressBar percent={pct} />
//                       </View>
//                     );
//                   })
//                 ) : (
//                   <Text style={styles.small}>N/A</Text>
//                 )}
//               </View>
//             </View>

//             {/* Bottom half: Co-curricular heading + cards */}
//             <View style={styles.rightBottomRow}>
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Co-Curricular Activities</Text>
//                 <View style={styles.coCardsWrap}>
//                   {coCounts.map((c) => (
//                     <View key={c.title} style={styles.coCard}>
//                       <Text style={styles.coCardTitle}>{c.title}</Text>
//                       <Text style={styles.coCardCount}>{c.count}</Text>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </View>
//         </View>

//         {/* Career Readiness */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Career Readiness</Text>
//           <View style={styles.readinessRow}>
//             <View style={styles.pill}>
//               <Text style={styles.pillLabel}>Resume</Text>
//               <Text style={styles.pillValue}>
//                 {reportCardData?.careerReadiness?.resumeStatus || "Not created"}
//               </Text>
//             </View>
//             <View style={styles.pill}>
//               <Text style={styles.pillLabel}>LinkedIn</Text>
//               <Text style={styles.pillValue}>
//                 {reportCardData?.careerReadiness?.linkedinStatus || "Need to improve"}
//               </Text>
//             </View>
//             <View style={styles.pill}>
//               <Text style={styles.pillLabel}>Aptitude</Text>
//               <Text style={styles.pillValue}>
//                 {reportCardData?.careerReadiness?.aptitudeStatus || "In-progress"}
//               </Text>
//             </View>
//             <View style={styles.pill}>
//               <Text style={styles.pillLabel}>Placement</Text>
//               <Text style={styles.pillValue}>
//                 {reportCardData?.careerReadiness?.placementReady || "Not-ready"}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* Academic Performance */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Academic Performance</Text>
//           <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
//             {[
//               { title: "Current Level", val: `Level ${studentData?.currentLevel || "1A"}` },
//               { title: "1st Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ?? "N/A" },
//               { title: "2nd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ?? "N/A" },
//               { title: "3rd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ?? "N/A" },
//               { title: "CGPA", val: reportCardData?.academicPerformance?.cgpa ?? "N/A" },
//             ].map((it, idx) => (
//               <View
//                 key={idx}
//                 style={{
//                   width: "19.2%",
//                   backgroundColor: "#FFFFFF",
//                   borderRadius: 6,
//                   borderWidth: 1,
//                   borderStyle: "solid",
//                   borderColor: "#E5E7EB",
//                   paddingVertical: 8,
//                   paddingHorizontal: 6,
//                 }}
//               >
//                 <Text style={{ fontSize: 9, color: "#6B7280", textAlign: "center", marginBottom: 4 }}>
//                   {it.title}
//                 </Text>
//                 <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center", color: "#111827" }}>
//                   {it.val}
//                 </Text>
//               </View>
//             ))}
//           </View>
//         </View>

//         {/* Faculty Feedback */}
//         {/* <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Faculty Feedback</Text>
//           <Text style={styles.value}>
//             {reportCardData?.facultyRemark || "No feedback available"}
//           </Text>

//           <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
//             <Text style={styles.label}>
//               Rating:{" "}
//               <Text style={styles.value}>
//                 {(() => {
//                   const g = (reportCardData?.overallGrade || "").toUpperCase();
//                   if (g === "A+") return "5.0";
//                   if (g === "A") return "4.5";
//                   if (g === "B+") return "4.0";
//                   if (g === "B") return "3.5";
//                   if (g === "C+") return "3.0";
//                   if (g === "C") return "2.5";
//                   if (g === "D+") return "2.0";
//                   if (g === "D") return "1.5";
//                   if (g === "F") return "1.0";
//                   return "3.0";
//                 })()} ★
//               </Text>
//             </Text>

//             <Text style={styles.label}>
//               Generated by:{" "}
//               <Text style={styles.value}>
//                 {reportCardData?.generatedByName || "N/A"}
//               </Text>
//             </Text>
//           </View>
//         </View> */}

//         {/* Footer */}
//         <View style={styles.footer} fixed>
//           <Text style={styles.footerText}>
//             Current Level: {studentData?.currentLevel || "1A"} • Overall Grade: {reportCardData?.overallGrade || "B+"} • Academic Year: 2024-25
//           </Text>
//         </View>
//       </Page>
//     </Document>
//   );
// };

// export default StudentReportPDF;



// // import React from "react";
// // import {
// //   Document,
// //   Page,
// //   Text,
// //   View,
// //   StyleSheet,
// //   Image,
// //   Svg,
// //   Line,
// //   Circle,
// //   G,
// // } from "@react-pdf/renderer";

// // import logo from "../../../assets/images/doulLogo.png";
// // import profileIcon from "../../../assets/icons/StuReportprofile_icon.png";
// // import courseIcon from "../../../assets/icons/StuReportCourse_icon.png";
// // import mailIcon from "../../../assets/icons/StuReportMail_icon.png";
// // import fatherIcon from "../../../assets/icons/StuReportFather_icon.png";
// // import contactIcon from "../../../assets/icons/StuReport_Phone.png";
// // import addressIcon from "../../../assets/icons/StuReportAddress_icon.png";

// // /* =================== Styles =================== */
// // const styles = StyleSheet.create({
// //   page: {
// //     flexDirection: "column",
// //     backgroundColor: "#FFFFFF",
// //     paddingTop: 12,
// //     paddingHorizontal: 18,
// //     paddingBottom: 12,
// //     fontFamily: "Helvetica",
// //   },

// //   /* Header */
// //   header: {
// //     flexDirection: "row",
// //     justifyContent: "space-between",
// //     alignItems: "center",
// //     marginBottom: 8,
// //     paddingBottom: 6,
// //     borderBottomWidth: 2,
// //     borderBottomColor: "#7335DD",
// //     borderBottomStyle: "solid",
// //   },
// //   headerLeft: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     // Removed fixed width — allow it to size naturally but not shrink below this
// //     minWidth: 70,
// //     flexShrink: 0,
// //   },
// //   headerCenter: { flexGrow: 1, alignItems: "center", paddingHorizontal: 8 },
// //   headerRight: { minWidth: 120, alignItems: "flex-end" },

// //   logo: {
// //     width: 68,
// //     height: 46,
// //     objectFit: "contain",
// //     maxWidth: "100%",
// //   },

// //   title: { fontSize: 18, fontWeight: "bold", color: "#111827" },
// //   subMuted: { fontSize: 9, color: "#6B7280" },
// //   subBold: { fontSize: 10, color: "#111827", fontWeight: "bold" },

// //   /* Section/Card */
// //   section: {
// //     marginBottom: 8,
// //     padding: 10,
// //     backgroundColor: "#F9FAFB",
// //     borderRadius: 6,
// //     borderWidth: 1,
// //     borderStyle: "solid",
// //     borderColor: "#E5E7EB",
// //   },
// //   sectionTitle: {
// //     fontSize: 12,
// //     fontWeight: "bold",
// //     color: "#111827",
// //     marginBottom: 8,
// //   },

// //   /* Info grid */
// //   infoGrid: { flexDirection: "row", flexWrap: "wrap" },
// //   infoCell: { width: "33.3333%", paddingRight: 4, marginBottom: 4 },
// //   infoTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
// //   icon: { width: 11, height: 11, marginRight: 6 },
// //   label: { fontSize: 9, color: "#6B7280", fontWeight: "bold" },
// //   value: { fontSize: 10, color: "#111827" },

// //   /* Level Progress */
// //   levelWrap: { paddingVertical: 6 },
// //   levelLegend: {
// //     marginTop: 6,
// //     flexDirection: "row",
// //     justifyContent: "space-between",
// //   },
// //   badge: { fontSize: 9, color: "#374151", textAlign: "center", width: 28 },

// //   /* Two-column main row: left = 30%, right = 60% (right has stacked rows) */
// //   mainRow: { flexDirection: "row", gap: 8, marginBottom: 6, width: "100%" },
// //   leftCol30: {
// //     width: "30%",
// //     backgroundColor: "#FFFFFF",
// //     borderRadius: 6,
// //     borderWidth: 1,
// //     borderStyle: "solid",
// //     borderColor: "#E5E7EB",
// //     padding: 10,
// //     minWidth: 0,
// //   },
// //   rightCol60: {
// //     width: "60%",
// //     flexDirection: "column",
// //   },

// //   /* Top half inside right column: two columns (Soft | Discipline) */
// //   rightTopRow: { flexDirection: "row", marginBottom: 6 },
// //   rightTopCol: {
// //     width: "50%",
// //     paddingHorizontal: 6,
// //     backgroundColor: "#FFFFFF",
// //     borderRadius: 6,
// //     borderWidth: 1,
// //     borderColor: "#E5E7EB",
// //     padding: 10,
// //     minWidth: 0,
// //   },

// //   /* Bottom half inside right column: Co-curricular cards */
// //   rightBottomRow: { width: "100%", marginTop: 6 },
// //   coCardsWrap: {
// //     flexDirection: "row",
// //     justifyContent: "space-between",
// //     flexWrap: "wrap",
// //   },
// //   coCard: {
// //     width: "31%", // slightly reduced so 3 fit with gaps
// //     paddingVertical: 6,
// //     paddingHorizontal: 6,
// //     backgroundColor: "#FFFFFF",
// //     borderRadius: 5,
// //     borderWidth: 1,
// //     borderColor: "#E5E7EB",
// //     marginBottom: 8,
// //     justifyContent: "center",
// //     alignItems: "center",
// //   },
// //   coCardTitle: {
// //     fontSize: 10,
// //     fontWeight: 700,
// //     color: "#374151",
// //     textAlign: "center",
// //     marginBottom: 4,
// //   },
// //   coCardCount: {
// //     fontSize: 16,
// //     fontWeight: 700,
// //     color: "#111827",
// //     textAlign: "center",
// //   },

// //   /* Progress list */
// //   skillRow: { marginBottom: 8 },
// //   skillHeader: {
// //     flexDirection: "row",
// //     justifyContent: "space-between",
// //     marginBottom: 4,
// //   },
// //   small: { fontSize: 9, color: "#374151" },
// //   barTrack: {
// //     height: 8,
// //     backgroundColor: "#E5E7EB",
// //     borderRadius: 5,
// //     overflow: "hidden",
// //   },
// //   barFill: { height: 8, backgroundColor: "#7335DD" },

// //   /* Soft skills */
// //   softRow: {
// //     flexDirection: "row",
// //     justifyContent: "space-between",
// //     marginBottom: 8,
// //   },
// //   softLeft: { fontSize: 9.5, color: "#374151" },
// //   softRight: { fontSize: 9.5, fontWeight: "bold" },

// //   /* Career readiness (4 in one row) */
// //   readinessRow: { flexDirection: "row", justifyContent: "space-between" },
// //   pill: {
// //     width: "23%",
// //     backgroundColor: "#F3F4F6",
// //     borderRadius: 8,
// //     paddingVertical: 10,
// //     paddingHorizontal: 8,
// //     borderWidth: 1,
// //     borderStyle: "solid",
// //     borderColor: "#E5E7EB",
// //   },
// //   pillLabel: { fontSize: 9, color: "#6B7280", marginBottom: 6, textAlign: "center" },
// //   pillValue: { fontSize: 10, fontWeight: "bold", color: "#111827", textAlign: "center" },

// //   /* Footer */
// //   footer: {
// //     marginTop: 8,
// //     padding: 8,
// //     backgroundColor: "#7335DD",
// //     borderRadius: 6,
// //   },
// //   footerText: { fontSize: 10, color: "#FFFFFF", textAlign: "center" },
// // });

// // /* =================== Helpers =================== */
// // const InfoItem = ({ icon, label, value }) => (
// //   <View style={styles.infoCell}>
// //     <View style={styles.infoTop}>
// //       <Image src={icon} style={styles.icon} />
// //       <Text style={styles.label}>{label}</Text>
// //     </View>
// //     <Text style={styles.value}>{value || "N/A"}</Text>
// //   </View>
// // );

// // const ProgressBar = ({ percent }) => (
// //   <View style={styles.barTrack}>
// //     <View
// //       style={[
// //         styles.barFill,
// //         { width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%` },
// //       ]}
// //     />
// //   </View>
// // );

// // const SoftItem = ({ title, status }) => (
// //   <View style={styles.softRow}>
// //     <Text style={styles.softLeft}>{title}</Text>
// //     <Text
// //       style={[
// //         styles.softRight,
// //         {
// //           color:
// //             status === "Excellent"
// //               ? "#059669"
// //               : status === "Good"
// //               ? "#2563EB"
// //               : status === "Average"
// //               ? "#D97706"
// //               : "#DC2626",
// //         },
// //       ]}
// //     >
// //       {status}
// //     </Text>
// //   </View>
// // );

// // const softStatus = (score, max) => {
// //   const pct = (Number(score || 0) / Number(max || 1)) * 100;
// //   if (pct >= 90) return "Excellent";
// //   if (pct >= 70) return "Good";
// //   if (pct >= 50) return "Average";
// //   return "Poor";
// // };

// // /* Level steps array */
// // const LEVEL_STEPS = ["1A", "1B", "1C", "2A", "2B", "2C"];

// // /* =================== Level Timeline Component =================== */
// // const LevelTimeline = ({ currentLevel = "1A" }) => {
// //   const steps = LEVEL_STEPS;
// //   const currentLevelUpper = String(currentLevel || "1A").toUpperCase();
// //   const currentIdx = Math.max(
// //     0,
// //     steps.findIndex((s) => s.toUpperCase() === currentLevelUpper)
// //   );

// //   const width = 480;
// //   const padding = 20;
// //   const yCenter = 15;
// //   const circleRadius = 12;
// //   const lineStrokeWidth = 3;

// //   const innerWidth = width - padding * 2;
// //   const pts = steps.map((_, i) => padding + (i * innerWidth) / (steps.length - 1));
// //   const progressLineEnd = pts[currentIdx];

// //   return (
// //     <View style={styles.levelWrap}>
// //       <Svg width={width} height="50" viewBox={`0 0 ${width} 50`}>
// //         <Line
// //           x1={pts[0]}
// //           y1={yCenter}
// //           x2={pts[steps.length - 1]}
// //           y2={yCenter}
// //           stroke="#E5E7EB"
// //           strokeWidth={lineStrokeWidth}
// //         />
// //         <Line
// //           x1={pts[0]}
// //           y1={yCenter}
// //           x2={progressLineEnd}
// //           y2={yCenter}
// //           stroke="#10B981"
// //           strokeWidth={lineStrokeWidth}
// //         />

// //         {pts.map((x, i) => {
// //           const isPassed = i < currentIdx;
// //           const isCurrent = i === currentIdx;

// //           const circleFill = isPassed ? "#10B981" : isCurrent ? "#F59E0B" : "#E5E7EB";
// //           const labelColor = isCurrent ? "#F59E0B" : "#374151";

// //           return (
// //             <G key={i}>
// //               <Circle
// //                 cx={x}
// //                 cy={yCenter}
// //                 r={circleRadius}
// //                 fill={circleFill}
// //                 stroke={isCurrent ? "#F59E0B" : "none"}
// //                 strokeWidth={isCurrent ? 1 : 0}
// //               />

// //               {isPassed && (
// //                 <Text
// //                   x={x}
// //                   y={yCenter + 4}
// //                   textAnchor="middle"
// //                   fontSize="12"
// //                   fill="white"
// //                   fontWeight="bold"
// //                 >
// //                   ✓
// //                 </Text>
// //               )}

// //               {!isPassed && (
// //                 <Text
// //                   x={x}
// //                   y={yCenter + 3}
// //                   textAnchor="middle"
// //                   fontSize="10"
// //                   fill={isCurrent ? "white" : "#6B7280"}
// //                   fontWeight={isCurrent ? "bold" : "normal"}
// //                 >
// //                   {steps[i]}
// //                 </Text>
// //               )}

// //               <Text
// //                 x={x}
// //                 y={yCenter + 25}
// //                 textAnchor="middle"
// //                 fontSize="8"
// //                 fill={labelColor}
// //                 fontWeight={isCurrent ? "bold" : "normal"}
// //               >
// //                 {steps[i]}
// //               </Text>
// //             </G>
// //           );
// //         })}
// //       </Svg>
// //     </View>
// //   );
// // };

// // /* =================== Main Component =================== */
// // const StudentReportPDF = ({ studentData = {}, reportCardData = {} }) => {
// //   const technicalSkills =
// //     reportCardData?.technicalSkills?.map((s) => ({
// //       name: s?.skillName || "Skill",
// //       percent: Math.round(Number(s?.totalPercentage || 0)),
// //     })) || [];

// //   const softCats = reportCardData?.softSkills?.categories || [];
// //   const discCats = reportCardData?.discipline?.categories || [];

// //   const co = reportCardData?.coCurricular || [];
// //   const coCounts = ["Certificate", "Project", "Sports"].map((c) => ({
// //     title: c,
// //     count: co.filter((x) => (x?.category || "").toLowerCase() === c.toLowerCase())
// //       .length,
// //   }));

// //   return (
// //     <Document>
// //       <Page size="A4" style={styles.page}>
// //         {/* Header */}
// //         <View style={styles.header}>
// //           <View style={styles.headerLeft}>
// //             <Image src={logo} style={styles.logo} />
// //           </View>
// //           <View style={styles.headerCenter}>
// //             <Text style={styles.title}>Report Card</Text>
// //           </View>
// //           <View style={styles.headerRight}>
// //             <Text style={styles.subMuted}>Academic Year</Text>
// //             <Text style={styles.subBold}>Session 2024-25</Text>
// //           </View>
// //         </View>

// //         {/* Personal Information */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Personal Information</Text>
// //           <View style={styles.infoGrid}>
// //             <InfoItem
// //               icon={profileIcon}
// //               label="Full Name"
// //               value={`${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "N/A"}
// //             />
// //             <InfoItem icon={mailIcon} label="Email" value={studentData?.email} />
// //             <InfoItem icon={contactIcon} label="Contact Number" value={studentData?.studentMobile} />
// //             <InfoItem icon={courseIcon} label="Course" value={studentData?.course} />
// //             <InfoItem icon={fatherIcon} label="Father's Name" value={studentData?.fatherName} />
// //             <InfoItem icon={addressIcon} label="Current Level" value={`Level ${studentData?.currentLevel || "1A"}`} />
// //           </View>
// //         </View>

// //         {/* Level Progress */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Level Progress</Text>
// //           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
// //             <Text style={[styles.value, { fontSize: 11 }]}>
// //               Current Level: <Text style={{ fontWeight: "bold", color: "#F59E0B" }}>Level {studentData?.currentLevel || "1A"}</Text>
// //             </Text>
// //             <Text style={[styles.small, { color: "#6B7280" }]}>
// //               Progress: {Math.round(((LEVEL_STEPS.findIndex(s => s === (studentData?.currentLevel || "1A")) + 1) / LEVEL_STEPS.length) * 100)}% Complete
// //             </Text>
// //           </View>
// //           <LevelTimeline currentLevel={studentData?.currentLevel || "1A"} />
// //         </View>

// //         {/* ======= CUSTOM TWO-COLUMN SECTION (30% | 60% with stacked rows on right) ======= */}
// //         <View style={styles.mainRow}>
// //           {/* LEFT: 30% - Technical Skills */}
// //           <View style={styles.leftCol30}>
// //             <Text style={styles.sectionTitle}>Technical Skills</Text>
// //             {(technicalSkills.length ? technicalSkills : [{ name: "N/A", percent: 0 }]).map(
// //               (s, i) => (
// //                 <View key={i} style={styles.skillRow}>
// //                   <View style={styles.skillHeader}>
// //                     <Text style={styles.small}>{s.name}</Text>
// //                     <Text style={styles.small}>{s.percent}%</Text>
// //                   </View>
// //                   <ProgressBar percent={s.percent} />
// //                 </View>
// //               )
// //             )}
// //           </View>

// //           {/* RIGHT: 60% - Top row: Soft + Discipline side-by-side; Bottom row: Co-curricular cards */}
// //           <View style={styles.rightCol60}>
// //             {/* Top half: Soft Skills + Discipline */}
// //             <View style={styles.rightTopRow}>
// //               <View style={styles.rightTopCol}>
// //                 <Text style={styles.sectionTitle}>Soft Skills</Text>
// //                 {softCats.length ? (
// //                   softCats.map((c, i) => (
// //                     <SoftItem
// //                       key={i}
// //                       title={c?.title || "Skill"}
// //                       status={softStatus(c?.score, c?.maxMarks)}
// //                     />
// //                   ))
// //                 ) : (
// //                   <Text style={styles.small}>N/A</Text>
// //                 )}
// //               </View>

// //               <View style={styles.rightTopCol}>
// //                 <Text style={styles.sectionTitle}>Discipline</Text>
// //                 {discCats.length ? (
// //                   discCats.map((c, i) => {
// //                     const pct = ((Number(c?.score || 0) / Number(c?.maxMarks || 10)) * 100) || 0;
// //                     return (
// //                       <View key={i} style={styles.skillRow}>
// //                         <View style={styles.skillHeader}>
// //                           <Text style={styles.small}>{c?.title || "Metric"}</Text>
// //                           <Text style={styles.small}>
// //                             {c?.score}/{c?.maxMarks}
// //                           </Text>
// //                         </View>
// //                         <ProgressBar percent={pct} />
// //                       </View>
// //                     );
// //                   })
// //                 ) : (
// //                   <Text style={styles.small}>N/A</Text>
// //                 )}
// //               </View>
// //             </View>

// //             {/* Bottom half: Co-curricular heading + cards */}
// //             <View style={styles.rightBottomRow}>
// //               <View style={styles.section}>
// //                 <Text style={styles.sectionTitle}>Co-Curricular Activities</Text>
// //                 <View style={styles.coCardsWrap}>
// //                   {coCounts.map((c) => (
// //                     <View key={c.title} style={styles.coCard}>
// //                       <Text style={styles.coCardTitle}>{c.title}</Text>
// //                       <Text style={styles.coCardCount}>{c.count}</Text>
// //                     </View>
// //                   ))}
// //                 </View>
// //               </View>
// //             </View>
// //           </View>
// //         </View>

// //         {/* Career Readiness */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Career Readiness</Text>
// //           <View style={styles.readinessRow}>
// //             <View style={styles.pill}>
// //               <Text style={styles.pillLabel}>Resume</Text>
// //               <Text style={styles.pillValue}>
// //                 {reportCardData?.careerReadiness?.resumeStatus || "Not created"}
// //               </Text>
// //             </View>
// //             <View style={styles.pill}>
// //               <Text style={styles.pillLabel}>LinkedIn</Text>
// //               <Text style={styles.pillValue}>
// //                 {reportCardData?.careerReadiness?.linkedinStatus || "Need to improve"}
// //               </Text>
// //             </View>
// //             <View style={styles.pill}>
// //               <Text style={styles.pillLabel}>Aptitude</Text>
// //               <Text style={styles.pillValue}>
// //                 {reportCardData?.careerReadiness?.aptitudeStatus || "In-progress"}
// //               </Text>
// //             </View>
// //             <View style={styles.pill}>
// //               <Text style={styles.pillLabel}>Placement</Text>
// //               <Text style={styles.pillValue}>
// //                 {reportCardData?.careerReadiness?.placementReady || "Not-ready"}
// //               </Text>
// //             </View>
// //           </View>
// //         </View>

// //         {/* Academic Performance */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Academic Performance</Text>
// //           <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
// //             {[
// //               { title: "Current Level", val: `Level ${studentData?.currentLevel || "1A"}` },
// //               { title: "1st Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ?? "N/A" },
// //               { title: "2nd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ?? "N/A" },
// //               { title: "3rd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ?? "N/A" },
// //               { title: "CGPA", val: reportCardData?.academicPerformance?.cgpa ?? "N/A" },
// //             ].map((it, idx) => (
// //               <View
// //                 key={idx}
// //                 style={{
// //                   width: "19.2%",
// //                   backgroundColor: "#FFFFFF",
// //                   borderRadius: 6,
// //                   borderWidth: 1,
// //                   borderStyle: "solid",
// //                   borderColor: "#E5E7EB",
// //                   paddingVertical: 8,
// //                   paddingHorizontal: 6,
// //                 }}
// //               >
// //                 <Text style={{ fontSize: 9, color: "#6B7280", textAlign: "center", marginBottom: 4 }}>
// //                   {it.title}
// //                 </Text>
// //                 <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center", color: "#111827" }}>
// //                   {it.val}
// //                 </Text>
// //               </View>
// //             ))}
// //           </View>
// //         </View>

// //         {/* Faculty Feedback */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Faculty Feedback</Text>
// //           <Text style={styles.value}>
// //             {reportCardData?.facultyRemark || "No feedback available"}
// //           </Text>

// //           <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
// //             <Text style={styles.label}>
// //               Rating:{" "}
// //               <Text style={styles.value}>
// //                 {(() => {
// //                   const g = (reportCardData?.overallGrade || "").toUpperCase();
// //                   if (g === "A+") return "5.0";
// //                   if (g === "A") return "4.5";
// //                   if (g === "B+") return "4.0";
// //                   if (g === "B") return "3.5";
// //                   if (g === "C+") return "3.0";
// //                   if (g === "C") return "2.5";
// //                   if (g === "D+") return "2.0";
// //                   if (g === "D") return "1.5";
// //                   if (g === "F") return "1.0";
// //                   return "3.0";
// //                 })()} ★
// //               </Text>
// //             </Text>

// //             <Text style={styles.label}>
// //               Generated by:{" "}
// //               <Text style={styles.value}>
// //                 {reportCardData?.generatedByName || "N/A"}
// //               </Text>
// //             </Text>
// //           </View>
// //         </View>

// //         {/* Footer */}
// //         <View style={styles.footer} fixed>
// //           <Text style={styles.footerText}>
// //             Current Level: {studentData?.currentLevel || "1A"} • Overall Grade: {reportCardData?.overallGrade || "B+"} • Academic Year: 2024-25
// //           </Text>
// //         </View>
// //       </Page>
// //     </Document>
// //   );
// // };

// // export default StudentReportPDF;



// // // import React from "react";
// // // import {
// // //   Document,
// // //   Page,
// // //   Text,
// // //   View,
// // //   StyleSheet,
// // //   Image,
// // //   Svg,
// // //   Line,
// // //   Circle,
// // //   G, // Use G for grouping elements for better rendering/styling in react-pdf
// // // } from "@react-pdf/renderer";

// // // import logo from "../../../assets/images/doulLogo.png";
// // // import profileIcon from "../../../assets/icons/StuReportprofile_icon.png";
// // // import courseIcon from "../../../assets/icons/StuReportCourse_icon.png";
// // // import mailIcon from "../../../assets/icons/StuReportMail_icon.png";
// // // import fatherIcon from "../../../assets/icons/StuReportFather_icon.png";
// // // import contactIcon from "../../../assets/icons/StuReport_Phone.png";
// // // import addressIcon from "../../../assets/icons/StuReportAddress_icon.png";

// // // /* =================== Styles (adjusted to use page more, larger text + spacing) =================== */
// // // const styles = StyleSheet.create({
// // //   page: {
// // //     flexDirection: "column",
// // //     backgroundColor: "#FFFFFF",
// // //     // a little more horizontal space to use the whole page
// // //     paddingTop: 12,
// // //     paddingHorizontal: 18,
// // //     paddingBottom: 12,
// // //     fontFamily: "Helvetica",
// // //   },

// // //   /* Header */
// // //   header: {
// // //     flexDirection: "row",
// // //     justifyContent: "space-between",
// // //     alignItems: "center",
// // //     marginBottom: 8,
// // //     paddingBottom: 6,
// // //     borderBottomWidth: 2,
// // //     borderBottomColor: "#7335DD",
// // //     borderBottomStyle: "solid",
// // //   },
// // //   headerLeft: { flexDirection: "row", alignItems: "center", width: 140 },
// // //   headerCenter: { flexGrow: 1, alignItems: "center" },
// // //   headerRight: { width: 140, alignItems: "flex-end" },

// // //   // slightly larger logo
// // //   logo: { width: 68, height: 46 },
// // //   // larger title
// // //   title: { fontSize: 18, fontWeight: "bold", color: "#111827" },
// // //   subMuted: { fontSize: 9, color: "#6B7280" },
// // //   subBold: { fontSize: 10, color: "#111827", fontWeight: "bold" },

// // //   /* Section/Card */
// // //   section: {
// // //     marginBottom: 8,
// // //     padding: 10, // more padding for breathing room
// // //     backgroundColor: "#F9FAFB",
// // //     borderRadius: 6,
// // //     borderWidth: 1,
// // //     borderStyle: "solid",
// // //     borderColor: "#E5E7EB",
// // //   },
// // //   sectionTitle: {
// // //     fontSize: 12, // bigger title
// // //     fontWeight: "bold",
// // //     color: "#111827",
// // //     marginBottom: 8,
// // //   },

// // //   /* Info grid - now two columns for more space */
// // //   infoGrid: { flexDirection: "row", flexWrap: "wrap" },
// // //   // increased width to 50% to make two columns and more horizontal space for values
// // //   infoCell: { width: "33.3333%", paddingRight: 4, marginBottom: 4 },
// // //   infoTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
// // //   icon: { width: 11, height: 11, marginRight: 6 }, // slightly larger icon
// // //   label: { fontSize: 9, color: "#6B7280", fontWeight: "bold" }, // larger label
// // //   value: { fontSize: 10, color: "#111827" }, // larger value font

// // //   /* Level Progress */
// // //   levelWrap: { paddingVertical: 6 },
// // //   levelLegend: {
// // //     marginTop: 6,
// // //     flexDirection: "row",
// // //     justifyContent: "space-between",
// // //   },
// // //   badge: { fontSize: 9, color: "#374151", textAlign: "center", width: 28 },

// // //   /* Two-column main row: left = 30%, right = 60% (right has stacked rows) */
// // //   mainRow: { flexDirection: "row", gap: 8, marginBottom: 6, width: '100%' },
// // //   leftCol30: {
// // //     width: "30%",
// // //     backgroundColor: "#FFFFFF",
// // //     borderRadius: 6,
// // //     borderWidth: 1,
// // //     borderStyle: "solid",
// // //     borderColor: "#E5E7EB",
// // //     padding: 10,
// // //     minWidth: 0,
// // //   },
// // //   rightCol60: {
// // //     width: "60%",
// // //     flexDirection: 'column',
// // //   },

// // //   /* Top half inside right column: two columns (Soft | Discipline) */
// // //   rightTopRow: { flexDirection: 'row', marginBottom: 6 },
// // //   rightTopCol: { width: '50%', paddingHorizontal: 6, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', padding: 10 },

// // //   /* Bottom half inside right column: Co-curricular cards */
// // //   rightBottomRow: { width: '100%', marginTop: 6 },
// // //   coCardsWrap: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
// // //   coCard: {
// // //     width: '30%',
// // //     paddingVertical: 8,
// // //     paddingHorizontal: 8,
// // //     backgroundColor: '#FFFFFF',
// // //     borderRadius: 5,
// // //     borderWidth: 1,
// // //     borderColor: '#E5E7EB',
// // //     marginBottom: 6,
// // //   },
// // //   coCardTitle: {
// // //     fontSize: 10,
// // //     fontWeight: 700,
// // //     color: '#374151',
// // //     textAlign: 'center',
// // //     marginBottom: 4,
// // //   },
// // //   coCardCount: {
// // //     fontSize: 16,
// // //     fontWeight: 700,
// // //     color: '#111827',
// // //     textAlign: 'center',
// // //   },

// // //   /* Progress list */
// // //   skillRow: { marginBottom: 8 },
// // //   skillHeader: {
// // //     flexDirection: "row",
// // //     justifyContent: "space-between",
// // //     marginBottom: 4,
// // //   },
// // //   small: { fontSize: 9, color: "#374151" }, // slightly larger
// // //   barTrack: {
// // //     height: 8, // increased height
// // //     backgroundColor: "#E5E7EB",
// // //     borderRadius: 5,
// // //     overflow: "hidden",
// // //   },
// // //   barFill: { height: 8, backgroundColor: "#7335DD" },

// // //   /* Soft skills */
// // //   softRow: {
// // //     flexDirection: "row",
// // //     justifyContent: "space-between",
// // //     marginBottom: 8,
// // //   },
// // //   softLeft: { fontSize: 9.5, color: "#374151" },
// // //   softRight: { fontSize: 9.5, fontWeight: "bold" },

// // //   /* Career readiness (4 in one row) */
// // //   readinessRow: { flexDirection: "row", justifyContent: "space-between" },
// // //   pill: {
// // //     width: "23%",
// // //     backgroundColor: "#F3F4F6",
// // //     borderRadius: 8,
// // //     paddingVertical: 10,
// // //     paddingHorizontal: 8,
// // //     borderWidth: 1,
// // //     borderStyle: "solid",
// // //     borderColor: "#E5E7EB",
// // //   },
// // //   pillLabel: { fontSize: 9, color: "#6B7280", marginBottom: 6, textAlign: "center" },
// // //   pillValue: { fontSize: 10, fontWeight: "bold", color: "#111827", textAlign: "center" },

// // //   /* Footer */
// // //   footer: {
// // //     marginTop: 8,
// // //     padding: 8,
// // //     backgroundColor: "#7335DD",
// // //     borderRadius: 6,
// // //   },
// // //   footerText: { fontSize: 10, color: "#FFFFFF", textAlign: "center" },
// // // });

// // // /* =================== Helpers =================== */
// // // const InfoItem = ({ icon, label, value }) => (
// // //   <View style={styles.infoCell}>
// // //     <View style={styles.infoTop}>
// // //       <Image src={icon} style={styles.icon} />
// // //       <Text style={styles.label}>{label}</Text>
// // //     </View>
// // //     <Text style={styles.value}>{value || "N/A"}</Text>
// // //   </View>
// // // );

// // // const ProgressBar = ({ percent }) => (
// // //   <View style={styles.barTrack}>
// // //     <View
// // //       style={[
// // //         styles.barFill,
// // //         { width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%` },
// // //       ]}
// // //     />
// // //   </View>
// // // );

// // // const SoftItem = ({ title, status }) => (
// // //   <View style={styles.softRow}>
// // //     <Text style={styles.softLeft}>{title}</Text>
// // //     <Text
// // //       style={[
// // //         styles.softRight,
// // //         {
// // //           color:
// // //             status === "Excellent"
// // //               ? "#059669"
// // //               : status === "Good"
// // //               ? "#2563EB"
// // //               : status === "Average"
// // //               ? "#D97706"
// // //               : "#DC2626",
// // //         },
// // //       ]}
// // //     >
// // //       {status}
// // //     </Text>
// // //   </View>
// // // );

// // // const softStatus = (score, max) => {
// // //   const pct = (Number(score || 0) / Number(max || 1)) * 100;
// // //   if (pct >= 90) return "Excellent";
// // //   if (pct >= 70) return "Good";
// // //   if (pct >= 50) return "Average";
// // //   return "Poor";
// // // };


// // // /* Level steps array - Adjusted to match the visual steps 1A through 2C */
// // // const LEVEL_STEPS = ["1A", "1B", "1C", "2A", "2B", "2C"];

// // // /* =================== Level Timeline Component (UPDATED) =================== */
// // // const LevelTimeline = ({ currentLevel = "1A" }) => {
// // //   const steps = LEVEL_STEPS;
// // //   const currentLevelUpper = String(currentLevel || "1A").toUpperCase();
// // //   // Find the index of the current level
// // //   const currentIdx = Math.max(
// // //     0,
// // //     steps.findIndex((s) => s.toUpperCase() === currentLevelUpper)
// // //   );

// // //   // Constants for SVG dimensions and positioning
// // //   const width = 480; // Total width for the SVG canvas (matches typical react-pdf A4 width)
// // //   const padding = 20; // Padding from the edges for circles
// // //   const yCenter = 15; // Vertical center for the line and circles
// // //   const circleRadius = 12;
// // //   const lineStrokeWidth = 3;

// // //   const innerWidth = width - padding * 2;
// // //   // Calculate the horizontal position for each step's circle center
// // //   const pts = steps.map(
// // //     (_, i) => padding + (i * innerWidth) / (steps.length - 1)
// // //   );

// // //   // The progress line ends at the center of the current circle
// // //   const progressLineEnd = pts[currentIdx];

// // //   return (
// // //     <View style={styles.levelWrap}>
// // //       <Svg width={width} height="50" viewBox={`0 0 ${width} 50`}>
// // //         {/* 1. Background line (Gray) */}
// // //         <Line
// // //           x1={pts[0]}
// // //           y1={yCenter}
// // //           x2={pts[steps.length - 1]}
// // //           y2={yCenter}
// // //           stroke="#E5E7EB" // Light gray for inactive track
// // //           strokeWidth={lineStrokeWidth}
// // //         />

// // //         {/* 2. Progress line (Green) */}
// // //         <Line
// // //           x1={pts[0]}
// // //           y1={yCenter}
// // //           x2={progressLineEnd}
// // //           y2={yCenter}
// // //           stroke="#10B981" // Green for active progress
// // //           strokeWidth={lineStrokeWidth}
// // //         />

// // //         {/* 3. Level circles and labels */}
// // //         {pts.map((x, i) => {
// // //           const isPassed = i < currentIdx;
// // //           const isCurrent = i === currentIdx;
// // //           const isUpcoming = i > currentIdx;

// // //           // Determine circle color: Green for passed, Yellow for current, Gray for upcoming
// // //           const circleFill = isPassed
// // //             ? "#10B981" // Green
// // //             : isCurrent
// // //             ? "#F59E0B" // Yellow
// // //             : "#E5E7EB"; // Light Gray

// // //           // Determine text color for the label below the circle
// // //           const labelColor = isCurrent ? "#F59E0B" : "#374151";

// // //           return (
// // //             <G key={i}>
// // //               {/* Circle */}
// // //               <Circle
// // //                 cx={x}
// // //                 cy={yCenter}
// // //                 r={circleRadius}
// // //                 fill={circleFill}
// // //                 stroke={isCurrent ? "#F59E0B" : "none"} // Optional: yellow stroke for current
// // //                 strokeWidth={isCurrent ? 1 : 0}
// // //               />

// // //               {/* Checkmark for Passed Levels */}
// // //               {isPassed && (
// // //                 <Text
// // //                   x={x}
// // //                   y={yCenter + 4} // Adjusted Y for better vertical centering
// // //                   textAnchor="middle"
// // //                   fontSize="12"
// // //                   fill="white"
// // //                   fontWeight="bold"
// // //                 >
// // //                   ✓
// // //                 </Text>
// // //               )}
              
// // //               {/* Level Text (Current and Upcoming) */}
// // //               {!isPassed && (
// // //                 <Text
// // //                   x={x}
// // //                   y={yCenter + 3} // Adjusted Y for better vertical centering
// // //                   textAnchor="middle"
// // //                   fontSize="10"
// // //                   fill={isCurrent ? "white" : "#6B7280"} // White text on yellow, gray text on light gray
// // //                   fontWeight={isCurrent ? "bold" : "normal"}
// // //                 >
// // //                   {steps[i]}
// // //                 </Text>
// // //               )}

// // //               {/* Label below the circle */}
// // //               <Text
// // //                 x={x}
// // //                 y={yCenter + 25}
// // //                 textAnchor="middle"
// // //                 fontSize="8"
// // //                 fill={labelColor}
// // //                 fontWeight={isCurrent ? "bold" : "normal"}
// // //               >
// // //                 {steps[i]}
// // //               </Text>
// // //             </G>
// // //           );
// // //         })}
// // //       </Svg>
// // //     </View>
// // //   );
// // // };

// // // /* =================== Main Component =================== */
// // // const StudentReportPDF = ({ studentData = {}, reportCardData = {} }) => {
// // //   const technicalSkills =
// // //     reportCardData?.technicalSkills?.map((s) => ({
// // //       name: s?.skillName || "Skill",
// // //       percent: Math.round(Number(s?.totalPercentage || 0)),
// // //     })) || [];

// // //   const softCats = reportCardData?.softSkills?.categories || [];
// // //   const discCats = reportCardData?.discipline?.categories || [];

// // //   // co-curricular calculation (uncommented and used)
// // //   const co = reportCardData?.coCurricular || [];
// // //   const coCounts = ["Certificate", "Project", "Sports"].map((c) => ({
// // //     title: c,
// // //     count: co.filter((x) => (x?.category || "").toLowerCase() === c.toLowerCase()).length,
// // //   }));

// // //   return (
// // //     <Document>
// // //       <Page size="A4" style={styles.page}>
// // //         {/* Header */}
// // //         <View style={styles.header}>
// // //           <View style={styles.headerLeft}>
// // //             <Image src={logo} style={styles.logo} />
// // //           </View>
// // //           <View style={styles.headerCenter}>
// // //             <Text style={styles.title}>Report Card</Text>
// // //           </View>
// // //           <View style={styles.headerRight}>
// // //             <Text style={styles.subMuted}>Academic Year</Text>
// // //             <Text style={styles.subBold}>Session 2024-25</Text>
// // //           </View>
// // //         </View>

// // //         {/* Personal Information - now two columns */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Personal Information</Text>
// // //           <View style={styles.infoGrid}>
// // //             <InfoItem
// // //               icon={profileIcon}
// // //               label="Full Name"
// // //               value={`${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "N/A"}
// // //             />
// // //             <InfoItem icon={mailIcon} label="Email" value={studentData?.email} />
// // //             <InfoItem icon={contactIcon} label="Contact Number" value={studentData?.studentMobile} />
// // //             <InfoItem icon={courseIcon} label="Course" value={studentData?.course} />
// // //             <InfoItem icon={fatherIcon} label="Father's Name" value={studentData?.fatherName} />
// // //             <InfoItem icon={addressIcon} label="Current Level" value={`Level ${studentData?.currentLevel || "1A"}`} />
// // //           </View>
// // //         </View>

// // //         {/* Level Progress (UPDATED) */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Level Progress</Text>
// // //           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
// // //             <Text style={[styles.value, { fontSize: 11 }]}>
// // //               Current Level: <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>Level {studentData?.currentLevel || "1A"}</Text>
// // //             </Text>
// // //             <Text style={[styles.small, { color: '#6B7280' }]}>
// // //               Progress: {Math.round(((LEVEL_STEPS.findIndex(s => s === (studentData?.currentLevel || "1A")) + 1) / LEVEL_STEPS.length) * 100)}% Complete
// // //             </Text>
// // //           </View>
// // //           <LevelTimeline currentLevel={studentData?.currentLevel || "1A"} />
// // //         </View>

// // //         {/* ======= CUSTOM TWO-COLUMN SECTION (30% | 60% with stacked rows on right) ======= */}
// // //         <View style={styles.mainRow}>
// // //           {/* LEFT: 30% - Technical Skills */}
// // //           <View style={styles.leftCol30}>
// // //             <Text style={styles.sectionTitle}>Technical Skills</Text>
// // //             {(technicalSkills.length ? technicalSkills : [{ name: "N/A", percent: 0 }]).map(
// // //               (s, i) => (
// // //                 <View key={i} style={styles.skillRow}>
// // //                   <View style={styles.skillHeader}>
// // //                     <Text style={styles.small}>{s.name}</Text>
// // //                     <Text style={styles.small}>{s.percent}%</Text>
// // //                   </View>
// // //                   <ProgressBar percent={s.percent} />
// // //                 </View>
// // //               )
// // //             )}
// // //           </View>

// // //           {/* RIGHT: 60% - Top row: Soft + Discipline side-by-side; Bottom row: Co-curricular cards */}
// // //           <View style={styles.rightCol60}>
// // //             {/* Top half: Soft Skills + Discipline */}
// // //             <View style={styles.rightTopRow}>
// // //               <View style={styles.rightTopCol}>
// // //                 <Text style={styles.sectionTitle}>Soft Skills</Text>
// // //                 {softCats.length ? (
// // //                   softCats.map((c, i) => (
// // //                     <SoftItem
// // //                       key={i}
// // //                       title={c?.title || "Skill"}
// // //                       status={softStatus(c?.score, c?.maxMarks)}
// // //                     />
// // //                   ))
// // //                 ) : (
// // //                   <Text style={styles.small}>N/A</Text>
// // //                 )}
// // //               </View>

// // //               <View style={styles.rightTopCol}>
// // //                 <Text style={styles.sectionTitle}>Discipline</Text>
// // //                 {discCats.length ? (
// // //                   discCats.map((c, i) => {
// // //                     const pct = ((Number(c?.score || 0) / Number(c?.maxMarks || 10)) * 100) || 0;
// // //                     return (
// // //                       <View key={i} style={styles.skillRow}>
// // //                         <View style={styles.skillHeader}>
// // //                           <Text style={styles.small}>{c?.title || "Metric"}</Text>
// // //                           <Text style={styles.small}>
// // //                             {c?.score}/{c?.maxMarks}
// // //                           </Text>
// // //                         </View>
// // //                         <ProgressBar percent={pct} />
// // //                       </View>
// // //                     );
// // //                   })
// // //                 ) : (
// // //                   <Text style={styles.small}>N/A</Text>
// // //                 )}
// // //               </View>
// // //             </View>

// // //             {/* Bottom half: Co-curricular full width (cards) */}
// // //             <View style={[styles.rightBottomRow, styles.section]}>
// // //               <Text style={styles.sectionTitle}>Co-Curricular Activities</Text>
// // //               <View style={styles.coCardsWrap}>
// // //                 {coCounts.map((c) => (
// // //                   <View key={c.title} style={styles.coCard}>
// // //                     <Text style={styles.coCardTitle}>{c.title}</Text>
// // //                     <Text style={styles.coCardCount}>{c.count}</Text>
// // //                   </View>
// // //                 ))}
// // //               </View>
// // //             </View>
// // //           </View>
// // //         </View>

// // //         {/* Career Readiness (4 in one row) */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Career Readiness</Text>
// // //           <View style={styles.readinessRow}>
// // //             <View style={styles.pill}>
// // //               <Text style={styles.pillLabel}>Resume</Text>
// // //               <Text style={styles.pillValue}>
// // //                 {reportCardData?.careerReadiness?.resumeStatus || "Not created"}
// // //               </Text>
// // //             </View>
// // //             <View style={styles.pill}>
// // //               <Text style={styles.pillLabel}>LinkedIn</Text>
// // //               <Text style={styles.pillValue}>
// // //                 {reportCardData?.careerReadiness?.linkedinStatus || "Need to improve"}
// // //               </Text>
// // //             </View>
// // //             <View style={styles.pill}>
// // //               <Text style={styles.pillLabel}>Aptitude</Text>
// // //               <Text style={styles.pillValue}>
// // //                 {reportCardData?.careerReadiness?.aptitudeStatus || "In-progress"}
// // //               </Text>
// // //             </View>
// // //             <View style={styles.pill}>
// // //               <Text style={styles.pillLabel}>Placement</Text>
// // //               <Text style={styles.pillValue}>
// // //                 {reportCardData?.careerReadiness?.placementReady || "Not-ready"}
// // //               </Text>
// // //             </View>
// // //           </View>
// // //         </View>

// // //         {/* Academic Performance (summary row) */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Academic Performance</Text>
// // //           <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
// // //             {[
// // //               { title: "Current Level", val: `Level ${studentData?.currentLevel || "1A"}` },
// // //               { title: "1st Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ?? "N/A" },
// // //               { title: "2nd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ?? "N/A" },
// // //               { title: "3rd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ?? "N/A" },
// // //               { title: "CGPA", val: reportCardData?.academicPerformance?.cgpa ?? "N/A" },
// // //             ].map((it, idx) => (
// // //               <View
// // //                 key={idx}
// // //                 style={{
// // //                   width: "19.2%",
// // //                   backgroundColor: "#FFFFFF",
// // //                   borderRadius: 6,
// // //                   borderWidth: 1,
// // //                   borderStyle: "solid",
// // //                   borderColor: "#E5E7EB",
// // //                   paddingVertical: 8,
// // //                   paddingHorizontal: 6,
// // //                 }}
// // //               >
// // //                 <Text style={{ fontSize: 9, color: "#6B7280", textAlign: "center", marginBottom: 4 }}>
// // //                   {it.title}
// // //                 </Text>
// // //                 <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center", color: "#111827" }}>
// // //                   {it.val}
// // //                 </Text>
// // //               </View>
// // //             ))}
// // //           </View>
// // //         </View>

// // //         {/* Faculty Feedback */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Faculty Feedback</Text>
// // //           <Text style={styles.value}>
// // //             {reportCardData?.facultyRemark || "No feedback available"}
// // //           </Text>

// // //           <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
// // //             <Text style={styles.label}>
// // //               Rating: {" "}
// // //               <Text style={styles.value}>
// // //                 {(() => {
// // //                   const g = (reportCardData?.overallGrade || "").toUpperCase();
// // //                   if (g === "A+") return "5.0";
// // //                   if (g === "A") return "4.5";
// // //                   if (g === "B+") return "4.0";
// // //                   if (g === "B") return "3.5";
// // //                   if (g === "C+") return "3.0";
// // //                   if (g === "C") return "2.5";
// // //                   if (g === "D+") return "2.0";
// // //                   if (g === "D") return "1.5";
// // //                   if (g === "F") return "1.0";
// // //                   return "3.0";
// // //                 })()} ★
// // //               </Text>
// // //             </Text>

// // //             <Text style={styles.label}>
// // //               Generated by: {" "}
// // //               <Text style={styles.value}>
// // //                 {reportCardData?.generatedByName || "N/A"}
// // //               </Text>
// // //             </Text>
// // //           </View>
// // //         </View>

// // //         {/* Footer */}
// // //         <View style={styles.footer} fixed>
// // //           <Text style={styles.footerText}>
// // //             Current Level: {studentData?.currentLevel || "1A"} • Overall Grade: {reportCardData?.overallGrade || "B+"} • Academic Year: 2024-25
// // //           </Text>
// // //         </View>
// // //       </Page>
// // //     </Document>
// // //   );
// // // };

// // // export default StudentReportPDF;




// // // // import React from "react";
// // // // import {
// // // //   Document,
// // // //   Page,
// // // //   Text,
// // // //   View,
// // // //   StyleSheet,
// // // //   Image,
// // // //   Svg,
// // // //   Line,
// // // //   Circle,
// // // //   G, // Use G for grouping elements for better rendering/styling in react-pdf
// // // // } from "@react-pdf/renderer";

// // // // import logo from "../../../assets/images/doulLogo.png";
// // // // import profileIcon from "../../../assets/icons/StuReportprofile_icon.png";
// // // // import courseIcon from "../../../assets/icons/StuReportCourse_icon.png";
// // // // import mailIcon from "../../../assets/icons/StuReportMail_icon.png";
// // // // import fatherIcon from "../../../assets/icons/StuReportFather_icon.png";
// // // // import contactIcon from "../../../assets/icons/StuReport_Phone.png";
// // // // import addressIcon from "../../../assets/icons/StuReportAddress_icon.png";

// // // // /* =================== Styles (adjusted to use page more, larger text + spacing) =================== */
// // // // const styles = StyleSheet.create({
// // // //   page: {
// // // //     flexDirection: "column",
// // // //     backgroundColor: "#FFFFFF",
// // // //     // a little more horizontal space to use the whole page
// // // //     paddingTop: 12,
// // // //     paddingHorizontal: 18,
// // // //     paddingBottom: 12,
// // // //     fontFamily: "Helvetica",
// // // //   },

// // // //   /* Header */
// // // //   header: {
// // // //     flexDirection: "row",
// // // //     justifyContent: "space-between",
// // // //     alignItems: "center",
// // // //     marginBottom: 8,
// // // //     paddingBottom: 6,
// // // //     borderBottomWidth: 2,
// // // //     borderBottomColor: "#7335DD",
// // // //     borderBottomStyle: "solid",
// // // //   },
// // // //   headerLeft: { flexDirection: "row", alignItems: "center", width: 140 },
// // // //   headerCenter: { flexGrow: 1, alignItems: "center" },
// // // //   headerRight: { width: 140, alignItems: "flex-end" },

// // // //   // slightly larger logo
// // // //   logo: { width: 68, height: 46 },
// // // //   // larger title
// // // //   title: { fontSize: 18, fontWeight: "bold", color: "#111827" },
// // // //   subMuted: { fontSize: 9, color: "#6B7280" },
// // // //   subBold: { fontSize: 10, color: "#111827", fontWeight: "bold" },

// // // //   /* Section/Card */
// // // //   section: {
// // // //     marginBottom: 8,
// // // //     padding: 10, // more padding for breathing room
// // // //     backgroundColor: "#F9FAFB",
// // // //     borderRadius: 6,
// // // //     borderWidth: 1,
// // // //     borderStyle: "solid",
// // // //     borderColor: "#E5E7EB",
// // // //   },
// // // //   sectionTitle: {
// // // //     fontSize: 12, // bigger title
// // // //     fontWeight: "bold",
// // // //     color: "#111827",
// // // //     marginBottom: 8,
// // // //   },

// // // //   /* Info grid - now two columns for more space */
// // // //   infoGrid: { flexDirection: "row", flexWrap: "wrap" },
// // // //   // increased width to 50% to make two columns and more horizontal space for values
// // // //   infoCell: { width: "33.3333%", paddingRight: 4, marginBottom: 4 },
// // // //   infoTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
// // // //   icon: { width: 11, height: 11, marginRight: 6 }, // slightly larger icon
// // // //   label: { fontSize: 9, color: "#6B7280", fontWeight: "bold" }, // larger label
// // // //   value: { fontSize: 10, color: "#111827" }, // larger value font

// // // //   /* Level Progress */
// // // //   levelWrap: { paddingVertical: 6 },
// // // //   levelLegend: {
// // // //     marginTop: 6,
// // // //     flexDirection: "row",
// // // //     justifyContent: "space-between",
// // // //   },
// // // //   badge: { fontSize: 9, color: "#374151", textAlign: "center", width: 28 },

// // // //   /* Three-panels row */
// // // //   boardRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
// // // //   boardCol: {
// // // //     flexGrow: 1,
// // // //     flexBasis: 0,
// // // //     backgroundColor: "#FFFFFF",
// // // //     borderRadius: 6,
// // // //     borderWidth: 1,
// // // //     borderStyle: "solid",
// // // //     borderColor: "#E5E7EB",
// // // //     padding: 10, // increased padding
// // // //     minWidth: 0,
// // // //   },

// // // //   /* Progress list */
// // // //   skillRow: { marginBottom: 8 },
// // // //   skillHeader: {
// // // //     flexDirection: "row",
// // // //     justifyContent: "space-between",
// // // //     marginBottom: 4,
// // // //   },
// // // //   small: { fontSize: 9, color: "#374151" }, // slightly larger
// // // //   barTrack: {
// // // //     height: 8, // increased height
// // // //     backgroundColor: "#E5E7EB",
// // // //     borderRadius: 5,
// // // //     overflow: "hidden",
// // // //   },
// // // //   barFill: { height: 8, backgroundColor: "#7335DD" },

// // // //   /* Soft skills */
// // // //   softRow: {
// // // //     flexDirection: "row",
// // // //     justifyContent: "space-between",
// // // //     marginBottom: 8,
// // // //   },
// // // //   softLeft: { fontSize: 9.5, color: "#374151" },
// // // //   softRight: { fontSize: 9.5, fontWeight: "bold" },

// // // //   /* Career readiness (4 in one row) */
// // // //   readinessRow: { flexDirection: "row", justifyContent: "space-between" },
// // // //   pill: {
// // // //     width: "23%",
// // // //     backgroundColor: "#F3F4F6",
// // // //     borderRadius: 8,
// // // //     paddingVertical: 10,
// // // //     paddingHorizontal: 8,
// // // //     borderWidth: 1,
// // // //     borderStyle: "solid",
// // // //     borderColor: "#E5E7EB",
// // // //   },
// // // //   pillLabel: { fontSize: 9, color: "#6B7280", marginBottom: 6, textAlign: "center" },
// // // //   pillValue: { fontSize: 10, fontWeight: "bold", color: "#111827", textAlign: "center" },

// // // //   /* Footer */
// // // //   footer: {
// // // //     marginTop: 8,
// // // //     padding: 8,
// // // //     backgroundColor: "#7335DD",
// // // //     borderRadius: 6,
// // // //   },
// // // //   footerText: { fontSize: 10, color: "#FFFFFF", textAlign: "center" },
// // // // });

// // // // /* =================== Helpers =================== */
// // // // const InfoItem = ({ icon, label, value }) => (
// // // //   <View style={styles.infoCell}>
// // // //     <View style={styles.infoTop}>
// // // //       <Image src={icon} style={styles.icon} />
// // // //       <Text style={styles.label}>{label}</Text>
// // // //     </View>
// // // //     <Text style={styles.value}>{value || "N/A"}</Text>
// // // //   </View>
// // // // );

// // // // const ProgressBar = ({ percent }) => (
// // // //   <View style={styles.barTrack}>
// // // //     <View
// // // //       style={[
// // // //         styles.barFill,
// // // //         { width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%` },
// // // //       ]}
// // // //     />
// // // //   </View>
// // // // );

// // // // const SoftItem = ({ title, status }) => (
// // // //   <View style={styles.softRow}>
// // // //     <Text style={styles.softLeft}>{title}</Text>
// // // //     <Text
// // // //       style={[
// // // //         styles.softRight,
// // // //         {
// // // //           color:
// // // //             status === "Excellent"
// // // //               ? "#059669"
// // // //               : status === "Good"
// // // //               ? "#2563EB"
// // // //               : status === "Average"
// // // //               ? "#D97706"
// // // //               : "#DC2626",
// // // //         },
// // // //       ]}
// // // //     >
// // // //       {status}
// // // //     </Text>
// // // //   </View>
// // // // );

// // // // const softStatus = (score, max) => {
// // // //   const pct = (Number(score || 0) / Number(max || 1)) * 100;
// // // //   if (pct >= 90) return "Excellent";
// // // //   if (pct >= 70) return "Good";
// // // //   if (pct >= 50) return "Average";
// // // //   return "Poor";
// // // // };


// // // // /* Level steps array - Adjusted to match the visual steps 1A through 2C */
// // // // const LEVEL_STEPS = ["1A", "1B", "1C", "2A", "2B", "2C"];

// // // // /* =================== Level Timeline Component (UPDATED) =================== */
// // // // const LevelTimeline = ({ currentLevel = "1A" }) => {
// // // //   const steps = LEVEL_STEPS;
// // // //   const currentLevelUpper = String(currentLevel || "1A").toUpperCase();
// // // //   // Find the index of the current level
// // // //   const currentIdx = Math.max(
// // // //     0,
// // // //     steps.findIndex((s) => s.toUpperCase() === currentLevelUpper)
// // // //   );

// // // //   // Constants for SVG dimensions and positioning
// // // //   const width = 480; // Total width for the SVG canvas (matches typical react-pdf A4 width)
// // // //   const padding = 20; // Padding from the edges for circles
// // // //   const yCenter = 15; // Vertical center for the line and circles
// // // //   const circleRadius = 12;
// // // //   const lineStrokeWidth = 3;

// // // //   const innerWidth = width - padding * 2;
// // // //   // Calculate the horizontal position for each step's circle center
// // // //   const pts = steps.map(
// // // //     (_, i) => padding + (i * innerWidth) / (steps.length - 1)
// // // //   );

// // // //   // The progress line ends at the center of the current circle
// // // //   const progressLineEnd = pts[currentIdx];

// // // //   return (
// // // //     <View style={styles.levelWrap}>
// // // //       <Svg width={width} height="50" viewBox={`0 0 ${width} 50`}>
// // // //         {/* 1. Background line (Gray) */}
// // // //         <Line
// // // //           x1={pts[0]}
// // // //           y1={yCenter}
// // // //           x2={pts[steps.length - 1]}
// // // //           y2={yCenter}
// // // //           stroke="#E5E7EB" // Light gray for inactive track
// // // //           strokeWidth={lineStrokeWidth}
// // // //         />

// // // //         {/* 2. Progress line (Green) */}
// // // //         <Line
// // // //           x1={pts[0]}
// // // //           y1={yCenter}
// // // //           x2={progressLineEnd}
// // // //           y2={yCenter}
// // // //           stroke="#10B981" // Green for active progress
// // // //           strokeWidth={lineStrokeWidth}
// // // //         />

// // // //         {/* 3. Level circles and labels */}
// // // //         {pts.map((x, i) => {
// // // //           const isPassed = i < currentIdx;
// // // //           const isCurrent = i === currentIdx;
// // // //           const isUpcoming = i > currentIdx;

// // // //           // Determine circle color: Green for passed, Yellow for current, Gray for upcoming
// // // //           const circleFill = isPassed
// // // //             ? "#10B981" // Green
// // // //             : isCurrent
// // // //             ? "#F59E0B" // Yellow
// // // //             : "#E5E7EB"; // Light Gray

// // // //           // Determine text color for the label below the circle
// // // //           const labelColor = isCurrent ? "#F59E0B" : "#374151";

// // // //           return (
// // // //             <G key={i}>
// // // //               {/* Circle */}
// // // //               <Circle
// // // //                 cx={x}
// // // //                 cy={yCenter}
// // // //                 r={circleRadius}
// // // //                 fill={circleFill}
// // // //                 stroke={isCurrent ? "#F59E0B" : "none"} // Optional: yellow stroke for current
// // // //                 strokeWidth={isCurrent ? 1 : 0}
// // // //               />

// // // //               {/* Checkmark for Passed Levels */}
// // // //               {isPassed && (
// // // //                 <Text
// // // //                   x={x}
// // // //                   y={yCenter + 4} // Adjusted Y for better vertical centering
// // // //                   textAnchor="middle"
// // // //                   fontSize="12"
// // // //                   fill="white"
// // // //                   fontWeight="bold"
// // // //                 >
// // // //                   ✓
// // // //                 </Text>
// // // //               )}
              
// // // //               {/* Level Text (Current and Upcoming) */}
// // // //               {!isPassed && (
// // // //                 <Text
// // // //                   x={x}
// // // //                   y={yCenter + 3} // Adjusted Y for better vertical centering
// // // //                   textAnchor="middle"
// // // //                   fontSize="10"
// // // //                   fill={isCurrent ? "white" : "#6B7280"} // White text on yellow, gray text on light gray
// // // //                   fontWeight={isCurrent ? "bold" : "normal"}
// // // //                 >
// // // //                   {steps[i]}
// // // //                 </Text>
// // // //               )}

// // // //               {/* Label below the circle */}
// // // //               <Text
// // // //                 x={x}
// // // //                 y={yCenter + 25}
// // // //                 textAnchor="middle"
// // // //                 fontSize="8"
// // // //                 fill={labelColor}
// // // //                 fontWeight={isCurrent ? "bold" : "normal"}
// // // //               >
// // // //                 {steps[i]}
// // // //               </Text>
// // // //             </G>
// // // //           );
// // // //         })}
// // // //       </Svg>
// // // //     </View>
// // // //   );
// // // // };

// // // // /* =================== Main Component =================== */
// // // // const StudentReportPDF = ({ studentData = {}, reportCardData = {} }) => {
// // // //   const technicalSkills =
// // // //     reportCardData?.technicalSkills?.map((s) => ({
// // // //       name: s?.skillName || "Skill",
// // // //       percent: Math.round(Number(s?.totalPercentage || 0)),
// // // //     })) || [];

// // // //   const softCats = reportCardData?.softSkills?.categories || [];
// // // //   const discCats = reportCardData?.discipline?.categories || [];

// // // //   // co-curricular calculation (not used in the commented-out section)
// // // //   // const co = reportCardData?.coCurricular || [];
// // // //   // const coCounts = ["Certificate", "Project", "Sports"].map((c) => ({
// // // //   //   title: c,
// // // //   //   count: co.filter(
// // // //   //     (x) => (x?.category || "").toLowerCase() === c.toLowerCase()
// // // //   //   ).length,
// // // //   // }));

// // // //   return (
// // // //     <Document>
// // // //       <Page size="A4" style={styles.page}>
// // // //         {/* Header */}
// // // //         <View style={styles.header}>
// // // //           <View style={styles.headerLeft}>
// // // //             <Image src={logo} style={styles.logo} />
// // // //           </View>
// // // //           <View style={styles.headerCenter}>
// // // //             <Text style={styles.title}>Report Card</Text>
// // // //           </View>
// // // //           <View style={styles.headerRight}>
// // // //             <Text style={styles.subMuted}>Academic Year</Text>
// // // //             <Text style={styles.subBold}>Session 2024-25</Text>
// // // //           </View>
// // // //         </View>

// // // //         {/* Personal Information - now two columns */}
// // // //         <View style={styles.section}>
// // // //           <Text style={styles.sectionTitle}>Personal Information</Text>
// // // //           <View style={styles.infoGrid}>
// // // //             <InfoItem
// // // //               icon={profileIcon}
// // // //               label="Full Name"
// // // //               value={`${studentData?.firstName || ""} ${studentData?.lastName || ""}`.trim() || "N/A"}
// // // //             />
// // // //             <InfoItem icon={mailIcon} label="Email" value={studentData?.email} />
// // // //             <InfoItem icon={contactIcon} label="Contact Number" value={studentData?.studentMobile} />
// // // //             <InfoItem icon={courseIcon} label="Course" value={studentData?.course} />
// // // //             <InfoItem icon={fatherIcon} label="Father's Name" value={studentData?.fatherName} />
// // // //             <InfoItem icon={addressIcon} label="Current Level" value={`Level ${studentData?.currentLevel || "1A"}`} />
// // // //           </View>
// // // //         </View>

// // // //         {/* Level Progress (UPDATED) */}
// // // //         <View style={styles.section}>
// // // //           <Text style={styles.sectionTitle}>Level Progress</Text>
// // // //           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
// // // //             <Text style={[styles.value, { fontSize: 11 }]}>
// // // //               Current Level: <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>Level {studentData?.currentLevel || "1A"}</Text>
// // // //             </Text>
// // // //             <Text style={[styles.small, { color: '#6B7280' }]}>
// // // //               Progress: {Math.round(((LEVEL_STEPS.findIndex(s => s === (studentData?.currentLevel || "1A")) + 1) / LEVEL_STEPS.length) * 100)}% Complete
// // // //             </Text>
// // // //           </View>
// // // //           <LevelTimeline currentLevel={studentData?.currentLevel || "1A"} />
// // // //         </View>

// // // //         {/* Technical | Soft | Discipline */}
// // // //         <View style={styles.boardRow}>
// // // //           {/* Technical */}
// // // //           <View style={styles.boardCol}>
// // // //             <Text style={styles.sectionTitle}>Technical Skills</Text>
// // // //             {(technicalSkills.length ? technicalSkills : [{ name: "N/A", percent: 0 }]).map(
// // // //               (s, i) => (
// // // //                 <View key={i} style={styles.skillRow}>
// // // //                   <View style={styles.skillHeader}>
// // // //                     <Text style={styles.small}>{s.name}</Text>
// // // //                     <Text style={styles.small}>{s.percent}%</Text>
// // // //                   </View>
// // // //                   <ProgressBar percent={s.percent} />
// // // //                 </View>
// // // //               )
// // // //             )}
// // // //           </View>

// // // //           {/* Soft */}
// // // //           <View style={styles.boardCol}>
// // // //             <Text style={styles.sectionTitle}>Soft Skills</Text>
// // // //             {softCats.length ? (
// // // //               softCats.map((c, i) => (
// // // //                 <SoftItem
// // // //                   key={i}
// // // //                   title={c?.title || "Skill"}
// // // //                   status={softStatus(c?.score, c?.maxMarks)}
// // // //                 />
// // // //               ))
// // // //             ) : (
// // // //               <Text style={styles.small}>N/A</Text>
// // // //             )}
// // // //           </View>

// // // //           {/* Discipline */}
// // // //           <View style={styles.boardCol}>
// // // //             <Text style={styles.sectionTitle}>Discipline</Text>
// // // //             {discCats.length ? (
// // // //               discCats.map((c, i) => {
// // // //                 const pct =
// // // //                   ((Number(c?.score || 0) / Number(c?.maxMarks || 10)) * 100) || 0;
// // // //                 return (
// // // //                   <View key={i} style={styles.skillRow}>
// // // //                     <View style={styles.skillHeader}>
// // // //                       <Text style={styles.small}>{c?.title || "Metric"}</Text>
// // // //                       <Text style={styles.small}>
// // // //                         {c?.score}/{c?.maxMarks}
// // // //                       </Text>
// // // //                     </View>
// // // //                     <ProgressBar percent={pct} />
// // // //                   </View>
// // // //                 );
// // // //               })
// // // //             ) : (
// // // //               <Text style={styles.small}>N/A</Text>
// // // //             )}
// // // //           </View>
// // // //         </View>

// // // //         {/* Career Readiness (4 in one row) */}
// // // //         <View style={styles.section}>
// // // //           <Text style={styles.sectionTitle}>Career Readiness</Text>
// // // //           <View style={styles.readinessRow}>
// // // //             <View style={styles.pill}>
// // // //               <Text style={styles.pillLabel}>Resume</Text>
// // // //               <Text style={styles.pillValue}>
// // // //                 {reportCardData?.careerReadiness?.resumeStatus || "Not created"}
// // // //               </Text>
// // // //             </View>
// // // //             <View style={styles.pill}>
// // // //               <Text style={styles.pillLabel}>LinkedIn</Text>
// // // //               <Text style={styles.pillValue}>
// // // //                 {reportCardData?.careerReadiness?.linkedinStatus || "Need to improve"}
// // // //               </Text>
// // // //             </View>
// // // //             <View style={styles.pill}>
// // // //               <Text style={styles.pillLabel}>Aptitude</Text>
// // // //               <Text style={styles.pillValue}>
// // // //                 {reportCardData?.careerReadiness?.aptitudeStatus || "In-progress"}
// // // //               </Text>
// // // //             </View>
// // // //             <View style={styles.pill}>
// // // //               <Text style={styles.pillLabel}>Placement</Text>
// // // //               <Text style={styles.pillValue}>
// // // //                 {reportCardData?.careerReadiness?.placementReady || "Not-ready"}
// // // //               </Text>
// // // //             </View>
// // // //           </View>
// // // //         </View>

// // // //         {/* Academic Performance (summary row) */}
// // // //         <View style={styles.section}>
// // // //           <Text style={styles.sectionTitle}>Academic Performance</Text>
// // // //           <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
// // // //             {[
// // // //               { title: "Current Level", val: `Level ${studentData?.currentLevel || "1A"}` },
// // // //               { title: "1st Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "FY")?.sgpa ?? "N/A" },
// // // //               { title: "2nd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "SY")?.sgpa ?? "N/A" },
// // // //               { title: "3rd Year SGPA", val: reportCardData?.academicPerformance?.yearWiseSGPA?.find(y => y.year === "TY")?.sgpa ?? "N/A" },
// // // //               { title: "CGPA", val: reportCardData?.academicPerformance?.cgpa ?? "N/A" },
// // // //             ].map((it, idx) => (
// // // //               <View
// // // //                 key={idx}
// // // //                 style={{
// // // //                   width: "19.2%",
// // // //                   backgroundColor: "#FFFFFF",
// // // //                   borderRadius: 6,
// // // //                   borderWidth: 1,
// // // //                   borderStyle: "solid",
// // // //                   borderColor: "#E5E7EB",
// // // //                   paddingVertical: 8,
// // // //                   paddingHorizontal: 6,
// // // //                 }}
// // // //               >
// // // //                 <Text style={{ fontSize: 9, color: "#6B7280", textAlign: "center", marginBottom: 4 }}>
// // // //                   {it.title}
// // // //                 </Text>
// // // //                 <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center", color: "#111827" }}>
// // // //                   {it.val}
// // // //                 </Text>
// // // //               </View>
// // // //             ))}
// // // //           </View>
// // // //         </View>

// // // //         {/* Faculty Feedback */}
// // // //         <View style={styles.section}>
// // // //           <Text style={styles.sectionTitle}>Faculty Feedback</Text>
// // // //           <Text style={styles.value}>
// // // //             {reportCardData?.facultyRemark || "No feedback available"}
// // // //           </Text>

// // // //           <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
// // // //             <Text style={styles.label}>
// // // //               Rating:{" "}
// // // //               <Text style={styles.value}>
// // // //                 {(() => {
// // // //                   const g = (reportCardData?.overallGrade || "").toUpperCase();
// // // //                   if (g === "A+") return "5.0";
// // // //                   if (g === "A") return "4.5";
// // // //                   if (g === "B+") return "4.0";
// // // //                   if (g === "B") return "3.5";
// // // //                   if (g === "C+") return "3.0";
// // // //                   if (g === "C") return "2.5";
// // // //                   if (g === "D+") return "2.0";
// // // //                   if (g === "D") return "1.5";
// // // //                   if (g === "F") return "1.0";
// // // //                   return "3.0";
// // // //                 })()} ★
// // // //               </Text>
// // // //             </Text>

// // // //             <Text style={styles.label}>
// // // //               Generated by:{" "}
// // // //               <Text style={styles.value}>
// // // //                 {reportCardData?.generatedByName || "N/A"}
// // // //               </Text>
// // // //             </Text>
// // // //           </View>
// // // //         </View>

// // // //         {/* Footer */}
// // // //         <View style={styles.footer} fixed>
// // // //           <Text style={styles.footerText}>
// // // //             Current Level: {studentData?.currentLevel || "1A"} • Overall Grade: {reportCardData?.overallGrade || "B+"} • Academic Year: 2024-25
// // // //           </Text>
// // // //         </View>
// // // //       </Page>
// // // //     </Document>
// // // //   );
// // // // };

// // // // export default StudentReportPDF;

