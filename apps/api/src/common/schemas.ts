import { z } from 'zod';
import { unitCodes, type UnitCode } from '@dwar/game-core';

export const id = z.union([
  z.number().int().positive().max(2147483647),
  z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(2147483647)),
]);

export const operationKey = z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/);

export const resourceName = z.enum(['wood', 'stone', 'iron']);

export const tradeResources = z.object({
  wood: z.number().int().min(0).max(999999),
  stone: z.number().int().min(0).max(999999),
  iron: z.number().int().min(0).max(999999),
});

export const troopCounts = z.record(
  z.enum(unitCodes as [UnitCode, ...UnitCode[]]),
  z.number().int().min(0).max(2147483647),
);

export const coordinate = z.number().int().min(0).max(999);

export const bodySchema = {
  type: 'object' as const,
  properties: {
    email: { type: 'string' as const, format: 'email' },
    password: { type: 'string' as const, minLength: 10, maxLength: 128 },
  },
  required: ['email', 'password'],
};
