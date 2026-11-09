import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(200),
  subject: z.string().trim().min(3, "Please add a subject.").max(200),
  message: z.string().trim().min(20, "Please write at least 20 characters.").max(5000),
  /** Honeypot: must stay empty. Bots tend to fill every field. */
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.input<typeof contactSchema>;
