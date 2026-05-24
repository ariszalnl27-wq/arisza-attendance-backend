import Joi from 'joi';

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  institution: Joi.string().max(200).optional().allow(''),
  is_active: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Minimal satu field harus diisi',
});

export const approveAttendanceSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.only': 'Status harus approved atau rejected',
    'any.required': 'Status wajib diisi',
  }),
  admin_notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Catatan admin maksimal 500 karakter',
  }),
});

export const processRedemptionSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.only': 'Status harus approved atau rejected',
    'any.required': 'Status wajib diisi',
  }),
  admin_notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Catatan admin maksimal 500 karakter',
  }),
});

export const createAdminSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  password: Joi.string().min(8).required(),
});
