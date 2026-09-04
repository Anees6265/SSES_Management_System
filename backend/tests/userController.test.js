const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../src/models/user/user");
const { refreshAccessToken, logout } = require("../src/controllers/user/userController"); // ✅ FIXED
const { forgotPassword, resetPassword } = require("../src/controllers/user/userController");
const { sendResetLinkEmail } = require("../src/services/emailService");

jest.mock("../src/models/user/user");
jest.mock("jsonwebtoken");

jest.mock("../src/services/emailService", () => ({
  sendResetLinkEmail: jest.fn()
}));


jest.mock("bcrypt", () => ({
  hash: jest.fn()
}));


describe("refreshAccessToken", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it("should return 401 if refresh token is missing", async () => {
    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Refresh token required" });
  });

  it("should return 403 if refresh token is not found in DB", async () => {
    req.body.refreshToken = "fake_token";
    User.findOne.mockResolvedValue(null);

    await refreshAccessToken(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ refreshToken: "fake_token" });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh token" });
  });

  it("should return 403 if refresh token is invalid or expired", async () => {
    req.body.refreshToken = "fake_token";
    const mockUser = { _id: "123", role: "student", refreshToken: "fake_token" };
    User.findOne.mockResolvedValue(mockUser);

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error("Token expired"), null);
    });

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired refresh token" });
  });

  it("should return new access token if refresh token is valid", async () => {
    req.body.refreshToken = "valid_refresh_token";
    const mockUser = { _id: "123", role: "admin", refreshToken: "valid_refresh_token" };
    User.findOne.mockResolvedValue(mockUser);

    const decoded = { id: "123" };

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decoded);
    });

    jwt.sign.mockReturnValue("new_access_token");

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Access token refreshed",
      accessToken: "new_access_token"
    });
  });

  it("should handle server error", async () => {
    req.body.refreshToken = "any";
    User.findOne.mockRejectedValue(new Error("DB error"));

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Server error",
      error: "DB error"
    });
  });
});



// Test for logout function in userController
describe("logout", () => {
  let req, res;

  beforeEach(() => {
    req = { body: { _id: "123" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if _id is not provided", async () => {
    req.body = {}; // No _id
    await logout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "User ID is required" });
  });

  it("should return 404 if user not found", async () => {
    User.findById.mockResolvedValue(null); // user not found
    await logout(req, res);
    expect(User.findById).toHaveBeenCalledWith("123");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should logout user and remove refresh token", async () => {
    const mockUser = {
      refreshToken: "someToken",
      save: jest.fn().mockResolvedValue(true),
    };

    User.findById.mockResolvedValue(mockUser);

    await logout(req, res);

    expect(User.findById).toHaveBeenCalledWith("123");
    expect(mockUser.refreshToken).toBeNull();
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Logged out successfully",
    });
  });

  it("should handle server error", async () => {
    const error = new Error("DB error");
    User.findById.mockRejectedValue(error);

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Server error",
      error: "DB error",
    });
  });
});

describe("forgotPassword", () => {
  let req, res;

  beforeEach(() => {
    req = { body: { email: "test@example.com" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it("should return 404 if user is not found", async () => {
    User.findOne = jest.fn().mockResolvedValue(null);

    await forgotPassword(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should generate token, save it, send email, and return 200 success response", async () => {
    const fakeUser = {
      _id: "123",
      email: "test@example.com",
      save: jest.fn()
    };

    User.findOne = jest.fn().mockResolvedValue(fakeUser);
    jwt.sign.mockReturnValue("mockToken");
    sendResetLinkEmail.mockResolvedValue(true);

    await forgotPassword(req, res);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: "123" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    expect(fakeUser.resetPasswordToken).toBe("mockToken");
    expect(fakeUser.resetPasswordExpires).toBeGreaterThan(Date.now());
    expect(fakeUser.resetTokenUsed).toBe(false);
    expect(fakeUser.save).toHaveBeenCalled();

    expect(sendResetLinkEmail).toHaveBeenCalledWith("test@example.com", "mockToken");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Reset link sent to your email." });
  });

  it("should handle failure in sending email gracefully", async () => {
    const fakeUser = {
      _id: "123",
      email: "test@example.com",
      save: jest.fn()
    };

    User.findOne = jest.fn().mockResolvedValue(fakeUser);
    jwt.sign.mockReturnValue("mockToken");
    sendResetLinkEmail.mockRejectedValue(new Error("Email service failed"));

    await forgotPassword(req, res);

    // Still saves user even if email fails
    expect(fakeUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Server error",
      error: "Email service failed"
    });
  });

  it("should handle database save error", async () => {
    const fakeUser = {
      _id: "123",
      email: "test@example.com",
      save: jest.fn().mockRejectedValue(new Error("DB save failed"))
    };

    User.findOne = jest.fn().mockResolvedValue(fakeUser);
    jwt.sign.mockReturnValue("mockToken");

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Server error",
      error: "DB save failed"
    });
  });

  it("should handle unexpected server errors", async () => {
    User.findOne = jest.fn().mockRejectedValue(new Error("Unexpected error"));

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Server error",
      error: "Unexpected error"
    });
  });

  it("should not expose token in response", async () => {
    const fakeUser = {
      _id: "123",
      email: "test@example.com",
      save: jest.fn()
    };

    User.findOne = jest.fn().mockResolvedValue(fakeUser);
    jwt.sign.mockReturnValue("mockToken");
    sendResetLinkEmail.mockResolvedValue(true);

    await forgotPassword(req, res);

    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse).not.toHaveProperty("token");
    expect(jsonResponse.message).toBe("Reset link sent to your email.");
  });
});



describe("resetPassword", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { token: "mockToken" },
      body: { newPassword: "newPass123", confirmPassword: "newPass123" }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it("should return 400 if any password field is missing", async () => {
    req.body = { newPassword: "", confirmPassword: "" };

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Both fields are required" });
  });

  it("should return 400 if passwords do not match", async () => {
    req.body = { newPassword: "abc", confirmPassword: "xyz" };

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Passwords do not match" });
  });

  it("should return 400 if token is invalid or expired", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await resetPassword(req, res);

    expect(jwt.verify).toHaveBeenCalledWith("mockToken", process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
  });

  it("should return 400 if user not found or token is incorrect/used", async () => {
    jwt.verify.mockReturnValue({ id: "123" });
    User.findById = jest.fn().mockResolvedValue({
      resetPasswordToken: "anotherToken",
      resetTokenUsed: false,
    });

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
  });

  it("should return 400 if reset token has expired", async () => {
    jwt.verify.mockReturnValue({ id: "123" });
    User.findById = jest.fn().mockResolvedValue({
      resetPasswordToken: "mockToken",
      resetTokenUsed: false,
      resetPasswordExpires: Date.now() - 1000 // expired
    });

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Token has expired" });
  });

  it("should hash password, update user and return success", async () => {
    const mockUser = {
      resetPasswordToken: "mockToken",
      resetTokenUsed: false,
      resetPasswordExpires: Date.now() + 60000,
      save: jest.fn(),
    };

    jwt.verify.mockReturnValue({ id: "123" });
    User.findById = jest.fn().mockResolvedValue(mockUser);
    bcrypt.hash.mockResolvedValue("hashedPass123");

    await resetPassword(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith("newPass123", 10);
    expect(mockUser.password).toBe("hashedPass123");
    expect(mockUser.resetTokenUsed).toBe(true);
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Password successfully reset" });
  });
});