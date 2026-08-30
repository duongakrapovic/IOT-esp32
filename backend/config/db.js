const mysql = require('mysql2');

// Tạo một pool kết nối tới database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Tên user mặc định của MySQL
    password: 'root', // 
    database: 'iot_project',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Lỗi kết nối Cơ sở dữ liệu:', err.message);
    } else {
        console.log('kết nối thành công tới MySQL (iot_project)');
        connection.release();
    }
});

// Xuất ra dạng promise để dùng chung cho các file khác
module.exports = pool.promise();