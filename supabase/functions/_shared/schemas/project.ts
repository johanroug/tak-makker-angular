import { z } from "npm:zod";

export const WorkItemSchema = z.object({
  id: z.string(),
  trade: z.string(),
  description: z.string(),
  descriptionSource: z.enum(["ai", "user"]).nullable(),
  estimateBasis: z.string().max(240).nullable(),
  status: z.enum(["suggested", "accepted", "rejected"]),
  estimatedHours: z.number().nullable(),
  estimatedHoursSource: z.enum(["ai", "user"]),
});
export type WorkItem = z.infer<typeof WorkItemSchema>;

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["suggested", "accepted", "rejected"]),
  quantity: z.number().nullable(),
  quantitySource: z.enum(["ai", "user"]).nullable(),
  unit: z.string().nullable(),
  unitSource: z.enum(["ai", "user"]).nullable(),
  unitPrice: z.number().nullable(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const ProjectCustomerSchema = z.object({
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  name: z.string().nullable(),
  address: z.string().nullable().default(null),
});

export const ProjectDetailsSchema = z.object({
  workAddress: z.string().nullable().default(null),
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  offerDescription: z.string().nullable().default(null),
});

const AiMaterialSchema = MaterialSchema.extend({
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  quantitySource: z.literal("ai").nullable(),
  unitSource: z.literal("ai").nullable(),
  unitPrice: z.number().nonnegative(),
  priceUpdateRequested: z.boolean(),
  quantityUpdateRequested: z.boolean(),
});

export const ProjectResponseSchema = z.object({
  complete: z.boolean(),

  customer: ProjectCustomerSchema,

  project: ProjectDetailsSchema,

  questions: z.array(z.string()).max(3),
  scopeWarnings: z.array(z.string().min(1).max(320)).max(3),

  workItems: z.array(WorkItemSchema),

  materials: z.array(AiMaterialSchema),
});
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

export const ProjectDraftSchema = z.object({
  complete: z.boolean().default(false),
  customer: ProjectCustomerSchema.extend({
    nameSource: z.enum(["ai", "user"]).nullable().default(null),
    addressSource: z.enum(["ai", "user"]).nullable().default(null),
  }),
  project: ProjectDetailsSchema.extend({
    workAddressSource: z.enum(["ai", "user"]).nullable().default(null),
    titleSource: z.enum(["ai", "user"]).nullable().default(null),
    descriptionSource: z.enum(["ai", "user"]).nullable().default(null),
    offerDescriptionSource: z.enum(["ai", "user"]).nullable().default(null),
  }),
  hourlyRate: z.number().nullable().default(null),
  workItems: z.array(WorkItemSchema),
  materials: z.array(MaterialSchema),
});
export type ProjectDraft = z.infer<typeof ProjectDraftSchema>;
