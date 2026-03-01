import mongoose from "mongoose";
import { SERVICE_TYPE, CITIES } from "../config/constants.js";

const serviceLogSchema = new mongoose.Schema(
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
    },
    type: {
      type: String,
      enum: Object.values(SERVICE_TYPE),
      required: true,
      index: true,
    },
    location: {
      type: String,
      enum: CITIES,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    mileageKm: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    cost: {
      type: Number,
      default: 0,
    },
    nextKm: {
      type: Number,
    },
    nextDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ServiceLog = mongoose.model("ServiceLog", serviceLogSchema);

