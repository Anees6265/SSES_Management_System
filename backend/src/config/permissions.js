const allPermissions = {
    // Super Admin has all permissions and serves as the master list
    superadmin: [
        // User Management Feature
        { feature: 'Page_UserManagement', description: 'Access to the User Management page', access: ['read'] },
        { feature: 'Tab_Users', description: 'Access to the Users tab', access: ['read'] },
        { feature: 'Tab_RolesAndPermissions', description: 'Access to the Roles & Permissions tab', access: ['read'] },
        { feature: 'Button_CreateUser', description: 'Visibility of the Create New User button', access: ['read'] },
        { feature: 'Action_CreateUser', description: 'Ability to submit the new user form', access: ['execute'] },
        { feature: 'Action_EditUser', description: 'Ability to edit a user', access: ['read', 'update'] },
        { feature: 'Action_DeleteUser', description: 'Ability to delete a user', access: ['execute'] },

        // Role & Permission Management
        { feature: 'Page_RoleManagement', description: 'Access to view role cards', access: ['read'] },
        { feature: 'Button_CreateRole', description: 'Visibility of the Create New Role card', access: ['read'] },
        { feature: 'Action_CreateRole', description: 'Ability to submit the new role form', access: ['execute'] },
        { feature: 'Button_ManagePermissions', description: 'Access to the user list for a role', access: ['read'] },
        { feature: 'Page_GlobalPermissionMatrix', description: 'Access to the permission matrix for a user', access: ['read', 'update'] },

        // Syllabus Feature
        { feature: 'Page_Syllabus', description: 'Access to the Syllabus page', access: ['create', 'read', 'update', 'delete'] },

        // Level Management
        { feature: 'Page_Level', description: 'Access to the Level management page', access: ['create', 'read', 'update', 'delete'] },

        // Sub-Level Management
        { feature: 'Page_SubLevel', description: 'Access to the Sub-Level management page', access: ['create', 'read', 'update', 'delete'] },

        // Admission
        { feature: 'Page_Admission', description: 'Access to the Admission section', access: ['read'] },

        // Admitted Students
        { feature: 'Page_AdmittedStudents', description: 'Access to the Admitted Students section', access: ['read'] },

        // Placement
        { feature: 'Page_Placement', description: 'Access to the Placement section', access: ['read'] },

        // Department Management
        { feature: 'Page_Department', description: 'Access to the Department management page', access: ['read', 'create', 'update', 'delete'] },

        // Sub-Department Management
        { feature: 'Page_SubDepartment', description: 'Access to the Sub-Department management page', access: ['read', 'create', 'update', 'delete'] },

        // Dashboard
        { feature: 'Page_Dashboard', description: 'Access to the main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },

        // Admitted Students Extras
        { feature: 'Page_LevelWiseManagement', description: 'Access to level-wise management', access: ['read'] },
        { feature: 'Page_DummyStudents', description: 'Access to dummy students section', access: ['read'] },
        { feature: 'Page_LeaveRequests', description: 'Access to student leave requests', access: ['read', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Access to the Task Management page', access: ['read', 'create', 'update', 'delete'] },
        { feature: 'Page_CurriculumManagement', description: 'Access to the Curriculum Management page', access: ['read', 'create', 'update', 'delete'] },

        // Placements Extras
        { feature: 'Page_CompanyDetails', description: 'Access to company details', access: ['read'] },
        { feature: 'Page_PlacedStudents', description: 'Access to placed students list', access: ['read'] },

        // Settings
        { feature: 'Page_Settings', description: 'Access to the main Settings menu', access: ['read'] },
        { feature: 'Page_SessionManagement', description: 'Access to the Session Management page', access: ['read', 'update'] },
        { feature: 'Page_Support', description: 'Access to the Support page', access: ['read'] }
    ],

    // Admin has a subset of permissions
    admin: [
        // Dashboard Access
        { feature: 'Page_Dashboard', description: 'Access to the main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },

        // Admission Process
        { feature: 'Page_Admission', description: 'Access to the Admission section', access: ['read'] },

        // Student Management
        { feature: 'Page_AdmittedStudents', description: 'Access to the Admitted Students section', access: ['read'] },
        { feature: 'Page_LevelWiseManagement', description: 'Access to level-wise management', access: ['read'] },
        { feature: 'Page_LeaveRequests', description: 'Access to student leave requests', access: ['read', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Access to the Task Management page', access: ['read', 'update'] },
        { feature: 'Page_CurriculumManagement', description: 'Access to the Curriculum Management page', access: ['read', 'update'] },

        // Placement
        { feature: 'Page_Placement', description: 'Access to the Placement section', access: ['read'] },
        { feature: 'Page_CompanyDetails', description: 'Access to company details', access: ['read'] },
        { feature: 'Page_PlacedStudents', description: 'Access to placed students list', access: ['read'] },

        // Academic Management
        { feature: 'Page_Syllabus', description: 'Access to the Syllabus page', access: ['read', 'update'] },
        { feature: 'Page_Level', description: 'Access to the Level management page', access: ['read'] },
        { feature: 'Page_SubLevel', description: 'Access to the Sub-Level management page', access: ['read'] },
        { feature: 'Page_SessionManagement', description: 'Access to the Session Management page', access: ['read', 'update'] },
        { feature: 'Page_Support', description: 'Access to the Support page', access: ['read'] }
    ],

    // Faculty has limited permissions
    faculty: [
        // Dashboard Access
        { feature: 'Page_Dashboard', description: 'Access to the main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },

        // Student Management (Read Only)
        { feature: 'Page_AdmittedStudents', description: 'Access to the Admitted Students section', access: ['read'] },
        { feature: 'Page_LeaveRequests', description: 'Access to student leave requests', access: ['read', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Access to the Task Management page', access: ['read'] },
        { feature: 'Page_CurriculumManagement', description: 'Access to the Curriculum Management page', access: ['read'] },

        // Academic Content
        { feature: 'Page_Syllabus', description: 'Access to the Syllabus page', access: ['read'] },
        { feature: 'Page_Support', description: 'Access to the Support page', access: ['read'] }
    ],

    hod: [
        { feature: 'Page_Dashboard', description: 'Access to the main dashboard', access: ['read'] },
        { feature: 'Page_AttendanceDetails', description: 'Access to attendance details', access: ['read'] },
        { feature: 'Page_AdmittedStudents', description: 'Access to the Admitted Students section', access: ['read'] },
        { feature: 'Page_LeaveRequests', description: 'Access to student leave requests', access: ['read', 'update'] },
        { feature: 'Page_TaskManagement', description: 'Access to the Task Management page', access: ['read', 'update'] },
        { feature: 'Page_CurriculumManagement', description: 'Access to the Curriculum Management page', access: ['read', 'update'] },
        { feature: 'Page_Syllabus', description: 'Access to the Syllabus page', access: ['read'] },
        { feature: 'Page_Placement', description: 'Access to the Placement section', access: ['read'] },
        { feature: 'Page_CompanyDetails', description: 'Access to company details', access: ['read'] },
        { feature: 'Page_PlacedStudents', description: 'Access to placed students list', access: ['read'] },
        { feature: 'Page_SubDepartment', description: 'Access to the Sub-Department management page', access: ['read'] },
        { feature: 'Page_Level', description: 'Access to the Level management page', access: ['read'] },
        { feature: 'Page_SubLevel', description: 'Access to the Sub-Level management page', access: ['read'] },
        { feature: 'Page_SessionManagement', description: 'Access to the Session Management page', access: ['read', 'update'] },
        { feature: 'Page_Support', description: 'Access to the Support page', access: ['read'] },
    ]
};

const getPermissionsForRole = (role) => {
    return allPermissions[role] || [];
};

module.exports = {
    getPermissionsForRole,
    allPermissions
};
