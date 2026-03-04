import mongoose from "mongoose";

const userExpenseSchema = new mongoose.Schema(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        return this.type !== "others";
      },
      index: true,
    },
    type: {
      type: String,
      enum: ["salary", "travel", "others"],
      required: true,
    },
    travelType: {
      type: String,
      enum: ["standard", "others"],
      default: "standard",
    },
    typeName: {
      type: String,
      required: function() {
        return this.type === "others";
      },
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userExpenseSchema.index({ agencyId: 1, userId: 1, date: 1 });

export const UserExpense = mongoose.model("UserExpense", userExpenseSchema);



