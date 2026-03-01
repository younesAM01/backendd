import express from "express";
import { UserExpense } from "../models/UserExpense.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/user-expenses - List all user expenses
router.get("/", async (req, res) => {
  try {
    const { userId, type, startDate, endDate } = req.query;
    const query = { agencyId: req.agencyId };

    if (userId) {
      query.userId = userId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const expenses = await UserExpense.find(query)
      .populate("userId", "fullName email")
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    console.error("Get user expenses error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user-expenses - Create user expense
// Admins can create for any user, agents can only create travel expenses for themselves
router.post("/", async (req, res) => {
  try {
    const { userId, type, date, amount, description } = req.body;

    if (!userId || !type || !date || !amount) {
      return res.status(400).json({ error: "userId, type, date, and amount are required" });
    }

    if (!["salary", "travel"].includes(type)) {
      return res.status(400).json({ error: "type must be 'salary' or 'travel'" });
    }

    // If user is not admin, they can only create travel expenses for themselves
    if (req.user.role !== "admin") {
      if (type !== "travel") {
        return res.status(403).json({ error: "Agents can only create travel expenses" });
      }
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({ error: "Agents can only create expenses for themselves" });
      }
    }

    // If type is salary, only admins can create it
    if (type === "salary" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create salary expenses" });
    }

    const expenseData = {
      agencyId: req.agencyId,
      userId,
      type,
      date: new Date(date),
      amount,
      description,
    };
    
    // Add travelType if it's a travel expense
    if (type === "travel" && req.body.travelType) {
      expenseData.travelType = req.body.travelType;
    }
    
    const expense = new UserExpense(expenseData);

    await expense.save();
    await expense.populate("userId", "fullName email");

    res.status(201).json(expense);
  } catch (error) {
    console.error("Create user expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/user-expenses/:id - Update user expense (admin only)
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const expense = await UserExpense.findOneAndUpdate(
      { _id: req.params.id, agencyId: req.agencyId },
      updateData,
      { new: true, runValidators: true }
    ).populate("userId", "fullName email");

    if (!expense) {
      return res.status(404).json({ error: "User expense not found" });
    }

    res.json(expense);
  } catch (error) {
    console.error("Update user expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/user-expenses/:id - Delete user expense (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const expense = await UserExpense.findOneAndDelete({ _id: req.params.id, agencyId: req.agencyId });

    if (!expense) {
      return res.status(404).json({ error: "User expense not found" });
    }

    res.json({ message: "User expense deleted successfully" });
  } catch (error) {
    console.error("Delete user expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;



