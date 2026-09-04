const otpController = require('../src/controllers/user/otpController');
const User = require('../src/models/user/user');
const { generateOTP, sendEmailOtp } = require('../src/services/emailService');
const jwt = require('jsonwebtoken');

// Mock external modules and functions
jest.mock('../src/models/user/user');
jest.mock('../src/services/emailService');
jest.mock('jsonwebtoken');

// ✅ Custom mockRequest and mockResponse functions
const mockRequest = (body = {}) => ({ body });
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mongoose = require('mongoose');

beforeEach(async () => {
  jest.clearAllMocks();
  try {
    const OtpModel = mongoose.model('Otp');
    await OtpModel.deleteMany({});
  } catch (_) {}
});

describe('OTP Controller', () => {

  describe('sendOtpToEmail', () => {
    it('should return 400 if email is not provided', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await otpController.sendOtpToEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email is required' });
    });

    it('should return 404 if user is not found', async () => {
      const req = mockRequest({ email: 'test@ssism.org' });
      const res = mockResponse();

      User.findOne.mockResolvedValue(null);

      await otpController.sendOtpToEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 429 if OTP request limit is exceeded', async () => {
      const email = 'blocked@ssism.org';
      const req = mockRequest({ email });
      const res = mockResponse();

      const OtpModel = mongoose.model('Otp');
      await OtpModel.create({
        email,
        otp: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        blockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 5
      });

      User.findOne.mockResolvedValue({ email });

      await otpController.sendOtpToEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/Too many attempts/)
      }));
    });

    it('should send OTP successfully if email exists', async () => {
      const req = mockRequest({ email: 'test@ssism.org' });
      const res = mockResponse();

      const mockUser = { _id: '123', email: 'test@ssism.org' };
      User.findOne.mockResolvedValue(mockUser);
      generateOTP.mockReturnValue('123456');
      sendEmailOtp.mockResolvedValue(true);

      await otpController.sendOtpToEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'OTP sent to registered email' });
    });
  });

  describe('verifyEmailOtp', () => {
    it('should return 400 if email or OTP is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await otpController.verifyEmailOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and OTP required' });
    });

    it('should return 400 if no OTP is found for the email', async () => {
      const req = mockRequest({ email: 'no_otp@ssism.org', otp: '123456' });
      const res = mockResponse();

      await otpController.verifyEmailOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No OTP found' });
    });

    it('should return 400 if OTP is expired', async () => {
      const email = 'expired@ssism.org';
      const req = mockRequest({ email, otp: '123456' });
      const res = mockResponse();

      const OtpModel = mongoose.model('Otp');
      await OtpModel.create({
        email,
        otp: '123456',
        expiresAt: new Date(Date.now() - 1000) // expired
      });

      await otpController.verifyEmailOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'OTP expired' });
    });

    it('should return 400 if OTP is incorrect', async () => {
      const email = 'test@ssism.org';
      const req = mockRequest({ email, otp: '000000' });
      const res = mockResponse();

      const OtpModel = mongoose.model('Otp');
      await OtpModel.create({
        email,
        otp: '123456',
        expiresAt: new Date(Date.now() + 100000)
      });

      await otpController.verifyEmailOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid OTP' });
    });

    it('should successfully verify OTP and return JWT tokens', async () => {
      const email = 'test@ssism.org';
      const req = mockRequest({ email, otp: '123456' });
      const res = mockResponse();

      const mockUser = {
        _id: 'mockId',
        email,
        save: jest.fn(),
      };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const OtpModel = mongoose.model('Otp');
      await OtpModel.create({
        email,
        otp: '123456',
        expiresAt: new Date(Date.now() + 100000)
      });

      jwt.sign.mockReturnValue('mockJwtToken');

      await otpController.verifyEmailOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'OTP verified successfully. Login success.',
        token: 'mockJwtToken',
        refreshToken: 'mockJwtToken',
      }));

      expect(mockUser.save).toHaveBeenCalled();
    });
  });

});
