import express from 'express';
import {
	addClassController,
	getClassController,
	editClassController,
	deleteClassController,
} from '../controllers/class';
const router = express.Router();

router.post('/add-class', addClassController);
router.get('/get-classes', getClassController);
router.put('/edit-class/', editClassController);
router.put('/delete-class/:id', deleteClassController);

export default router;
