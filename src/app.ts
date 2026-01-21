// src/app.ts
import express from 'express';
// import './utils/routes';
import cors from 'cors';
import AuthRoutes from './routes/auth';
import StudentRoutes from './routes/students';
import ClassRoutes from './routes/class';
import DashboardRoutes from './routes/dashboard';
import { log } from 'node:console';
import { errorHandler } from './middleware/errorHandler';

import routes from './utils/routes';
import { authHandler } from './middleware/authentication';
const app = express();
app.use(express.json());
app.use(
	cors({
		origin: 'http://localhost:5173', // your frontend URL EXACTLY
		credentials: true,
		exposedHeaders: ['Authorization', 'X-Refresh-Token'],
	})
);
console.log('App loaded'); // confirm app file runs

app.get('/', (req: any, res: { send: (arg0: string) => any }) =>
	res.send('Server is running!')
);
app.use(routes.auth, AuthRoutes); //routes is a seperate route attribute defined in utils
app.use(routes.students, authHandler, StudentRoutes);
app.use(routes.classes, authHandler, ClassRoutes);
app.use(routes.dashboard, authHandler, DashboardRoutes);
console.log('Routes loaded', routes.auth + ' ' + AuthRoutes);

app.use(errorHandler);

export default app;
