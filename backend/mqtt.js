const mqtt = require('mqtt');
const db = require('./db');
require('dotenv').config();

const options = {
    clientId: process.env.MQTT_CLIENT_ID + '_' + Math.random().toString(16).substr(2, 8),
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
    rejectUnauthorized: false
};

const client = mqtt.connect(process.env.MQTT_BROKER_URL, options);

client.on('connect', () => {
    console.log('[MQTT] Kết nối thành công HiveMQ Cloud');
    client.subscribe(['iot/sensors/data', 'iot/devices/status']);
});

client.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        // 1. Nhận dữ liệu cảm biến từ ESP32
        if (topic === 'iot/sensors/data') {
            // Cập nhật mốc thời gian nhận dữ liệu cảm biến thực tế từ ESP32
            global.lastSensorDataTime = Date.now(); 

            const { temperature, humidity, light } = payload;
            const query = 'INSERT INTO data_sensor (sensor_id, value) VALUES ?';
            const values = [[1, temperature], [2, humidity], [3, light]];
            await db.query(query, [values]);
        }

        // 2. Nhận phản hồi trạng thái từ ESP32 & Xử lý sự kiện ngắt nguồn (OFFLINE)
        if (topic === 'iot/devices/status') {
            // Trường hợp ESP32 sập nguồn / đứt mạng đột ngột (HiveMQ kích hoạt Last Will)
            if (payload.device_status === 'OFFLINE') {
                console.log('[AN TOÀN ĐIỆN] ESP32 ngắt nguồn/mất mạng! Tự động ngắt tất cả công tắc về OFF.');
                const safetyLogs = [
                    [1, 'tắt', 'success', 1],
                    [2, 'tắt', 'success', 1],
                    [3, 'tắt', 'success', 1]
                ];
                await db.query(
                    'INSERT INTO active_history (device_id, action, status, user_id) VALUES ?',
                    [safetyLogs]
                );
                return;
            }

            // Trường hợp phản hồi bật/tắt thiết bị từ ESP32
            const { device_id, action, status, history_id } = payload;
            
            const rawAct = String(action || status || '').toUpperCase().trim();
            const isOff = ['OFF', 'TẮT', '0', 'FALSE'].includes(rawAct);
            const actText = isOff ? 'tắt' : 'bật';
            const stText = (status && String(status).toLowerCase() === 'fail') ? 'fail' : 'success';

            // XỬ LÝ TỨC THỜI: Cập nhật CSDL ngay khi nhận tin nhắn MQTT từ ESP32
            try {
                if (history_id) {
                    await db.query(
                        'UPDATE active_history SET status = ?, action = ? WHERE id = ?',
                        [stText, actText, history_id]
                    );
                    console.log(`[MQTT ACK Instant] Bản ghi #${history_id} -> ${stText}`);
                } else {
                    const [pendingRows] = await db.query(
                        'SELECT id FROM active_history WHERE device_id = ? AND status = "pending" ORDER BY id DESC LIMIT 1',
                        [device_id]
                    );
                    if (pendingRows.length > 0) {
                        await db.query(
                            'UPDATE active_history SET status = ?, action = ? WHERE id = ?',
                            [stText, actText, pendingRows[0].id]
                        );
                        console.log(`[MQTT ACK Instant] Bản ghi PENDING #${pendingRows[0].id} -> ${stText}`);
                    } else {
                        await db.query(
                            'INSERT INTO active_history (device_id, action, status, user_id) VALUES (?, ?, ?, 1)',
                            [device_id, actText, stText]
                        );
                    }
                }
            } catch (dbErr) {
                console.error('[MQTT Update Error]:', dbErr.message);
            }
        }
    } catch (error) {
        console.error('[MQTT Error] Lỗi xử lý:', error.message);
    }
});

function sendDeviceCommand(deviceId, action, historyId = null) {
    const topic = 'iot/devices/command';
    const payload = JSON.stringify({ 
        device_id: Number(deviceId), 
        action: action,
        history_id: historyId 
    });
    client.publish(topic, payload);
}

module.exports = { client, sendDeviceCommand };