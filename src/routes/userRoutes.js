import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadPhoto } from '../middlewares/uploadMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/userValidator.js';

const router = Router();

// Semua route memerlukan autentikasi
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.post('/profile/photo', uploadPhoto.single('photo'), userController.uploadProfilePhoto);
router.put('/change-password', validate(changePasswordSchema), userController.changePassword);

export default router;
