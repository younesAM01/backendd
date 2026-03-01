import { z } from "zod";

export const createClientSchema = z.object({
  body: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    addressMorocco: z.string().min(1),
    addressAbroad: z.string().optional(),
    nationality: z.enum(["morocain", "morocain IMR", "etrangé"]),
    driverLicenseNumber: z.string().min(1),
    driverLicenseStartDate: z.string().datetime().optional(),
    driverLicenseEndDate: z.string().datetime().optional(),
    passportOrCIN: z.string().min(1),
    status: z.enum(["good", "bad", "blacklist"]).optional(),
    description: z.string().optional(),
  }),
});

export const updateClientSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    addressMorocco: z.string().min(1).optional(),
    addressAbroad: z.string().optional(),
    nationality: z.enum(["morocain", "morocain IMR", "etrangé"]).optional(),
    driverLicenseNumber: z.string().min(1).optional(),
    driverLicenseStartDate: z.string().datetime().optional(),
    driverLicenseEndDate: z.string().datetime().optional(),
    passportOrCIN: z.string().min(1).optional(),
    status: z.enum(["good", "bad", "blacklist"]).optional(),
    description: z.string().optional(),
  }),
});












