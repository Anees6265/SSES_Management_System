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

  const generateDynamicSections = (templateType, student, tasks) => {
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

    // 1. Level Progress Table
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
          completion = 60;
          ratingStr = "3.90";
        }
        return {
          itemName: lvl, // sublevel name (e.g. "1A")
          value: status, // status (e.g. "Completed")
          score: completion, // completion % (e.g. 100)
          remark: ratingStr, // rating (e.g. "4.10")
          maxMarks: lvl.startsWith("1") ? 1 : 2 // Level index
        };
      })
    };

    // 2. Subject-wise Performance Table
    const subjectItems = [];
    if (tasks?.groupedBySubject) {
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
          value: performance, // performance level
          score: evaluated, // evaluated tasks
          maxMarks: total, // total tasks
          remark: avg.toFixed(2) // avg rating / 5
        });
      });
    }
    if (subjectItems.length === 0) {
      subjectItems.push({ itemName: "Python", value: "Excellent", score: 92, maxMarks: 100, remark: "4.12" });
      subjectItems.push({ itemName: "DSA", value: "Very Good", score: 45, maxMarks: 50, remark: "3.90" });
      subjectItems.push({ itemName: "HTML", value: "Excellent", score: 28, maxMarks: 30, remark: "4.40" });
      subjectItems.push({ itemName: "MySQL", value: "Very Good", score: 22, maxMarks: 25, remark: "3.70" });
    }

    const subjectPerformanceSection = {
      sectionName: "Subject-wise Performance",
      sectionType: "SubjectPerformanceTable",
      items: subjectItems
    };

    // 3. Soft Skills & Behavioural Evaluation
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

    // 4. Interview Evaluation
    const interviewSection = {
      sectionName: "Interview Evaluation",
      sectionType: "InterviewRating",
      items: [
        { itemName: "Technical Knowledge", value: 4.0, maxMarks: 5 },
        { itemName: "Communication", value: 4.0, maxMarks: 5 },
        { itemName: "Confidence", value: 3.0, maxMarks: 5 },
        { itemName: "Problem Solving", value: 4.0, maxMarks: 5 },
        { itemName: "Answer Quality", value: 4.0, maxMarks: 5 },
        { itemName: "Overall Interview Rating", value: 3.8, maxMarks: 5 }
      ]
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

    // 7. Strengths & Areas for Improvement
    const strengthsSection = {
      sectionName: "Strengths & Areas for Improvement",
      sectionType: "StrengthsImprovement",
      items: [
        { itemName: "Strengths", value: "Good programming fundamentals, Consistent task completion, Good communication, Active participation" },
        { itemName: "Areas for Improvement", value: "Advanced problem solving, Interview confidence, Time management" }
      ]
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

  const autoPopulateFromData = (student, tasks, templateType = "ITEG_STANDARD") => {
    if (!student) return {};

    const batchYear = student.sessionId?.name || "";
    const dynamicSections = generateDynamicSections(templateType, student, tasks);

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
    if (studentData?.data && tasksData && !existingReportData?.data) {
      const templateType = studentData.data.subDepartmentId?.departmentId?.reportConfig?.templateType || "ITEG_STANDARD";
      const populated = autoPopulateFromData(studentData.data, tasksData, templateType);
      setFormData(prev => ({
        ...prev,
        ...populated
      }));
    }
  }, [studentData, tasksData, existingReportData]);

  const handleAutoPopulate = () => {
    if (!studentData?.data) {
      toast.error("Student profile data is not loaded yet");
      return;
    }
    const templateType = studentData.data.subDepartmentId?.departmentId?.reportConfig?.templateType || "ITEG_STANDARD";
    const populated = autoPopulateFromData(studentData.data, tasksData, templateType);

    // Preserve existing Level Progress section if it exists in current formData
    const existingLevelProgress = formData.dynamicSections.find(s => s.sectionType === "LevelProgressTable");
    if (existingLevelProgress && populated.dynamicSections) {
      populated.dynamicSections = populated.dynamicSections.map(s => 
        s.sectionType === "LevelProgressTable" ? existingLevelProgress : s
      );
    }

    setFormData(prev => ({
      ...prev,
      ...populated
    }));
    toast.success("Auto-filled from student profile & task record!");
  };

  const setDynamicItemField = (sectionIndex, itemIndex, field, val) => {
    setFormData(prev => {
      const next = deepClone(prev);
      const section = next.dynamicSections[sectionIndex];
      const item = section.items[itemIndex];
      item[field] = val;
      return next;
    });
  };

  // Populate form with existing data when available (safe merge, no stale closure)
  useEffect(() => {
    if (existingReportData?.data) {
      const reportData = existingReportData.data;
      const next = deepClone({
        batchYear: reportData.batchYear || "",
        generatedByName: reportData.generatedByName || loggedInUser?.name || "",
        templateType: reportData.templateType || "ITEG_STANDARD",
        dynamicSections: reportData.dynamicSections || [],
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
  }, [existingReportData, loggedInUser?.name]);

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
    <div className="min-h-screen py-4">
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

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.batchYear}
                onChange={(e) => setFormData(prev => ({ ...prev, batchYear: e.target.value }))}
                placeholder="e.g., 2024-25"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={`Prof. ${formData.generatedByName}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Academic Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Academic Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {formData.academicPerformance.yearWiseSGPA.map((year, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {year.year} SGPA
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={year.sgpa}
                  onChange={(e) => setYearSGPA(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CGPA
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {formData.dynamicSections && formData.dynamicSections.length > 0 ? (
          <div className="space-y-6">
            {formData.dynamicSections.map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 text-orange-600 border-b pb-2">{section.sectionName}</h3>
                
                {section.sectionType === "LevelProgressTable" && (
                  <div className="space-y-4">
                    <div className="hidden md:grid grid-cols-4 gap-4 font-semibold text-gray-700 text-sm mb-2">
                      <div>Sub-Level</div>
                      <div>Status</div>
                      <div>Completion %</div>
                      <div>Average Rating / 5</div>
                    </div>
                    {section.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b border-gray-100 pb-3 last:border-b-0">
                        <div className="font-bold text-gray-800">
                          {item.maxMarks === 1 ? "Level 1" : "Level 2"} - {item.itemName}
                        </div>
                        <div>
                          <select
                            value={item.value || "Upcoming"}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                          >
                            <option value="Completed">Completed</option>
                            <option value="Current">Current</option>
                            <option value="Upcoming">Upcoming</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.score || 0}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "score", parseInt(e.target.value, 10) || 0)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={item.remark || ""}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "remark", e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm text-center"
                            placeholder="e.g. 4.10 or —"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section.sectionType === "SubjectPerformanceTable" && (
                  <div className="space-y-4">
                    <div className="hidden md:grid grid-cols-5 gap-4 font-semibold text-gray-700 text-sm mb-2">
                      <div>Subject</div>
                      <div>Total Tasks</div>
                      <div>Evaluated</div>
                      <div>Avg Rating / 5</div>
                      <div>Performance Level</div>
                    </div>
                    {section.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center border-b border-gray-100 pb-3 last:border-b-0">
                        <div>
                          <input
                            type="text"
                            value={item.itemName || ""}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "itemName", e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={item.maxMarks || 0}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "maxMarks", parseInt(e.target.value, 10) || 0)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={item.score || 0}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "score", parseInt(e.target.value, 10) || 0)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="5"
                            value={item.remark || 0}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "remark", e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                        </div>
                        <div>
                          <select
                            value={item.value || "Good"}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                          >
                            <option value="Outstanding">Outstanding</option>
                            <option value="Excellent">Excellent</option>
                            <option value="Very Good">Very Good</option>
                            <option value="Good">Good</option>
                            <option value="Average">Average</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section.sectionType === "SoftSkillsRating" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="font-medium text-gray-700">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={item.value || 0}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                          />
                          <span className="text-gray-500 text-xs">/ 5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section.sectionType === "InterviewRating" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="font-medium text-gray-700">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={item.value || 0}
                            onChange={(e) => setDynamicItemField(sIdx, idx, "value", parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                          />
                          <span className="text-gray-500 text-xs">/ 5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section.sectionType === "CareerStatus" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500">{item.itemName}</label>
                        <select
                          value={item.value || "Not Ready"}
                          onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="font-medium text-gray-700">{item.itemName}</span>
                        <input
                          type="text"
                          value={item.value || ""}
                          onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                          className="w-32 px-3 py-1 border border-gray-300 rounded text-sm text-center"
                          placeholder="e.g. 92% or Good"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {section.sectionType === "StrengthsImprovement" && (
                  <div className="space-y-4">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700">{item.itemName}</label>
                        <textarea
                          rows={3}
                          value={item.value || ""}
                          onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                          placeholder={`Enter ${item.itemName} (comma separated or comments)...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {section.sectionType === "OverallPerformanceSummary" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="font-medium text-gray-700">{item.itemName}</span>
                          <div className="flex items-center gap-3">
                            {item.itemName === "Overall Rating" && (
                              <select
                                value={item.remark || "Excellent"}
                                onChange={(e) => setDynamicItemField(sIdx, idx, "remark", e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
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
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm font-bold"
                                />
                                <span className="text-gray-500 text-xs">/ 5</span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={item.value || ""}
                                onChange={(e) => setDynamicItemField(sIdx, idx, "value", e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-center text-sm font-bold"
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
            {/* Career Readiness */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Career Readiness</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Co-Curricular Activities */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Co-Curricular Activities</h3>
              {formData.coCurricular.map((activity, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={activity.category}
                      onChange={(e) => setCoCurricularField(index, 'category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={activity.title}
                      onChange={(e) => setCoCurricularField(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remark
                    </label>
                    <input
                      type="text"
                      value={activity.remark}
                      onChange={(e) => setCoCurricularField(index, 'remark', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addCoCurricular}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
              >
                Add More
              </button>
            </div>

            {/* Soft Skills */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Soft Skills Evaluation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {formData.softSkills.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">{category.title}</h4>
                    <div className="space-y-2 mb-3">
                      {category.subcategories.map((sub, subIndex) => (
                        <label key={subIndex} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!sub.value}
                            onChange={(e) => updateSoftSkillSubcategory(categoryIndex, subIndex, e.target.checked)}
                            className="w-5 h-5 rounded border-2 border-gray-300 checked:bg-black checked:border-black focus:ring-2 focus:ring-black appearance-none relative checked:after:content-['✓'] checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-1"
                          />
                          <span className="text-sm text-gray-700">{sub.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Score:</span>
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
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">/ {category.maxMarks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discipline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Discipline Evaluation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {formData.discipline.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">{category.title}</h4>
                    <div className="space-y-2 mb-3">
                      {category.subcategories.map((sub, subIndex) => (
                        <label key={subIndex} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!sub.value}
                            onChange={(e) => updateDisciplineSubcategory(categoryIndex, subIndex, e.target.checked)}
                            className="w-5 h-5 rounded border-2 border-gray-300 checked:bg-black checked:border-black focus:ring-2 focus:ring-black appearance-none relative checked:after:content-['✓'] checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-1"
                          />
                          <span className="text-sm text-gray-700">{sub.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Score:</span>
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
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">/ {category.maxMarks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Skills */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Technical Skills</h3>
              {formData.technicalSkills.map((skill, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
                    <input
                      type="text"
                      value={skill.skillName}
                      onChange={(e) => setTechnicalSkillField(index, 'skillName', e.target.value)}
                      placeholder="e.g., HTML & CSS"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theory Marks (out of 10)</label>
                    <input
                      type="number"
                      max="10"
                      value={skill.theoryMarks}
                      onChange={(e) => setTechnicalSkillField(index, 'theoryMarks', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Practical Marks (out of 10)</label>
                    <input
                      type="number"
                      max="10"
                      value={skill.practicalMarks}
                      onChange={(e) => setTechnicalSkillField(index, 'practicalMarks', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label>
                    <input
                      type="number"
                      value={skill.totalPercentage}
                      onChange={(e) => setTechnicalSkillField(index, 'totalPercentage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                    <input
                      type="text"
                      value={skill.remark}
                      onChange={(e) => setTechnicalSkillField(index, 'remark', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addTechnicalSkill}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
              >
                Add More
              </button>
            </div>
          </>
        )}

        {/* Final Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Final Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Grade <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.overallGrade}
                onChange={(e) => setFormData(prev => ({ ...prev, overallGrade: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Remark</label>
              <textarea
                value={formData.facultyRemark}
                onChange={(e) => setFormData(prev => ({ ...prev, facultyRemark: e.target.value }))}
                rows={3}
                placeholder="Enter faculty remarks about student performance..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          {/* Show Submit button only when no existing data */}
          {!existingReportData?.data && (
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
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
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Report'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}



// import { useState, useRef, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useGetAdmittedStudentsByIdQuery, useCreateReportCardMutation, useGetReportCardForEditQuery, useUpdateReportCardMutation } from "../../../redux/api/authApi";
// import { HiArrowNarrowLeft } from "react-icons/hi";
// import Loader from "../../shared/loader/Loader";
// import { toast } from "react-toastify";

// const SimpleDropdown = ({ label, value, onChange, options }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [isFocused, setIsFocused] = useState(false);
//   const dropdownRef = useRef(null);

//   const hasValue = value !== "";
//   const selectedOption = options.find(opt => opt.value === value);

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setIsOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <div className="relative w-full" ref={dropdownRef}>
//       <button
//         type="button"
//         onClick={() => setIsOpen(!isOpen)}
//         onFocus={() => setIsFocused(true)}
//         onBlur={() => setIsFocused(false)}
//         className={`
//           peer h-12 w-full border border-gray-300 rounded-md
//           px-3 py-2 leading-tight bg-white text-left
//           focus:outline-none focus:border-black 
//           focus:ring-0 appearance-none flex items-center justify-between
//           cursor-pointer
//           ${isOpen ? "border-black" : ""}
//           transition-all duration-200
//         `}
//       >
//         <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
//           {selectedOption ? selectedOption.label : 'Select'}
//         </span>
//         <span className={`ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
//           ▼
//         </span>
//       </button>

//       <label
//         className={`
//           absolute left-3 bg-white px-1 transition-all duration-200
//           pointer-events-none
//           ${isFocused || hasValue || isOpen
//             ? "text-xs -top-2 text-black"
//             : "text-gray-500 top-3"}
//         `}
//       >
//         {label}
//       </label>

//       {isOpen && (
//         <div className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-lg z-50 overflow-hidden border bg-white">
//           {options.map((option) => (
//             <div
//               key={option.value}
//               onClick={() => {
//                 onChange(option.value);
//                 setIsOpen(false);
//               }}
//               className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-left transition-colors duration-150"
//             >
//               {option.label}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };


// export default function StudentReportForm() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const { data: studentData, isLoading, isError } = useGetAdmittedStudentsByIdQuery(id);
//   const { data: existingReportData, isLoading: reportLoading, error: reportError } = useGetReportCardForEditQuery(id);
//   const [createReportCard, { isLoading: isCreating, error: mutationError }] = useCreateReportCardMutation();
//   const [updateReportCard, { isLoading: isUpdating }] = useUpdateReportCardMutation();
//   const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');

//   console.log('🔍 StudentReportForm - Student ID:', id);
//   console.log('📄 Report loading:', reportLoading);
//   console.log('📄 Report error:', reportError);
//   console.log('📄 Report data:', existingReportData);

//   const [formData, setFormData] = useState({
//     batchYear: "",
//     generatedByName: loggedInUser?.name || "",
//     softSkills: {
//       sectionTitle: "Soft Skills Evaluation (50 Marks)",
//       totalSoftSkillMarks: 0,
//       categories: [
//         {
//           title: "Presentation Skills",
//           maxMarks: 10,
//           score: 0,
//           subcategories: [
//             { name: "Content & Structure", value: false },
//             { name: "Confidence & Clarity", value: false },
//             { name: "Body Language", value: false },
//             { name: "Engagement with Audience", value: false },
//             { name: "Voice Modulation", value: false }
//           ]
//         },
//         {
//           title: "Team Collaboration",
//           maxMarks: 10,
//           score: 0,
//           subcategories: [
//             { name: "Active Participation", value: false },
//             { name: "Cooperation", value: false },
//             { name: "Leadership", value: false },
//             { name: "Task Contribution", value: false },
//             { name: "Conflict Resolution", value: false }
//           ]
//         },
//         {
//           title: "Time Management",
//           maxMarks: 10,
//           score: 0,
//           subcategories: [
//             { name: "Punctuality", value: false },
//             { name: "Deadline Handling", value: false },
//             { name: "Task Prioritization", value: false },
//             { name: "Consistency", value: false },
//             { name: "Efficiency", value: false }
//           ]
//         }
//       ]
//     },
//     discipline: {
//       sectionTitle: "Discipline Evaluation (30 Marks)",
//       totalDisciplineMarks: 0,
//       categories: [
//         {
//           title: "Attendance",
//           maxMarks: 10,
//           score: 0,
//           subcategories: [
//             { name: "Regular Attendance", value: false },
//             { name: "Leaves with Permission", value: false },
//             { name: "Class Participation", value: false },
//             { name: "Punctual Entry", value: false },
//             { name: "Active Listening", value: false }
//           ]
//         },
//         {
//           title: "Behaviour",
//           maxMarks: 10,
//           score: 0,
//           subcategories: [
//             { name: "Politeness", value: false },
//             { name: "Respect for Faculty", value: false },
//             { name: "Team Behaviour", value: false },
//             { name: "Classroom Conduct", value: false },
//             { name: "Responsibility", value: false }
//           ]
//         },
//         {
//           title: "Professionalism",
//           maxMarks: 10,
//           score: 0,
//           subcategories: [
//             { name: "Dress Code", value: false },
//             { name: "Communication Etiquette", value: false },
//             { name: "Task Ownership", value: false },
//             { name: "Timely Submission", value: false },
//             { name: "Accountability", value: false }
//           ]
//         }
//       ]
//     },
//     technicalSkills: [
//       {
//         skillName: "",
//         theoryMarks: 0,
//         practicalMarks: 0,
//         totalPercentage: 0,
//         remark: ""
//       }
//     ],
//     careerReadiness: {
//       resumeStatus: "",
//       linkedinStatus: "",
//       aptitudeStatus: "",
//       placementReady: ""
//     },
//     academicPerformance: {
//       yearWiseSGPA: [
//         { year: "FY", sgpa: 0 },
//         { year: "SY", sgpa: 0 },
//         { year: "TY", sgpa: 0 }
//       ],
//       cgpa: 0
//     },
//     coCurricular: [
//       {
//         category: "",
//         title: "",
//         remark: ""
//       }
//     ],
//     overallGrade: "",
//     facultyRemark: "",
//     isFinalReport: false
//   });

//   // Populate form with existing data when available
//   useEffect(() => {
//     console.log('🔍 useEffect triggered - existingReportData:', existingReportData);
//     if (existingReportData?.data) {
//       const reportData = existingReportData.data;
//       console.log('📄 Populating form with existing data:', reportData);

//       setFormData({
//         batchYear: reportData.batchYear || "",
//         generatedByName: reportData.generatedByName || loggedInUser?.name || "",

//         // Soft Skills - preserve existing structure and data
//         softSkills: {
//           sectionTitle: reportData.softSkills?.sectionTitle || "Soft Skills Evaluation (50 Marks)",
//           totalSoftSkillMarks: reportData.softSkills?.totalSoftSkillMarks || 0,
//           categories: reportData.softSkills?.categories?.length > 0
//             ? reportData.softSkills.categories
//             : formData.softSkills.categories // fallback to default structure
//         },

//         // Discipline - preserve existing structure and data
//         discipline: {
//           sectionTitle: reportData.discipline?.sectionTitle || "Discipline Evaluation (30 Marks)",
//           totalDisciplineMarks: reportData.discipline?.totalDisciplineMarks || 0,
//           categories: reportData.discipline?.categories?.length > 0
//             ? reportData.discipline.categories
//             : formData.discipline.categories // fallback to default structure
//         },

//         // Technical Skills - ensure at least one empty entry for adding more
//         technicalSkills: reportData.technicalSkills?.length > 0
//           ? [...reportData.technicalSkills, { skillName: "", theoryMarks: 0, practicalMarks: 0, totalPercentage: 0, remark: "" }]
//           : [{ skillName: "", theoryMarks: 0, practicalMarks: 0, totalPercentage: 0, remark: "" }],

//         // Career Readiness
//         careerReadiness: {
//           resumeStatus: reportData.careerReadiness?.resumeStatus || "",
//           linkedinStatus: reportData.careerReadiness?.linkedinStatus || "",
//           aptitudeStatus: reportData.careerReadiness?.aptitudeStatus || "",
//           placementReady: reportData.careerReadiness?.placementReady || ""
//         },

//         // Academic Performance
//         academicPerformance: {
//           yearWiseSGPA: reportData.academicPerformance?.yearWiseSGPA?.length > 0
//             ? reportData.academicPerformance.yearWiseSGPA
//             : [{ year: "FY", sgpa: 0 }, { year: "SY", sgpa: 0 }, { year: "TY", sgpa: 0 }],
//           cgpa: reportData.academicPerformance?.cgpa || 0
//         },

//         // Co-Curricular Activities - ensure at least one empty entry for adding more
//         coCurricular: reportData.coCurricular?.length > 0
//           ? [...reportData.coCurricular, { category: "", title: "", remark: "" }]
//           : [{ category: "", title: "", remark: "" }],

//         // Final Assessment
//         overallGrade: reportData.overallGrade || "",
//         facultyRemark: reportData.facultyRemark || "",
//         isFinalReport: reportData.isFinalReport || false
//       });
//     } else {
//       console.log('⚠️ No existing report data found');
//     }
//   }, [existingReportData, loggedInUser?.name]);
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!formData.batchYear.trim()) {
//       toast.error('Please enter batch year');
//       return;
//     }
//     if (!formData.generatedByName.trim()) {
//       toast.error('Please enter faculty name');
//       return;
//     }
//     if (!formData.overallGrade) {
//       toast.error('Please select overall grade');
//       return;
//     }

//     try {
//       const reportData = {
//         studentRef: id,
//         batchYear: formData.batchYear.trim(),
//         generatedByName: formData.generatedByName.trim(),
//         softSkills: {
//           sectionTitle: "Soft Skills Evaluation (50 Marks)",
//           totalSoftSkillMarks: formData.softSkills.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
//           categories: formData.softSkills.categories.map(cat => ({
//             title: cat.title,
//             maxMarks: cat.maxMarks,
//             score: cat.score || 0,
//             subcategories: cat.subcategories
//           }))
//         },
//         discipline: {
//           sectionTitle: "Discipline Evaluation (30 Marks)",
//           totalDisciplineMarks: formData.discipline.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
//           categories: formData.discipline.categories.map(cat => ({
//             title: cat.title,
//             maxMarks: cat.maxMarks,
//             score: cat.score || 0,
//             subcategories: cat.subcategories
//           }))
//         },
//         technicalSkills: formData.technicalSkills
//           .filter(skill => skill.skillName && skill.skillName.trim() !== "" && (skill.theoryMarks > 0 || skill.practicalMarks > 0))
//           .map(skill => ({
//             skillName: skill.skillName.trim(),
//             theoryMarks: skill.theoryMarks || 0,
//             practicalMarks: skill.practicalMarks || 0,
//             totalPercentage: skill.totalPercentage || 0,
//             remark: skill.remark.trim() || "No remarks"
//           })),
//         careerReadiness: formData.careerReadiness,
//         academicPerformance: formData.academicPerformance,
//         coCurricular: formData.coCurricular.filter(item => item.title && item.title.trim() !== "" && item.category && item.category.trim() !== ""),
//         overallGrade: formData.overallGrade,
//         facultyRemark: formData.facultyRemark.trim() || "No specific remarks",
//         isFinalReport: formData.isFinalReport
//       };

//       console.log('Sending report data to API:', JSON.stringify(reportData, null, 2));
//       const result = await createReportCard(reportData).unwrap();
//       console.log('Report card created successfully:', result);

//       toast.success(existingReportData?.data ? 'Report card updated successfully!' : 'Report card created successfully!');
//       navigate(`/student/${id}/report`);
//     } catch (error) {
//       console.error('Submit Error:', error);

//       let errorMsg = 'Failed to create report card';
//       if (error.status === 400) {
//         errorMsg = 'Invalid data format. Please check all fields.';
//       } else if (error.status === 500) {
//         errorMsg = 'Server error. Please try again later.';
//       } else if (error.data?.message) {
//         errorMsg = error.data.message;
//       }

//       toast.error(errorMsg);
//     }
//   };

//   const updateSoftSkillSubcategory = (categoryIndex, subcategoryIndex, value) => {
//     const newFormData = { ...formData };
//     newFormData.softSkills.categories[categoryIndex].subcategories[subcategoryIndex].value = value;
//     setFormData(newFormData);
//   };

//   const updateDisciplineSubcategory = (categoryIndex, subcategoryIndex, value) => {
//     const newFormData = { ...formData };
//     newFormData.discipline.categories[categoryIndex].subcategories[subcategoryIndex].value = value;
//     setFormData(newFormData);
//   };

//   if (isLoading || reportLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-white">
//         <Loader />
//       </div>
//     );
//   }

//   if (isError || !studentData) {
//     return <div className="p-4 text-red-500">Error loading student data.</div>;
//   }

//   return (
//     <div className="min-h-screen py-4">
//       {/* Header */}
//       <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
//         <button
//           onClick={() => window.history.back()}
//           className="group flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
//         >
//           <HiArrowNarrowLeft className="text-base sm:text-lg group-hover:-translate-x-1 transition-transform" />
//           <span className="text-xs sm:text-sm font-medium">Back</span>
//         </button>
//         <div className="h-6 sm:h-8 w-px bg-gray-300 hidden sm:block"></div>
//         <div className="flex-1 sm:flex-none">
//           <h1 className="text-lg sm:text-2xl font-bold text-black">
//             {existingReportData?.data ? 'Edit Student Report' : 'Create Student Report'}
//           </h1>
//           <p className="text-gray-600">
//             {existingReportData?.data ? 'Edit' : 'Create'} performance report for {studentData.firstName} {studentData.lastName}
//           </p>
//         </div>
//       </div>


//       <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
//         {/* Basic Info */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Batch Year <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={formData.batchYear}
//                 onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
//                 placeholder="e.g., 2024-25"
//                 required
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Generated By <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={formData.generatedByName}
//                 onChange={(e) => setFormData({ ...formData, generatedByName: e.target.value })}
//                 placeholder="Enter faculty name"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Academic Performance */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Academic Performance</h3>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             {formData.academicPerformance.yearWiseSGPA.map((year, index) => (
//               <div key={index}>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   {year.year} SGPA
//                 </label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   value={year.sgpa}
//                   onChange={(e) => {
//                     const newFormData = { ...formData };
//                     newFormData.academicPerformance.yearWiseSGPA[index].sgpa = parseFloat(e.target.value) || 0;

//                     // Auto-calculate CGPA
//                     const totalSGPA = newFormData.academicPerformance.yearWiseSGPA.reduce((sum, year) => sum + year.sgpa, 0);
//                     const validSGPAs = newFormData.academicPerformance.yearWiseSGPA.filter(year => year.sgpa > 0).length;
//                     newFormData.academicPerformance.cgpa = validSGPAs > 0 ? parseFloat((totalSGPA / validSGPAs).toFixed(2)) : 0;

//                     setFormData(newFormData);
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//             ))}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 CGPA
//               </label>
//               <input
//                 type="number"
//                 step="0.01"
//                 value={formData.academicPerformance.cgpa}
//                 onChange={(e) => {
//                   const newFormData = { ...formData };
//                   newFormData.academicPerformance.cgpa = parseFloat(e.target.value) || 0;
//                   setFormData(newFormData);
//                 }}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Career Readiness */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Career Readiness</h3>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <SimpleDropdown
//                 label="Resume Status"
//                 value={formData.careerReadiness.resumeStatus}
//                 onChange={(value) => {
//                   const newFormData = { ...formData };
//                   newFormData.careerReadiness.resumeStatus = value;
//                   setFormData(newFormData);
//                 }}
//                 options={[
//                   { value: "", label: "Select Status" },
//                   { value: "Not created", label: "Not created" },
//                   { value: "Need to improve", label: "Need to improve" },
//                   { value: "Updated", label: "Updated" }
//                 ]}
//               />
//             </div>
//             <div>
//               <SimpleDropdown
//                 label="LinkedIn Status"
//                 value={formData.careerReadiness.linkedinStatus}
//                 onChange={(value) => {
//                   const newFormData = { ...formData };
//                   newFormData.careerReadiness.linkedinStatus = value;
//                   setFormData(newFormData);
//                 }}
//                 options={[
//                   { value: "", label: "Select Status" },
//                   { value: "Not created", label: "Not created" },
//                   { value: "Need to improve", label: "Need to improve" },
//                   { value: "Updated", label: "Updated" }
//                 ]}
//               />
//             </div>
//             <div>
//               <SimpleDropdown
//                 label="Aptitude Status"
//                 value={formData.careerReadiness.aptitudeStatus}
//                 onChange={(value) => {
//                   const newFormData = { ...formData };
//                   newFormData.careerReadiness.aptitudeStatus = value;
//                   setFormData(newFormData);
//                 }}
//                 options={[
//                   { value: "", label: "Select Status" },
//                   { value: "In-Progress", label: "In-Progress" },
//                   { value: "Not Started", label: "Not Started" }
//                 ]}
//               />
//             </div>
//             <div>
//               <SimpleDropdown
//                 label="Placement Ready"
//                 value={formData.careerReadiness.placementReady}
//                 onChange={(value) => {
//                   const newFormData = { ...formData };
//                   newFormData.careerReadiness.placementReady = value;
//                   setFormData(newFormData);
//                 }}
//                 options={[
//                   { value: "", label: "Select Status" },
//                   { value: "Ready", label: "Ready" },
//                   { value: "In-process", label: "In-process" },
//                   { value: "Not Ready", label: "Not Ready" }
//                 ]}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Co-Curricular Activities */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Co-Curricular Activities</h3>
//           {formData.coCurricular.map((activity, index) => (
//             <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Category
//                 </label>
//                 <input
//                   type="text"
//                   value={activity.category}
//                   onChange={(e) => {
//                     const newFormData = { ...formData };
//                     newFormData.coCurricular[index].category = e.target.value;
//                     setFormData(newFormData);
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title
//                 </label>
//                 <input
//                   type="text"
//                   value={activity.title}
//                   onChange={(e) => {
//                     const newFormData = { ...formData };
//                     newFormData.coCurricular[index].title = e.target.value;
//                     setFormData(newFormData);
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Remark
//                 </label>
//                 <input
//                   type="text"
//                   value={activity.remark}
//                   onChange={(e) => {
//                     const newFormData = { ...formData };
//                     newFormData.coCurricular[index].remark = e.target.value;
//                     setFormData(newFormData);
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//             </div>
//           ))}
//           <button
//             type="button"
//             onClick={() => {
//               const newFormData = { ...formData };
//               newFormData.coCurricular.push({ category: "", title: "", remark: "" });
//               setFormData(newFormData);
//             }}
//             className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
//           >
//             Add More
//           </button>
//         </div>

//         {/* Soft Skills */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Soft Skills Evaluation</h3>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {formData.softSkills.categories.map((category, categoryIndex) => (
//               <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
//                 <h4 className="text-lg font-bold text-gray-800 mb-3">{category.title}</h4>
//                 <div className="space-y-2 mb-3">
//                   {category.subcategories.map((sub, subIndex) => (
//                     <label key={subIndex} className="flex items-center gap-3 cursor-pointer">
//                       <input
//                         type="checkbox"
//                         checked={sub.value}
//                         onChange={(e) => {
//                           updateSoftSkillSubcategory(categoryIndex, subIndex, e.target.checked);
//                           // Auto-calculate score (2 points per checkbox)
//                           const newFormData = { ...formData };
//                           const checkedCount = newFormData.softSkills.categories[categoryIndex].subcategories.filter(s => s.value).length;
//                           newFormData.softSkills.categories[categoryIndex].score = checkedCount * 2;
//                           setFormData(newFormData);
//                         }}
//                         className="w-5 h-5 rounded border-2 border-gray-300 checked:bg-black checked:border-black focus:ring-2 focus:ring-black appearance-none relative checked:after:content-['✓'] checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-1"
//                       />
//                       <span className="text-sm text-gray-700">{sub.name}</span>
//                     </label>
//                   ))}
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm text-gray-600">Score:</span>
//                   <input
//                     type="number"
//                     value={category.score}
//                     onChange={(e) => {
//                       const newFormData = { ...formData };
//                       newFormData.softSkills.categories[categoryIndex].score = parseInt(e.target.value) || 0;
//                       setFormData(newFormData);
//                     }}
//                     className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500"
//                   />
//                   <span className="text-sm text-gray-600">/ {category.maxMarks}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Discipline */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Discipline Evaluation</h3>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {formData.discipline.categories.map((category, categoryIndex) => (
//               <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
//                 <h4 className="text-lg font-bold text-gray-800 mb-3">{category.title}</h4>
//                 <div className="space-y-2 mb-3">
//                   {category.subcategories.map((sub, subIndex) => (
//                     <label key={subIndex} className="flex items-center gap-3 cursor-pointer">
//                       <input
//                         type="checkbox"
//                         checked={sub.value}
//                         onChange={(e) => {
//                           updateDisciplineSubcategory(categoryIndex, subIndex, e.target.checked);
//                           // Auto-calculate score (2 points per checkbox)
//                           const newFormData = { ...formData };
//                           const checkedCount = newFormData.discipline.categories[categoryIndex].subcategories.filter(s => s.value).length;
//                           newFormData.discipline.categories[categoryIndex].score = checkedCount * 2;
//                           setFormData(newFormData);
//                         }}
//                         className="w-5 h-5 rounded border-2 border-gray-300 checked:bg-black checked:border-black focus:ring-2 focus:ring-black appearance-none relative checked:after:content-['✓'] checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-1"
//                       />
//                       <span className="text-sm text-gray-700">{sub.name}</span>
//                     </label>
//                   ))}
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm text-gray-600">Score:</span>
//                   <input
//                     type="number"
//                     value={category.score}
//                     onChange={(e) => {
//                       const newFormData = { ...formData };
//                       newFormData.discipline.categories[categoryIndex].score = parseInt(e.target.value) || 0;
//                       setFormData(newFormData);
//                     }}
//                     className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500"
//                   />
//                   <span className="text-sm text-gray-600">/ {category.maxMarks}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Technical Skills */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Technical Skills</h3>
//           {formData.technicalSkills.map((skill, index) => (
//             <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
//                 <input
//                   type="text"
//                   value={skill.skillName}
//                   onChange={(e) => {
//                     const newSkills = [...formData.technicalSkills];
//                     newSkills[index].skillName = e.target.value;
//                     setFormData({ ...formData, technicalSkills: newSkills });
//                   }}
//                   placeholder="e.g., HTML & CSS"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Theory Marks (out of 10)</label>
//                 <input
//                   type="number"
//                   max="10"
//                   value={skill.theoryMarks}
//                   onChange={(e) => {
//                     const newSkills = [...formData.technicalSkills];
//                     const theoryMarks = Math.min(parseInt(e.target.value) || 0, 10);
//                     newSkills[index].theoryMarks = theoryMarks;

//                     // Calculate percentage and remark
//                     const totalMarks = theoryMarks + newSkills[index].practicalMarks;
//                     const percentage = Math.round((totalMarks / 20) * 100);
//                     newSkills[index].totalPercentage = percentage;

//                     // Auto-generate remark
//                     if (percentage >= 90) newSkills[index].remark = "Excellent";
//                     else if (percentage >= 80) newSkills[index].remark = "Very Good";
//                     else if (percentage >= 70) newSkills[index].remark = "Good";
//                     else if (percentage >= 60) newSkills[index].remark = "Average";
//                     else if (percentage >= 50) newSkills[index].remark = "Below Average";
//                     else newSkills[index].remark = "Poor";

//                     setFormData({ ...formData, technicalSkills: newSkills });
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Practical Marks (out of 10)</label>
//                 <input
//                   type="number"
//                   max="10"
//                   value={skill.practicalMarks}
//                   onChange={(e) => {
//                     const newSkills = [...formData.technicalSkills];
//                     const practicalMarks = Math.min(parseInt(e.target.value) || 0, 10);
//                     newSkills[index].practicalMarks = practicalMarks;

//                     // Calculate percentage and remark
//                     const totalMarks = newSkills[index].theoryMarks + practicalMarks;
//                     const percentage = Math.round((totalMarks / 20) * 100);
//                     newSkills[index].totalPercentage = percentage;

//                     // Auto-generate remark
//                     if (percentage >= 90) newSkills[index].remark = "Excellent";
//                     else if (percentage >= 80) newSkills[index].remark = "Very Good";
//                     else if (percentage >= 70) newSkills[index].remark = "Good";
//                     else if (percentage >= 60) newSkills[index].remark = "Average";
//                     else if (percentage >= 50) newSkills[index].remark = "Below Average";
//                     else newSkills[index].remark = "Poor";

//                     setFormData({ ...formData, technicalSkills: newSkills });
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label>
//                 <input
//                   type="number"
//                   value={skill.totalPercentage}
//                   onChange={(e) => {
//                     const newSkills = [...formData.technicalSkills];
//                     newSkills[index].totalPercentage = parseInt(e.target.value) || 0;
//                     setFormData({ ...formData, technicalSkills: newSkills });
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
//                 <input
//                   type="text"
//                   value={skill.remark}
//                   onChange={(e) => {
//                     const newSkills = [...formData.technicalSkills];
//                     newSkills[index].remark = e.target.value;
//                     setFormData({ ...formData, technicalSkills: newSkills });
//                   }}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//                 />
//               </div>
//             </div>
//           ))}
//           <button
//             type="button"
//             onClick={() => {
//               const newFormData = { ...formData };
//               newFormData.technicalSkills.push({ skillName: "", theoryMarks: 0, practicalMarks: 0, totalPercentage: 0, remark: "" });
//               setFormData(newFormData);
//             }}
//             className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
//           >
//             Add More
//           </button>
//         </div>

//         {/* Final Section */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold mb-4">Final Assessment</h3>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Overall Grade <span className="text-red-500">*</span>
//               </label>
//               <select
//                 value={formData.overallGrade}
//                 onChange={(e) => setFormData({ ...formData, overallGrade: e.target.value })}
//                 required
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//               >
//                 <option value="">Select Grade</option>
//                 <option value="A+">A+</option>
//                 <option value="A">A</option>
//                 <option value="B+">B+</option>
//                 <option value="B">B</option>
//                 <option value="C">C</option>
//               </select>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Remark</label>
//               <textarea
//                 value={formData.facultyRemark}
//                 onChange={(e) => setFormData({ ...formData, facultyRemark: e.target.value })}
//                 rows={3}
//                 placeholder="Enter faculty remarks about student performance..."
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Submit Buttons */}
//         <div className="flex justify-end gap-4">
//           <button
//             type="button"
//             onClick={() => navigate(-1)}
//             className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
//           >
//             Cancel
//           </button>
          
//           <button
//             type="submit"
//             disabled={isCreating}
//             className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
//           >
//             {isCreating ? 'Submitting...' : 'Submit Report'}
//           </button>
          
//           {existingReportData?.data && (
//             <button
//               type="button"
//               onClick={async () => {
//                 if (!formData.batchYear.trim()) {
//                   toast.error('Please enter batch year');
//                   return;
//                 }
//                 if (!formData.generatedByName.trim()) {
//                   toast.error('Please enter faculty name');
//                   return;
//                 }
//                 if (!formData.overallGrade) {
//                   toast.error('Please select overall grade');
//                   return;
//                 }

//                 try {
//                   const reportData = {
//                     studentRef: id,
//                     batchYear: formData.batchYear.trim(),
//                     generatedByName: formData.generatedByName.trim(),
//                     softSkills: {
//                       sectionTitle: "Soft Skills Evaluation (50 Marks)",
//                       totalSoftSkillMarks: formData.softSkills.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
//                       categories: formData.softSkills.categories.map(cat => ({
//                         title: cat.title,
//                         maxMarks: cat.maxMarks,
//                         score: cat.score || 0,
//                         subcategories: cat.subcategories
//                       }))
//                     },
//                     discipline: {
//                       sectionTitle: "Discipline Evaluation (30 Marks)",
//                       totalDisciplineMarks: formData.discipline.categories.reduce((sum, cat) => sum + (cat.score || 0), 0),
//                       categories: formData.discipline.categories.map(cat => ({
//                         title: cat.title,
//                         maxMarks: cat.maxMarks,
//                         score: cat.score || 0,
//                         subcategories: cat.subcategories
//                       }))
//                     },
//                     technicalSkills: formData.technicalSkills
//                       .filter(skill => skill.skillName && skill.skillName.trim() !== "" && (skill.theoryMarks > 0 || skill.practicalMarks > 0))
//                       .map(skill => ({
//                         skillName: skill.skillName.trim(),
//                         theoryMarks: skill.theoryMarks || 0,
//                         practicalMarks: skill.practicalMarks || 0,
//                         totalPercentage: skill.totalPercentage || 0,
//                         remark: skill.remark.trim() || "No remarks"
//                       })),
//                     careerReadiness: formData.careerReadiness,
//                     academicPerformance: formData.academicPerformance,
//                     coCurricular: formData.coCurricular.filter(item => item.title && item.title.trim() !== "" && item.category && item.category.trim() !== ""),
//                     overallGrade: formData.overallGrade,
//                     facultyRemark: formData.facultyRemark.trim() || "No specific remarks",
//                     isFinalReport: formData.isFinalReport
//                   };

//                   await updateReportCard({ id: existingReportData.data._id, ...reportData }).unwrap();
//                   toast.success('Report card updated successfully!');
//                   navigate(`/student/${id}/report`);
//                 } catch (error) {
//                   console.error('Update Error:', error);
//                   toast.error('Failed to update report card');
//                 }
//               }}
//               disabled={isUpdating}
//               className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
//             >
//               {isUpdating ? 'Updating...' : 'Update Report'}
//             </button>
//           )}
//         </div>
//       </form>
//     </div>
//   );
// }