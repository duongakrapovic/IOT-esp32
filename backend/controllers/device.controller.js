const db = require('../config/db');
const mqttClient = require('../config/mqtt');

exports.controlDevice = async (req, res) => {
    const { device_id, action } = req.body; 
    try {
        let dbDeviceId = 1;
        if (device_id === 'device2') dbDeviceId = 2;
        if (device_id === 'device3') dbDeviceId = 3;

        const sqlHistory = `INSERT INTO active_history (deviceId, action) VALUES (?, ?)`;
        await db.query(sqlHistory, [dbDeviceId, action]);

        const commandPayload = JSON.stringify({ device: device_id, status: action });
        mqttClient.publish('iot/devices/command', commandPayload);

        console.log(`[API] Đã gửi lệnh & Lưu lịch sử DB: ${device_id} -> ${action}`);
        res.json({ status: 'success', message: 'Lệnh đã được gửi và lưu lịch sử' });
    } catch (error) {
        console.error("Lỗi điều khiển thiết bị:", error);
        res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

exports.getActiveHistory = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', sort = 'desc' } = req.query;
        page = parseInt(page); limit = parseInt(limit);
        const offset = (page - 1) * limit;
        const sortOrder = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const searchParam = `%${search}%`;

        const sqlData = `
            SELECT ah.id, d.name as device_name, ah.action, ah.createAt 
            FROM active_history ah JOIN devices d ON ah.deviceId = d.id 
            WHERE ah.id LIKE ? OR d.name LIKE ? OR ah.action LIKE ? OR ah.createAt LIKE ?
            ORDER BY ah.id ${sortOrder} LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(sqlData, [searchParam, searchParam, searchParam, searchParam, limit, offset]);
        
        const sqlCount = `
            SELECT COUNT(*) as total FROM active_history ah JOIN devices d ON ah.deviceId = d.id 
            WHERE ah.id LIKE ? OR d.name LIKE ? OR ah.action LIKE ? OR ah.createAt LIKE ?
        `;
        const [countResult] = await db.query(sqlCount, [searchParam, searchParam, searchParam, searchParam]);
        
        const totalPages = Math.ceil(countResult[0].total / limit);

        res.json({ status: 'success', data: rows, totalPages, currentPage: page });
    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({ status: 'error' });
    }
};