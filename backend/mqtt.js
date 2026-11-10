const mqtt = require('mqtt');
const db = require('./db');
require('dotenv').config();

// Cấu hình kết nối MQTT Local trực tiếp (port 1884)
const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1884';

const options = {
    clientId: 'backendServer_' + Math.random().toString(16).substr(2, 8),
    // Không cần username/password vì Mosquitto local bật allow_anonymous true
    clean: true
};

const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
    console.log('[MQTT] Kết nối thành công đến Mosquitto Local Broker:', brokerUrl);
    client.subscribe(['iot/sensors/data', 'iot/devices/status'], (err) => {
        if (!err) {
            console.log('[MQTT] Đã đăng ký thành công các topic: iot/sensors/data, iot/devices/status');
        }
    });
});

client.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        // 1. Nhận dữ liệu cảm biến từ ESP32
        if (topic === 'iot/sensors/data') {
            global.lastSensorDataTime = Date.now();
            global.hasReceivedFirstSensorData = true;

            const { temperature, humidity, light } = payload;
            console.log(`[MQTT Received Data] T: ${temperature}°C | H: ${humidity}% | L: ${light} Lux`);

            try {
                const query = 'INSERT INTO data_sensor (sensor_id, value) VALUES ?';
                const values = [[1, temperature], [2, humidity], [3, light]];
                await db.query(query, [values]);
            } catch (dbErr) {
                console.error('[MySQL Sensor Insert Error]:', dbErr.message);
            }
        }

        // 2. Nhận phản hồi trạng thái từ ESP32
        if (topic === 'iot/devices/status') {
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

            const { device_id, action, status, history_id } = payload;
            
            const rawAct = String(action || status || '').toUpperCase().trim();
            const isOff = ['OFF', 'TẮT', '0', 'FALSE'].includes(rawAct);
            const actText = isOff ? 'tắt' : 'bật';
            const stText = (status && String(status).toLowerCase() === 'fail') ? 'fail' : 'success';

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
        console.error('[MQTT Error] Lỗi xử lý gói tin:', error.message);
    }
});

function sendDeviceCommand(deviceId, action, historyId = null) {
    const topic = 'iot/devices/command';
    const payload = JSON.stringify({ 
        device_id: Number(deviceId), 
        action: action,
        history_id: historyId 
    });
    client.publish(topic, payload, (err) => {
        if (err) {
            console.error('[MQTT Publish Error]:', err.message);
        } else {
            console.log(`[MQTT Publish Command] Gửi xuống topic ${topic}:`, payload);
        }
    });
}

module.exports = { client, sendDeviceCommand };