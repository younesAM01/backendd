import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      required: true,
      index: true,
    },
    addressMorocco: {
      type: String,
      required: true,
    },
    addressAbroad: {
      type: String,
    },
    nationality: {
      type: String,
      enum: ["morocain", "morocain IMR", "etrangé"],
      required: true,
    },
    driverLicenseNumber: {
      type: String,
      required: true,
    },
    driverLicenseStartDate: {
      type: Date,
    },
    driverLicenseEndDate: {
      type: Date,
    },
    passportOrCIN: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["good", "bad", "blacklist"],
      default: "good",
      index: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique passportOrCIN per agency
clientSchema.index({ agencyId: 1, passportOrCIN: 1 }, { unique: true });

export const Client = mongoose.model("Client", clientSchema);












