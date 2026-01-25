import bcrypt from 'bcryptjs';
import { getConnection } from './lib/db.js';
import { createToken, verifyToken, getTokenFromHeaders, sendResponse, handleCors } from './lib/auth.js';

export const handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleCors();
    }

    const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');

    try {
        // POST /auth/login
        if (event.httpMethod === 'POST' && (path === '/login' || path === '')) {
            const { username, password } = JSON.parse(event.body || '{}');

            if (!username || !password) {
                return sendResponse(400, null, false, 'Username and password required');
            }

            const pool = await getConnection();
            const [rows] = await pool.execute(
                'SELECT id, username, password, role FROM auth_users WHERE username = ?',
                [username]
            );

            if (rows.length === 0) {
                return sendResponse(401, null, false, 'Invalid credentials');
            }

            const user = rows[0];
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
                return sendResponse(401, null, false, 'Invalid credentials');
            }

            const token = createToken({
                userId: user.id,
                username: user.username,
                role: user.role
            });

            return sendResponse(200, {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            }, true, 'Login successful');
        }

        // GET /auth/check
        if (event.httpMethod === 'GET' && path === '/check') {
            const token = getTokenFromHeaders(event.headers);

            if (!token) {
                return sendResponse(401, null, false, 'No token provided');
            }

            const decoded = verifyToken(token);

            if (!decoded) {
                return sendResponse(401, null, false, 'Invalid token');
            }

            return sendResponse(200, {
                user: {
                    id: decoded.userId,
                    username: decoded.username,
                    role: decoded.role
                }
            }, true, 'Authenticated');
        }

        // POST /auth/logout
        if (event.httpMethod === 'POST' && path === '/logout') {
            return sendResponse(200, null, true, 'Logged out');
        }



        return sendResponse(404, null, false, 'Not found');

    } catch (error) {
        console.error('Auth error:', error);
        return sendResponse(500, null, false, error.message || 'Internal server error');
    }
};
