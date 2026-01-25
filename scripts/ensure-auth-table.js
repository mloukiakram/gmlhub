
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createTable() {
    try {
        const connection = await mysql.createConnection({
            uri: process.env.DATABASE_URL,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        });
        console.log('Connected to database.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS auth_users (
              id INT NOT NULL AUTO_INCREMENT,
              username VARCHAR(50) NOT NULL,
              password VARCHAR(255) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              role VARCHAR(20) DEFAULT 'user',
              PRIMARY KEY (id),
              UNIQUE KEY username_idx (username)
            );
        `);
        console.log('Table auth_users checked/created.');
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

createTable();
