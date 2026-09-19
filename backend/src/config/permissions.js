const allPermissions = {
    // Super Admin has all permissions and serves as the master list
    superadmin: [
        // 1. Dashboard & Attendance
        { feature: 'Page_Dashboard', name: 'Dashboard (Overview & Analytics)', category: '1. Dashboard & Attendance', description: 'Access to the main analytics dashboard and summary metrics', access: ['read'] },
        { feature: 'Page_AttendanceDetails', name: 'Attendance Details', category: '1. Dashboard & Attendance', description: 'Access to view student & faculty attendance details', access: ['read'] },

        // 2. Departments & Academics
        { feature: 'Page_Department', name: 'Department Management', category: '2. Departments & Academics', description: 'Manage departments, courses, and department configurations', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_SubDepartment', name: 'Subdepartments & Branches', category: '2. Departments & Academics', description: 'Manage sub-departments and specialized academic streams', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_Level', name: 'Academic Levels', category: '2. Departments & Academics', description: 'Manage academic training levels (Level 1, Level 2, etc.)', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_SubLevel', name: 'Academic Sub-Levels & Criteria', category: '2. Departments & Academics', description: 'Manage academic sub-levels (1A, 1B, etc.) and sublevel criteria', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_CurriculumManagement', name: 'Curriculum & Syllabus Management', category: '2. Departments & Academics', description: 'Manage department curriculum and syllabus versions', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_TaskManagement', name: 'Task Management', category: '2. Departments & Academics', description: 'Create, assign, edit, and evaluate academic tasks', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_StudentTaskBoard', name: 'Student Task Board', category: '2. Departments & Academics', description: 'Interactive board for tracking student task progression', access: ['create', 'read', 'update', 'delete'] },

        // 3. Students & Progress
        { feature: 'Page_AdmittedStudents', name: 'Student Progress (Admitted Students)', category: '3. Students & Progress', description: 'Access to enrolled students directory and progress table', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_StudentProfile', name: 'Student Profile View', category: '3. Students & Progress', description: 'View complete student profile, personal, and fee details', access: ['read', 'update'] },
        { feature: 'Page_StudentEdit', name: 'Student Profile Edit', category: '3. Students & Progress', description: 'Modify student registration, demographics, and contact info', access: ['read', 'update'] },
        { feature: 'Page_StudentReport', name: 'Student Report Card (Preview & PDF)', category: '3. Students & Progress', description: 'Preview and download official printable student report cards', access: ['read'] },
        { feature: 'Page_StudentReportEdit', name: 'Student Report Card Marks Edit', category: '3. Students & Progress', description: 'Enter test marks, levels, and faculty remarks on report cards', access: ['read', 'update'] },
        { feature: 'Page_LeaveRequests', name: 'Leave Requests & Approvals', category: '3. Students & Progress', description: 'Review and approve/reject student leave applications', access: ['read', 'update'] },
        { feature: 'Page_DummyStudents', name: 'Dummy Students & Portal Permissions', category: '3. Students & Progress', description: 'Manage dummy students and student portal login access', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_StudentLevelInterviewHistory', name: 'Student Level Interview History', category: '3. Students & Progress', description: 'Review student evaluation and promotion interview history', access: ['read', 'update'] },

        // 4. Placements & Career
        { feature: 'Page_PlacementDashboard', name: 'Placement Analytics Dashboard', category: '4. Placements & Career', description: 'Access to placement analytics and statistics dashboard', access: ['read'] },
        { feature: 'Page_Placement', name: 'Placement Candidates & Readiness', category: '4. Placements & Career', description: 'Track placement candidates readiness and mock interviews', access: ['read', 'update'] },
        { feature: 'Page_PlacementDrives', name: 'Placement Drives & Schedules', category: '4. Placements & Career', description: 'Schedule and manage campus placement drives', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_ResumeSharing', name: 'Resume Sharing & Candidate Profiles', category: '4. Placements & Career', description: 'Access resume sharing portal for recruiters', access: ['read', 'execute'] },
        { feature: 'Page_CompanyDetails', name: 'Company Details & Recruiters', category: '4. Placements & Career', description: 'Manage recruiting company profiles and contacts', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_PlacedStudents', name: 'Placed Students Wall & Posters', category: '4. Placements & Career', description: 'Create and publish placed students success posters', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_PlacementRecords', name: 'Placement Interview Records', category: '4. Placements & Career', description: 'View company interview records and selection history', access: ['read'] },

        // 5. User Management & Security
        { feature: 'Page_UserManagement', name: 'User Management Portal', category: '5. User Management & Security', description: 'Access to user and staff management portal', access: ['read'] },
        { feature: 'Tab_Users', name: 'Users Directory Tab', category: '5. User Management & Security', description: 'View users and staff directory tab', access: ['read'] },
        { feature: 'Tab_RolesAndPermissions', name: 'Roles & Permissions Tab', category: '5. User Management & Security', description: 'View roles and permission configurations tab', access: ['read'] },
        { feature: 'Button_CreateUser', name: 'Create User Action', category: '5. User Management & Security', description: 'Ability to open form and register new employee accounts', access: ['read', 'execute'] },
        { feature: 'Action_EditUser', name: 'Edit User Action', category: '5. User Management & Security', description: 'Permission to edit user profile and account status', access: ['update'] },
        { feature: 'Action_DeleteUser', name: 'Delete User Action', category: '5. User Management & Security', description: 'Permission to permanently remove user accounts', access: ['execute'] },
        { feature: 'Button_ManagePermissions', name: 'Manage User Permissions Action', category: '5. User Management & Security', description: 'Permission to customize permissions for individual users', access: ['read', 'update'] },

        // 6. System Administration
        { feature: 'Page_Settings', name: 'System Settings & Branding', category: '6. System Administration', description: 'Access to system settings and college profile configuration', access: ['read', 'update'] },
        { feature: 'Page_SessionManagement', name: 'Academic Session Management', category: '6. System Administration', description: 'Manage academic session years and periods', access: ['create', 'read', 'update', 'delete'] },
        { feature: 'Page_Support', name: 'Support & Help Desk', category: '6. System Administration', description: 'Access to support tickets and help desk', access: ['read'] }
    ],

    // Admin has a comprehensive administrative subset
    admin: [
        { feature: 'Page_Dashboard', description: 'Access to main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },
        { feature: 'Page_Department', description: 'Department management', access: ['read', 'create', 'update'] },
        { feature: 'Page_SubDepartment', description: 'Sub-department management', access: ['read', 'create', 'update'] },
        { feature: 'Page_Level', description: 'Level management', access: ['read', 'create', 'update'] },
        { feature: 'Page_SubLevel', description: 'Sub-level management', access: ['read', 'create', 'update'] },
        { feature: 'Page_CurriculumManagement', description: 'Curriculum management', access: ['read', 'create', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Task management', access: ['read', 'create', 'update'] },
        { feature: 'Page_StudentTaskBoard', description: 'Student task board', access: ['read', 'update'] },
        { feature: 'Page_AdmittedStudents', description: 'Student progress list', access: ['read', 'create', 'update'] },
        { feature: 'Page_StudentProfile', description: 'Student profile view', access: ['read', 'update'] },
        { feature: 'Page_StudentEdit', description: 'Edit student details', access: ['read', 'update'] },
        { feature: 'Page_StudentReport', description: 'Student report card preview', access: ['read'] },
        { feature: 'Page_StudentReportEdit', description: 'Student report card marks edit', access: ['read', 'update'] },
        { feature: 'Page_LeaveRequests', description: 'Student leave requests', access: ['read', 'update'] },
        { feature: 'Page_DummyStudents', description: 'Dummy students access', access: ['read', 'create', 'update'] },
        { feature: 'Page_StudentLevelInterviewHistory', description: 'Level interview history', access: ['read', 'update'] },
        { feature: 'Page_PlacementDashboard', description: 'Placement dashboard', access: ['read'] },
        { feature: 'Page_Placement', description: 'Placement readiness status', access: ['read', 'update'] },
        { feature: 'Page_PlacementDrives', description: 'Placement drives', access: ['read', 'create', 'update'] },
        { feature: 'Page_ResumeSharing', description: 'Resume sharing', access: ['read', 'execute'] },
        { feature: 'Page_CompanyDetails', description: 'Company details', access: ['read', 'create', 'update'] },
        { feature: 'Page_PlacedStudents', description: 'Placed students wall', access: ['read', 'create', 'update'] },
        { feature: 'Page_PlacementRecords', description: 'Placement interview records', access: ['read'] },
        { feature: 'Page_UserManagement', description: 'User management', access: ['read'] },
        { feature: 'Tab_Users', description: 'Users tab', access: ['read'] },
        { feature: 'Button_CreateUser', description: 'Create user button', access: ['read', 'execute'] },
        { feature: 'Action_EditUser', description: 'Edit user details', access: ['update'] },
        { feature: 'Page_Settings', description: 'System settings', access: ['read', 'update'] },
        { feature: 'Page_SessionManagement', description: 'Session management', access: ['read', 'update'] },
        { feature: 'Page_Support', description: 'Support help desk', access: ['read'] }
    ],

    // Faculty has student and academic management permissions
    faculty: [
        { feature: 'Page_Dashboard', description: 'Access to main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },
        { feature: 'Page_AdmittedStudents', description: 'Student progress list', access: ['read'] },
        { feature: 'Page_StudentProfile', description: 'Student profile view', access: ['read'] },
        { feature: 'Page_StudentReport', description: 'Student report card preview', access: ['read'] },
        { feature: 'Page_StudentReportEdit', description: 'Student report card marks edit', access: ['read', 'update'] },
        { feature: 'Page_StudentTaskBoard', description: 'Student task board tracking', access: ['read', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Task evaluation', access: ['read'] },
        { feature: 'Page_CurriculumManagement', description: 'Curriculum viewing', access: ['read'] },
        { feature: 'Page_LeaveRequests', description: 'Student leave requests', access: ['read', 'update'] },
        { feature: 'Page_StudentLevelInterviewHistory', description: 'Level interview history', access: ['read'] },
        { feature: 'Page_Support', description: 'Support help desk', access: ['read'] }
    ],

    // HOD has full department oversight
    hod: [
        { feature: 'Page_Dashboard', description: 'Access to main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },
        { feature: 'Page_Department', description: 'Department view', access: ['read'] },
        { feature: 'Page_SubDepartment', description: 'Sub-department management', access: ['read', 'update'] },
        { feature: 'Page_Level', description: 'Level management', access: ['read', 'update'] },
        { feature: 'Page_SubLevel', description: 'Sub-level management', access: ['read', 'update'] },
        { feature: 'Page_CurriculumManagement', description: 'Curriculum management', access: ['read', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Task management', access: ['read', 'create', 'update'] },
        { feature: 'Page_StudentTaskBoard', description: 'Student task board', access: ['read', 'update'] },
        { feature: 'Page_AdmittedStudents', description: 'Student progress list', access: ['read', 'create', 'update'] },
        { feature: 'Page_StudentProfile', description: 'Student profile view', access: ['read', 'update'] },
        { feature: 'Page_StudentEdit', description: 'Edit student details', access: ['read', 'update'] },
        { feature: 'Page_StudentReport', description: 'Student report card preview', access: ['read'] },
        { feature: 'Page_StudentReportEdit', description: 'Student report card marks edit', access: ['read', 'update'] },
        { feature: 'Page_LeaveRequests', description: 'Student leave requests', access: ['read', 'update'] },
        { feature: 'Page_StudentLevelInterviewHistory', description: 'Level interview history', access: ['read', 'update'] },
        { feature: 'Page_PlacementDashboard', description: 'Placement dashboard', access: ['read'] },
        { feature: 'Page_Placement', description: 'Placement readiness status', access: ['read', 'update'] },
        { feature: 'Page_CompanyDetails', description: 'Company details', access: ['read'] },
        { feature: 'Page_PlacedStudents', description: 'Placed students wall', access: ['read'] },
        { feature: 'Page_SessionManagement', description: 'Session management', access: ['read', 'update'] },
        { feature: 'Page_Support', description: 'Support help desk', access: ['read'] }
    ],

    // Placement Officer has placement and recruiter access
    placement_officer: [
        { feature: 'Page_Dashboard', description: 'Access to main dashboard', access: ['read'] },
        { feature: 'Page_PlacementDashboard', description: 'Placement dashboard analytics', access: ['read'] },
        { feature: 'Page_Placement', description: 'Placement candidates readiness', access: ['read', 'update'] },
        { feature: 'Page_PlacementDrives', description: 'Placement drives management', access: ['read', 'create', 'update', 'delete'] },
        { feature: 'Page_ResumeSharing', description: 'Resume sharing portal', access: ['read', 'execute'] },
        { feature: 'Page_CompanyDetails', description: 'Visiting company profiles', access: ['read', 'create', 'update', 'delete'] },
        { feature: 'Page_PlacedStudents', description: 'Placed students wall and posters', access: ['read', 'create', 'update', 'delete'] },
        { feature: 'Page_PlacementRecords', description: 'Company interview records', access: ['read'] },
        { feature: 'Page_AdmittedStudents', description: 'View student progress', access: ['read'] },
        { feature: 'Page_StudentProfile', description: 'View student profiles', access: ['read'] },
        { feature: 'Page_Support', description: 'Support help desk', access: ['read'] }
    ]
};

const getPermissionsForRole = (role) => {
    return allPermissions[role] || [];
};

module.exports = {
    getPermissionsForRole,
    allPermissions
};
