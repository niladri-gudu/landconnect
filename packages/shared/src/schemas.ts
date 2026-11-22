import { z } from "zod";
import {
  CALL_KINDS,
  LISTING_STATUSES,
  MESSAGE_TYPES,
  ROLES,
} from "./constants";

export const zRole = z.enum(ROLES);
export const zListingStatus = z.enum(LISTING_STATUSES);
export const zMessageType = z.enum(MESSAGE_TYPES);
export const zCallKind = z.enum(CALL_KINDS);

const email = z.string().trim().toLowerCase().email("Enter a valid email");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");
const uuid = z.string().uuid("Invalid id");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  role: zRole,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number")
    .optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20).max(500),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const logoutSchema = refreshTokenSchema;
export type LogoutInput = z.infer<typeof logoutSchema>;

export const listingCreateSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(4000),
  price: z.coerce.number().positive().max(1_000_000_000_000),
  areaAcres: z.coerce.number().positive().max(1_000_000),
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100).default("India"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  images: z.array(z.string().url()).max(10).default([]),
  status: zListingStatus.optional(),
});
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;

export const listingUpdateSchema = listingCreateSchema.partial();
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;

export const listingQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const conversationCreateSchema = z.object({
  listingId: uuid,
  participantId: uuid,
});
export type ConversationCreateInput = z.infer<typeof conversationCreateSchema>;

export const messageCreateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  type: zMessageType.default("TEXT"),
});
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

export const callCreateSchema = z.object({
  conversationId: uuid,
  kind: zCallKind,
});
export type CallCreateInput = z.infer<typeof callCreateSchema>;

export const callAnswerSchema = z.object({
  accept: z.boolean(),
});
export type CallAnswerInput = z.infer<typeof callAnswerSchema>;
