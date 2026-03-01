import { z } from "zod";
import { SERVICE_TYPE, CITIES } from "../config/constants.js";

export const createServiceSchema = z.object({
  body: z.object({
    carId: z.string().min(1),
    type: z.enum(Object.values(SERVICE_TYPE)),
    location: z.enum(CITIES),
    date: z.string().datetime(),
    mileageKm: z.number().min(0),
    description: z.string().optional(),
    cost: z.number().min(0).optional(),
    nextKm: z.number().min(0).optional(),
    nextDate: z.string().datetime().optional(),
  }),
});

export const updateServiceSchema = z.object({
  body: z.object({
    carId: z.string().min(1).optional(),
    type: z.enum(Object.values(SERVICE_TYPE)).optional(),
    location: z.enum(CITIES).optional(),
    date: z.string().datetime().optional(),
    mileageKm: z.number().min(0).optional(),
    description: z.string().optional(),
    cost: z.number().min(0).optional(),
    nextKm: z.number().min(0).optional(),
    nextDate: z.string().datetime().optional(),
  }),
});



















