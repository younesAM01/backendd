import mongoose from "mongoose";
import { CITIES, CAR_STATUS } from "../config/constants.js";

const carSchema = new mongoose.Schema(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    plateNumber: {
      type: String,
      required: true,
    },
    immatriculation: {
      type: String,
    },
    immatww: {
      type: String,
    },
    brand: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: false,
    },
    carburant: {
      type: String,
      enum: ["ESSENCE", "DIESEL", "HYBRIDE", "ELECTRIQUE"],
    },
    nCGrise: {
      type: String,
    },
    responsable: {
      type: Number,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    carColor: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(CAR_STATUS),
      default: CAR_STATUS.AVAILABLE,
      index: true,
    },
    mileageKm: {
      type: Number,
      required: true,
      default: 0,
    },
    agence: {
      type: String,
      enum: CITIES,
      index: true,
    },
    // Expense fields
    vidange: {
      date: { type: Date },
      mileage: { type: Number },
      cost: { type: Number },
      description: { type: String },
    },
    maintenance: {
      date: { type: Date },
      mileage: { type: Number },
      cost: { type: Number },
      description: { type: String },
    },
    visiteTechnique: {
      date: { type: Date },
      mileage: { type: Number },
      cost: { type: Number },
      description: { type: String },
    },
    insurance: {
      date: { type: Date },
      cost: { type: Number },
      description: { type: String },
    },
    courroieDistribution: {
      date: { type: Date },
      cost: { type: Number },
      description: { type: String },
      lastMaintenanceKilometrage: { type: Number }, // When it was last changed
      maintenanceIntervalKilometrage: { type: Number }, // How much for each time to change it
    },
    // Car loan information
    carLoan: {
      amount: { type: Number },
      startDate: { type: Date },
      endDate: { type: Date },
      monthlyPayment: { type: Number },
      remainingAmount: { type: Number },
      description: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique plateNumber per agency
carSchema.index({ agencyId: 1, plateNumber: 1 }, { unique: true });

export const Car = mongoose.model("Car", carSchema);
