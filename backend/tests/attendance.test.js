const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('Attendance Statistics API', () => {
  let authToken;

  beforeAll(async () => {
    authToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), role: "superadmin" },
      process.env.JWT_SECRET || "default_secret"
    );
  });

  describe('GET /api/students/attendance/stats', () => {
    it('should return attendance statistics with default pagination', async () => {
      const response = await request(app)
        .get('/api/students/attendance/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('students');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('statistics');
    });

    it('should filter by gender', async () => {
      const response = await request(app)
        .get('/api/students/attendance/stats?gender=male')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/students/attendance/stats?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.currentPage).toBe(1);
    });
  });
});