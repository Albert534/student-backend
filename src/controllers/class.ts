import { Request, Response } from 'express';
import { CustomError } from '../globalError';
import { db } from '..';
import { classesTable } from '../db/schema';
import { itemChecker } from '../utils/itemChecker';
import pickBy from 'lodash/pickBy';
import { and, like, eq, inArray, desc } from 'drizzle-orm';
export const addClassController = async (req: Request, res: Response) => {
	try {
		const { name, teacher, price, startDate, endDate, type, image } = req.body;

		if (
			!name ||
			!teacher ||
			!price ||
			!startDate ||
			!endDate ||
			!image ||
			!type
		) {
			throw new CustomError('All fields are required', 400);
		}

		const newClass = await db.insert(classesTable).values({
			name,
			teacher,
			price,
			done: false,
			type,
			image,
			startDate,
			endDate,
		});

		res.status(200).json({
			success: true,
			message: 'Class added successfully',
			data: newClass,
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

export const getClassController = async (req: Request, res: Response) => {
	const { search, filter, page = 0, limit = 10 } = req.query;

	const pageNumber = Number(page) || 1;
	const limitNumber = Number(limit) || 10;
	const offset = (pageNumber - 1) * limitNumber;

	// Parse filter query param
	const filterArray = filter ? (filter as string).split(',') : [];

	const conditions: any[] = [];

	// 🔹 Search condition
	if (search) {
		conditions.push(like(classesTable.name, `%${search}%`));
	}

	// 🔹 Done / NotDone filter
	const doneFilters = filterArray.filter(
		(f) => f === 'done' || f === 'notDone',
	);

	if (doneFilters.length === 1) {
		// Only filter if exactly one is selected
		conditions.push(eq(classesTable.done, doneFilters[0] === 'done'));
	}
	// If both 'done' and 'notDone' are selected, no filter is applied for 'done' (show all)

	// 🔹 Class type filter
	const classTypes = filterArray.filter((type) =>
		['FRONTEND', 'BACKEND', 'MOBILE'].includes(type),
	);

	if (classTypes.length) {
		conditions.push(inArray(classesTable.type, classTypes));
	}
	conditions.push(eq(classesTable.activate, true));

	try {
		const classCount = await db.select().from(classesTable);

		const classes = await db
			.select()
			.from(classesTable)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(classesTable.id))
			.limit(limitNumber)
			.offset(offset);

		return res.status(200).json({
			success: true,
			message: 'Classes fetched successfully',
			page: pageNumber,
			limit: limitNumber,
			totalCount: classCount.length,

			data: classes,
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

export const editClassController = async (req: Request, res: Response) => {
	try {
		const { id, name, teacher, price, startDate, endDate, done } = req.body;

		const isItem = itemChecker(id, classesTable);

		if (!isItem) {
			throw new CustomError('Class not found', 404);
		}

		const updateData = pickBy(
			{ name, teacher, price, startDate, endDate, done },
			(value: any) => value !== undefined || value !== null,
		);

		const editClasses = await db
			.update(classesTable)
			.set(updateData)
			.where(eq(classesTable.id, id))
			.returning();

		res.status(200).json({
			success: true,
			message: 'Class edited successfully',
			data: editClasses,
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
			message: 'Something went wrong',
		});
	}
};

export const getClassByStudent = async (req: Request, res: Response) => {
	try {
		const { classIds } = req.body;

		// 1️⃣ Validate input
		if (!Array.isArray(classIds) || classIds.length === 0) {
			throw new CustomError('classIds must be a non-empty array', 400);
		}

		// 2️⃣ Query
		const classes = await db
			.select()
			.from(classesTable)
			.where(inArray(classesTable.id, classIds));

		// 3️⃣ Response
		return res.status(200).json({
			success: true,
			data: classes,
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

export const deleteClassController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const isItem = itemChecker(Number(id), classesTable);

		if (!isItem) {
			throw new CustomError('Class not found', 404);
		}

		const deleteClass = await db
			.update(classesTable)
			.set({ activate: false })
			.where(eq(classesTable.id, Number(id)))
			.returning();

		res.status(200).json({
			success: true,
			message: 'Class deleted successfully',
			data: deleteClass,
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
			message: 'Something went wrong',
		});
	}
};
