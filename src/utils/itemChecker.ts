import { db } from '..';
import { eq } from 'drizzle-orm';

export const itemChecker = async (id: number, table: any) => {
	const [item] = await db.select().from(table).where(eq(table.id, id)).limit(1);

	return Boolean(item);
};
