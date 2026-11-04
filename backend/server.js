const express = require('express');
const cors = require('cors');
const db = require('./db');
const { sendDeviceCommand } = require('./mqtt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo biến toàn cục theo dõi mốc thời gian nhận cảm biến thực tế từ ESP32
global.lastSensorDataTime = Date.now();

// ==========================================
// 1. API CẢM BIẾN (DASHBOARD & DATA SENSOR)
// ==========================================

// Lấy 30 bản ghi cảm biến mới nhất cho Dashboard Chart & Cards
app.get('/api/sensors/latest', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ds.id, COALESCE(s.name, 'Cảm biến') AS sensor_name, ds.sensor_id, ds.value, ds.time 
            FROM data_sensor ds
            LEFT JOIN sensor s ON ds.sensor_id = s.id
            ORDER BY ds.id DESC 
            LIMIT 30
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Lấy danh sách cảm biến (Phân trang, Tìm kiếm, Lọc, Sắp xếp)
app.get('/api/sensors', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const sensorFilter = req.query.type || '';
        const sort = req.query.sort === 'time_asc' ? 'ASC' : 'DESC';

        let whereConditions = [];
        let queryParams = [];

        if (sensorFilter === 'temp') whereConditions.push('ds.sensor_id = 1');
        else if (sensorFilter === 'humid') whereConditions.push('ds.sensor_id = 2');
        else if (sensorFilter === 'light') whereConditions.push('ds.sensor_id = 3');

        if (search) {
            whereConditions.push('(s.name LIKE ? OR ds.value LIKE ? OR ds.time LIKE ?)');
            const term = `%${search}%`;
            queryParams.push(term, term, term);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM data_sensor ds LEFT JOIN sensor s ON ds.sensor_id = s.id ${whereClause}`,
            queryParams
        );
        const totalItems = countResult[0].total;

        const [rows] = await db.query(
            `SELECT ds.id, COALESCE(s.name, 'Cảm biến') AS sensor_name, ds.sensor_id, ds.value, ds.time 
             FROM data_sensor ds LEFT JOIN sensor s ON ds.sensor_id = s.id 
             ${whereClause} ORDER BY ds.id ${sort} LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { totalItems, currentPage: page, totalPages: Math.ceil(totalItems / limit) || 1, limit }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 2. API ĐIỀU KHIỂN & LỊCH SỬ THIẾT BỊ (USER)
// ==========================================

// Lấy trạng thái đèn thành công gần nhất để phục hồi công tắc khi F5
app.get('/api/devices/status', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ah.device_id, ah.action, ah.status, ah.time
            FROM active_history ah
            INNER JOIN (
                SELECT device_id, MAX(id) as max_id
                FROM active_history
                WHERE status = 'success'
                GROUP BY device_id
            ) latest ON ah.device_id = latest.device_id AND ah.id = latest.max_id
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Ghi PENDING -> Phát MQTT -> Tự động chuyển FAIL sau 4s nếu timeout
app.post('/api/control', async (req, res) => {
    const { device_id, action } = req.body;

    if (!device_id || !['ON', 'OFF'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const actionText = action === 'ON' ? 'bật' : 'tắt';

    try {
        const [result] = await db.query(
            'INSERT INTO active_history (device_id, action, status, user_id) VALUES (?, ?, ?, 1)',
            [Number(device_id), actionText, 'pending']
        );
        const historyId = result.insertId;

        sendDeviceCommand(device_id, action, historyId);

        // Timeout 4 giây: Nếu ESP32 không phản hồi, tự đánh dấu FAIL
        setTimeout(async () => {
            try {
                const [rows] = await db.query('SELECT status FROM active_history WHERE id = ?', [historyId]);
                if (rows.length > 0 && rows[0].status === 'pending') {
                    await db.query('UPDATE active_history SET status = "fail" WHERE id = ?', [historyId]);
                    console.log(`[Timeout 4s] ESP32 không phản hồi -> Cập nhật FAIL bản ghi #${historyId}`);
                }
            } catch (tErr) {
                console.error('[Timeout Error]:', tErr.message);
            }
        }, 4000);

        res.json({ success: true, history_id: historyId, message: `Đang xử lý lệnh ${action}...` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Truy vấn danh sách Lịch sử điều khiển kết hợp với bảng users
app.get('/api/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const deviceFilter = req.query.device || '';
        const actionFilter = req.query.action || '';
        const statusFilter = req.query.status || '';
        const searchKeyword = req.query.search || '';

        let whereConditions = [];
        let queryParams = [];

        if (deviceFilter) {
            whereConditions.push('(d.name LIKE ? OR ah.device_id = ?)');
            const num = deviceFilter.replace(/\D/g, '') || 0;
            queryParams.push(`%${deviceFilter}%`, num);
        }
        if (actionFilter) {
            whereConditions.push('ah.action LIKE ?');
            queryParams.push(`%${actionFilter}%`);
        }
        if (statusFilter) {
            whereConditions.push('ah.status LIKE ?');
            queryParams.push(`%${statusFilter}%`);
        }
        if (searchKeyword) {
            whereConditions.push('ah.time LIKE ?');
            queryParams.push(`%${searchKeyword}%`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM active_history ah LEFT JOIN devices d ON ah.device_id = d.id ${whereClause}`,
            queryParams
        );
        const totalItems = countResult[0].total;

        const [rows] = await db.query(
            `SELECT ah.id, COALESCE(d.name, CONCAT('Đèn ', ah.device_id)) AS device_name, 
                    COALESCE(u.username, 'admin') AS username,
                    ah.device_id, ah.action, ah.status, ah.time 
             FROM active_history ah
             LEFT JOIN devices d ON ah.device_id = d.id
             LEFT JOIN users u ON ah.user_id = u.id
             ${whereClause}
             ORDER BY ah.id DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { totalItems, currentPage: page, totalPages: Math.ceil(totalItems / limit) || 1, limit }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Profile Tác giả
app.get('/api/profile', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM profile WHERE id = 1 LIMIT 1');
        if (rows.length > 0) res.json({ success: true, data: rows[0] });
        else res.status(404).json({ success: false, message: 'Profile not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Giám sát Watchdog (Tự động chuyển công tắc Web về OFF nếu sập nguồn ESP32 > 20s)
setInterval(async () => {
    const timeDiff = Date.now() - (global.lastSensorDataTime || Date.now());
    if (timeDiff > 20000) {
        try {
            const [rows] = await db.query(`
                SELECT ah.device_id, ah.action 
                FROM active_history ah
                INNER JOIN (
                    SELECT device_id, MAX(id) as max_id 
                    FROM active_history 
                    GROUP BY device_id
                ) latest ON ah.device_id = latest.device_id AND ah.id = latest.max_id
                WHERE ah.action IN ('bật', 'ON') AND ah.status = 'success'
            `);

            if (rows.length > 0) {
                console.log('[WATCHDOG] ESP32 không gửi cảm biến > 20s. Tự động chèn bản ghi OFF an toàn điện.');
                const autoOffRecords = rows.map(r => [r.device_id, 'tắt', 'success', 1]);
                await db.query(
                    'INSERT INTO active_history (device_id, action, status, user_id) VALUES ?',
                    [autoOffRecords]
                );
            }
        } catch (err) {
            console.error('[Watchdog Error]:', err.message);
        }
    }
}, 5000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Express Server] Running at http://localhost:${PORT}`));