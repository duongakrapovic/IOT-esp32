const db = require('../config/db');

exports.getSensorHistory = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', sort = 'desc' } = req.query;
        page = parseInt(page); limit = parseInt(limit);
        const offset = (page - 1) * limit;
        const sortOrder = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const searchParam = `%${search}%`;

        // 1. Lấy dữ liệu 10 dòng của trang hiện tại
        const sqlData = `
            SELECT * FROM (
                SELECT MIN(id) as id, MAX(CASE WHEN sensor_id = 1 THEN value END) AS temperature, MAX(CASE WHEN sensor_id = 2 THEN value END) AS humidity, MAX(CASE WHEN sensor_id = 3 THEN value END) AS light, createAt as time FROM data_sensor GROUP BY createAt
            ) AS t
            WHERE temperature LIKE ? OR humidity LIKE ? OR light LIKE ? OR time LIKE ?
            ORDER BY id ${sortOrder} LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(sqlData, [searchParam, searchParam, searchParam, searchParam, limit, offset]);
        
        // 2. Đếm tổng số dòng để tính ra số trang
        const sqlCount = `
            SELECT COUNT(*) as total FROM (
                SELECT MIN(id) as id, MAX(CASE WHEN sensor_id = 1 THEN value END) AS temperature, MAX(CASE WHEN sensor_id = 2 THEN value END) AS humidity, MAX(CASE WHEN sensor_id = 3 THEN value END) AS light, createAt as time FROM data_sensor GROUP BY createAt
            ) AS t
            WHERE temperature LIKE ? OR humidity LIKE ? OR light LIKE ? OR time LIKE ?
        `;
        const [countResult] = await db.query(sqlCount, [searchParam, searchParam, searchParam, searchParam]);
        
        const totalPages = Math.ceil(countResult[0].total / limit); // Chia 10 để ra số trang

        res.json({ status: 'success', data: rows, totalPages, currentPage: page });
    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({ status: 'error' });
    }
};