import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { CITIES } from "../config/constants.js";

const router = express.Router();

// Initialize default users for testing
router.post("/", async (req, res) => {
  try {
    // Use a default agencyId for testing
    const defaultAgencyId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

    // Check if users already exist
    const existingAdmin = await User.findOne({ email: "admin@test.com" });
    const existingAgent = await User.findOne({ email: "agent@test.com" });

    if (existingAdmin && existingAgent) {
      return res.json({
        message: "Default users already exist",
        admin: {
          email: "admin@test.com",
          password: "password123",
        },
        agent: {
          email: "agent@test.com",
          password: "password123",
        },
      });
    }

    const passwordHash = await bcrypt.hash("password123", 10);

    // Create admin user
    if (!existingAdmin) {
      const admin = new User({
        fullName: "Admin User",
        email: "admin@test.com",
        passwordHash,
        role: "admin",
        agencyId: defaultAgencyId,
        branchCity: CITIES[0],
        isActive: true,
      });
      await admin.save();
    }

    // Create agent user
    if (!existingAgent) {
      const agent = new User({
        fullName: "Agent User",
        email: "agent@test.com",
        passwordHash,
        role: "agent",
        agencyId: defaultAgencyId,
        branchCity: CITIES[0],
        isActive: true,
      });
      await agent.save();
    }

    res.json({
      message: "Default users created successfully",
      admin: {
        email: "admin@test.com",
        password: "password123",
      },
      agent: {
        email: "agent@test.com",
        password: "password123",
      },
    });
  } catch (error) {
    console.error("Init error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

