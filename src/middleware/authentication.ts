import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../globalError';
import { tokenValidator } from '../utils/token';

export const authHandler = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const authHeader = req.headers.authorization; // ✅ lowercase
		const refreshToken = req.headers['x-refresh-token'] as string | undefined;
		console.log('req.headers:', req.headers);
		console.log('authHeader:', authHeader);
		console.log('refreshToken:', refreshToken);

		if (!authHeader) {
			throw new CustomError('Authorization header missing', 401);
		}

		const accessToken = authHeader.split(' ')[1];

		if (!accessToken) {
			throw new CustomError('Access token missing', 401);
		}

		const validAccessToken = tokenValidator({
			token: accessToken,
			type: 'access',
		});

		if (!validAccessToken) {
			throw new CustomError('Invalid access token', 403);
		}

		// OPTIONAL refresh token validation
		if (refreshToken) {
			const validRefreshToken = tokenValidator({
				token: refreshToken,
				type: 'refresh',
			});

			if (!validRefreshToken) {
				throw new CustomError('Invalid refresh token', 401);
			}
		}

		next();
	} catch (error) {
		next(error);
	}
};
