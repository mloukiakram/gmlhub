import mysql from 'mysql2/promise';
import 'dotenv/config'; // Explicitly load .env for local dev

let pool = null;

export async function getConnection() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error('FATAL: DATABASE_URL is undefined.');
            throw new Error('DATABASE_URL is missing in environment variables');
        }

        console.log('Connecting to DB with URI length:', process.env.DATABASE_URL.length);

        pool = mysql.createPool({
            uri: process.env.DATABASE_URL,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            },
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });
    }

    return pool;
}
