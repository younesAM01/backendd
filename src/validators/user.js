import { z } from "zod";
import { CITIES } from "../config/constants.js";

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    branchCity: z.enum(CITIES),
    salary: z.number().min(0).optional(),
    responsable: z.number().min(0).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    branchCity: z.enum(CITIES).optional(),
    isActive: z.boolean().optional(),
    salary: z.number().min(0).optional(),
    responsable: z.number().min(0).optional(),
  }),
});











