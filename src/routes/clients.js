import express from "express";
import { Client } from "../models/Client.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createClientSchema, updateClientSchema } from "../validators/client.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/clients - List all clients
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { agencyId: req.agencyId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { passportOrCIN: { $regex: search, $options: "i" } },
        { clientId: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(query).sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/clients/:id - Get client details
router.get("/:id", async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, agencyId: req.agencyId });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/clients - Create or update client (upsert by passportOrCIN)
router.post("/", validate(createClientSchema), async (req, res) => {
  try {
    const clientData = {
      ...req.body,
      agencyId: req.agencyId,
    };

    // Handle driver license dates
    if (req.body.driverLicenseStartDate) {
      clientData.driverLicenseStartDate = new Date(req.body.driverLicenseStartDate);
    }
    if (req.body.driverLicenseEndDate) {
      clientData.driverLicenseEndDate = new Date(req.body.driverLicenseEndDate);
    }

    // Find existing client by passportOrCIN
    let client = await Client.findOne({
      agencyId: req.agencyId,
      passportOrCIN: req.body.passportOrCIN,
    });

    if (client) {
      // Update existing client
      Object.assign(client, clientData);
      await client.save();
      res.json(client);
    } else {
      // Create new client
      client = new Client(clientData);
      await client.save();
      res.status(201).json(client);
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Client already exists" });
    }
    console.error("Create client error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/clients/:id - Update client (admin only)
router.patch("/:id", requireAdmin, validate(updateClientSchema), async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, agencyId: req.agencyId });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Handle driver license dates
    if (req.body.driverLicenseStartDate) {
      req.body.driverLicenseStartDate = new Date(req.body.driverLicenseStartDate);
    }
    if (req.body.driverLicenseEndDate) {
      req.body.driverLicenseEndDate = new Date(req.body.driverLicenseEndDate);
    }

    Object.assign(client, req.body);
    await client.save();

    res.json(client);
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/clients/:id - Delete client (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, agencyId: req.agencyId });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

