// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../globalError';

export const errorHandler = (
	err: Error | CustomError,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	console.error(err); // log the error for debugging

	if (err instanceof CustomError) {
		return res.status(err.statusCode).json({
			success: false,
			message: err.message,
		});
	}

	// Fallback for unknown errors
	res.status(500).json({
		success: false,
		message: 'Something went wrong',
	});
};
