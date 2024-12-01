const userController = require("../controllers/user.controller");
const userUtils = require("../utils/user.utils");
const passwordUtils = require("../utils/password.utils");
const UserModel = require("../models/user.model");

jest.mock("../utils/user.utils");
jest.mock("../utils/password.utils");
jest.mock("../models/user.model");

describe("User Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("userRegistrationDefault", () => {
    it("should return 400 if user already exists", async () => {
      // Mock user existence
      userUtils.checkUserWithEmail.mockResolvedValue(true);

      req.body = {
        full_name: "John Doe",
        email: "john@example.com",
        password: "password123"
      };

      await userController.userRegistrationDefault(req, res, next);

      expect(userUtils.checkUserWithEmail).toHaveBeenCalledWith("john@example.com");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "A user with this details is already registered!",
        error: false
      });
    });

    it("should register a new user and return tokens", async () => {
      userUtils.checkUserWithEmail.mockResolvedValue(false);

      // Mock utils
      passwordUtils.genPassword.mockReturnValue({ salt: "salt123", hash: "hash123" });
      passwordUtils.issueJWT.mockReturnValue({ accessToken: "access-token", refreshToken: "refresh-token" });

      UserModel.createUser.mockResolvedValue({
        id: 1,
        full_name: "John Doe",
        email: "john@example.com"
      });

      req.body = {
        full_name: "John Doe",
        email: "john@example.com",
        password: "password123"
      };

      await userController.userRegistrationDefault(req, res, next);

      expect(userUtils.checkUserWithEmail).toHaveBeenCalledWith("john@example.com");
      expect(passwordUtils.genPassword).toHaveBeenCalledWith("password123");
      expect(UserModel.createUser).toHaveBeenCalledWith({
        email: "john@example.com",
        full_name: "John Doe",
        salt: "salt123",
        hash: "hash123"
      });
      expect(passwordUtils.issueJWT).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Registration Success.",
        success: true,
        accessToken: "access-token",
        refreshToken: "refresh-token"
      });
    });
  });

  describe("userLoginDefault", () => {
    it("should return 200 if user not found", async () => {
      // Mock
      userUtils.getUserDetails.mockResolvedValue(null);

      req.body = {
        email: "john@example.com",
        password: "password123"
      };

      await userController.userLoginDefault(req, res, next);

      expect(userUtils.getUserDetails).toHaveBeenCalledWith("john@example.com");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "A user with these details is not found",
        error: false
      });
    });

    it("should return 200 if password is correct and issue tokens", async () => {
      // Mock user details
      userUtils.getUserDetails.mockResolvedValue({
        id: 1,
        full_name: "John Doe",
        email: "john@example.com",
        salt: "salt123",
        hash: "hash123"
      });

      passwordUtils.validatePassword.mockResolvedValue(true);
      passwordUtils.issueJWT.mockReturnValue({ accessToken: "access-token", refreshToken: "refresh-token" });

      req.body = {
        email: "john@example.com",
        password: "password123"
      };

      await userController.userLoginDefault(req, res, next);

      expect(userUtils.getUserDetails).toHaveBeenCalledWith("john@example.com");
      expect(passwordUtils.validatePassword).toHaveBeenCalledWith(
        "password123",
        "hash123",
        "salt123"
      );
      expect(passwordUtils.issueJWT).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Login Success.",
        success: true,
        accessToken: "access-token",
        refreshToken: "refresh-token"
      });
    });

    it("should return 200 if password is incorrect", async () => {
      // Mock user details
      userUtils.getUserDetails.mockResolvedValue({
        id: 1,
        full_name: "John Doe",
        email: "john@example.com",
        salt: "salt123",
        hash: "hash123"
      });

      passwordUtils.validatePassword.mockResolvedValue(false);

      req.body = {
        email: "john@example.com",
        password: "wrongpassword"
      };

      await userController.userLoginDefault(req, res, next);

      expect(passwordUtils.validatePassword).toHaveBeenCalledWith(
        "wrongpassword",
        "hash123",
        "salt123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Your password is incorrect, please try again with a correct password!",
        error: false
      });
    });
  });
});
