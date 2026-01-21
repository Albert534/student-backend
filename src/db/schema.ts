import {
	integer,
	pgTable,
	varchar,
	boolean,
	primaryKey,
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 255 }).notNull().unique(),
	email: varchar({ length: 255 }).notNull().unique(),
	password: varchar({ length: 255 }).notNull(),
});

export const classesTable = pgTable('classes', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	teacher: varchar({ length: 255 }).notNull(),
	image: varchar({ length: 255 }).notNull(),
	price: integer().notNull(),
	type: varchar({ length: 255 }).notNull(),
	done: boolean().notNull().default(false),
	activate: boolean().notNull().default(true),
	startDate: varchar({ length: 255 }).notNull(),
	endDate: varchar({ length: 255 }).notNull(),
});
export const studentTable = pgTable('students', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	activate: boolean().notNull().default(true),
	name: varchar({ length: 255 }).notNull(),
	joinedDate: varchar({ length: 255 }).notNull(),
	accomplishedClasses: integer().default(0),
});

export const studentClassesTable = pgTable(
	'student_classes',
	{
		student_id: integer('student_id')
			.notNull()
			.references(() => studentTable.id, { onDelete: 'cascade' }),

		class_id: integer('class_id')
			.notNull()
			.references(() => classesTable.id, { onDelete: 'cascade' }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.student_id, table.class_id] }),
	})
);
