const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../server"); // Import the app to test the routes
const AdmissionProcess = require("../modules/student/models/admissionProcessStudent");

const axios = require("axios");
jest.mock("axios");

const { sendEmail } = require("../modules/student/controllers/emailController");
jest.mock("../modules/student/controllers/emailController", () => ({
  sendEmail: jest.fn(), // mock sendEmail as a Jest function
}));


let studentId;

// for addAdmission Api
describe("Admission API Tests", () => {
  

  it("1. should create a new admission with valid data", async () => {
    const payload = {
      prkey: "test1",
      firstName: "A",
      lastName: "B",
      fatherName: "C",
      studentMobile: "1234567890",
      parentMobile: "0987654321",
      gender: "Male",
      dob: "2000-01-01",
      aadharCard: "123456789012",
      address: "Addr",
      village:"village",
      track:"track",
      stream: "Sci",
      course: "Course",
      category: "Gen",
      subject12: "Sub",
      year12: "2020",
    };
    const res = await request(app)
      .post("/api/admission/students/webhook/register")
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Student admission initiated");
    expect(res.body.data).toHaveProperty("_id");
  });

  it("2. should fail when a required field is missing", async () => {
    const payload = { prkey: "test2" }; // missing others
    const res = await request(app)
      .post("/api/admission/students/webhook/register")
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/^Missing field:/);
  });

  it("3. should fail on invalid dob format", async () => {
    const payload = {
      prkey: "test3",
      firstName: "A",
      lastName: "B",
      fatherName: "C",
      studentMobile: "1234567890",
      parentMobile: "0987654321",
      gender: "Male",
      dob: "invalid-date",
      aadharCard: "123456789012",
      address: "Addr",
      village:"village",
      track:"track",
      stream: "Sci",
      course: "Course",
      category: "Gen",
      subject12: "Sub",
      year12: "2020",
    };
    const res = await request(app)
      .post("/api/admission/students/webhook/register")
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid date format");
  });

  it("4. should fail on invalid mobile or aadhar format", async () => {
    const payload = {
      prkey: "test4",
      firstName: "A",
      lastName: "B",
      fatherName: "C",
      studentMobile: "12345",
      parentMobile: "0987654321",
      gender: "Male",
      dob: "2000-01-01",
      aadharCard: "invalid",
      address: "Addr",
      village:"village",
      track:"track",
      stream: "Sci",
      course: "Course",
      category: "Gen",
      subject12: "Sub",
      year12: "2020",
    };
    const res = await request(app)
      .post("/api/admission/students/webhook/register")
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid mobile number format");
  });

  it("5. should detect duplicate prkey and return 200", async () => {
    const payload = {
      prkey: "test5",
      firstName: "A",
      lastName: "B",
      fatherName: "C",
      studentMobile: "1234567890",
      parentMobile: "0987654321",
      gender: "Male",
      dob: "2000-01-01",
      aadharCard: "123456789012",
      address: "Addr",
      village:"village",
      track:"track",
      stream: "Sci",
      course: "Course",
      category: "Gen",
      subject12: "Sub",
      year12: "2020",
    };
    // first request
    await request(app).post("/api/admission/students/webhook/register").send(payload);
    // duplicate request
    const res = await request(app)
      .post("/api/admission/students/webhook/register")
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Student already registered");
  });
});



