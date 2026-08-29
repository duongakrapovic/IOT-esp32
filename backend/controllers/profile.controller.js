const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const sql = `SELECT * FROM profile LIMIT 1`;
        const [rows] = await db.query(sql);
        
        if (rows.length > 0) {
            res.json({ status: 'success', data: rows[0] });
        } else {
            res.json({ status: 'empty', message: 'Chưa có dữ liệu' });
        }
    } catch (error) {
        console.error("Lỗi lấy thông tin profile:", error);
        res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};