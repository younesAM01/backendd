import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerAdminSchema } from "../validators/auth.js";

const router = express.Router();

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (first match, assuming emails are unique for testing)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: "No account found with this email" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account disabled. Please contact an administrator" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Incorrect password. Please try again" });
    }

    const token = jwt.sign(
      { userId: user._id, agencyId: user.agencyId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        branchCity: user.branchCity,
        agencyId: user.agencyId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/register-admin", validate(registerAdminSchema), async (req, res) => {
  try {
    const { fullName, email, password, agencyId, branchCity, setupSecret } = req.body;

    if (setupSecret !== process.env.SETUP_SECRET) {
      return res.status(403).json({ error: "Invalid setup secret" });
    }

    const existingUser = await User.findOne({ email, agencyId });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      passwordHash,
      role: "admin",
      agencyId,
      branchCity,
      isActive: true,
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, agencyId: user.agencyId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        branchCity: user.branchCity,
        agencyId: user.agencyId,
      },
    });
  } catch (error) {
    console.error("Register admin error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

