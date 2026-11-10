const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { sendDeviceCommand } = require('./mqtt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'IOT_SECRET_KEY_2026';

// Map toàn cục lưu các timer đếm ngược 4s theo history_id để tránh lag
global.pendingTimers = global.pendingTimers || {};
global.lastSensorDataTime = Date.now();
global.hasReceivedFirstSensorData = false; // Cờ đánh dấu đã nhận bản tin cảm biến đầu tiên hay chưa

// ==========================================
// MIDDLEWARE XÁC THỰC & PHÂN QUYỀN (RBAC)
// ==========================================

// 1. Middleware kiểm tra Token hợp lệ
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy chuỗi Token từ "Bearer <token>"
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập (Thiếu Bearer Token)' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
        req.user = user; // Gán payload { id, username, role } vào req
        next();
    });
};

// 2. Middleware kiểm tra Vai trò (Role-Based Access Control)
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({ 
                success: false, 
                message: `Quyền truy cập bị từ chối. API này yêu cầu vai trò [${requiredRole}]!` 
            });
        }
        next();
    };
};

// ==========================================
// 1. API AUTHENTICATION
// ==========================================

// POST /api/auth/register - Đăng ký tài khoản
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập username và password' });
        }

        const userRole = role === 'admin' ? 'admin' : 'user';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, userRole]
        );

        res.json({ success: true, message: `Đăng ký tài khoản [${username}] thành công với vai trò [${userRole}]!` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/login - Đăng nhập
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không đúng' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 2. API CẢM BIẾN (YÊU CẦU ĐĂNG NHẬP)
// ==========================================

app.get('/api/sensors/latest', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ds.id, COALESCE(s.name, 'Cảm biến') AS sensor_name, ds.sensor_id, ds.value, ds.time 
            FROM data_sensor ds
            LEFT JOIN sensor s ON ds.sensor_id = s.id
            ORDER BY ds.id DESC LIMIT 30
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/sensors', authenticateToken, async (req, res) => {
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
// 3. API ĐIỀU KHIỂN & LỊCH SỬ (PHÂN QUYỀN STRICTION)
// ==========================================

app.get('/api/devices/status', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ah.device_id, ah.action, ah.status, ah.time
            FROM active_history ah
            INNER JOIN (
                SELECT device_id, MAX(id) as max_id
                FROM active_history WHERE status = 'success' GROUP BY device_id
            ) latest ON ah.device_id = latest.device_id AND ah.id = latest.max_id
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API ĐIỀU KHIỂN: YÊU CẦU TOKEN + VAI TRÒ ADMIN
app.post('/api/control', authenticateToken, requireRole('admin'), async (req, res) => {
    const { device_id, action } = req.body;

    if (!device_id || !['ON', 'OFF'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const actionText = action === 'ON' ? 'bật' : 'tắt';
    const currentUserId = req.user.id;

    try {
        const [result] = await db.query(
            'INSERT INTO active_history (device_id, action, status, user_id) VALUES (?, ?, ?, ?)',
            [Number(device_id), actionText, 'pending', currentUserId]
        );
        const historyId = result.insertId;

        sendDeviceCommand(device_id, action, historyId);

        global.pendingTimers[historyId] = setTimeout(async () => {
            try {
                const [rows] = await db.query('SELECT status FROM active_history WHERE id = ?', [historyId]);
                if (rows.length > 0 && rows[0].status === 'pending') {
                    await db.query('UPDATE active_history SET status = "fail" WHERE id = ?', [historyId]);
                    console.log(`[Timeout 4s] ESP32 không phản hồi -> Cập nhật FAIL bản ghi #${historyId}`);
                }
            } catch (tErr) {
                console.error('[Timeout Error]:', tErr.message);
            } finally {
                delete global.pendingTimers[historyId];
            }
        }, 4000);

        res.json({ success: true, history_id: historyId, message: `[Admin: ${req.user.username}] Đang xử lý lệnh ${action}...` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/history', authenticateToken, async (req, res) => {
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
                    COALESCE(u.username, 'Hệ thống') AS username,
                    ah.device_id, ah.action, ah.status, ah.time 
             FROM active_history ah
             LEFT JOIN devices d ON ah.device_id = d.id
             LEFT JOIN users u ON ah.user_id = u.id
             ${whereClause}
             ORDER BY ah.id DESC LIMIT ? OFFSET ?`,
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
// 4. API PROFILE & WATCHDOG AN TOÀN ĐIỆN
// ==========================================

app.get('/api/profile', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM profile WHERE id = 1 LIMIT 1');
        if (rows.length > 0) res.json({ success: true, data: rows[0] });
        else res.status(404).json({ success: false, message: 'Profile not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Watchdog: Chỉ kiểm tra SAU KHI đã nhận được ít nhất 1 gói tin cảm biến đầu tiên
setInterval(async () => {
    if (!global.hasReceivedFirstSensorData) return;

    const timeDiff = Date.now() - global.lastSensorDataTime;
    if (timeDiff > 20000) {
        try {
            const [rows] = await db.query(`
                SELECT ah.device_id, ah.action 
                FROM active_history ah
                INNER JOIN (
                    SELECT device_id, MAX(id) as max_id FROM active_history GROUP BY device_id
                ) latest ON ah.device_id = latest.device_id AND ah.id = latest.max_id
                WHERE ah.action IN ('bật', 'ON') AND ah.status = 'success'
            `);

            if (rows.length > 0) {
                console.log('[WATCHDOG] ESP32 mất kết nối > 20s. Tự động chuyển công tắc sang OFF.');
                const autoOffRecords = rows.map(r => [r.device_id, 'tắt', 'success', 1]);
                await db.query(
                    'INSERT INTO active_history (device_id, action, status, user_id) VALUES ?',
                    [autoOffRecords]
                );
                // Reset cờ để không lặp lại log cho đến khi ESP32 gửi lại dữ liệu
                global.hasReceivedFirstSensorData = false;
            }
        } catch (err) {
            console.error('[Watchdog Error]:', err.message);
        }
    }
}, 5000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Express Server] Running at http://localhost:${PORT}`));