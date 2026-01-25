import mysql from 'mysql2/promise';

let pool = null;

export async function getConnection() {
    if (!pool) {
        const dbUrl = process.env.DATABASE_URL;

        // Parse the connection string
        const url = new URL(dbUrl);

        pool = mysql.createPool({
            host: url.hostname,
            port: parseInt(url.port) || 4000,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
            ssl: {
                rejectUnauthorized: true
            },
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });
    }

    return pool;
}
