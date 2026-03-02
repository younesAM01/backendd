import express from "express";
import { Booking } from "../models/Booking.js";
import { Car } from "../models/Car.js";
import { Client } from "../models/Client.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createBookingSchema, updateBookingSchema } from "../validators/booking.js";
import { emitBookingEvent } from "../utils/socket.js";
import { BOOKING_STATUS, CAR_STATUS } from "../config/constants.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/bookings - List bookings (with optional filters)
router.get("/", async (req, res) => {
  try {
    const { agence, location, agent, paymentStatus } = req.query; // Support both for backward compatibility
    const query = { agencyId: req.agencyId };
    
    if (agence || location) {
      query.agence = agence || location;
    }
    if (agent) {
      query.agent = agent;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const bookings = await Booking.find(query)
      .populate({
        path: "carId",
        select: "plateNumber brand model year immatriculation assignedAgent responsable",
        populate: {
          path: "assignedAgent",
          select: "fullName email",
        },
      })
      .populate("createdBy", "fullName email")
      .populate("agent", "fullName email")
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/bookings/:id - Get booking details
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, agencyId: req.agencyId })
      .populate({
        path: "carId",
        select: "plateNumber brand model year immatriculation assignedAgent responsable",
        populate: {
          path: "assignedAgent",
          select: "fullName email",
        },
      })
      .populate("createdBy", "fullName email")
      .populate("agent", "fullName email");
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bookings - Create booking (admin/agent)
router.post("/", validate(createBookingSchema), async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      agencyId: req.agencyId,
      createdBy: req.user._id,
      startAt: new Date(req.body.startAt),
      endAt: new Date(req.body.endAt),
    };

    // Handle driver license dates
    if (req.body.customer?.driverLicenseStartDate) {
      bookingData.customer.driverLicenseStartDate = new Date(req.body.customer.driverLicenseStartDate);
    }
    if (req.body.customer?.driverLicenseEndDate) {
      bookingData.customer.driverLicenseEndDate = new Date(req.body.customer.driverLicenseEndDate);
    }
    if (req.body.additionalDriver?.driverLicenseStartDate) {
      bookingData.additionalDriver.driverLicenseStartDate = new Date(req.body.additionalDriver.driverLicenseStartDate);
    }
    if (req.body.additionalDriver?.driverLicenseEndDate) {
      bookingData.additionalDriver.driverLicenseEndDate = new Date(req.body.additionalDriver.driverLicenseEndDate);
    }

    const booking = new Booking(bookingData);
    await booking.save();

    // Set car status to rented when a booking is created (regardless of booking status)
    if (booking.carId) {
      await Car.findByIdAndUpdate(booking.carId, { status: CAR_STATUS.RENTED });
    }

    // Sync client data
    if (req.body.customer) {
      const clientData = {
        ...req.body.customer,
        agencyId: req.agencyId,
      };
      if (req.body.customer.driverLicenseStartDate) {
        clientData.driverLicenseStartDate = new Date(req.body.customer.driverLicenseStartDate);
      }
      if (req.body.customer.driverLicenseEndDate) {
        clientData.driverLicenseEndDate = new Date(req.body.customer.driverLicenseEndDate);
      }

      // Upsert client by passportOrCIN
      await Client.findOneAndUpdate(
        { agencyId: req.agencyId, passportOrCIN: req.body.customer.passportOrCIN },
        clientData,
        { upsert: true, new: true }
      );
    }

    // Sync additional driver if enabled
    if (req.body.additionalDriver?.enabled && req.body.additionalDriver.passportOrCIN) {
      const additionalDriverData = {
        fullName: req.body.additionalDriver.fullName,
        phone: req.body.additionalDriver.phone,
        addressMorocco: req.body.additionalDriver.addressMorocco,
        addressAbroad: req.body.additionalDriver.addressAbroad,
        nationality: req.body.additionalDriver.nationality,
        driverLicenseNumber: req.body.additionalDriver.driverLicenseNumber,
        passportOrCIN: req.body.additionalDriver.passportOrCIN,
        agencyId: req.agencyId,
      };
      if (req.body.additionalDriver.driverLicenseStartDate) {
        additionalDriverData.driverLicenseStartDate = new Date(req.body.additionalDriver.driverLicenseStartDate);
      }
      if (req.body.additionalDriver.driverLicenseEndDate) {
        additionalDriverData.driverLicenseEndDate = new Date(req.body.additionalDriver.driverLicenseEndDate);
      }

      await Client.findOneAndUpdate(
        { agencyId: req.agencyId, passportOrCIN: req.body.additionalDriver.passportOrCIN },
        additionalDriverData,
        { upsert: true, new: true }
      );
    }

    await booking.populate({
      path: "carId",
      select: "plateNumber brand model year immatriculation assignedAgent responsable",
      populate: {
        path: "assignedAgent",
        select: "fullName email",
      },
    });
    await booking.populate("createdBy", "fullName email");
    await booking.populate("agent", "fullName email");

    // Emit socket event
    emitBookingEvent("booking:created", booking);

    res.status(201).json(booking);
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/bookings/:id - Update booking (admin: all fields, agent: status only)
router.patch("/:id", validate(updateBookingSchema), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, agencyId: req.agencyId });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Agents can only update status
    if (req.user.role !== "admin") {
      if (Object.keys(req.body).some(key => key !== "status")) {
        return res.status(403).json({ error: "Agents can only update booking status" });
      }
    }

    // Update fields
    if (req.body.startAt) req.body.startAt = new Date(req.body.startAt);
    if (req.body.endAt) req.body.endAt = new Date(req.body.endAt);
    if (req.body.customer?.driverLicenseStartDate) {
      req.body.customer.driverLicenseStartDate = new Date(req.body.customer.driverLicenseStartDate);
    }
    if (req.body.customer?.driverLicenseEndDate) {
      req.body.customer.driverLicenseEndDate = new Date(req.body.customer.driverLicenseEndDate);
    }
    if (req.body.additionalDriver?.driverLicenseStartDate) {
      req.body.additionalDriver.driverLicenseStartDate = new Date(req.body.additionalDriver.driverLicenseStartDate);
    }
    if (req.body.additionalDriver?.driverLicenseEndDate) {
      req.body.additionalDriver.driverLicenseEndDate = new Date(req.body.additionalDriver.driverLicenseEndDate);
    }

    const oldStatus = booking.status;
    const oldCarId = booking.carId;

    Object.assign(booking, req.body);
    await booking.save();

    // Handle car status updates based on booking status
    if (booking.status === BOOKING_STATUS.ACTIVE && booking.carId) {
      // Ensure car is rented when booking becomes active
      await Car.findByIdAndUpdate(booking.carId, { status: CAR_STATUS.RENTED });
    } else if (oldStatus === BOOKING_STATUS.ACTIVE && booking.status !== BOOKING_STATUS.ACTIVE && oldCarId) {
      // If booking was active and is no longer active, check if there are other bookings for this car
      const otherBookings = await Booking.find({
        agencyId: req.agencyId,
        carId: oldCarId,
        _id: { $ne: booking._id },
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACTIVE] }
      });
      
      // Only set car back to available if there are no other pending/active bookings
      if (otherBookings.length === 0) {
        await Car.findByIdAndUpdate(oldCarId, { status: CAR_STATUS.AVAILABLE });
      }
    }
    
    // If car was changed, update both old and new car statuses
    if (booking.carId && oldCarId && booking.carId.toString() !== oldCarId.toString()) {
      // Set new car to rented
      await Car.findByIdAndUpdate(booking.carId, { status: CAR_STATUS.RENTED });
      
      // Check if old car has other bookings
      const otherBookingsForOldCar = await Booking.find({
        agencyId: req.agencyId,
        carId: oldCarId,
        _id: { $ne: booking._id },
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACTIVE] }
      });
      
      // Only set old car back to available if there are no other bookings
      if (otherBookingsForOldCar.length === 0) {
        await Car.findByIdAndUpdate(oldCarId, { status: CAR_STATUS.AVAILABLE });
      }
    }

    // Sync client data if customer info was updated
    if (req.body.customer) {
      const clientData = {
        ...req.body.customer,
        agencyId: req.agencyId,
      };
      if (req.body.customer.driverLicenseStartDate) {
        clientData.driverLicenseStartDate = new Date(req.body.customer.driverLicenseStartDate);
      }
      if (req.body.customer.driverLicenseEndDate) {
        clientData.driverLicenseEndDate = new Date(req.body.customer.driverLicenseEndDate);
      }

      await Client.findOneAndUpdate(
        { agencyId: req.agencyId, passportOrCIN: req.body.customer.passportOrCIN || booking.customer.passportOrCIN },
        clientData,
        { upsert: true, new: true }
      );
    }

    // Sync additional driver if enabled
    if (req.body.additionalDriver?.enabled && req.body.additionalDriver.passportOrCIN) {
      const additionalDriverData = {
        fullName: req.body.additionalDriver.fullName,
        phone: req.body.additionalDriver.phone,
        addressMorocco: req.body.additionalDriver.addressMorocco,
        addressAbroad: req.body.additionalDriver.addressAbroad,
        nationality: req.body.additionalDriver.nationality,
        driverLicenseNumber: req.body.additionalDriver.driverLicenseNumber,
        passportOrCIN: req.body.additionalDriver.passportOrCIN,
        agencyId: req.agencyId,
      };
      if (req.body.additionalDriver.driverLicenseStartDate) {
        additionalDriverData.driverLicenseStartDate = new Date(req.body.additionalDriver.driverLicenseStartDate);
      }
      if (req.body.additionalDriver.driverLicenseEndDate) {
        additionalDriverData.driverLicenseEndDate = new Date(req.body.additionalDriver.driverLicenseEndDate);
      }

      await Client.findOneAndUpdate(
        { agencyId: req.agencyId, passportOrCIN: req.body.additionalDriver.passportOrCIN },
        additionalDriverData,
        { upsert: true, new: true }
      );
    }

    await booking.populate({
      path: "carId",
      select: "plateNumber brand model year immatriculation assignedAgent responsable",
      populate: {
        path: "assignedAgent",
        select: "fullName email",
      },
    });
    await booking.populate("createdBy", "fullName email");
    await booking.populate("agent", "fullName email");

    // Emit socket event
    emitBookingEvent("booking:updated", booking);

    res.json(booking);
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/bookings/:id - Delete booking (admin: all, agent: own bookings only)
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, agencyId: req.agencyId });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Agents can only delete bookings they created or are assigned to
    if (req.user.role !== "admin") {
      const isAgentBooking = 
        (booking.agent && booking.agent.toString() === req.user._id.toString()) ||
        (booking.createdBy && booking.createdBy.toString() === req.user._id.toString());
      
      if (!isAgentBooking) {
        return res.status(403).json({ error: "You can only delete your own bookings" });
      }
    }

    // Check if there are other bookings for this car before setting it back to available
    if (booking.carId) {
      const otherBookings = await Booking.find({
        agencyId: req.agencyId,
        carId: booking.carId,
        _id: { $ne: booking._id },
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACTIVE] }
      });
      
      // Only set car back to available if there are no other pending/active bookings
      if (otherBookings.length === 0) {
        await Car.findByIdAndUpdate(booking.carId, { status: CAR_STATUS.AVAILABLE });
      }
    }

    await Booking.findByIdAndDelete(req.params.id);

    // Emit socket event
    emitBookingEvent("booking:deleted", booking);

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
