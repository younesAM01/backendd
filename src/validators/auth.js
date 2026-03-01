import { z } from "zod";
import { CITIES } from "../config/constants.js";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const registerAdminSchema = z.object({
  body: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    agencyId: z.string().min(1),
    branchCity: z.enum(CITIES),
    setupSecret: z.string(),
  }),
});

