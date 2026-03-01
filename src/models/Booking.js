import mongoose from "mongoose";
import { BOOKING_STATUS, CITIES } from "../config/constants.js";

const bookingSchema = new mongoose.Schema(
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
    agence: {
      type: String,
      enum: CITIES,
      required: true,
      index: true,
    },
    placeOfService: {
      type: String,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    priceTotal: {
      type: Number,
      required: true,
    },
    deposit: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ["check", "espece", "tpe"],
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "not_fully_paid"],
      default: "not_fully_paid",
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customer: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressMorocco: { type: String, required: true },
      addressAbroad: { type: String },
      nationality: { type: String, required: true },
      driverLicenseNumber: { type: String, required: true },
      driverLicenseStartDate: { type: Date },
      driverLicenseEndDate: { type: Date },
      passportOrCIN: { type: String, required: true },
    },
    additionalDriver: {
      enabled: { type: Boolean, default: false },
      fullName: { type: String },
      phone: { type: String },
      addressMorocco: { type: String },
      addressAbroad: { type: String },
      nationality: { type: String },
      driverLicenseNumber: { type: String },
      driverLicenseStartDate: { type: Date },
      driverLicenseEndDate: { type: Date },
      passportOrCIN: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export const Booking = mongoose.model("Booking", bookingSchema);








