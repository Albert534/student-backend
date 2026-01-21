// src/controllers/auth.ts

interface RefreshTokenPayload extends JwtPayload {
	id: number;
	email?: string;
}
import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { CustomError } from '../globalError';
import { usersTable } from '../db/schema';
import { db } from '..';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { tokenGenerator } from '../utils/token';

// TypeScript interface for request body
interface LoginBody {
	email: string;
	password: string;
}

export const loginController = async (
	req: Request<{}, {}, LoginBody>,
	res: Response,
) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			throw new CustomError('Email and password are required', 400);
		}

		// 1️⃣ Fetch user from database
		const users = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.email, email))
			.limit(1);

		if (users.length === 0) {
			// User does not exist
			throw new CustomError('User not found', 404);
		}

		const user = users[0];

		// 2️⃣ Compare password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			throw new CustomError('Invalid password', 401);
		}

		// 3️⃣ Generate JWT tokens
		const { accessToken, refreshToken } = tokenGenerator({
			id: user.id,
			name: user.name,
		});

		// 4️⃣ Send response with headers
		res.header('Authorization', `Bearer ${accessToken}`);
		res.header('x-refresh-token', refreshToken);
		res.status(200).json({
			success: true,
			message: 'Login successful',
			data: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: 'Something went wrong',
		});
		return; // Add this line to return from the function
	}
};

export const logOutController = async (res: Response) => {
	try {
		// Clear headers
		res.header('Authorization', '');
		res.header('x-refresh-token', '');
		res.status(200).json({
			success: true,
			message: 'Logout successful',
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: 'Something went wrong',
		});
	}
};

export const refreshController = async (req: Request, res: Response) => {
	try {
		const oldRefreshToken = req.headers['x-refresh-token'] as string;

		if (!oldRefreshToken) {
			throw new CustomError('Refresh token missing', 401);
		}

		const decodedRefreshToken = jwt.verify(
			oldRefreshToken,
			process.env.JWT_REFRESHTOKEN_KEY!,
		) as RefreshTokenPayload;

		if (decodedRefreshToken === null) {
			throw new CustomError('Invalid refresh token', 403);
		}

		const { accessToken, refreshToken: newRefreshToken } = tokenGenerator({
			id: decodedRefreshToken as JwtPayload['id'],
			name: decodedRefreshToken.email,
		});

		res.header('Authorization', `Bearer ${accessToken}`);
		res.header('x-refresh-token', newRefreshToken);
		res.status(200).json({
			success: true,
			message: 'Refresh successful',
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
