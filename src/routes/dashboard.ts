import express from 'express';
import {
	dashboardHeaderCardController,
	chartDataController,
} from '../controllers/dashboard';
const router = express.Router();

router.get('/dashboard-header-card', dashboardHeaderCardController);
router.get('/dashboard-chart', chartDataController);

export default router;
