import { z } from 'zod';

export const extinguisherSchema = z.object({
  serialNumber: z.string().min(2, 'Serial number is required').max(80),
  location: z.string().min(2, 'Location is required').max(120),
  type: z.enum(['Water', 'CO2', 'Foam', 'Dry Chemical']),
  size: z.enum(['2.5 lb', '5 lb', '9 lb', '12 lb']),
  installationDate: z.string().min(1, 'Installation date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
});

export const inspectionSchema = z.object({
  extinguisherId: z.string().uuid('Choose an extinguisher'),
  inspectorId: z.string().uuid('Choose an inspector'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const maintenanceSchema = z.object({
  extinguisherId: z.string().uuid('Choose an extinguisher'),
  actionTaken: z.string().min(3, 'Action taken is required').max(300),
  maintenanceDate: z.string().min(1, 'Maintenance date is required'),
  issuesIdentified: z.string().max(1000).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  recommendations: z.string().max(1000).optional().or(z.literal('')),
});

export const profileSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
});
