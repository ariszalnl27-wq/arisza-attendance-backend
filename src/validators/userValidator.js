import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 100 karakter',
  }),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
    'string.pattern.base': 'Nomor telepon harus 10-15 digit angka',
  }),
  institution: Joi.string().max(200).optional().allow('').messages({
    'string.max': 'Instansi maksimal 200 karakter',
  }),
}).min(1).messages({
  'object.min': 'Minimal satu field harus diisi',
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Password saat ini wajib diisi',
  }),
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'Password baru minimal 8 karakter',
    'any.required': 'Password baru wajib diisi',
  }),
});
