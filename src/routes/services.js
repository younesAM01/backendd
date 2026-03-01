import express from "express";
import { ServiceLog } from "../models/ServiceLog.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createServiceSchema, updateServiceSchema } from "../validators/service.js";
import { emitServiceEvent } from "../utils/socket.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/services - List services (with optional location and type filters)
router.get("/", async (req, res) => {
  try {
    const { location, type } = req.query;
    const query = { agencyId: req.agencyId };
    
    if (location) {
      query.location = location;
    }
    if (type) {
      query.type = type;
    }

    const services = await ServiceLog.find(query)
      .populate("carId", "plateNumber brand model year")
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });
    
    res.json(services);
  } catch (error) {
    console.error("Get services error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/services/:id - Get service details
router.get("/:id", async (req, res) => {
  try {
    const service = await ServiceLog.findOne({ _id: req.params.id, agencyId: req.agencyId })
      .populate("carId", "plateNumber brand model year")
      .populate("createdBy", "fullName email");
    
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(service);
  } catch (error) {
    console.error("Get service error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/services - Create service (admin/agent)
router.post("/", validate(createServiceSchema), async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      agencyId: req.agencyId,
      createdBy: req.user._id,
      date: new Date(req.body.date),
      nextDate: req.body.nextDate ? new Date(req.body.nextDate) : undefined,
    };

    const service = new ServiceLog(serviceData);
    await service.save();

    await service.populate("carId", "plateNumber brand model year");
    await service.populate("createdBy", "fullName email");

    // Emit socket event
    emitServiceEvent("service:created", service);

    res.status(201).json(service);
  } catch (error) {
    console.error("Create service error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/services/:id - Update service (admin: all, agent: own only)
router.patch("/:id", validate(updateServiceSchema), async (req, res) => {
  try {
    const service = await ServiceLog.findOne({ _id: req.params.id, agencyId: req.agencyId });

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Agents can only update their own services
    if (req.user.role !== "admin" && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only update your own services" });
    }

    // Update fields
    if (req.body.date) req.body.date = new Date(req.body.date);
    if (req.body.nextDate) req.body.nextDate = new Date(req.body.nextDate);

    Object.assign(service, req.body);
    await service.save();

    await service.populate("carId", "plateNumber brand model year");
    await service.populate("createdBy", "fullName email");

    // Emit socket event
    emitServiceEvent("service:updated", service);

    res.json(service);
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/services/:id - Delete service (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const service = await ServiceLog.findOneAndDelete({ _id: req.params.id, agencyId: req.agencyId });

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Emit socket event
    emitServiceEvent("service:deleted", service);

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Delete service error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
