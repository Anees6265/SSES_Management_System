// StudentReportForm.jsx (final - safe updates, deep cloning, functional setState)
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetAdmittedStudentsByIdQuery,
  useCreateReportCardMutation,
  useGetReportCardForEditQuery,
  useUpdateReportCardMutation,
  useGetStudentTasksQuery
} from "../../../redux/api/authApi";
import Header from '../../shared/sidebar/Header';
import Loader from "../../shared/loader/Loader";
import { toast } from "react-toastify";
import { FaLock, FaCheckCircle, FaStar, FaSyncAlt, FaPlus } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { taskAPI } from "../../../services/taskService";
import { detectDepartment, DEPARTMENT_CONFIGS } from "./reportCardDepartmentConfig";

const deepClone = (obj) => {
  // Use structuredClone when available (preserves types), fallback to JSON
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

const SimpleDropdown = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef(null);

  const hasValue = value !== "";
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          peer h-12 w-full border border-gray-300 rounded-md
          px-3 py-2 leading-tight bg-white text-left
          focus:outline-none focus:border-orange-400 
          focus:ring-0 appearance-none flex items-center justify-between
          cursor-pointer
          ${isOpen ? "border-orange-400" : ""}
          transition-all duration-200
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : 'Select'}
        </span>
        <span className={`ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      <label
        className={`
          absolute left-3 bg-white px-1 transition-all duration-200
          pointer-events-none
          ${isFocused || hasValue || isOpen
            ? "text-xs -top-2 text-black"
            : "text-gray-500 top-3"}
        `}
      >
        {label}
      </label>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-lg z-50 overflow-hidden border bg-white">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-left transition-colors duration-150"
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default function StudentReportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: studentData, isLoading, isError } = useGetAdmittedStudentsByIdQuery(id);
  const { data: existingReportData, isLoading: reportLoading, error: reportError } = useGetReportCardForEditQuery(id);
  const { data: tasksData, isLoading: tasksLoading } = useGetStudentTasksQuery(id);
  const [createReportCard, { isLoading: isCreating, error: mutationError }] = useCreateReportCardMutation();
  const [updateReportCard, { isLoading: isUpdating }] = useUpdateReportCardMutation();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [taskPerformance, setTaskPerformance] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPerformance = async () => {
      if (id) {
        try {
          const res = await taskAPI.getStudentTaskPerformance(id);
          if (isMounted && res?.performance) {
            setTaskPerformance(res.performance);
          }
        } catch (err) {
          console.error("Error fetching task performance in form:", err);
        }
      }
    };
    fetchPerformance();
    return () => { isMounted = false; };
  }, [id]);

  const [formData, setFormData] = useState({
    batchYear: "",
    generatedByName: loggedInUser?.name || "",
    templateType: "ITEG_STANDARD",
    dynamicSections: [],
    softSkills: {
      sectionTitle: "Soft Skills Evaluation (50 Marks)",
      totalSoftSkillMarks: 0,
      categories: [
        {
          title: "Presentation Skills",
          maxMarks: 10,
          score: 0,
          subcategories: [
            { name: "Content & Structure", value: false },
            { name: "Confidence & Clarity", value: false },
            { name: "Body Language", value: false },
            { name: "Engagement with Audience", value: false },
            { name: "Voice Modulation", value: false }
          ]
        },
        {
          title: "Team Collaboration",
          maxMarks: 10,
          score: 0,
          subcategories: [
            { name: "Active Participation", value: false },
            { name: "Cooperation", value: false },
            { name: "Leadership", value: false },
            { name: "Task Contribution", value: false },
            { name: "Conflict Resolution", value: false }
          ]
        },
        {
          title: "Time Management",
          maxMarks: 10,
          score: 0,
          subcategories: [
            { name: "Punctuality", value: false },
            { name: "Deadline Handling", value: false },
            { name: "Task Prioritization", value: false },
            { name: "Consistency", value: false },
            { name: "Efficiency", value: false }
          ]
        }
      ]
    },
    discipline: {
      sectionTitle: "Discipline Evaluation (30 Marks)",
      totalDisciplineMarks: 0,
      categories: [
        {
          title: "Attendance",
          maxMarks: 10,
          score: 0,
          subcategories: [
            { name: "Regular Attendance", value: false },
            { name: "Leaves with Permission", value: false },
            { name: "Class Participation", value: false },
            { name: "Punctual Entry", value: false },
            { name: "Active Listening", value: false }
          ]
        },
        {
          title: "Behaviour",
          maxMarks: 10,
          score: 0,
          subcategories: [
            { name: "Politeness", value: false },
            { name: "Respect for Faculty", value: false },
            { name: "Team Behaviour", value: false },
            { name: "Classroom Conduct", value: false },
            { name: "Responsibility", value: false }
          ]
        },
        {
          title: "Professionalism",
          maxMarks: 10,
          score: 0,
          subcategories: [
            { name: "Dress Code", value: false },
            { name: "Communication Etiquette", value: false },
            { name: "Task Ownership", value: false },
            { name: "Timely Submission", value: false },
            { name: "Accountability", value: false }
          ]
        }
      ]
    },
    technicalSkills: [
      {
        skillName: "",
        theoryMarks: 0,
        practicalMarks: 0,
        totalPercentage: 0,
        remark: ""
      }
    ],
    careerReadiness: {
      resumeStatus: "",
      linkedinStatus: "",
      aptitudeStatus: "",
      placementReady: ""
    },
    academicPerformance: {
      yearWiseSGPA: [
        { year: "FY", sgpa: 0 },
        { year: "SY", sgpa: 0 },
        { year: "TY", sgpa: 0 }
      ],
      cgpa: 0
    },
    coCurricular: [
      {
        category: "",
        title: "",
        remark: ""
      }
    ],
    overallGrade: "",
    facultyRemark: "",
    isFinalReport: false
  });

  const generateDynamicSections = (templateType, student, tasks, taskPerf = null) => {
    const resumeStatus = (student?.placement?.resumeURL || student?.resumeURL || student?.resume || student?.resumeUrl || student?.resume_url) ? "Created" : "Not created";
    
    let placementReady = "Not Ready";
    if (student?.placement?.readinessStatus) {
      const rs = student.placement.readinessStatus;
      if (["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"].includes(rs)) {
        placementReady = "Ready";
      } else if (rs === "In Progress") {
        placementReady = "In Progress";
      } else {
        placementReady = "Not Ready";
      }
    }

    const LEVEL_STEPS = ["1A", "1B", "1C", "2A", "2B", "2C"];
    const currentSubLevel = student?.currentSubLevelId?.name || student?.currentLevel || "1A";
    const currentIdx = LEVEL_STEPS.indexOf(currentSubLevel);

    // 1. Level Progress Table (Automatic / Read-Only)
    const levelProgressSection = {
      sectionName: "Level Progress",
      sectionType: "LevelProgressTable",
      items: LEVEL_STEPS.map(lvl => {
        let status = "Upcoming";
        let completion = 0;
        let ratingStr = "—";
        const idx = LEVEL_STEPS.indexOf(lvl);
        if (idx < currentIdx) {
          status = "Completed";
          completion = 100;
          ratingStr = "4.10";
        } else if (idx === currentIdx) {
          status = "Current";
          if (taskPerf?.completionRate !== undefined && taskPerf.completionRate > 0) {
            completion = taskPerf.completionRate;
          } else if (tasks?.totalTasks > 0) {
            completion = Math.round((tasks.completedTasks / tasks.totalTasks) * 100);
          } else {
            completion = 60;
          }
          ratingStr = "3.90";
        }
        return {
          itemName: lvl,
          value: status,
          score: completion,
          remark: ratingStr,
          maxMarks: lvl.startsWith("1") ? 1 : 2
        };
      })
    };

    // 2. Subject-wise Performance Table (Automatic / Read-Only from live tasks)
    const deptType = detectDepartment(student, { templateType });
    const deptConfig = DEPARTMENT_CONFIGS[deptType] || DEPARTMENT_CONFIGS.ITEG;
    const isMeg = deptType === "MEG";

    const subjectItems = [];

    // Prioritize taskPerf from /tasks/student/:id/performance if available
    if (taskPerf?.technicalSkills && taskPerf.technicalSkills.length > 0) {
      taskPerf.technicalSkills.forEach(skill => {
        subjectItems.push({
          itemName: skill.skillName,
          value: skill.remark || "Good",
          score: skill.completedTasks || 0,
          maxMarks: skill.totalTasks || 0,
          remark: skill.rating ? Number(skill.rating).toFixed(2) : "4.00"
        });
      });
    } else if (tasks?.groupedBySubject) {
      Object.keys(tasks.groupedBySubject).forEach(subjectName => {
        if (subjectName.trim() === "" || subjectName.toLowerCase() === "other") return;
        const subjTasks = tasks.groupedBySubject[subjectName].tasks || [];
        const total = subjTasks.length;
        const evaluated = subjTasks.filter(t => t.status === "completed").length;
        
        let scoreSum = 0;
        let gradedCount = 0;
        subjTasks.forEach(t => {
          if (t.status === "completed" && t.marks !== undefined && t.marks !== null) {
            const max = t.maxMarks || 5;
            scoreSum += (t.marks / max) * 5;
            gradedCount++;
          }
        });
        const avg = gradedCount > 0 ? parseFloat((scoreSum / gradedCount).toFixed(2)) : 4.0;
        
        let performance = "Good";
        if (avg >= 4.5) performance = "Outstanding";
        else if (avg >= 4.0) performance = "Excellent";
        else if (avg >= 3.5) performance = "Very Good";
        else if (avg >= 3.0) performance = "Good";
        else performance = "Average";

        subjectItems.push({
          itemName: subjectName,
          value: performance,
          score: evaluated,
          maxMarks: total,
          remark: avg.toFixed(2)
        });
      });
    }

    if (subjectItems.length === 0) {
      deptConfig.defaultSubjects.forEach(s => subjectItems.push({ ...s }));
    }

    const subjectPerformanceSection = {
      sectionName: "Subject-wise Performance",
      sectionType: "SubjectPerformanceTable",
      items: subjectItems
    };

    // 3. Soft Skills & Behavioural Evaluation (Fully Customizable)
    const softSkillsSection = {
      sectionName: "Soft Skills & Behavioural Evaluation",
      sectionType: "SoftSkillsRating",
      items: [
        { itemName: "Communication", value: 4.2, maxMarks: 5 },
        { itemName: "Confidence", value: 4.0, maxMarks: 5 },
        { itemName: "Teamwork", value: 4.1, maxMarks: 5 },
        { itemName: "Leadership", value: 3.8, maxMarks: 5 },
        { itemName: "Presentation", value: 4.0, maxMarks: 5 },
        { itemName: "Professional Behaviour", value: 4.2, maxMarks: 5 }
      ]
    };

    // 4. Interview Evaluation (Department-specific defaults, fully editable)
    const interviewItems = deptConfig.interviewItems.map(item => ({ ...item }));

    const interviewSection = {
      sectionName: deptConfig.interviewSectionTitle || "Interview Evaluation",
      sectionType: "InterviewRating",
      items: interviewItems
    };

    // 5. Career Readiness
    const careerSection = {
      sectionName: "Career Readiness",
      sectionType: "CareerStatus",
      items: [
        { itemName: "Resume", value: resumeStatus },
        { itemName: "LinkedIn", value: "Created" },
        { itemName: "Aptitude", value: "In Progress" },
        { itemName: "Placement Ready", value: placementReady }
      ]
    };

    // 6. Attendance & Discipline
    const attendanceDisciplineSection = {
      sectionName: "Attendance & Discipline",
      sectionType: "AttendanceDiscipline",
      items: [
        { itemName: "Attendance", value: "92%" },
        { itemName: "Punctuality", value: "Good" },
        { itemName: "Discipline", value: "Excellent" },
        { itemName: "Professional Behaviour", value: "Good" }
      ]
    };

    // 7. Strengths & Areas for Improvement (Department-tailored)
    const strengthsItems = [
      { itemName: "Strengths", value: deptConfig.strengths },
      { itemName: "Areas for Improvement", value: deptConfig.mockGrowthAreas.join(", ") }
    ];

    const strengthsSection = {
      sectionName: "Strengths & Areas for Improvement",
      sectionType: "StrengthsImprovement",
      items: strengthsItems
    };

    // 8. Overall Performance
    const overallPerformanceSection = {
      sectionName: "Overall Performance",
      sectionType: "OverallPerformanceSummary",
      items: [
        { itemName: "Subject Performance", value: 4.10, maxMarks: 5 },
        { itemName: "Soft Skills", value: 4.00, maxMarks: 5 },
        { itemName: "Interview", value: 3.80, maxMarks: 5 },
        { itemName: "Discipline", value: 4.20, maxMarks: 5 },
        { itemName: "Overall Rating", value: 4.02, maxMarks: 5, remark: "Excellent" }
      ]
    };

    return [
      levelProgressSection,
      subjectPerformanceSection,
      softSkillsSection,
      interviewSection,
      careerSection,
      attendanceDisciplineSection,
      strengthsSection,
      overallPerformanceSection
    ];
  };

  const autoPopulateFromData = (student, tasks, templateType = "ITEG_STANDARD", taskPerf = null) => {
    if (!student) return {};

    const batchYear = student.batchYear || student.sessionId?.name || "";
    const dynamicSections = generateDynamicSections(templateType, student, tasks, taskPerf);

    let resumeStatus = "Not created";
    const hasResume = student.placement?.resumeURL || student.resumeURL || student.resume || student.resumeUrl || student.resume_url;
    if (hasResume) {
      resumeStatus = "Updated";
    }

    let placementReady = "Not Ready";
    if (student.placement?.readinessStatus) {
      const rs = student.placement.readinessStatus;
      if (["Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"].includes(rs)) {
        placementReady = "Ready";
      } else if (rs === "In Progress") {
        placementReady = "In-process";
      } else {
        placementReady = "Not Ready";
      }
    }

    const yearWiseSGPA = [
      { year: "FY", sgpa: 0 },
      { year: "SY", sgpa: 0 },
      { year: "TY", sgpa: 0 }
    ];
    if (student.academicHistory && student.academicHistory.length > 0) {
      student.academicHistory.forEach(h => {
        const name = (h.yearName || "").toLowerCase();
        let index = -1;
        if (name.includes("1st") || name.includes("fy") || name.includes("first")) {
          index = 0;
        } else if (name.includes("2nd") || name.includes("sy") || name.includes("second")) {
          index = 1;
        } else if (name.includes("3rd") || name.includes("ty") || name.includes("third")) {
          index = 2;
        }
        if (index !== -1 && h.percentage) {
          yearWiseSGPA[index].sgpa = parseFloat((h.percentage / 10).toFixed(2));
        }
      });
    }
    const totalSgpa = yearWiseSGPA.reduce((sum, y) => sum + y.sgpa, 0);
    const activeCount = yearWiseSGPA.filter(y => y.sgpa > 0).length;
    const cgpa = activeCount > 0 ? parseFloat((totalSgpa / activeCount).toFixed(2)) : 0;

    let technicalSkills = [];
    if (tasks && tasks.groupedBySubject) {
      Object.keys(tasks.groupedBySubject).forEach(subjectName => {
        if (subjectName.trim() === "" || subjectName.toLowerCase() === "other") return;
        const subjData = tasks.groupedBySubject[subjectName];
        const subjectTasks = subjData.tasks || [];
        const totalTasks = subjectTasks.length;
        if (totalTasks === 0) return;

        const completedTasks = subjectTasks.filter(t => t.status === "completed");
        const completedCount = completedTasks.length;
        const theoryMarks = Math.round((completedCount / totalTasks) * 10);

        const gradedTasks = completedTasks.filter(t => t.marks !== null && t.marks !== undefined);
        const avgMarks = gradedTasks.length > 0
          ? gradedTasks.reduce((sum, t) => sum + t.marks, 0) / gradedTasks.length
          : 0;
        const practicalMarks = Math.round(avgMarks * 2);

        const totalPercentage = Math.round(((theoryMarks + practicalMarks) / 20) * 100);

        let remark = "Poor";
        if (totalPercentage >= 90) remark = "Excellent";
        else if (totalPercentage >= 80) remark = "Very Good";
        else if (totalPercentage >= 70) remark = "Good";
        else if (totalPercentage >= 60) remark = "Average";
        else if (totalPercentage >= 50) remark = "Below Average";

        technicalSkills.push({
          skillName: subjectName,
          theoryMarks,
          practicalMarks,
          totalPercentage,
          remark
        });
      });
    }

    if (technicalSkills.length === 0) {
      technicalSkills = [{ skillName: "", theoryMarks: 0, practicalMarks: 0, totalPercentage: 0, remark: "" }];
    }

    return {
      batchYear,
      templateType,
      dynamicSections,
      careerReadiness: {
        resumeStatus,
        linkedinStatus: "Not created",
        aptitudeStatus: "In-Progress",
        placementReady
      },
      academicPerformance: {
        yearWiseSGPA,
        cgpa
      },
      technicalSkills
    };
  };

  // Auto-populate form when creating new report card and data is loaded
  useEffect(() => {
    if (studentData?.data && !existingReportData?.data) {
      const templateType = studentData.data.subDepartmentId?.departmentId?.reportConfig?.templateType || "ITEG_STANDARD";
      const populated = autoPopulateFromData(studentData.data, tasksData, templateType, taskPerformance);
      setFormData(prev => ({
        ...prev,
        ...populated
      }));
    }
  }, [studentData, tasksData, taskPerformance, existingReportData]);

  const handleAutoPopulate = () => {
    if (!studentData?.data) {
      toast.error("Student profile data is not loaded yet");
      return;
    }
    const templateType = studentData.data.subDepartmentId?.departmentId?.reportConfig?.templateType || "ITEG_STANDARD";
    const populated = autoPopulateFromData(studentData.data, tasksData, templateType, taskPerformance);

    setFormData(prev => ({
      ...prev,
      ...populated
    }));
    toast.success("Auto-filled from student profile & task record!");
  };

  const addDynamicItem = (sectionIndex, defaultItem = { itemName: "New Parameter", value: 4.0, maxMarks: 5 }) => {
    setFormData(prev => {
      const next = deepClone(prev);
      const section = next.dynamicSections[sectionIndex];
      if (!section || section.sectionType === "LevelProgressTable" || section.sectionType === "SubjectPerformanceTable") {
        return prev;
      }
      section.items.push(defaultItem);
      return next;
    });
  };

  const removeDynamicItem = (sectionIndex, itemIndex) => {
    setFormData(prev => {
      const next = deepClone(prev);
      const section = next.dynamicSections[sectionIndex];
      if (!section || section.sectionType === "LevelProgressTable" || section.sectionType === "SubjectPerformanceTable") {
        return prev;
      }
      section.items.splice(itemIndex, 1);
      return next;
    });
  };

  const setDynamicItemField = (sectionIndex, itemIndex, field, val) => {
    setFormData(prev => {
      const next = deepClone(prev);
      const section = next.dynamicSections[sectionIndex];
      // Disallow manual edits to automated sections
      if (section.sectionType === "LevelProgressTable" || section.sectionType === "SubjectPerformanceTable") {
        return prev;
      }
      const item = section.items[itemIndex];
      item[field] = val;
      return next;
    });
  };

  // Populate form with existing data when available (safe merge, no stale closure)
  useEffect(() => {
    if (existingReportData?.data) {
      const reportData = existingReportData.data;
      const templateType = studentData?.data?.subDepartmentId?.departmentId?.reportConfig?.templateType || reportData.templateType || "ITEG_STANDARD";

      // Always auto-fill LevelProgressTable and SubjectPerformanceTable from real student records
      const autoSections = generateDynamicSections(templateType, studentData?.data, tasksData, taskPerformance);
      const autoLevelProgress = autoSections.find(s => s.sectionType === "LevelProgressTable");
      const autoSubjectPerf = autoSections.find(s => s.sectionType === "SubjectPerformanceTable");

      let resolvedDynamicSections = [];
      if (reportData.dynamicSections && reportData.dynamicSections.length > 0) {
        resolvedDynamicSections = reportData.dynamicSections.map(sec => {
          if (sec.sectionType === "LevelProgressTable" && autoLevelProgress) return autoLevelProgress;
          if (sec.sectionType === "SubjectPerformanceTable" && autoSubjectPerf) return autoSubjectPerf;
          return sec;
        });
        if (!resolvedDynamicSections.some(s => s.sectionType === "LevelProgressTable") && autoLevelProgress) {
          resolvedDynamicSections.unshift(autoLevelProgress);
        }
        if (!resolvedDynamicSections.some(s => s.sectionType === "SubjectPerformanceTable") && autoSubjectPerf) {
          const lIdx = resolvedDynamicSections.findIndex(s => s.sectionType === "LevelProgressTable");
          resolvedDynamicSections.splice(lIdx + 1, 0, autoSubjectPerf);
        }
      } else {
        resolvedDynamicSections = autoSections;
      }

      const next = deepClone({
        batchYear: reportData.batchYear || "",
        generatedByName: reportData.generatedByName || loggedInUser?.name || "",
        templateType: reportData.templateType || "ITEG_STANDARD",
        dynamicSections: resolvedDynamicSections,
        softSkills: {
          sectionTitle: reportData.softSkills?.sectionTitle || "Soft Skills Evaluation (50 Marks)",
          totalSoftSkillMarks: reportData.softSkills?.totalSoftSkillMarks || 0,
          categories: reportData.softSkills?.categories?.length > 0
            ? reportData.softSkills.categories
            : undefined
        },
        discipline: {
          sectionTitle: reportData.discipline?.sectionTitle || "Discipline Evaluation (30 Marks)",
          totalDisciplineMarks: reportData.discipline?.totalDisciplineMarks || 0,
          categories: reportData.discipline?.categories?.length > 0
            ? reportData.discipline.categories
            : undefined
        },
        technicalSkills: reportData.technicalSkills?.length > 0
          ? [...reportData.technicalSkills]
          : undefined,
        careerReadiness: reportData.careerReadiness || undefined,
        academicPerformance: reportData.academicPerformance?.yearWiseSGPA?.length > 0
          ? reportData.academicPerformance
          : undefined,
        coCurricular: reportData.coCurricular?.length > 0 ? [...reportData.coCurricular] : undefined,
        overallGrade: reportData.overallGrade || "",
        facultyRemark: reportData.facultyRemark || "",
        isFinalReport: reportData.isFinalReport || false
      });

      // Merge with defaults (do not remove default fields if undefined in API)
      setFormData(prev => {
        const merged = deepClone(prev);
        // shallow replace only provided keys
        Object.keys(next).forEach(key => {
          if (next[key] !== undefined) merged[key] = next[key];
        });
        return merged;
      });
    } else {
      // no report found - keep defaults or loggedInUser name
      setFormData(prev => ({ ...prev, generatedByName: loggedInUser?.name || prev.generatedByName }));
    }
  }, [existingReportData, studentData, tasksData, taskPerformance, loggedInUser?.name]);

  // Keep LevelProgress and SubjectPerformance synchronized with live student & task performance
  useEffect(() => {
    if (studentData?.data && (tasksData || taskPerformance)) {
      const templateType = studentData.data.subDepartmentId?.departmentId?.reportConfig?.templateType || formData.templateType || "ITEG_STANDARD";
      const freshAuto = generateDynamicSections(templateType, studentData.data, tasksData, taskPerformance);
      const freshLevel = freshAuto.find(s => s.sectionType === "LevelProgressTable");
      const freshSubject = freshAuto.find(s => s.sectionType === "SubjectPerformanceTable");

      setFormData(prev => {
        if (!prev.dynamicSections || prev.dynamicSections.length === 0) return prev;
        const updated = prev.dynamicSections.map(sec => {
          if (sec.sectionType === "LevelProgressTable" && freshLevel) return freshLevel;
          if (sec.sectionType === "SubjectPerformanceTable" && freshSubject) return freshSubject;
          return sec;
        });
        return { ...prev, dynamicSections: updated };
      });
    }
  }, [studentData, tasksData, taskPerformance]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.batchYear.trim()) {
      toast.error('Please enter batch year');
      return;
    }
    if (!formData.generatedByName.trim()) {
      toast.error('Please enter faculty name');
      return;
    }
    if (!formData.overallGrade) {
      toast.error('Please select overall grade');
      return;
    }

    try {
      const reportData = {
        studentRef: id,
        batchYear: formData.batchYear.trim(),
        generatedByName: formData.generatedByName.trim(),
        templateType: formData.templateType || "ITEG_STANDARD",
        dynamicSections: formData.dynamicSections || [],
        softSkills: {
          sectionTitle: "Soft Skills Evaluation (50 Marks)",
          totalSoftSkillMarks: formData.softSkills.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
          categories: formData.softSkills.categories.map(cat => ({
            title: cat.title,
            maxMarks: cat.maxMarks,
            score: cat.score || 0,
            subcategories: cat.subcategories
          }))
        },
        discipline: {
          sectionTitle: "Discipline Evaluation (30 Marks)",
          totalDisciplineMarks: formData.discipline.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
          categories: formData.discipline.categories.map(cat => ({
            title: cat.title,
            maxMarks: cat.maxMarks,
            score: cat.score || 0,
            subcategories: cat.subcategories
          }))
        },
        technicalSkills: formData.technicalSkills
          .filter(skill => skill.skillName && skill.skillName.trim() !== "" && (skill.theoryMarks > 0 || skill.practicalMarks > 0))
          .map(skill => ({
            skillName: skill.skillName.trim(),
            theoryMarks: skill.theoryMarks || 0,
            practicalMarks: skill.practicalMarks || 0,
            totalPercentage: skill.totalPercentage || 0,
            remark: skill.remark.trim() || "No remarks"
          })),
        careerReadiness: formData.careerReadiness,
        academicPerformance: formData.academicPerformance,
        coCurricular: formData.coCurricular.filter(item => item.title && item.title.trim() !== "" && item.category && item.category.trim() !== ""),
        overallGrade: formData.overallGrade,
        facultyRemark: formData.facultyRemark.trim() || "No specific remarks",
        isFinalReport: formData.isFinalReport
      };

      const result = await createReportCard(reportData).unwrap();
      console.log('Report card created:', result);

      toast.success(existingReportData?.data ? 'Report card updated successfully!' : 'Report card created successfully!');
      navigate(`/student/${id}/report`);
    } catch (error) {
      console.error('Submit Error:', error);
      let errorMsg = 'Failed to create report card';
      if (error.status === 400) {
        errorMsg = 'Invalid data format. Please check all fields.';
      } else if (error.status === 500) {
        errorMsg = 'Server error. Please try again later.';
      } else if (error.data?.message) {
        errorMsg = error.data.message;
      }
      toast.error(errorMsg);
    }
  };

  // Safe update helpers using functional set and deepClone
  const updateSoftSkillSubcategory = (categoryIndex, subcategoryIndex, value) => {
    setFormData(prev => {
      const next = deepClone(prev);
      next.softSkills.categories[categoryIndex].subcategories[subcategoryIndex].value = !!value;
      // recalc score
      const checkedCount = next.softSkills.categories[categoryIndex].subcategories.filter(s => s.value).length;
      next.softSkills.categories[categoryIndex].score = checkedCount * 2;
      return next;
    });
  };

  const updateDisciplineSubcategory = (categoryIndex, subcategoryIndex, value) => {
    setFormData(prev => {
      const next = deepClone(prev);
      next.discipline.categories[categoryIndex].subcategories[subcategoryIndex].value = !!value;
      const checkedCount = next.discipline.categories[categoryIndex].subcategories.filter(s => s.value).length;
      next.discipline.categories[categoryIndex].score = checkedCount * 2;
      return next;
    });
  };

  // Generic single-field setter for nested keys (path-based could be added). Using specific handlers in UI below.
  const setTechnicalSkillField = (index, field, rawValue) => {
    setFormData(prev => {
      const next = deepClone(prev);
      const newSkills = next.technicalSkills || [];
      // ensure slot exists
      while (newSkills.length <= index) newSkills.push({ skillName: "", theoryMarks: 0, practicalMarks: 0, totalPercentage: 0, remark: "" });
      const skill = newSkills[index];
      if (field === "theoryMarks" || field === "practicalMarks") {
        const val = Math.min(parseInt(rawValue || 0, 10) || 0, 10);
        skill[field] = val;
        const totalMarks = (skill.theoryMarks || 0) + (skill.practicalMarks || 0);
        const percentage = Math.round((totalMarks / 20) * 100);
        skill.totalPercentage = percentage;
        // set remark
        if (percentage >= 90) skill.remark = "Excellent";
        else if (percentage >= 80) skill.remark = "Very Good";
        else if (percentage >= 70) skill.remark = "Good";
        else if (percentage >= 60) skill.remark = "Average";
        else if (percentage >= 50) skill.remark = "Below Average";
        else skill.remark = "Poor";
      } else if (field === "skillName" || field === "remark") {
        skill[field] = String(rawValue || "");
      } else if (field === "totalPercentage") {
        skill.totalPercentage = Math.max(0, Math.min(parseInt(rawValue || 0, 10) || 0, 100));
      }
      next.technicalSkills = newSkills;
      return next;
    });
  };

  const addTechnicalSkill = () => {
    setFormData(prev => {
      const next = deepClone(prev);
      next.technicalSkills = next.technicalSkills || [];
      next.technicalSkills.push({ skillName: "", theoryMarks: 0, practicalMarks: 0, totalPercentage: 0, remark: "" });
      return next;
    });
  };

  const addCoCurricular = () => {
    setFormData(prev => {
      const next = deepClone(prev);
      next.coCurricular = next.coCurricular || [];
      next.coCurricular.push({ category: "", title: "", remark: "" });
      return next;
    });
  };

  const setCoCurricularField = (index, field, value) => {
    setFormData(prev => {
      const next = deepClone(prev);
      next.coCurricular = next.coCurricular || [];
      while (next.coCurricular.length <= index) next.coCurricular.push({ category: "", title: "", remark: "" });
      next.coCurricular[index][field] = value;
      return next;
    });
  };

  // Academic sgpa change (handles CGPA recalc)
  const setYearSGPA = (index, rawValue) => {
    setFormData(prev => {
      const next = deepClone(prev);
      const val = parseFloat(rawValue) || 0;
      next.academicPerformance = next.academicPerformance || { yearWiseSGPA: [{ year: "FY", sgpa: 0 }, { year: "SY", sgpa: 0 }, { year: "TY", sgpa: 0 }], cgpa: 0 };
      next.academicPerformance.yearWiseSGPA[index].sgpa = val;
      const total = next.academicPerformance.yearWiseSGPA.reduce((s, y) => s + (parseFloat(y.sgpa) || 0), 0);
      const count = next.academicPerformance.yearWiseSGPA.filter(y => (parseFloat(y.sgpa) || 0) > 0).length || 0;
      next.academicPerformance.cgpa = count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
      return next;
    });
  };

  if (isLoading || reportLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader />
      </div>
    );
  }

  if (isError || !studentData) {
    return <div className="p-4 text-red-500">Error loading student data.</div>;
  }

  return (
    <div className="min-h-screen py-2 sm:py-4 bg-slate-50/50">
      <Header
        title={existingReportData?.data ? 'Edit Student Report' : 'Create Student Report'}
        showBack={true}
        breadcrumbs={[
          { label: 'Academics', path: '/student-detail-table' },
          { label: 'Student Progress', path: '/student-detail-table' },
          { label: 'Profile', path: `/student-profile/${id}` },
          { label: 'Report Card', path: `/student/${id}/report` },
          { label: existingReportData?.data ? 'Edit' : 'Create' }
        ]}
      />

      <div className="w-full px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4 max-w-[1600px] mx-auto">
        <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Basic Information</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoPopulate}
                  title="Re-fetch and synchronize level and task metrics"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] sm:text-xs font-semibold transition cursor-pointer"
                >
                  <FaSyncAlt className="text-[10px]" /> Re-sync Live Data
                </button>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Academic Session
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Batch Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.batchYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchYear: e.target.value }))}
                  placeholder="e.g., 2025 - 2029"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Generated By <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={`Prof. ${formData.generatedByName}`}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed text-xs sm:text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Academic Performance */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Academic Performance (SGPA & CGPA)</h3>
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                10.0 Scale
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              {formData.academicPerformance.yearWiseSGPA.map((year, index) => (
                <div key={index} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {year.year} SGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={year.sgpa}
                    onChange={(e) => setYearSGPA(index, e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-200/60">
                <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-700 mb-1">
                  Cumulative CGPA
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.academicPerformance.cgpa}
                  onChange={(e) => setFormData(prev => {
                    const next = deepClone(prev);
                    next.academicPerformance.cgpa = parseFloat(e.target.value) || 0;
                    return next;
                  })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-orange-300 rounded-lg text-xs sm:text-sm font-black bg-white text-orange-700 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {formData.dynamicSections && formData.dynamicSections.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {formData.dynamicSections.map((section, sIdx) => (
                <div key={sIdx} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-orange-600">{section.sectionName}</h3>
                    </div>
                    {(section.sectionType === "LevelProgressTable" || section.sectionType === "SubjectPerformanceTable") ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FaLock className="text-[10px]" /> Auto-Filled (Read-Only)
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                        Editable Section
                      </span>
                    )}
                  </div>

                  {section.sectionType === "LevelProgressTable" && (
                    <div className="space-y-3">
                      {/* Read-Only Notice Banner */}
                      <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-emerald-800 text-xs">
                        <FaLock className="shrink-0 text-emerald-600 text-xs sm:text-sm" />
                        <span>
                          <strong>Auto-Calculated from Level Tracking:</strong> Sublevel progression, completion percentages, and ratings are automatically generated from student records and cannot be edited.
                        </span>
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/30">
                        <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-slate-100/70 font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200/80">
                          <div>Sub-Level</div>
                          <div>Status</div>
                          <div>Completion %</div>
                          <div className="text-right">Average Rating / 5</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {section.items.map((item, idx) => {
                            const isCompleted = item.value === "Completed";
                            const isCurrent = item.value === "Current";
                            return (
                              <div key={idx} className="grid grid-cols-4 gap-4 items-center px-4 py-3 bg-white hover:bg-slate-50/50 transition">
                                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                                  <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0">
                                    {item.itemName}
                                  </span>
                                  <span>{item.maxMarks === 1 ? "Level 1" : "Level 2"} - {item.itemName}</span>
                                </div>
                                <div>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    isCurrent ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}>
                                    {isCompleted && <FaCheckCircle className="text-[10px]" />}
                                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                    {item.value || "Upcoming"}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                    <span>{item.score || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isCompleted ? "bg-emerald-500" : isCurrent ? "bg-blue-500" : "bg-slate-300"
                                      }`}
                                      style={{ width: `${Math.min(item.score || 0, 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 font-bold text-sm text-slate-800 bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                                    <FaStar className="text-amber-500 text-xs" />
                                    {item.remark || "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mobile Responsive Cards */}
                      <div className="block md:hidden space-y-2.5">
                        {section.items.map((item, idx) => {
                          const isCompleted = item.value === "Completed";
                          const isCurrent = item.value === "Current";
                          return (
                            <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0">
                                    {item.itemName}
                                  </span>
                                  <span className="font-bold text-xs text-slate-800">
                                    {item.maxMarks === 1 ? "Level 1" : "Level 2"} - {item.itemName}
                                  </span>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  isCurrent ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                  {isCompleted && <FaCheckCircle className="text-[9px]" />}
                                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                  {item.value || "Upcoming"}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                                  <span>Completion</span>
                                  <span className="font-bold text-slate-800">{item.score || 0}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isCompleted ? "bg-emerald-500" : isCurrent ? "bg-blue-500" : "bg-slate-300"
                                    }`}
                                    style={{ width: `${Math.min(item.score || 0, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                                <span className="text-slate-500 font-medium">Faculty Rating</span>
                                <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px]">
                                  <FaStar className="text-amber-500 text-[10px]" />
                                  {item.remark || "—"} / 5.0
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {section.sectionType === "SubjectPerformanceTable" && (
                    <div className="space-y-3">
                      {/* Read-Only Notice Banner */}
                      <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-emerald-800 text-xs">
                        <FaLock className="shrink-0 text-emerald-600 text-xs sm:text-sm" />
                        <span>
                          <strong>Auto-Calculated from Task Evaluations:</strong> Total tasks, evaluated tasks, average ratings, and performance levels are automatically computed from live student task records and cannot be edited.
                        </span>
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/30">
                        <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-slate-100/70 font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200/80">
                          <div>Subject</div>
                          <div className="text-center">Total Tasks</div>
                          <div className="text-center">Evaluated</div>
                          <div className="text-center">Avg Rating / 5</div>
                          <div className="text-right">Performance Level</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {section.items.map((item, idx) => {
                            const perf = item.value || "Good";
                            return (
                              <div key={idx} className="grid grid-cols-5 gap-4 items-center px-4 py-3 bg-white hover:bg-slate-50/50 transition">
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                  <span>{item.itemName}</span>
                                </div>
                                <div className="text-center font-bold text-sm text-slate-700">
                                  {item.maxMarks || 0}
                                </div>
                                <div className="text-center">
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {item.score || 0}
                                  </span>
                                </div>
                                <div className="text-center">
                                  <span className="inline-flex items-center gap-1 font-bold text-sm text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-lg">
                                    <FaStar className="text-amber-500 text-xs" />
                                    {item.remark || "4.00"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    perf === "Outstanding" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                    perf === "Excellent" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    perf === "Very Good" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    perf === "Good" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}>
                                    {perf}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mobile Responsive Cards */}
                      <div className="block md:hidden space-y-2.5">
                        {section.items.map((item, idx) => {
                          const perf = item.value || "Good";
                          return (
                            <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                  {item.itemName}
                                </span>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                  perf === "Outstanding" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                  perf === "Excellent" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  perf === "Very Good" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  perf === "Good" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>
                                  {perf}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                                <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                  <span className="text-[10px] text-slate-500 block font-medium">Tasks Completed</span>
                                  <span className="font-bold text-slate-800 text-xs">
                                    {item.score || 0} / {item.maxMarks || 0}
                                  </span>
                                </div>
                                <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                                  <span className="text-[10px] text-amber-700 block font-medium">Avg Rating</span>
                                  <span className="font-bold text-amber-800 text-xs flex items-center gap-1">
                                    <FaStar className="text-amber-500 text-[10px]" />
                                    {item.remark || "4.00"} / 5.0
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {section.sectionType === "SoftSkillsRating" && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                        <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                          Customize, rename or add behavioural & soft skill metrics:
                        </span>
                        <button
                          type="button"
                          onClick={() => addDynamicItem(sIdx, { itemName: "New Soft Skill", value: 4.0, maxMarks: 5 })}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/70 px-2.5 py-1 rounded-lg transition cursor-pointer self-start sm:self-auto"
                        >
                          <FaPlus size={10} /> Add Skill Metric
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 hover:border-slate-300 transition gap-2">
                            <input
                              type="text"
                              value={item.itemName || ""}
                              onChange={(e) => setDynamicItemField(sIdx, idx, "itemName", e.target.value)}
                              placeholder="Parameter Name"
                              className="font-semibold text-slate-800 text-xs sm:text-sm bg-white border border-slate-200 focus:border-orange-400 rounded-lg px-2.5 py-1 outline-none transition flex-1 min-w-0"
                              title="Click to rename this metric"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                value={item.value ?? 0}
                                onChange={(e) => setDynamicItemField(sIdx, idx, "value", parseFloat(e.target.value) || 0)}
                                className="w-14 sm:w-16 px-1.5 py-1 border border-slate-300 rounded-lg text-center text-xs sm:text-sm font-bold bg-white text-slate-800"
                              />
                              <span className="text-slate-400 text-xs font-medium">/ 5</span>
                              <button
                                type="button"
                                onClick={() => removeDynamicItem(sIdx, idx)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer ml-1"
                                title="Delete metric"
                              >
                                <MdDelete size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {section.sectionType === "InterviewRating" && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                        <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                          Customize interview parameters according to department (e.g. Domain Knowledge, Problem Solving):
                        </span>
                        <button
                          type="button"
                          onClick={() => addDynamicItem(sIdx, { itemName: "New Evaluation Parameter", value: 4.0, maxMarks: 5 })}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/70 px-2.5 py-1 rounded-lg transition cursor-pointer self-start sm:self-auto"
                        >
                          <FaPlus size={10} /> Add Interview Metric
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 hover:border-slate-300 transition gap-2">
                            <input
                              type="text"
                              value={item.itemName || ""}
                              onChange={(e) => setDynamicItemField(sIdx, idx, "itemName", e.target.value)}
                              placeholder="Parameter Name"
                              className="font-semibold text-slate-800 text-xs sm:text-sm bg-white border border-slate-200 focus:border-orange-400 rounded-lg px-2.5 py-1 outline-none transition flex-1 min-w-0"
                              title="Click to rename this interview parameter"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                value={item.value ?? 0}
                                onChange={(e) => setDynamicItemField(sIdx, idx, "value", parseFloat(e.target.value) || 0)}
                                className="w-14 sm:w-16 px-1.5 py-1 border border-slate-300 rounded-lg text-center text-xs sm:text-sm font-bold bg-white text-slate-800"
                              />
                              <span className="text-slate-400 text-xs font-medium">/ 5</span>
                              <button
                                type="button"
                                onClick={() => removeDynamicItem(sIdx, idx)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer ml-1"
                                title="Delete metric"
                              >
                                <MdDelete size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {section.sectionType === "CareerStatus" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                          <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{item.itemName}</label>
                          <select
                            value={item.value || "Not Ready"}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-700"
                          >
                            <option value="Created">Created</option>
                            <option value="Not created">Not created</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Not Ready">Not Ready</option>
                            <option value="Ready">Ready</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.sectionType === "AttendanceDiscipline" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                          <span className="font-semibold text-slate-700 text-xs sm:text-sm truncate pr-2">{item.itemName}</span>
                          <input
                            type="text"
                            value={item.value || ""}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                            className="w-28 sm:w-32 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-center bg-white"
                            placeholder="e.g. 92% or Good"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {section.sectionType === "StrengthsImprovement" && (
                    <div className="space-y-3 sm:space-y-4">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <label className="text-xs sm:text-sm font-bold text-slate-700">{item.itemName}</label>
                          <textarea
                            rows={3}
                            value={item.value || ""}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                            placeholder={`Enter ${item.itemName} (comma separated or detailed remarks)...`}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {section.sectionType === "OverallPerformanceSummary" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-700 text-xs sm:text-sm truncate pr-2">{item.itemName}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.itemName === "Overall Rating" && (
                                <select
                                  value={item.remark || "Excellent"}
                                  onChange={(e) => setDynamicItemField(sIdx, idx, "remark", e.target.value)}
                                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-700"
                                >
                                  <option value="Outstanding">Outstanding</option>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Very Good">Very Good</option>
                                  <option value="Good">Good</option>
                                  <option value="Average">Average</option>
                                </select>
                              )}
                              {item.itemName !== "Performance Level" ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="5"
                                    value={item.value || 0}
                                    onChange={(e) => setDynamicItemField(sIdx, idx, "value", parseFloat(e.target.value) || 0)}
                                    className="w-16 sm:w-20 px-2 py-1 border border-slate-300 rounded-lg text-center text-xs sm:text-sm font-bold bg-white"
                                  />
                                  <span className="text-slate-400 text-xs">/ 5</span>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={item.value || ""}
                                  onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                                  className="w-28 sm:w-32 px-2 py-1 border border-slate-300 rounded-lg text-center text-xs sm:text-sm font-bold bg-white"
                                  placeholder="e.g. Excellent"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Career Readiness (Legacy fallback) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Career Readiness</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <SimpleDropdown
                      label="Resume Status"
                      value={formData.careerReadiness.resumeStatus}
                      onChange={(value) => setFormData(prev => {
                        const next = deepClone(prev);
                        next.careerReadiness.resumeStatus = value;
                        return next;
                      })}
                      options={[
                        { value: "", label: "Select Status" },
                        { value: "Not created", label: "Not created" },
                        { value: "Need to improve", label: "Need to improve" },
                        { value: "Updated", label: "Updated" }
                      ]}
                    />
                  </div>
                  <div>
                    <SimpleDropdown
                      label="LinkedIn Status"
                      value={formData.careerReadiness.linkedinStatus}
                      onChange={(value) => setFormData(prev => {
                        const next = deepClone(prev);
                        next.careerReadiness.linkedinStatus = value;
                        return next;
                      })}
                      options={[
                        { value: "", label: "Select Status" },
                        { value: "Not created", label: "Not created" },
                        { value: "Need to improve", label: "Need to improve" },
                        { value: "Updated", label: "Updated" }
                      ]}
                    />
                  </div>
                  <div>
                    <SimpleDropdown
                      label="Aptitude Status"
                      value={formData.careerReadiness.aptitudeStatus}
                      onChange={(value) => setFormData(prev => {
                        const next = deepClone(prev);
                        next.careerReadiness.aptitudeStatus = value;
                        return next;
                      })}
                      options={[
                        { value: "", label: "Select Status" },
                        { value: "In-Progress", label: "In-Progress" },
                        { value: "Not Started", label: "Not Started" }
                      ]}
                    />
                  </div>
                  <div>
                    <SimpleDropdown
                      label="Placement Ready"
                      value={formData.careerReadiness.placementReady}
                      onChange={(value) => setFormData(prev => {
                        const next = deepClone(prev);
                        next.careerReadiness.placementReady = value;
                        return next;
                      })}
                      options={[
                        { value: "", label: "Select Status" },
                        { value: "Ready", label: "Ready" },
                        { value: "In-process", label: "In-process" },
                        { value: "Not Ready", label: "Not Ready" }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Co-Curricular Activities (Legacy fallback) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">Co-Curricular Activities</h3>
                  <button
                    type="button"
                    onClick={addCoCurricular}
                    className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition"
                  >
                    + Add Activity
                  </button>
                </div>
                {formData.coCurricular.map((activity, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                      <input
                        type="text"
                        value={activity.category}
                        onChange={(e) => setCoCurricularField(index, 'category', e.target.value)}
                        placeholder="e.g. Workshop"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={activity.title}
                        onChange={(e) => setCoCurricularField(index, 'title', e.target.value)}
                        placeholder="Event / Activity name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Remark</label>
                      <input
                        type="text"
                        value={activity.remark}
                        onChange={(e) => setCoCurricularField(index, 'remark', e.target.value)}
                        placeholder="Participation remarks"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Soft Skills (Legacy fallback) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Soft Skills Evaluation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {formData.softSkills.categories.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 pb-1 border-b border-slate-200/60">{category.title}</h4>
                      <div className="space-y-1.5">
                        {category.subcategories.map((sub, subIndex) => (
                          <label key={subIndex} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={!!sub.value}
                              onChange={(e) => updateSoftSkillSubcategory(categoryIndex, subIndex, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                            />
                            <span className="text-xs text-slate-700">{sub.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <span className="font-semibold text-slate-600">Score:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={category.score}
                            onChange={(e) => {
                              const v = parseInt(e.target.value || 0, 10) || 0;
                              setFormData(prev => {
                                const next = deepClone(prev);
                                next.softSkills.categories[categoryIndex].score = v;
                                return next;
                              });
                            }}
                            className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold bg-white"
                          />
                          <span className="text-slate-400">/ {category.maxMarks}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discipline (Legacy fallback) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Discipline Evaluation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {formData.discipline.categories.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 pb-1 border-b border-slate-200/60">{category.title}</h4>
                      <div className="space-y-1.5">
                        {category.subcategories.map((sub, subIndex) => (
                          <label key={subIndex} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={!!sub.value}
                              onChange={(e) => updateDisciplineSubcategory(categoryIndex, subIndex, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                            />
                            <span className="text-xs text-slate-700">{sub.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <span className="font-semibold text-slate-600">Score:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={category.score}
                            onChange={(e) => {
                              const v = parseInt(e.target.value || 0, 10) || 0;
                              setFormData(prev => {
                                const next = deepClone(prev);
                                next.discipline.categories[categoryIndex].score = v;
                                return next;
                              });
                            }}
                            className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold bg-white"
                          />
                          <span className="text-slate-400">/ {category.maxMarks}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Skills (Legacy fallback) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">Technical Skills</h3>
                  <button
                    type="button"
                    onClick={addTechnicalSkill}
                    className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition"
                  >
                    + Add Skill
                  </button>
                </div>
                {formData.technicalSkills.map((skill, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Skill Name</label>
                      <input
                        type="text"
                        value={skill.skillName}
                        onChange={(e) => setTechnicalSkillField(index, 'skillName', e.target.value)}
                        placeholder="e.g., HTML & CSS"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Theory (Max 10)</label>
                      <input
                        type="number"
                        max="10"
                        value={skill.theoryMarks}
                        onChange={(e) => setTechnicalSkillField(index, 'theoryMarks', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Practical (Max 10)</label>
                      <input
                        type="number"
                        max="10"
                        value={skill.practicalMarks}
                        onChange={(e) => setTechnicalSkillField(index, 'practicalMarks', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Percentage</label>
                      <input
                        type="number"
                        value={skill.totalPercentage}
                        onChange={(e) => setTechnicalSkillField(index, 'totalPercentage', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Remark</label>
                      <input
                        type="text"
                        value={skill.remark}
                        onChange={(e) => setTechnicalSkillField(index, 'remark', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        placeholder="e.g. Good"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Final Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Final Assessment & Remarks</h3>
              <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Evaluation Summary
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Overall Grade <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.overallGrade}
                  onChange={(e) => setFormData(prev => ({ ...prev, overallGrade: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">Select Grade</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Faculty Remark</label>
                <textarea
                  value={formData.facultyRemark}
                  onChange={(e) => setFormData(prev => ({ ...prev, facultyRemark: e.target.value }))}
                  rows={3}
                  placeholder="Enter faculty remarks about student performance..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition text-center"
            >
              Cancel
            </button>

            {/* Show Submit button only when no existing data */}
            {!existingReportData?.data && (
              <button
                type="submit"
                disabled={isCreating}
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold text-xs sm:text-sm disabled:opacity-50 shadow-xs shadow-orange-200 transition text-center"
              >
                {isCreating ? 'Submitting...' : 'Submit Report'}
              </button>
            )}

            {/* Show Update button only when existing data is found */}
            {existingReportData?.data && (
              <button
                type="button"
                onClick={async () => {
                  if (!formData.batchYear.trim()) {
                    toast.error('Please enter batch year');
                    return;
                  }
                  if (!formData.generatedByName.trim()) {
                    toast.error('Please enter faculty name');
                    return;
                  }
                  if (!formData.overallGrade) {
                    toast.error('Please select overall grade');
                    return;
                  }

                  try {
                    const reportData = {
                      studentRef: id,
                      batchYear: formData.batchYear.trim(),
                      generatedByName: formData.generatedByName.trim(),
                      softSkills: {
                        sectionTitle: "Soft Skills Evaluation (50 Marks)",
                        totalSoftSkillMarks: formData.softSkills.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
                        categories: formData.softSkills.categories.map(cat => ({
                          title: cat.title,
                          maxMarks: cat.maxMarks,
                          score: cat.score || 0,
                          subcategories: cat.subcategories
                        }))
                      },
                      discipline: {
                        sectionTitle: "Discipline Evaluation (30 Marks)",
                        totalDisciplineMarks: formData.discipline.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
                        categories: formData.discipline.categories.map(cat => ({
                          title: cat.title,
                          maxMarks: cat.maxMarks,
                          score: cat.score || 0,
                          subcategories: cat.subcategories
                        }))
                      },
                      technicalSkills: formData.technicalSkills
                        .filter(skill => skill.skillName && skill.skillName.trim() !== "" && (skill.theoryMarks > 0 || skill.practicalMarks > 0))
                        .map(skill => ({
                          skillName: skill.skillName.trim(),
                          theoryMarks: skill.theoryMarks || 0,
                          practicalMarks: skill.practicalMarks || 0,
                          totalPercentage: skill.totalPercentage || 0,
                          remark: skill.remark.trim() || "No remarks"
                        })),
                      careerReadiness: formData.careerReadiness,
                      academicPerformance: formData.academicPerformance,
                      coCurricular: formData.coCurricular.filter(item => item.title && item.title.trim() !== "" && item.category && item.category.trim() !== ""),
                      overallGrade: formData.overallGrade,
                      facultyRemark: formData.facultyRemark.trim() || "No specific remarks",
                      isFinalReport: formData.isFinalReport
                    };

                    await updateReportCard({ id: existingReportData.data._id, ...reportData }).unwrap();
                    toast.success('Report card updated successfully!');
                    navigate(`/student/${id}/report`);
                  } catch (error) {
                    console.error('Update Error:', error);
                    toast.error('Failed to update report card');
                  }
                }}
                disabled={isUpdating}
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold text-xs sm:text-sm disabled:opacity-50 shadow-xs shadow-orange-200 transition text-center"
              >
                {isUpdating ? 'Updating...' : 'Update Report'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}