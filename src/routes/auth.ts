import express from 'express';
import {
	loginController,
	logOutController,
	refreshController,
} from '../controllers/auth';
const router = express.Router();

router.post('/login', loginController);
router.post('/logout', logOutController);
router.post('/refresh-token', refreshController);

export default router;
