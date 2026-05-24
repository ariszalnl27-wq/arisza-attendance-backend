import { Router } from 'express';
import * as attendanceController from '../controllers/attendanceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { qrTokenSchema, checkoutSchema } from '../validators/attendanceValidator.js';

const router = Router();

router.use(authenticate);

router.post('/check-in',        validate(qrTokenSchema),  attendanceController.checkIn);
router.post('/check-out',       validate(checkoutSchema),  attendanceController.checkOut);
router.get('/today',            attendanceController.getTodayStatus);
router.get('/history',          attendanceController.getHistory);
router.get('/points',           attendanceController.getPoints);
router.post('/points/redeem',   attendanceController.redeemPoints);
router.get('/points/redemptions', attendanceController.getRedemptions);

export default router;
