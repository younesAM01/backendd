import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      unique: true,
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

// Generate clientId before saving if it doesn't exist
clientSchema.pre("save", async function (next) {
  if (!this.clientId) {
    // Generate a unique client ID: CLT + random alphanumeric string
    const generateClientId = () => {
      const prefix = "CLT";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let randomPart = "";
      for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${prefix}-${randomPart}`;
    };

    let clientId = generateClientId();
    // Ensure uniqueness
    let existingClient = await this.constructor.findOne({ clientId });
    while (existingClient) {
      clientId = generateClientId();
      existingClient = await this.constructor.findOne({ clientId });
    }
    this.clientId = clientId;
  }
  next();
});

export const Client = mongoose.model("Client", clientSchema);












