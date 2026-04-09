import { z } from "zod";

export const eventFiltersSchema = z.object({
  city: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
  price: z.enum(["all", "free", "paid"]).default("all"),
});

export const ticketTypeSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240).optional(),
    price: z.coerce.number().min(0),
    capacity: z.coerce.number().int().positive().max(500_000),
    includedDrinks: z.coerce.number().int().min(0).max(50).default(0),
    salesStart: z.string().datetime().optional(),
    salesEnd: z.string().datetime().optional(),
    isVisible: z.coerce.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.salesStart && value.salesEnd && new Date(value.salesEnd) <= new Date(value.salesStart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salesEnd"],
        message: "La venta de esta entrada debe terminar después de empezar.",
      });
    }
  });

export const createEventSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(5000),
    location: z.string().trim().min(2).max(160),
    city: z.string().trim().min(2).max(60),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
    date: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    imageUrl: z.string().trim().max(255).optional().or(z.literal("")),
    published: z.coerce.boolean().default(false),
    ticketTypes: z.array(ticketTypeSchema).min(1, "Añade al menos un tipo de entrada."),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && new Date(value.endDate) <= new Date(value.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "La hora de finalización debe ser posterior al inicio.",
      });
    }

    value.ticketTypes.forEach((ticketType, index) => {
      if (ticketType.salesEnd && new Date(ticketType.salesEnd) > new Date(value.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticketTypes", index, "salesEnd"],
          message: "La venta no puede terminar después del inicio del evento.",
        });
      }
    });
  });

export type EventFilters = z.infer<typeof eventFiltersSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
