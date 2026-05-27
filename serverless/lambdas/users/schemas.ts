import { z } from "zod";

export const CreateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
