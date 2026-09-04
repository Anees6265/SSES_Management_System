const request = require('supertest');
const app = require('../server'); // your Express app
const mongoose = require('mongoose');
const User = require('../src/models/user/user');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Department = require('../src/models/department/Department');
const jwt = require('jsonwebtoken');

let user;
let authToken;

beforeEach(async () => {
  let dept = await Department.findOne({ name: 'IT' });
  if (!dept) {
    dept = await Department.create({
      name: 'IT',
      universityName: 'IT University',
      code: 'IT-001',
      reportConfig: {
        templateType: "ITEG_STANDARD"
      },
      isActive: true
    });
  }

  user = await User.create({
    name: 'Test User',
    email: `testuser${Date.now()}@example.com`,
    mobileNo: '9876543210', 
    password: 'hashedpassword',
    adharCard: `${Math.floor(Math.random() * 1000000000000)}`,
    department: 'IT',
    departmentId: dept._id,
    position: 'Developer',
    role: 'admin',
    isActive: true,
  });

  authToken = jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || "default_secret"
  );
});
  
 
beforeAll(async () => {
    // assume in-memory DB configured in setup.js
  });


  // After all tests, disconnect
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // After each test, clear users
  afterEach(async () => {
    await User.deleteMany({});
    await Department.deleteMany({});
  });
  describe('User API - Create User', () => {

    const validPayload = {
      name: "John Doe",
      email: "john.doe@ssism.org",
      mobileNo: "9876543210",
      password: "Password123",
      adharCard: "123456789012",
      department: "IT",
      position: "Lecturer",
      role: "faculty",
      isActive: true,
      updatedAt: new Date(),
      createdAt: new Date()
    };
  
    it('should create a new user successfully', async () => {
      const res = await request(app)
        .post('/api/user/signup')
        .send(validPayload);
  
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/Faculty created successfully!/i);
      expect(res.body.user).toHaveProperty('email', validPayload.email.toLowerCase());
    });
  
    it('should fail if required fields are missing', async () => {
      const { name, ...incomplete } = validPayload;
      const res = await request(app)
        .post('/api/user/signup')
        .send(incomplete);
  
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("All fields are required");
    });
  
    it('should reject non-ssism.org email', async () => {
      const badEmailPayload = { ...validPayload, email: "john@gmail.com" };
      const res = await request(app)
        .post('/api/user/signup')
        .send(badEmailPayload);
  
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/institutional emails/i);
    });
  
    it('should reject duplicate email or Aadhar', async () => {
      await request(app).post('/api/user/signup').send(validPayload);
  
      const res = await request(app)
        .post('/api/user/signup')
        .send(validPayload); // duplicate
  
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });
  
    it('should reject invalid roles', async () => {
      const res = await request(app)
        .post('/api/user/signup')
        .send({ ...validPayload, role: "student" });
  
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Invalid role/i);
    });
  
  });

  

    describe('User API - Login User', () => {

      // describe('POST /users/login', () => {
        const validUser = {
          name: 'John Doe',
          email: 'john.doe@ssism.org',
          password: 'TestPass123',
          mobileNo: '9876543210',
          adharCard: '123456789012',
          department: 'IT',
          position: 'Lecturer',
          role: 'faculty',
          isActive: true,
        };
      
        beforeEach(async () => {
          const hashedPassword = await bcrypt.hash(validUser.password, 10);
          await User.create({ ...validUser, password: hashedPassword });
        });
      
        it('should login successfully with valid credentials', async () => {
          const res = await request(app)
            .post('/api/user/login')
            .send({ email: validUser.email, password: validUser.password });
      
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('message', 'Login successful');
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(validUser.email.toLowerCase());
        });
      
        it('should fail with missing email or password', async () => {
          const res = await request(app)
            .post('/api/user/login')
            .send({ email: validUser.email });
      
          expect(res.statusCode).toBe(400);
          expect(res.body.message).toBe('Email and password are required');
        });
      
        it('should reject non-ssism.org email', async () => {
          const res = await request(app)
            .post('/api/user/login')
            .send({ email: 'john@gmail.com', password: 'anything' });
      
          expect(res.statusCode).toBe(403);
          expect(res.body.message).toMatch(/institutional emails/i);
        });
      
        it('should fail with incorrect email', async () => {
          const res = await request(app)
            .post('/api/user/login')
            .send({ email: 'wrong@ssism.org', password: validUser.password });
      
          expect(res.statusCode).toBe(401);
          expect(res.body.message).toBe('Invalid email or password');
        });
      
        it('should fail with incorrect password', async () => {
          const res = await request(app)
            .post('/api/user/login')
            .send({ email: validUser.email, password: 'WrongPass' });
      
          expect(res.statusCode).toBe(401);
          expect(res.body.message).toBe('Invalid email or password');
        });
      });
  
// // Update

describe('User API - Udate User', () => {
it('1 should update the user\'s position successfully', async () => {
  const res = await request(app)
    .patch(`/api/user/update/${user._id}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ position: 'Senior Developer' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.user.position).toBe('Senior Developer');
});

it('2 should update multiple fields successfully', async () => {
  const res = await request(app)
    .patch(`/api/user/update/${user._id}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      position: 'Team Lead',
      department: 'Engineering',
      role: 'faculty',
      isActive: false,
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.user.position).toBe('Team Lead');
  expect(res.body.user.department).toBe('Engineering');
  expect(res.body.user.role).toBe('faculty');
  expect(res.body.user.isActive).toBe(false);
});
  

it('3 should return 404 if ID is invalid', async () => {
  const invalidId = '12345';

  const res = await request(app)
    .patch(`/api/user/update/${invalidId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ position: 'Senior Developer' });

  expect(res.statusCode).toBe(404);
  expect(res.body.message).toBe('User not found');
});


it('4 should return 404 if user does not exist', async () => {
  const validNonExistentId = new mongoose.Types.ObjectId();

  const res = await request(app)
    .patch(`/api/user/update/${validNonExistentId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ position: 'Senior Developer' });

  expect(res.statusCode).toBe(404);
  expect(res.body.message).toBe('User not found');
});

it('5 should return 200 even if no fields are updated (optional behavior)', async () => {
  const res = await request(app)
    .patch(`/api/user/update/${user._id}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({});

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe('User updated successfully');
});

});
