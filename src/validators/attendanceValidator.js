import Joi from 'joi';

export const qrTokenSchema = Joi.object({
  qr_token: Joi.string().required().messages({
    'any.required': 'QR token wajib diisi.',
  }),
  activity: Joi.string().max(200).optional().allow('').messages({
    'string.max': 'Kegiatan maksimal 200 karakter.',
  }),
});

export const checkoutSchema = Joi.object({
  qr_token: Joi.string().required().messages({
    'any.required': 'QR token wajib diisi.',
  }),
});
