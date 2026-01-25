
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function seedUser() {
    try {
        const connection = await mysql.createConnection({
            uri: process.env.DATABASE_URL,
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });
        console.log('Connected to database.');

        const username = 'test_admin_user';
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Check if exists
        const [existing] = await connection.execute('SELECT id FROM auth_users WHERE username = ?', [username]);

        if (existing.length > 0) {
            console.log('Test user already exists.');
        } else {
            await connection.execute(
                'INSERT INTO auth_users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, 'admin']
            );
            console.log('Test user "test_admin_user" created successfully.');
        }

        const [users] = await connection.execute('SELECT id, username, role FROM auth_users');
        console.log('Current Users in DB:', users);

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

seedUser();
