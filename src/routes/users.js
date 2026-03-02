import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createUserSchema, updateUserSchema } from "../validators/user.js";
import { USER_ROLES } from "../config/constants.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users - List users
// Admins get all users, agents get active agents list (for booking assignment)
router.get("/", async (req, res) => {
  try {
    if (req.user.role === USER_ROLES.ADMIN) {
      const users = await User.find({ agencyId: req.agencyId })
        .select("-passwordHash")
        .sort({ createdAt: -1 });
      return res.json(users);
    }

    const users = await User.find({
      agencyId: req.agencyId,
      role: USER_ROLES.AGENT,
      isActive: true,
    })
      .select("fullName email role isActive branchCity responsable")
      .sort({ fullName: 1 });

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users - Create new agent (admin only)
router.post("/", requireAdmin, validate(createUserSchema), async (req, res) => {
  try {
    const { fullName, email, password, branchCity, salary, responsable } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase(), agencyId: req.agencyId });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: USER_ROLES.AGENT,
      agencyId: req.agencyId,
      branchCity,
      isActive: true,
      salary: salary || 0,
      responsable: responsable || undefined,
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.status(201).json(userResponse);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "User already exists" });
    }
    console.error("Create user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/users/:id - Update user (admin only)
router.patch("/:id", requireAdmin, validate(updateUserSchema), async (req, res) => {
  try {
    const { fullName, email, password, branchCity, isActive, salary, responsable } = req.body;
    const updateData = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        agencyId: req.agencyId,
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      updateData.email = email.toLowerCase();
    }
    if (password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (branchCity !== undefined) updateData.branchCity = branchCity;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (salary !== undefined) updateData.salary = salary;
    if (responsable !== undefined) updateData.responsable = responsable || null;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, agencyId: req.agencyId },
      updateData,
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already in use" });
    }
    console.error("Update user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/users/:id/disable - Disable user (admin only)
router.patch("/:id/disable", requireAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, agencyId: req.agencyId },
      { isActive: false },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Disable user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, agencyId: req.agencyId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
