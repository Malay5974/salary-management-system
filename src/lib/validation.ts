import { z } from 'zod';

const date = z.iso.date();
export const employeeInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().max(254).transform(value => value.toLowerCase()),
  department: z.string().trim().min(1).max(80),
  country: z.string().trim().length(2).transform(value => value.toUpperCase()),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()),
  startDate: date,
  salaryMinor: z.number().int().min(0).max(1_000_000_000_000),
  salaryEffectiveDate: date
}).refine(value => value.salaryEffectiveDate >= value.startDate, {
  message: 'Salary effective date cannot precede start date', path: ['salaryEffectiveDate']
});

export const salaryChangeInput = z.object({
  salaryMinor: z.number().int().min(0).max(1_000_000_000_000),
  effectiveDate: date,
  reason: z.string().trim().min(3).max(500)
});

export const listInput = z.object({
  q: z.string().trim().max(100).default(''),
  country: z.string().trim().max(2).default(''),
  department: z.string().trim().max(80).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['name', 'salary_asc', 'salary_desc']).default('name')
});
