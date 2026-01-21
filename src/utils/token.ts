import jwt, { JwtPayload } from 'jsonwebtoken';
import { CustomError } from '../globalError';
const secretKey = process.env.JWT_ACCESSTOKEN_KEY!;
const secretRefresh = process.env.JWT_REFRESHTOKEN_KEY!;
export const tokenGenerator = ({
	id,
	name,
}: {
	id?: number | string | JwtPayload;
	name?: string;
}) => {
	const accessToken = jwt.sign(
		{
			id: id,
			name: name,
		},
		secretKey, // secret key goes second
		{ expiresIn: '1m' } // options go third
	);
	const refreshToken = jwt.sign(
		{
			id: id,
			email: name,
		},
		secretRefresh,
		{ expiresIn: '7d' }
	);

	return { accessToken, refreshToken };
};

export const tokenValidator = ({
	token,
	type,
}: {
	token: string;
	type: string;
}) => {
	try {
		const decoded = jwt.verify(
			token,
			type === 'access' ? secretKey : secretRefresh
		);
		return decoded;
	} catch (error) {
		return null;
	}
};
