<div class="panel">
    <header class="panel-header">
        <div class="header-title">
            <h1>Sensor Overview</h1>
            <p class="subtitle">Dữ liệu trực tuyến · Cập nhật liên tục</p>
            <div id="hardware-status" class="status-offline">Trạng thái: Đang chờ dữ liệu...</div>
        </div>
        <div class="sensor-stats">
            <div class="stat-item temp"><h3>TEMPERATURE</h3><p id="temp-value">-- °C</p></div>
            <div class="stat-item humid"><h3>HUMIDITY</h3><p id="humid-value">-- %</p></div>
            <div class="stat-item light"><h3>LIGHT</h3><p id="light-value">-- Lux</p></div>
        </div>
    </header>
    <div class="chart-container">
        <canvas id="sensorChart"></canvas>
    </div>
</div>

<div class="panel">
    <h3 class="panel-title">Device Control</h3>
    <div class="device-list">
        <div class="device-item"><span class="device-name">Đèn 1</span><label class="switch"><input type="checkbox" id="device1"><span class="slider round"></span></label></div>
        <div class="device-item"><span class="device-name">Đèn 2</span><label class="switch"><input type="checkbox" id="device2"><span class="slider round"></span></label></div>
        <div class="device-item"><span class="device-name">Đèn 3</span><label class="switch"><input type="checkbox" id="device3"><span class="slider round"></span></label></div>
    </div>
</div>
/* Reset định dạng mặc định */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
}

/* Nền toàn trang */
body {
    background-color: #1a1e29;
    color: #ffffff;
    height: 100vh;
    overflow: hidden;
}

.container {
    display: flex;
    height: 100%;
}

/* === MENU BÊN TRÁI === */
.sidebar {
    width: 200px;
    background-color: #23283b;
    padding: 40px 20px;
    border-right: 1px solid #2d334a;
}

.sidebar nav ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 30px;
}

.sidebar nav a {
    text-decoration: none;
    color: #e2e8f0;
    font-size: 16px;
}

.sidebar nav li.active a {
    color: #4ade80; /* Màu xanh lá cho mục đang chọn */
}

/* === NỘI DUNG BÊN PHẢI === */
.main-content {
    flex: 1;
    padding: 30px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
}

/* Các khung hộp (Panel) */
.panel {
    background-color: #23283b;
    border-radius: 8px;
    padding: 25px;
}

/* Header của phần cảm biến */
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
}

.header-title h1 {
    font-size: 24px;
    font-weight: 500;
}

.subtitle {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 5px;
    margin-bottom: 10px;
}

#hardware-status {
    font-size: 13px;
    color: #fbbf24;
}

/* Các thông số cảm biến */
.sensor-stats {
    display: flex;
    gap: 50px;
}

.stat-item h3 {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 5px;
    text-transform: uppercase;
}

.stat-item p {
    font-size: 16px;
    font-weight: bold;
}

