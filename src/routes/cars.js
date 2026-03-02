import express from "express";
import { Car } from "../models/Car.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { USER_ROLES, CAR_STATUS } from "../config/constants.js";
import { validate } from "../middleware/validate.js";
import { createCarSchema, updateCarSchema } from "../validators/car.js";
import { emitCarEvent } from "../utils/socket.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/cars - List cars (with optional agence filter)
router.get("/", async (req, res) => {
  try {
    const { agence, carCity, responsable, assignedAgent } = req.query; // Support both for backward compatibility
    const query = { agencyId: req.agencyId };
    
    if (agence || carCity) {
      query.agence = agence || carCity;
    }

    if (responsable) {
      query.responsable = responsable;
    }

    if (assignedAgent) {
      query.assignedAgent = assignedAgent;
    }

    const cars = await Car.find(query)
      .populate("assignedAgent", "fullName email")
      .sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    console.error("Get cars error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/cars/:id - Get car details
router.get("/:id", async (req, res) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, agencyId: req.agencyId });
    
    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }

    res.json(car);
  } catch (error) {
    console.error("Get car error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/cars - Create car (admin/agent)
router.post("/", validate(createCarSchema), async (req, res) => {
  try {
    // Normalize the plate number and immatriculation
    const plateNumber = (req.body.plateNumber || req.body.immatriculation || "").trim().toUpperCase();
    const immatriculation = (req.body.immatriculation || req.body.plateNumber || "").trim().toUpperCase();

    if (!plateNumber) {
      return res.status(400).json({ error: "Plate number or immatriculation is required" });
    }

    // Check if plateNumber already exists (this is what the unique index checks)
    const existingByPlate = await Car.findOne({
      agencyId: req.agencyId,
      $or: [
        { plateNumber: plateNumber },
        { plateNumber: { $regex: new RegExp(`^${plateNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    });

    if (existingByPlate) {
      return res.status(400).json({ 
        error: `A car with plate number "${existingByPlate.plateNumber}" already exists for this agency (Car: ${existingByPlate.brand} ${existingByPlate.model})` 
      });
    }

    // Check if immatriculation is being used as a plateNumber by another car
    if (immatriculation && immatriculation !== plateNumber) {
      const existingByImmat = await Car.findOne({
        agencyId: req.agencyId,
        $or: [
          { plateNumber: immatriculation },
          { plateNumber: { $regex: new RegExp(`^${immatriculation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      });

      if (existingByImmat) {
        return res.status(400).json({ 
          error: `A car with plate number "${existingByImmat.plateNumber}" already exists for this agency (Car: ${existingByImmat.brand} ${existingByImmat.model})` 
        });
      }
    }

    const carData = {
      ...req.body,
      agencyId: req.agencyId,
      plateNumber: plateNumber, // Ensure plateNumber is set and normalized
      immatriculation: immatriculation || plateNumber, // Set immatriculation if provided
      // Map carCity to agence for backward compatibility
      agence: req.body.agence || req.body.carCity,
    };

    // Agents can create cars but cannot assign to other agents.
    // Always assign cars they create to themselves.
    if (req.user.role === USER_ROLES.AGENT) {
      carData.assignedAgent = req.user._id;
    }
    
    // Remove carName if it exists (old field, should not be in new schema)
    delete carData.carName;

    // Handle carLoan dates
    if (carData.carLoan) {
      if (carData.carLoan.startDate) {
        carData.carLoan.startDate = new Date(carData.carLoan.startDate);
      }
      if (carData.carLoan.endDate) {
        carData.carLoan.endDate = new Date(carData.carLoan.endDate);
      }
    }

    const car = new Car(carData);
    await car.save();
    emitCarEvent("car:created", car);

    res.status(201).json(car);
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB unique index violation - this means the duplicate check above didn't catch it
      // This could happen if there's a race condition or if the check logic missed something
      console.error("Duplicate key error:", error.keyPattern, error.keyValue);
      return res.status(400).json({ 
        error: `A car with this plate number already exists for this agency. Please check existing cars and use a different plate number.` 
      });
    }
    console.error("Create car error:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// PATCH /api/cars/:id - Update car
// Admins can update all fields; agents can update cars assigned to them
router.patch("/:id", validate(updateCarSchema), async (req, res) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, agencyId: req.agencyId });

    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }

    // If user is an agent, only allow editing cars assigned to them
    if (req.user.role !== "admin") {
      // Check if car is assigned to this agent
      const assignedAgentId = car.assignedAgent?.toString() || car.assignedAgent;
      const userId = req.user._id.toString();
      
      if (assignedAgentId !== userId) {
        return res.status(403).json({ error: "You can only update cars assigned to you" });
      }
    }

    // If updating plateNumber or immatriculation, check for duplicates
    if (req.body.plateNumber || req.body.immatriculation) {
      const newPlateNumber = req.body.plateNumber || req.body.immatriculation || car.plateNumber;
      const newImmatriculation = req.body.immatriculation || req.body.plateNumber || car.immatriculation;
      
      const existingCar = await Car.findOne({
        agencyId: req.agencyId,
        _id: { $ne: req.params.id },
        $or: [
          { plateNumber: newPlateNumber },
          { immatriculation: newImmatriculation }
        ]
      });

      if (existingCar) {
        return res.status(400).json({ error: "A car with this plate number or immatriculation already exists for this agency" });
      }
    }

    const updateData = {
      ...req.body,
      // Map carCity to agence for backward compatibility (admin only)
      agence: req.user.role === "admin" ? (req.body.agence || req.body.carCity || undefined) : undefined,
    };

    // Agents cannot change assignment manually.
    if (req.user.role !== "admin") {
      delete updateData.assignedAgent;
      delete updateData.carCity;
      if (req.body.agence) {
        updateData.agence = req.body.agence;
      }
    }
    // Remove carCity if agence is provided
    if (updateData.agence) {
      delete updateData.carCity;
    }

    // Handle carLoan dates
    if (updateData.carLoan) {
      if (updateData.carLoan.startDate) {
        updateData.carLoan.startDate = new Date(updateData.carLoan.startDate);
      }
      if (updateData.carLoan.endDate) {
        updateData.carLoan.endDate = new Date(updateData.carLoan.endDate);
      }
    }

    // Handle expense dates. Null means explicit deletion of that expense.
    const expenseFields = ["vidange", "maintenance", "visiteTechnique", "insurance", "courroieDistribution"];
    expenseFields.forEach(field => {
      if (updateData[field] && updateData[field].date) {
        updateData[field].date = new Date(updateData[field].date);
      }
    });

    // Auto-update car status to "maintenance" if maintenance expense is added/updated
    // Only if car is currently "available" or "rented" (don't override if already in maintenance)
    if (updateData.maintenance && updateData.maintenance.date && !updateData.status) {
      // Check current car status before update
      const currentCar = await Car.findOne({ _id: req.params.id, agencyId: req.agencyId });
      if (currentCar && (currentCar.status === CAR_STATUS.AVAILABLE || currentCar.status === CAR_STATUS.RENTED)) {
        updateData.status = CAR_STATUS.MAINTENANCE;
      }
    }

    const updatedCar = await Car.findOneAndUpdate(
      { _id: req.params.id, agencyId: req.agencyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCar) {
      return res.status(404).json({ error: "Car not found" });
    }
    emitCarEvent("car:updated", updatedCar);

    res.json(updatedCar);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Plate number already exists for this agency" });
    }
    console.error("Update car error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/cars/:id - Delete car (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const car = await Car.findOneAndDelete({ _id: req.params.id, agencyId: req.agencyId });

    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }
    emitCarEvent("car:deleted", car);

    res.json({ message: "Car deleted successfully" });
  } catch (error) {
    console.error("Delete car error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
