const express = require('express');
const router = express.Router();

// Import all route modules
const userRoutes = require('./userRoutes');
const studentRoutes = require('./studentRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const otpRoutes = require('./otpRoutes');
const faceAuthRoutes = require('./faceAuthRoutes');
const reportCardRoutes = require('./reportCardRoutes');
const protectedRoutes = require('./protectedRoutes');
const roleRoutes = require('./roleRoutes');
const syllabusRoutes = require('./syllabusRoutes');
const sessionRoutes  = require('./sessionRoutes');
const sessionSyllabusRoutes = require('./sessionSyllabusRoutes');
const superAdminDashboardRoutes = require('./superAdminDashboardRoutes');
const deptPlacementRoutes = require('./deptPlacementRoutes');
const placementDriveRoutes = require('./placementDriveRoutes');
const companyRoutes = require('./companyRoutes');
const taskRoutes = require('./taskRoutes');
const studentAuthRoutes = require('./studentAuthRoutes');
const studentThesisRoutes = require('./studentThesisRoutes');

// Mount routes
router.use('/user', userRoutes);
router.use('/user/otp', otpRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/students', studentRoutes);
router.use('/admitted/students', studentRoutes);
router.use('/face-auth', faceAuthRoutes);
router.use('/reportcards', reportCardRoutes);
router.use('/protected', protectedRoutes);
router.use('/roles', roleRoutes);
router.use('/syllabus/versions', syllabusRoutes);
router.use('/sessions', sessionRoutes);
router.use('/session-syllabus', sessionSyllabusRoutes);
router.use('/superadmin/dashboard', superAdminDashboardRoutes);
router.use('/placements/department', deptPlacementRoutes);
router.use('/placements/drives', placementDriveRoutes);
router.use('/companies', companyRoutes);
router.use('/tasks', taskRoutes);
router.use('/student-auth', studentAuthRoutes);
router.use('/thesis', studentThesisRoutes);

module.exports = router;