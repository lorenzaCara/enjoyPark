import { z } from 'zod';

export const validateQrCodeValidator = z.object({
  qrCode: z.string().nonempty("QR Code is required"),
});
