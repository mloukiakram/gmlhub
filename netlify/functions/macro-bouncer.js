import SftpClient from 'ssh2-sftp-client';
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

    // Only allow GET and POST
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
        return sendResponse(405, null, false, 'Method Not Allowed');
    }

    const filePath = process.env.SSH_FILE_PATH;
    if (!filePath || !process.env.SSH_HOST || !process.env.SSH_USER) {
        return sendResponse(500, null, false, 'SSH configuration is missing in the environment (.env)');
    }

    const sftp = new SftpClient();

    try {
        await sftp.connect({
            host: process.env.SSH_HOST,
            port: parseInt(process.env.SSH_PORT, 10) || 22,
            username: process.env.SSH_USER,
            password: process.env.SSH_PASSWORD,
        });

        // ---------------- GET: Load IPs ----------------
        if (event.httpMethod === 'GET') {
            const buf = await sftp.get(filePath);
            const content = buf.toString('utf-8');
            
            // Regex to find AUTHORIZED_IPS = { ... }
            const match = content.match(/AUTHORIZED_IPS\s*=\s*\{([\s\S]*?)\n\}/);
            let teams = {};
            if (match) {
                const inner = match[1];
                const teamRe = /"([^"]+)"\s*:\s*\[([\s\S]*?)\]/g;
                let teamMatch;
                while ((teamMatch = teamRe.exec(inner)) !== null) {
                    const teamName = teamMatch[1];
                    const ipsInner = teamMatch[2];
                    let ips = [];
                    const ipRe = /"([^"]+)"/g;
                    let m;
                    while ((m = ipRe.exec(ipsInner)) !== null) {
                        ips.push(m[1]);
                    }
                    teams[teamName] = ips;
                }
            } else {
                // Fallback for empty or newly initialized dict
                teams = { "Team A": [], "Team B": [] };
            }
            
            await sftp.end();
            return sendResponse(200, { teams }, true, 'Loaded IPs');
        }

        // ---------------- POST: Save IPs ----------------
        if (event.httpMethod === 'POST') {
            const { team, ips } = JSON.parse(event.body || '{}');
            if (!team) {
                await sftp.end();
                return sendResponse(400, null, false, 'No team specified');
            }

            const ipRegex = /^((?:\d{1,3}\.){3}\d{1,3}|([a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4})$/i;
            for (const ip of (ips || [])) {
                if (!ipRegex.test(ip.trim())) {
                    await sftp.end();
                    return sendResponse(400, null, false, `Invalid IP: ${ip}`);
                }
            }

            const cleanIps = Array.from(new Set(ips.map(ip => ip.trim()))); // Dedupe

            // 1. Read existing content
            const buf = await sftp.get(filePath);
            const originalContent = buf.toString('utf-8');

            // 2. Extract existing teams
            let teams = {};
            const match = originalContent.match(/AUTHORIZED_IPS\s*=\s*\{([\s\S]*?)\n\}/);
            if (match) {
                const inner = match[1];
                const teamRe = /"([^"]+)"\s*:\s*\[([\s\S]*?)\]/g;
                let teamMatch;
                while ((teamMatch = teamRe.exec(inner)) !== null) {
                    const teamName = teamMatch[1];
                    const ipsInner = teamMatch[2];
                    let teamIps = [];
                    const ipRe = /"([^"]+)"/g;
                    let m;
                    while ((m = ipRe.exec(ipsInner)) !== null) {
                        teamIps.push(m[1]);
                    }
                    teams[teamName] = teamIps;
                }
            } else {
                teams = { "Team A": [], "Team B": [] };
            }

            // 3. Update the specific team
            teams[team] = cleanIps;

            // 4. Build new dict string
            const teamStrings = [];
            for (const [teamName, teamIps] of Object.entries(teams)) {
                const rows = [];
                for (let i = 0; i < teamIps.length; i += 4) {
                    const chunk = teamIps.slice(i, i + 4).map(ip => `"${ip}"`).join(', ');
                    rows.push('        ' + chunk);
                }
                const ipsStr = rows.length ? '\n' + rows.join(',\n') + '\n    ' : '';
                teamStrings.push(`    "${teamName}": [${ipsStr}]`);
            }
            const newDictBlock = 'AUTHORIZED_IPS = {\n' + teamStrings.join(',\n') + '\n}';

            let newContent = originalContent;
            if (match) {
                newContent = originalContent.replace(/AUTHORIZED_IPS\s*=\s*\{([\s\S]*?)\n\}/, newDictBlock);
            } else {
                // If it wasn't there, append it
                newContent += '\n\n' + newDictBlock + '\n';
            }

            // 5. Write backup
            await sftp.put(Buffer.from(originalContent, 'utf-8'), filePath + '.bak');

            // 6. Write new file
            await sftp.put(Buffer.from(newContent, 'utf-8'), filePath);
            await sftp.chmod(filePath, 0o755);

            await sftp.end();

            return sendResponse(200, { count: cleanIps.length }, true, `Saved ${cleanIps.length} IPs`);
        }

    } catch (error) {
        if (sftp) sftp.end();
        console.error('SFTP Error:', error);
        return sendResponse(500, null, false, error.message || 'SSH/SFTP connection failed');
    }
};