.temp p { color: #f87171; }   /* Màu đỏ */
.humid p { color: #34d399; }  /* Màu xanh */
.light p { color: #fbbf24; }  /* Màu vàng */

/* Khu vực biểu đồ */
.chart-container {
    width: 100%;
    height: 300px; /* Độ cao biểu đồ */
}

/* === ĐIỀU KHIỂN THIẾT BỊ === */

.device-panel {
    padding: 25px;
}

.panel-title {
    font-size: 18px;
    color: #cbd5e1;
    margin-bottom: 25px;
    font-weight: normal;
}

.device-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.device-item {
    display: flex;
    justify-content: space-between;
    align-items: center;

    background-color: #1e2235;

    padding: 20px 25px;

    border-radius: 8px;
}

.device-name {
    font-size: 18px;
    font-weight: 500;
}


/* ============================= */
/*        TOGGLE SWITCH          */
/* ============================= */

.switch {
    position: relative;

    display: inline-block;

    width: 164px;
    height: 80px;

    flex-shrink: 0;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}


/* Thanh công tắc */

.slider {
    position: absolute;

    inset: 0;

    cursor: pointer;

    background-color: #bcbec2;

    border-radius: 80px;

    transition: 0.3s;

    box-shadow:
        inset 0 2px 3px rgba(0, 0, 0, 0.12);
}


/* Nút tròn */

.slider::before {
    content: "";

    position: absolute;

    width: 70px;
    height: 70px;

    left: 5px;
    top: 5px;

    background-color: #f5f5f5;

    border-radius: 50%;

    transition: 0.3s;

    box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.25);
}


/* ============================= */
/*             TEXT              */
/* ============================= */

.switch-text {
    position: absolute;

    top: 50%;

    transform: translateY(-50%);

    font-size: 27px;

    font-weight: 400;

    line-height: 1;

    transition: 0.3s;

    pointer-events: none;
}


/* Chữ ON khi đang tắt */

.on-text {
    left: 25px;
    color: #eeeeee;
    opacity: 0;
}


/* Chữ OFF khi đang tắt */

.off-text {
    right: 12px;
    color: #eeeeee;
    opacity: 1;
}


/* ============================= */
/*             ON                */
/* ============================= */

.switch input:checked + .slider {
    background-color: #4ade80;
}


/* Nút trượt sang phải */

.switch input:checked + .slider::before {
    transform: translateX(84px);
}


/* Hiện chữ ON */

.switch input:checked + .slider .on-text {
    opacity: 1;
}


/* Ẩn chữ OFF */

.switch input:checked + .slider .off-text {
    opacity: 0;
}
/* === BẢNG DỮ LIỆU === */
.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    color: #e2e8f0;
}
.data-table th, .data-table td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #334155;
}
.data-table th {
    background-color: #1e2235;
    color: #94a3b8;
}
.data-table tr:hover {
    background-color: #2a3149;
}
/* Profile */
.profile-card { text-align: center; }
.avatar { width: 150px; height: 150px; background: #cbd5e1; border-radius: 50%; margin: 0 auto 20px; }
.profile-card a { color: #4ade80; }
/* === THANH CÔNG CỤ TÌM KIẾM & SẮP XẾP === */
.table-controls {
    display: flex;
    justify-content: flex-end;
    gap: 15px;
    margin-bottom: 20px;
}
.control-select, .control-search {
    background-color: #23283b;
    color: #94a3b8;
    border: 1px solid #334155;
    padding: 10px 15px;
    border-radius: 6px;
    outline: none;
    font-size: 14px;
}
.control-search {
    width: 200px;
}

/* === BẢNG THIẾT KẾ MỚI === */
.table-panel {
    padding: 0; /* Bỏ padding để viền sát lề */
    background-color: transparent;
}
.data-table th, .data-table td {
    text-align: center; /* Căn giữa nội dung */
    border-bottom: 1px dashed #475569; /* Chuyển thành nét đứt */
    padding: 15px;
}
.data-table th {
    background-color: #1e2235;
    font-weight: normal;
    text-transform: lowercase;
}
.data-table tr:hover {
    background-color: rgba(255, 255, 255, 0.02);
}
/* === BẢNG DỮ LIỆU CÓ THANH CUỘN === */
.table-panel {
    max-height: 500px; /* Chiều cao tối đa của bảng (bạn có thể tự chỉnh) */
    overflow-y: auto;  /* Tự động hiện thanh cuộn dọc khi dữ liệu dài */
    padding: 0;
    background-color: transparent;
}

/* Ghim tiêu đề bảng đứng im khi cuộn */
.data-table thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #1e2235; /* Giữ màu nền để không bị chữ đè lên nhau */
}

/* Tùy chỉnh thanh cuộn cho đẹp mắt (Dành cho Chrome/Edge/Safari) */
.table-panel::-webkit-scrollbar {
    width: 8px;
}
.table-panel::-webkit-scrollbar-track {
    background: #1e2235; 
}
.table-panel::-webkit-scrollbar-thumb {
    background: #475569; 
    border-radius: 4px;
}
.table-panel::-webkit-scrollbar-thumb:hover {
    background: #64748b; 
}
/* === PHÂN TRANG (PAGINATION) === */
.pagination {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}
.page-btn {
    background-color: #e2e8f0;
    color: #0f172a;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}
.page-btn:hover { background-color: #cbd5e1; }
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IoT Dashboard</title>
    <!-- Trỏ đường dẫn CSS vào thư mục css/ -->
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <!-- Cột Menu bên trái -->
        <aside class="sidebar">
            <h2 class="logo" style="color:white; margin-bottom:30px;">IoT Project</h2>
            <nav>
                <ul>
                    <li class="active" onclick="loadPage('dashboard', this)"><a href="#">Dashboard</a></li>
                    <li onclick="loadPage('dataSensor', this)"><a href="#">Data sensor</a></li>
                    <li onclick="loadPage('activeHistory', this)"><a href="#">Active history</a></li>
                    <li onclick="loadPage('profile', this)"><a href="#">profile</a></li>
                </ul>
            </nav>
        </aside>

        <!-- Nơi các trang con (từ thư mục pages) sẽ được đắp vào -->
        <main class="main-content" id="app-content">
            <!-- Đang tải nội dung... -->
        </main>
    </div>

    <!-- Gọi thư viện Socket.IO từ Backend -->
    <script src="http://localhost:5000/socket.io/socket.io.js"></script>
    <!-- Gọi file Điều phối chuyển trang -->
    <script src="js/main.js"></script>
    <!-- Gọi file Xử lý dữ liệu API -->
    <script src="js/api.js"></script>
</body>
</html>
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