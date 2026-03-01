import { z } from "zod";
import { CITIES, CAR_STATUS } from "../config/constants.js";

export const createCarSchema = z.object({
  body: z.object({
    plateNumber: z.string().min(1),
    immatriculation: z.string().optional(),
    immatww: z.string().optional(),
    brand: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    carburant: z.enum(["ESSENCE", "DIESEL", "HYBRIDE", "ELECTRIQUE"]).optional(),
    nCGrise: z.string().optional(),
    responsable: z.number().min(0).optional(),
    carColor: z.string().optional(),
    status: z.enum(Object.values(CAR_STATUS)).optional(),
    mileageKm: z.number().min(0).optional(),
    agence: z.enum(CITIES).optional(),
    carCity: z.enum(CITIES).optional(), // Keep for backward compatibility
    carLoan: z.object({
      amount: z.number().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      monthlyPayment: z.number().optional(),
      remainingAmount: z.number().optional(),
      description: z.string().optional(),
    }).optional(),
  }),
});

const expenseFieldSchema = z.object({
  date: z.string().optional(), // Accept any string (will be converted to Date in route handler)
  mileage: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  description: z.string().optional(),
  lastMaintenanceKilometrage: z.number().min(0).optional(),
  maintenanceIntervalKilometrage: z.number().min(0).optional(),
}).nullish(); // Accept null, undefined, or the object

export const updateCarSchema = z.object({
  body: z.object({
    plateNumber: z.string().min(1).optional(),
    immatriculation: z.string().optional(),
    immatww: z.string().optional(),
    brand: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    carburant: z.enum(["ESSENCE", "DIESEL", "HYBRIDE", "ELECTRIQUE"]).optional(),
    nCGrise: z.string().optional(),
    responsable: z.number().min(0).optional(),
    carColor: z.string().optional(),
    status: z.enum(Object.values(CAR_STATUS)).optional(),
    mileageKm: z.number().min(0).optional(),
    agence: z.enum(CITIES).optional(),
    carCity: z.enum(CITIES).optional(), // Keep for backward compatibility
    carLoan: z.object({
      amount: z.number().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      monthlyPayment: z.number().optional(),
      remainingAmount: z.number().optional(),
      description: z.string().optional(),
    }).optional(),
    // Expense fields - agents can update these
    vidange: expenseFieldSchema,
    maintenance: expenseFieldSchema,
    visiteTechnique: expenseFieldSchema,
    insurance: expenseFieldSchema,
    courroieDistribution: expenseFieldSchema,
  }),
});
