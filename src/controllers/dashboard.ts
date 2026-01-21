import { Request, Response } from 'express';
import { db } from '..';
import dayjs from 'dayjs';
import { studentTable, classesTable, studentClassesTable } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { CustomError } from '../globalError';

type RevenueType = {
	month: string; // 'January', 'February', ...
	type: 'Frontend' | 'Backend' | 'Mobile';
	totalRevenue: number;
};

export const dashboardHeaderCardController = async (
	req: Request,
	res: Response
) => {
	try {
		const totalStudents = await db.select().from(studentTable);
		const completedClasses = await db
			.select()
			.from(classesTable)
			.where(eq(classesTable.done, true));
		const completedStudents = await db
			.select()
			.from(studentTable)
			.where(eq(studentTable.accomplishedClasses, 1));
		const totalClasses = await db.select().from(classesTable);

		return res.status(200).json({
			success: true,
			message: 'Dashboard header card fetched successfully',
			data: {
				totalStudentsCount: totalStudents.length,
				totalClassesCount: totalClasses.length,
				completedClasses: completedClasses.length,
				completedStudents: completedStudents.length,
			},
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

export const chartDataController = async (req: Request, res: Response) => {
	try {
		// 1. Fetch all classes that are NOT done
		const classesWithCounts = await db
			.select({
				id: classesTable.id,
				teacher: classesTable.teacher,
				name: classesTable.name,
				image: classesTable.image,
				studentCount:
					sql<number>`count(${studentClassesTable.class_id})`.mapWith(Number),
			})
			.from(classesTable)
			.leftJoin(
				studentClassesTable,
				eq(classesTable.id, studentClassesTable.class_id)
			)
			.where(eq(classesTable.done, false))
			.groupBy(classesTable.id);

		// 2. Aggregate total revenue by type
		const statsByType = await db
			.select({
				type: classesTable.type,
				studentCount:
					sql<number>`count(${studentClassesTable.student_id})`.mapWith(Number),
				totalRevenue: sql<number>`sum(${classesTable.price})`.mapWith(Number),
			})
			.from(studentClassesTable)
			.innerJoin(
				classesTable,
				eq(studentClassesTable.class_id, classesTable.id)
			)
			.where(eq(classesTable.done, false))
			.groupBy(classesTable.type);

		const frontendRevenue = statsByType.find((s) => s.type === 'FRONTEND');
		const backendRevenue = statsByType.find((s) => s.type === 'BACKEND');
		const mobileRevenue = statsByType.find((s) => s.type === 'MOBILE');

		const revenueData = [
			{ frontendRevenue: frontendRevenue?.totalRevenue || 0 },
			{ backendRevenue: backendRevenue?.totalRevenue || 0 },
			{ mobileRevenue: mobileRevenue?.totalRevenue || 0 },
		];

		// 2. Sum revenue per month/type
		const revenuePerClass = await db
			.select({
				month: sql<string>`TO_CHAR(TO_DATE(${classesTable.startDate}, 'YYYY-MM-DD'), 'YYYY-MM')`,
				type: classesTable.type,
				classRevenue:
					sql<number>`(${classesTable.price} * COUNT(${studentClassesTable.student_id}))`.mapWith(
						Number
					),
			})
			.from(classesTable)
			.leftJoin(
				studentClassesTable,
				eq(studentClassesTable.class_id, classesTable.id)
			)
			.where(eq(classesTable.done, false))
			.groupBy(classesTable.id);

		// Step 2: Sum revenue per month/type
		const revenueByMonthRaw = revenuePerClass.reduce((acc, curr) => {
			const key = curr.month;
			if (!acc[key])
				acc[key] = { month: curr.month, Frontend: 0, Backend: 0, Mobile: 0 };
			if (curr.type === 'FRONTEND') acc[key].Frontend += curr.classRevenue;
			else if (curr.type === 'BACKEND') acc[key].Backend += curr.classRevenue;
			else acc[key].Mobile += curr.classRevenue;
			return acc;
		}, {} as Record<string, { month: string; Frontend: number; Backend: number; Mobile: number }>);

		// Step 3: Generate next 6 months from now
		const startMonth = dayjs();
		const next6Months = Array.from({ length: 6 }, (_, i) =>
			startMonth.add(i, 'month').format('YYYY-MM')
		);

		// Step 4: Create final array with pivoted data
		// Step 4: Create final array with pivoted data, including empty months
		const finalData = next6Months.map((m) => {
			const raw = revenueByMonthRaw[m];
			return {
				month: dayjs(m + '-01').format('MMMM'),
				Frontend: raw?.Frontend || 0,
				Backend: raw?.Backend || 0,
				Mobile: raw?.Mobile || 0,
			};
		});

		// 5. Get distinct teachers
		const teachers = await db
			.selectDistinct({
				teacher: classesTable.teacher,
				type: classesTable.type,
			})
			.from(classesTable);

		return res.status(200).json({
			success: true,
			data: {
				runningClasses: classesWithCounts,
				revenues: revenueData,
				revenuesByMonth: finalData,
				teachers: teachers,
			},
		});
	} catch (error: any) {
		console.error('Database Error:', error);
		return res.status(500).json({
			message: 'Failed to fetch chart data',
			error: error.message,
		});
	}
};
