import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  registerSchema, loginSchema, refreshTokenSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from '../validators/authValidator.js';

const router = Router();

router.post('/register',        validate(registerSchema),       authController.register);
router.post('/login',           validate(loginSchema),          authController.login);
router.post('/google',          authController.googleAuth);
router.post('/refresh-token',   validate(refreshTokenSchema),   authController.refreshToken);
router.post('/logout',          validate(refreshTokenSchema),   authController.logout);
router.post('/logout-all',      authenticate,                   authController.logoutAll);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),  authController.resetPassword);

export default router;
