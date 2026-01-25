import bcrypt from 'bcryptjs';
import { getConnection } from './lib/db.js';
import { sendResponse, handleCors } from './lib/auth.js';

const ADMIN_PASS = 'ADMIN@gml-2026';

export const handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return handleCors();
    }

    // Verify Admin Password
    const adminHeader = event.headers['x-admin-pass'] || event.headers['X-Admin-Pass'];
    if (adminHeader !== ADMIN_PASS) {
        return sendResponse(401, null, false, 'Unauthorized: Invalid Admin Password');
    }

    const pool = await getConnection();

    try {
        // GET /admin-users - List all users
        if (event.httpMethod === 'GET') {
            console.log('Admin API: Fetching rows from auth_users...');
            const [users] = await pool.execute(
                'SELECT id, username, role, created_at, password FROM auth_users ORDER BY created_at DESC'
            );
            console.log(`Admin API: Found ${users.length} users.`);
            return sendResponse(200, users, true, 'Users retrieved');
        }

        // POST /admin-users - Create new user
        if (event.httpMethod === 'POST') {
            const { username, password } = JSON.parse(event.body || '{}');

            if (!username || !password) {
                return sendResponse(400, null, false, 'Username and password required');
            }

            // Check if exists
            const [existing] = await pool.execute(
                'SELECT id FROM auth_users WHERE username = ?',
                [username]
            );

            if (existing.length > 0) {
                return sendResponse(400, null, false, 'Username already exists');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await pool.execute(
                'INSERT INTO auth_users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, 'user']
            );

            return sendResponse(201, { id: result.insertId, username }, true, 'User created successfully');
        }

        // DELETE /admin-users?id=123 - Delete user
        if (event.httpMethod === 'DELETE') {
            const { id } = event.queryStringParameters || {};

            if (!id) {
                return sendResponse(400, null, false, 'User ID required');
            }

            await pool.execute('DELETE FROM auth_users WHERE id = ?', [id]);
            return sendResponse(200, null, true, 'User deleted successfully');
        }

        return sendResponse(404, null, false, 'Method not allowed');

    } catch (error) {
        console.error('Admin API Error:', error);
        return sendResponse(500, null, false, error.message);
    }
};
