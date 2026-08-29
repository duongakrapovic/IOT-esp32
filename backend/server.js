const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./config/db'); 
const mqttClient = require('./config/mqtt');

// 1. IMPORT CÁC ROUTER BÊN NGOÀI
const sensorRoutes = require('./routes/sensor.routes');
const deviceRoutes = require('./routes/device.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); 

const PORT = 5000;

app.use(cors());
app.use(express.json());

// 2. KẾT NỐI ROUTER VỚI URL
app.get('/', (req, res) => { res.send('Backend Server IoT đang chạy cực chuẩn MVC!'); });

app.use('/api/sensors', sensorRoutes); // URL: /api/sensors/history
app.use('/api', deviceRoutes);         // URL: /api/control, /api/history
app.use('/api', profileRoutes);        // URL: /api/profile


// 3. XỬ LÝ NHẬN DỮ LIỆU MQTT VÀ ĐẨY LÊN WEB THÔNG QUA SOCKET.IO
mqttClient.on('message', async (topic, message) => {
    if (topic === 'iot/sensors/data') {
        try {
            const data = JSON.parse(message.toString());
            const { temperature, humidity, light } = data;
            
            const sqlSensor = `INSERT INTO data_sensor (sensor_id, value) VALUES (1, ?), (2, ?), (3, ?)`;
            const [result] = await db.query(sqlSensor, [temperature, humidity, light]);

            const now = new Date();
            const timeString = now.toLocaleTimeString('vi-VN'); // VD: 14:05:22

            // Đẩy dữ liệu ra giao diện qua Socket.IO
            io.emit('newData', { temperature, humidity, light, timeString });
            
            // In rõ ID bản ghi vừa thêm và thời gian thực
            console.log(`[#${result.insertId} | ${timeString}] Đã nhận & Lưu DB: ${temperature}°C | ${humidity}% | ${light} Lux`);
        } catch (err) {
            console.error("Lỗi xử lý dữ liệu MQTT:", err.message);
        }
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại địa chỉ: http://localhost:${PORT}`);
});