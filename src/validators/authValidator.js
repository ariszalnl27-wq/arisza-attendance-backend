import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 100 karakter',
    'any.required': 'Nama wajib diisi',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Format email tidak valid',
    'any.required': 'Email wajib diisi',
  }),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
    'string.pattern.base': 'Nomor telepon harus 10-15 digit angka',
    'any.required': 'Nomor telepon wajib diisi',
  }),
  institution: Joi.string().max(200).optional().allow('').messages({
    'string.max': 'Instansi maksimal 200 karakter',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password minimal 8 karakter',
    'any.required': 'Password wajib diisi',
  }),
});

export const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Email atau nomor telepon wajib diisi',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password wajib diisi',
  }),
});

export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    'any.required': 'Refresh token wajib diisi',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Format email tidak valid',
    'any.required': 'Email wajib diisi',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token wajib diisi',
  }),
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'Password baru minimal 8 karakter',
    'any.required': 'Password baru wajib diisi',
  }),
});
