import { z } from "zod";
import { BOOKING_STATUS, CITIES } from "../config/constants.js";

const customerSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  addressMorocco: z.string().min(1),
  addressAbroad: z.string().optional(),
  nationality: z.enum(["morocain", "morocain IMR", "etrangé"]),
  driverLicenseNumber: z.string().min(1),
  driverLicenseStartDate: z.string().datetime().optional(),
  driverLicenseEndDate: z.string().datetime().optional(),
  passportOrCIN: z.string().min(1),
});

const additionalDriverSchema = z.object({
  enabled: z.boolean(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  addressMorocco: z.string().optional(),
  addressAbroad: z.string().optional(),
  nationality: z.enum(["morocain", "morocain IMR", "etrangé"]).optional(),
  driverLicenseNumber: z.string().optional(),
  driverLicenseStartDate: z.string().datetime().optional(),
  driverLicenseEndDate: z.string().datetime().optional(),
  passportOrCIN: z.string().optional(),
}).refine(
  (data) => {
    if (data.enabled) {
      return (
        data.fullName &&
        data.addressMorocco &&
        data.nationality &&
        data.driverLicenseNumber &&
        data.passportOrCIN
      );
    }
    return true;
  },
  {
    message: "Additional driver fields are required when enabled",
  }
);

export const createBookingSchema = z.object({
  body: z.object({
    carId: z.string().min(1),
    agence: z.enum(CITIES),
    placeOfService: z.string().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    priceTotal: z.number().min(0),
    deposit: z.number().min(0).optional(),
    paymentMode: z.enum(["check", "espece", "tpe"]).optional(),
    paymentStatus: z.enum(["paid", "not_fully_paid"]).optional(),
    status: z.enum(Object.values(BOOKING_STATUS)).optional(),
    agent: z.string().optional(),
    customer: customerSchema,
    additionalDriver: additionalDriverSchema.optional(),
  }),
});

export const updateBookingSchema = z.object({
  body: z.object({
    carId: z.string().min(1).optional(),
    agence: z.enum(CITIES).optional(),
    placeOfService: z.string().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    priceTotal: z.number().min(0).optional(),
    deposit: z.number().min(0).optional(),
    paymentMode: z.enum(["check", "espece", "tpe"]).optional(),
    paymentStatus: z.enum(["paid", "not_fully_paid"]).optional(),
    status: z.enum(Object.values(BOOKING_STATUS)).optional(),
    agent: z.string().optional(),
    customer: customerSchema.optional(),
    additionalDriver: additionalDriverSchema.optional(),
  }),
});








