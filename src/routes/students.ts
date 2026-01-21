import express from 'express';
import {
	getStudentsController,
	addStudentController,
	editStudentController,
	deleteStudentController,
} from '../controllers/students';
import { getClassByStudent } from '../controllers/class';
const router = express.Router();

router.get('/students', getStudentsController);
router.post('/students/add-students', addStudentController);
router.put('/students/edit-student/:id', editStudentController);
router.post('/students/getClasses', getClassByStudent);
router.put('/students/delete-student/:id', deleteStudentController);
export default router;
