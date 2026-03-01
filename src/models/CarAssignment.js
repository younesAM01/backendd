import mongoose from "mongoose";

const carAssignmentSchema = new mongoose.Schema(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one assignment per car-agent combination
carAssignmentSchema.index({ agencyId: 1, carId: 1, userId: 1 }, { unique: true });

export const CarAssignment = mongoose.model("CarAssignment", carAssignmentSchema);









