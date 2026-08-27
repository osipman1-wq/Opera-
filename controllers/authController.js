const authService = require("../services/authService");

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register({ email, password, name });
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: result.user,
      token: result.token
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({
      success: true,
      message: "Logged in successfully",
      user: result.user,
      token: result.token
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-auth-token"];
    
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const user = await authService.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: "Session expired or invalid" });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-auth-token"];
    if (token) {
      await authService.logout(token);
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  logout
};
