const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test kết nối nhanh
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('[MySQL] Kết nối thành công đến database:', process.env.DB_NAME);
        connection.release();
    } catch (error) {
        console.error('[MySQL Error] Lỗi kết nối CSDL:', error.message);
    }
})();

module.exports = pool;