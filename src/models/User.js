import mongoose from "mongoose";
import { CITIES, USER_ROLES } from "../config/constants.js";

const userSchema = new mongoose.Schema(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.AGENT,
    },
    branchCity: {
      type: String,
      enum: CITIES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    responsable: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique email per agency
userSchema.index({ agencyId: 1, email: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);











