import express from "express";
import { CarAssignment } from "../models/CarAssignment.js";
import { Car } from "../models/Car.js";
import { User } from "../models/User.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/car-assignments - List all car assignments
router.get("/", async (req, res) => {
  try {
    const { carId, userId } = req.query;
    const query = { agencyId: req.agencyId };

    if (carId) {
      query.carId = carId;
    }

    if (userId) {
      query.userId = userId;
    }

    const assignments = await CarAssignment.find(query)
      .populate("carId", "brand model immatriculation plateNumber")
      .populate("userId", "fullName email branchCity")
      .sort({ assignedAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Get car assignments error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/car-assignments - Assign car to agent (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { carId, userId, notes } = req.body;

    if (!carId || !userId) {
      return res.status(400).json({ error: "carId and userId are required" });
    }

    // Check if assignment already exists
    const existing = await CarAssignment.findOne({
      agencyId: req.agencyId,
      carId,
      userId,
    });

    if (existing) {
      return res.status(400).json({ error: "Car is already assigned to this agent" });
    }

    const assignment = new CarAssignment({
      agencyId: req.agencyId,
      carId,
      userId,
      notes,
    });

    await assignment.save();
    await assignment.populate("carId", "brand model immatriculation plateNumber");
    await assignment.populate("userId", "fullName email branchCity");

    // Update car's responsable number and assignedAgent fields
    if (assignment.userId) {
      // Use the agent's responsable number from their user record
      const agent = await User.findById(assignment.userId._id);
      const responsableNumber = agent && agent.responsable !== undefined && agent.responsable !== null ? agent.responsable : undefined;
      
      await Car.findByIdAndUpdate(carId, { 
        responsable: responsableNumber,
        assignedAgent: assignment.userId._id
      });
    }

    res.status(201).json(assignment);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Car is already assigned to this agent" });
    }
    console.error("Create car assignment error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/car-assignments/:id - Remove car assignment (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const assignment = await CarAssignment.findOneAndDelete({
      _id: req.params.id,
      agencyId: req.agencyId,
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ message: "Car assignment removed successfully" });
  } catch (error) {
    console.error("Delete car assignment error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/car-assignments - Remove assignment by carId and userId (admin only)
router.delete("/", requireAdmin, async (req, res) => {
  try {
    const { carId, userId } = req.query;

    if (!carId || !userId) {
      return res.status(400).json({ error: "carId and userId are required" });
    }

    const assignment = await CarAssignment.findOneAndDelete({
      agencyId: req.agencyId,
      carId,
      userId,
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ message: "Car assignment removed successfully" });
  } catch (error) {
    console.error("Delete car assignment error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;




