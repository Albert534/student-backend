//@ts-nocheck
import { Request, Response } from 'express';
import { db } from '..';
import { CustomError } from '../globalError';
import { studentClassesTable, studentTable } from '../db/schema';

import { itemChecker } from '../utils/itemChecker';
import pickBy from 'lodash/pickBy';
import { eq, inArray, like, desc, gt, asc, sql } from 'drizzle-orm';

export const getStudentsController = async (req: Request, res: Response) => {
	const { search, filter, page = 1, limit = 10 } = req.query;

	const pageNumber = Number(page) || 1;
	const limitNumber = Number(limit) || 10;
	const offset = (pageNumber - 1) * limitNumber;

	const filterArray = filter ? (filter as string).split(',') : [];

	try {
		// -------------------------
		// 1️⃣ Build an array of conditions dynamically
		// -------------------------
		const conditions: any[] = [];
		console.log('These are the conditions', conditions);

		// -------------------------

		if (search) {
			conditions.push(like(studentTable.name, `%${search}%`));
		}

		if (filterArray.includes('accomplished')) {
			conditions.push(gt(studentTable.accomplishedClasses, 0));
		} else if (filterArray.includes('unaccomplished')) {
			conditions.push(eq(studentTable.accomplishedClasses, 0));
		}

		// -------------------------
		// 2️⃣ Handle sorting
		// -------------------------
		let sortColumn = studentTable.joinedDate;
		let sortOrder = desc;

		if (filterArray.includes('oldest')) sortOrder = asc;
		else if (filterArray.includes('recent')) sortOrder = desc;

		// -------------------------
		// 3️⃣ Build query
		// -------------------------
		const studentCount = await db.select().from(studentTable);
		let query = db
			.select({
				id: studentTable.id,
				name: studentTable.name,
				joinedDate: studentTable.joinedDate,
				accomplishedClasses: studentTable.accomplishedClasses,
				classes: sql<any[]>`
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'studentId', ${studentClassesTable.student_id},
            'classId', ${studentClassesTable.class_id}
          )
        ) FILTER (WHERE ${studentClassesTable.student_id} IS NOT NULL),
        '[]'
      )
    `,
			})
			.from(studentTable)
			.where(studentTable.activate, true)
			.leftJoin(
				studentClassesTable,
				eq(studentClassesTable.student_id, studentTable.id)
			)
			.groupBy(studentTable.id)
			.orderBy(sortOrder(studentTable.joinedDate))
			.limit(limitNumber)
			.offset(offset);

		// Apply dynamic conditions
		if (conditions.length > 0) {
			query = query.where(...conditions);
		}

		const students = await query;

		return res.status(200).json({
			success: true,
			message: 'Students fetched successfully',
			data: students,
			totalCount: studentCount.length,
		});
	} catch (error) {
		if (error instanceof CustomError) {
			return res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
export const addStudentController = async (req: Request, res: Response) => {
	try {
		const { name, classIds, joinedDate } = req.body;
		console.log(name, classIds, joinedDate);
		if (
			!name ||
			!Array.isArray(classIds) ||
			classIds.length === 0 ||
			!joinedDate
		) {
			throw new CustomError('All fields are required', 400);
		}

		const result = await db.transaction(async (tx) => {
			// 1️⃣ Insert student & RETURN id
			const [student] = await tx
				.insert(studentTable)
				.values({
					name,
					joinedDate,
					accomplishedClasses: 0,
				})
				.returning({ id: studentTable.id });

			// 2️⃣ Insert student_classes records
			const studentClassesValues = classIds.map((classId: number) => ({
				student_id: student.id,
				class_id: classId,
			}));

			await tx.insert(studentClassesTable).values(studentClassesValues);

			return student;
		});

		console.log(result);

		return res.status(201).json({
			success: true,
			message: 'Student added successfully',
			data: result,
		});
	} catch (error: any) {
		if (error instanceof CustomError) {
			return res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

export const editStudentController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, classIds, joinedDate, accomplishedClasses } = req.body;

		const isUser = await itemChecker(id, studentTable);
		console.log('isUser', isUser);
		if (!isUser) {
			throw new CustomError('User not found', 404);
		}

		const updateData = pickBy(
			{ name, joinedDate, accomplishedClasses },
			(value: any) => value !== undefined && value !== null && value !== ''
		);

		const updateStudent = await db
			.update(studentTable)
			.set(updateData)
			.where(eq(studentTable.id, id))
			.returning();

		const studentClassValue = classIds.map((classId: number) => ({
			class_id: classId,
		}));
		console.log('RAW BODY:', req.body);
		console.log('UPDATE DATA:', updateData);
		console.log('STUDENT CLASS VALUES:', studentClassValue);
		console.log('updatedStudent', updateStudent);

		await db.transaction(async (tx) => {
			// Update student basic info
			await tx
				.update(studentTable)
				.set(updateData)
				.where(eq(studentTable.id, id));

			// Reset classes
			await tx
				.delete(studentClassesTable)
				.where(eq(studentClassesTable.student_id, id));

			if (classIds.length > 0) {
				await tx
					.insert(studentClassesTable)
					.values(
						classIds.map((c: number) => ({ student_id: id, class_id: c }))
					);
			}
		});

		return res.status(200).json({
			success: true,
			message: 'Student edited successfully',
			data: updateStudent,
		});
	} catch (error: any) {
		if (error instanceof CustomError) {
			return res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

export const deleteStudentController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const isUser = await itemChecker(id, studentTable);

		if (!isUser) {
			throw new CustomError('User not found', 404);
		}

		const deleteStudent = await db
			.update(studentTable)
			.set({ activate: false })
			.where(eq(studentTable.id, id));

		res.status(200).json({
			success: true,
			message: 'Student deleted successfully',
			data: deleteStudent,
		});
	} catch (error: any) {
		if (error instanceof CustomError) {
			return res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
