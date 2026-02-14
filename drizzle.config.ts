import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const isProduction = process.env.NODE_ENV === 'production';
export default defineConfig({
	out: './drizzle',
	schema: './src/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url:
			isProduction ?
				process.env.NEON_DATABASE_URL!
			:	process.env.LOCAL_DATABASE_URL!,
	},
});