//for updateAdmissionFlag Api
describe("Admission API Tests - Interview Flag", () => {
  
 let student;
  
  beforeAll(async () => {
    student = await AdmissionProcess.create({
      prkey: "test-flag",
      firstName: "Test",
      lastName: "Student",
      fatherName: "Father",
      studentMobile: "1234567890",
      parentMobile: "0987654321",
      gender: "Male",
      dob: "2000-01-01",
      aadharCard: "123456789012",
      address: "Test Address",
      village:"village",
      track:"track",
      stream: "Sci",
      course: "Course",
      category: "Gen",
      subject12: "Sub",
      year12: "2020",
      email: "student@example.com",
    });
  });

  it("1. should successfully update interview flag and send to central",
     async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
    sendEmail.mockResolvedValue();
    
    const res = await request(app)
      .put(`/api/admission/students/update_interview_flag/${student._id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "Interview flag updated and sent to central"
    );
    expect(res.body.centralResponse).toEqual({ success: true });

    const updated = await AdmissionProcess.findById(student._id);
    expect(updated.itegInterviewFlag).toBe(true);
  });

  it("2. should return 404 if student not found", async () => {
  
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(
      `/api/admission/students/update_interview_flag/${fakeId}`
    );

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Student not found");
  });
  
// tried to solve it but due to anonymous function in axios.post, it is not working

  it("3. should send email if email exists", async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
   
    // Spy on the same module you mocked at top
    const emailCtrl = require("../modules/student/controllers/emailController");
    const sendEmailMock = jest
      .spyOn(emailCtrl, "sendEmail")
      .mockResolvedValue();

    await request(app)
      .put(`/api/admission/students/update_interview_flag/${student._id}`);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "student@example.com",
        subject: expect.any(String),
        text: expect.any(String),
      })
    );

    sendEmailMock.mockRestore();
  });

  it("4. should not fail if email is missing", async () => {
    // create a student without email
   const studentWithoutEmail = await AdmissionProcess.create({
      prkey: "test-no-email",
      firstName: "Test",
      lastName: "Student",
      fatherName: "Father",
      studentMobile: "1234567890",
      parentMobile: "0987654321",         
      gender: "Male",
      dob: "2000-01-01",
      aadharCard: "123456789012",
      address: "Test Address",
      village:"village",
      track:"track",
      stream: "Sci",
      course: "Course",
      category: "Gen",
      subject12: "Sub",
      year12: "2020"});
    axios.post.mockResolvedValue({ data: { success: true } });

    const emailCtrl = require("../modules/student/controllers/emailController");
    const sendEmailMock = jest
      .spyOn(emailCtrl, "sendEmail")
      .mockResolvedValue();

    const res = await request(app).put(
      `/api/admission/students/update_interview_flag/${studentWithoutEmail._id}`
    );

    expect(res.status).toBe(200);
    expect(sendEmailMock).not.toHaveBeenCalled();

    sendEmailMock.mockRestore();
  });

  it("5. should handle error if axios.post fails", async () => {
    // Arrange
    const fakeId = new mongoose.Types.ObjectId();
    const student1 = {
      _id: fakeId,
      prkey: "test-prkey",
      firstName: "Ali",
      email: "ali@example.com",
      itegInterviewFlag: true
    };
  
    // Mock the DB update
    jest.spyOn(AdmissionProcess, 'findByIdAndUpdate').mockResolvedValue(student1);
  
    // Mock axios error
    axios.post.mockRejectedValue(new Error("Axios Error"));
  
    // Mock email send
    sendEmail.mockResolvedValue();
  
    // Act
    const res = await request(app)
      .put(`/api/admission/students/update_interview_flag/${fakeId}`);
  
    // Assert
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Server error");
    expect(res.body.error).toMatch("Axios Error");
  });

})


describe("Admission API Tests get student by id", () => {


  // it('should return interviews for a valid student ID', async () => {
  //   const res = await request(app).get(`/api/admission/students/get_interviews/${studentId}`);

  //   expect(res.statusCode).toBe(200);
  //   expect(res.body.success).toBe(true);
  //   expect(Array.isArray(res.body.interviews)).toBe(true);
  //   expect(res.body.interviews.length).toBeGreaterThan(0);
  //   expect(res.body.interviews[0]).toHaveProperty('round', 'First');
  // });

  it('should return 404 for invalid student ID', async () => {
    const res = await request(app).get(`/api/admission/students/get_interviews/invalidId123`);

    expect(res.statusCode).toBe(500); // If not a valid ObjectId
  });

  it('should return 404 if student not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/admission/students/get_interviews/${nonExistentId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Student not found');
  });

})



