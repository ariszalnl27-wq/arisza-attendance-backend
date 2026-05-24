import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  updateUserSchema, approveAttendanceSchema,
  processRedemptionSchema, createAdminSchema,
} from '../validators/adminValidator.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard',            adminController.getDashboard);
router.get('/qr',                   adminController.getQRCodes);
router.post('/qr/generate-token',   adminController.generateToken);

// Users
router.get('/users',                adminController.getUsers);
router.get('/users/export',         adminController.exportUsers);          // ← export Excel
router.get('/users/:id',            adminController.getUserById);
router.put('/users/:id',            validate(updateUserSchema), adminController.updateUser);
router.delete('/users/:id',         adminController.deactivateUser);

// Attendances
router.get('/attendances',          adminController.getAttendances);
router.put('/attendances/:id',      validate(approveAttendanceSchema), adminController.approveAttendance);

// Redemptions
router.get('/redemptions',          adminController.getRedemptions);
router.put('/redemptions/:id',      validate(processRedemptionSchema), adminController.processRedemption);

// Create admin
router.post('/create-admin',        validate(createAdminSchema), adminController.createAdmin);

export default router;
