import { getConnection } from './lib/db.js';
import { verifyToken, getTokenFromHeaders, sendResponse, handleCors } from './lib/auth.js';

export const handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleCors();
    }

    // Verify authentication
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
        return sendResponse(401, null, false, 'Unauthorized');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return sendResponse(401, null, false, 'Invalid token');
    }

    const userId = decoded.userId;
    const path = event.path.replace('/.netlify/functions/sessions', '').replace('/api/sessions', '');
    const pool = await getConnection();

    try {
        // GET /sessions - List all sessions for user
        if (event.httpMethod === 'GET' && (path === '' || path === '/')) {
            const [rows] = await pool.execute(
                `SELECT u.*, COUNT(i.id) as ip_count 
         FROM users u 
         LEFT JOIN user_ips i ON u.id = i.user_id 
         WHERE u.created_by = ? 
         GROUP BY u.id 
         ORDER BY u.id DESC`,
                [userId]
            );

            const sessions = rows.map(row => ({
                ...row,
                color: row.color || '#3b82f6'
            }));

            return sendResponse(200, sessions, true);
        }

        // GET /sessions/stats - Get user stats
        if (event.httpMethod === 'GET' && path === '/stats') {
            const [sessionCount] = await pool.execute(
                'SELECT COUNT(*) as c FROM users WHERE created_by = ?',
                [userId]
            );

            const [ipCount] = await pool.execute(
                `SELECT COUNT(i.id) as c 
         FROM user_ips i 
         JOIN users u ON i.user_id = u.id 
         WHERE u.created_by = ?`,
                [userId]
            );

            return sendResponse(200, {
                total_sessions: sessionCount[0].c,
                total_ips: ipCount[0].c,
                active_pmtas: ipCount[0].c
            }, true);
        }

        // POST /sessions - Create new session
        if (event.httpMethod === 'POST' && (path === '' || path === '/')) {
            const { session_id, name, color, raw_ips } = JSON.parse(event.body || '{}');

            const [result] = await pool.execute(
                'INSERT INTO users (session_id, name, color, created_by) VALUES (?, ?, ?, ?)',
                [session_id, name, color || '#3b82f6', userId]
            );

            const newId = result.insertId;

            if (raw_ips) {
                await processBulkIps(pool, newId, raw_ips);
            }

            return sendResponse(200, { id: newId }, true, 'Session created');
        }

        // PUT /sessions/:id - Update session
        if (event.httpMethod === 'PUT') {
            const sessionId = path.replace('/', '');
            const { session_id, name, color } = JSON.parse(event.body || '{}');

            const [check] = await pool.execute(
                'SELECT id FROM users WHERE id = ? AND created_by = ?',
                [sessionId, userId]
            );

            if (check.length === 0) {
                return sendResponse(403, null, false, 'Access denied');
            }

            await pool.execute(
                'UPDATE users SET session_id = ?, name = ?, color = ? WHERE id = ?',
                [session_id, name, color, sessionId]
            );

            return sendResponse(200, null, true, 'Session updated');
        }

        // DELETE /sessions/:id - Delete session
        if (event.httpMethod === 'DELETE') {
            const sessionId = path.replace('/', '');

            const [check] = await pool.execute(
                'SELECT id FROM users WHERE id = ? AND created_by = ?',
                [sessionId, userId]
            );

            if (check.length === 0) {
                return sendResponse(403, null, false, 'Access denied');
            }

            await pool.execute('DELETE FROM user_ips WHERE user_id = ?', [sessionId]);
            await pool.execute('DELETE FROM users WHERE id = ?', [sessionId]);

            return sendResponse(200, null, true, 'Session deleted');
        }

        return sendResponse(404, null, false, 'Not found');

    } catch (error) {
        console.error('Sessions error:', error);
        return sendResponse(500, null, false, error.message || 'Internal server error');
    }
};

async function processBulkIps(pool, userId, rawText) {
    const lines = rawText.split(/\r\n|\n|\r/);
    let count = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let label = 'Server';
        let ip = '';

        const match = trimmed.match(/(.+)[\s,;:_-]+(\d{1,3}(?:\.\d{1,3}){3})$/);
        if (match) {
            label = match[1].trim();
            ip = match[2].trim();
        } else if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(trimmed)) {
            ip = trimmed;
        } else {
            continue;
        }

        await pool.execute(
            'INSERT INTO user_ips (user_id, ip_address, label) VALUES (?, ?, ?)',
            [userId, ip, label]
        );
        count++;
    }

    return count;
}
