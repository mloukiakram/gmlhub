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
    const path = event.path.replace('/.netlify/functions/ips', '').replace('/api/ips', '');
    const pool = await getConnection();

    try {
        // GET /ips/:sessionId - Get IPs for a session
        if (event.httpMethod === 'GET' && path.length > 1) {
            const sessionId = path.replace('/', '');

            const [check] = await pool.execute(
                'SELECT id FROM users WHERE id = ? AND created_by = ?',
                [sessionId, userId]
            );

            if (check.length === 0) {
                return sendResponse(403, null, false, 'Access denied');
            }

            const [rows] = await pool.execute(
                'SELECT id, ip_address as ip, label FROM user_ips WHERE user_id = ? ORDER BY label ASC, ip_address ASC',
                [sessionId]
            );

            return sendResponse(200, rows, true);
        }

        // POST /ips - Add bulk IPs or single IP
        if (event.httpMethod === 'POST' && (path === '' || path === '/')) {
            const { session_id, raw_ips, ip, label } = JSON.parse(event.body || '{}');

            const [check] = await pool.execute(
                'SELECT id FROM users WHERE id = ? AND created_by = ?',
                [session_id, userId]
            );

            if (check.length === 0) {
                return sendResponse(403, null, false, 'Access denied');
            }

            if (raw_ips) {
                const count = await processBulkIps(pool, session_id, raw_ips);
                return sendResponse(200, { added: count }, true, `${count} IPs added`);
            } else if (ip) {
                await pool.execute(
                    'INSERT INTO user_ips (user_id, ip_address, label) VALUES (?, ?, ?)',
                    [session_id, ip, label || 'Server']
                );
                return sendResponse(200, null, true, 'IP added');
            }

            return sendResponse(400, null, false, 'No IP data provided');
        }

        // PUT /ips/:id - Update single IP
        if (event.httpMethod === 'PUT') {
            const ipId = path.replace('/', '');
            const { ip, label } = JSON.parse(event.body || '{}');

            const [check] = await pool.execute(
                `SELECT i.id FROM user_ips i 
         JOIN users u ON i.user_id = u.id 
         WHERE i.id = ? AND u.created_by = ?`,
                [ipId, userId]
            );

            if (check.length === 0) {
                return sendResponse(403, null, false, 'Access denied');
            }

            await pool.execute(
                'UPDATE user_ips SET ip_address = ?, label = ? WHERE id = ?',
                [ip, label, ipId]
            );

            return sendResponse(200, null, true, 'IP updated');
        }

        // DELETE /ips - Delete single or bulk IPs
        if (event.httpMethod === 'DELETE') {
            const { ip_id, ip_ids } = JSON.parse(event.body || '{}');

            if (ip_ids && Array.isArray(ip_ids) && ip_ids.length > 0) {
                const placeholders = ip_ids.map(() => '?').join(',');
                const [check] = await pool.execute(
                    `SELECT i.id FROM user_ips i 
           JOIN users u ON i.user_id = u.id 
           WHERE i.id IN (${placeholders}) AND u.created_by = ?`,
                    [...ip_ids, userId]
                );

                if (check.length !== ip_ids.length) {
                    return sendResponse(403, null, false, 'Access denied');
                }

                await pool.execute(
                    `DELETE FROM user_ips WHERE id IN (${placeholders})`,
                    ip_ids
                );

                return sendResponse(200, null, true, `${ip_ids.length} IPs deleted`);
            } else if (ip_id) {
                const [check] = await pool.execute(
                    `SELECT i.id FROM user_ips i 
           JOIN users u ON i.user_id = u.id 
           WHERE i.id = ? AND u.created_by = ?`,
                    [ip_id, userId]
                );

                if (check.length === 0) {
                    return sendResponse(403, null, false, 'Access denied');
                }

                await pool.execute('DELETE FROM user_ips WHERE id = ?', [ip_id]);
                return sendResponse(200, null, true, 'IP deleted');
            }

            return sendResponse(400, null, false, 'No IP ID provided');
        }

        return sendResponse(404, null, false, 'Not found');

    } catch (error) {
        console.error('IPs error:', error);
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
