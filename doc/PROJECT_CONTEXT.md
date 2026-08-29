# IOT PROJECT — PROJECT CONTEXT
Version: 2026-08-28
Purpose: Context/bàn giao cho AI khác hoặc người tiếp quản dự án.

---

## 1. MỤC ĐÍCH FILE

File này là bộ nhớ trạng thái của dự án IoT Full-Stack.
AI đọc file này phải phân biệt rõ:
- ĐÃ TEST THÀNH CÔNG
- ĐÃ CODE nhưng CHƯA TEST
- CHƯA LÀM
- GIẢ LẬP
- QUYẾT ĐỊNH/PINOUT hiện tại

Không được tự suy luận rằng một phần đã hoàn thành nếu trạng thái bên dưới ghi chưa test.

---

# 2. TỔNG QUAN DỰ ÁN

Hệ thống IoT giám sát môi trường và điều khiển thiết bị thời gian thực.

Kiến trúc 3 tầng:

1. Backend:
   - Node.js
   - Express
   - MVC (Routes, Controllers, Config)

2. Real-time / Communication:
   - ESP32 <-> Backend: MQTT
   - Mosquitto Broker local, port 1883
   - Backend <-> Frontend: Socket.IO, port 5000
   - Frontend <-> Backend: REST API

3. Database:
   - MySQL
   - Database: iot_project
   - User: root
   - Port: 3306

4. Frontend:
   - Modular SPA
   - HTML5
   - CSS3
   - Vanilla JavaScript
   - Chart.js

5. Firmware:
   - PlatformIO
   - C++ / Arduino Framework
   - ESP32-WROOM-32 / ESP32 DevKit V1, 38 pin

Mục tiêu cuối:
- Web chạy được.
- ESP32 thật đọc DHT11 + cảm biến ánh sáng.
- ESP32 thật điều khiển 3 LED.
- MQTT truyền dữ liệu/lệnh.
- Backend lưu DB và đẩy real-time lên web.
- Sau này deploy để điện thoại/máy khác truy cập bằng link và điều khiển được.

---

# 3. KIẾN TRÚC LUỒNG DỮ LIỆU

## 3.1 ESP32 -> Backend

Dữ liệu cảm biến:

Topic:
iot/sensors/data

Payload:
{"temperature":28.5,"humidity":65.0,"light":320}

Backend:
MQTT -> nhận JSON -> INSERT MySQL -> Socket.IO -> Frontend

## 3.2 Backend -> ESP32

Điều khiển thiết bị:

Topic:
iot/devices/command

Payload:
{"device_id":1,"action":"ON"}

hoặc:
{"device_id":1,"action":"OFF"}

## 3.3 ESP32 -> Backend

Xác nhận trạng thái:

Topic:
iot/devices/status

Payload:
{"device_id":1,"status":"ON"}

---

# 4. DATABASE

Database:
iot_project

## sensors
- id INT AUTO_INCREMENT PRIMARY KEY
- name VARCHAR(100) NOT NULL
  - 1: Nhiệt độ
  - 2: Độ ẩm
  - 3: Ánh sáng

## data_sensor
- id INT AUTO_INCREMENT PRIMARY KEY
- sensor_id INT NOT NULL, FK -> sensors.id
- value FLOAT NOT NULL
- createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP

## devices
- id INT AUTO_INCREMENT PRIMARY KEY
- name VARCHAR(100) NOT NULL
  - Đèn 1
  - Đèn 2
  - Đèn 3

## active_history
- id INT AUTO_INCREMENT PRIMARY KEY
- deviceId INT NOT NULL, FK -> devices.id
- action VARCHAR(20) NOT NULL
  - ON / OFF
- createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP

## profile
- id INT AUTO_INCREMENT PRIMARY KEY
- name VARCHAR(100)
- email VARCHAR(100)
- gitlink VARCHAR(100)
- figmalink VARCHAR(100)

---

# 5. BACKEND HIỆN TẠI

## controllers/sensor.controller.js

Chức năng:
- GET lịch sử sensor
- limit
- search
- sort
- nhóm dữ liệu theo createAt

Code hiện tại:

const db = require('../config/db');

exports.getSensorHistory = async (req, res) => {
    try {
        let { limit = 100, search = '', sort = 'desc' } = req.query;
        limit = parseInt(limit);
        const sortOrder = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const searchParam = `%${search}%`;

        const sql = `
            SELECT * FROM (
                SELECT MIN(id) as id,
                       MAX(CASE WHEN sensor_id = 1 THEN value END) AS temperature,
                       MAX(CASE WHEN sensor_id = 2 THEN value END) AS humidity,
                       MAX(CASE WHEN sensor_id = 3 THEN value END) AS light,
                       createAt as time
                FROM data_sensor GROUP BY createAt
            ) AS t
            WHERE temperature LIKE ? OR humidity LIKE ? OR light LIKE ? OR time LIKE ?
            ORDER BY id ${sortOrder} LIMIT ?
        `;
        const [rows] = await db.query(sql, [searchParam, searchParam, searchParam, searchParam, limit]);
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error("Lỗi getSensorHistory:", error);
        res.status(500).json({ status: 'error' });
    }
};

## controllers/device.controller.js

Chức năng:
- gửi MQTT command
- lưu active_history
- lấy lịch sử hoạt động

Code hiện tại:

const db = require('../config/db');
const mqttClient = require('../config/mqtt');

exports.controlDevice = async (req, res) => {
    try {
        const { device_id, action } = req.body;
        mqttClient.publish('iot/devices/command', JSON.stringify({ device_id, action }));
        await db.query('INSERT INTO active_history (deviceId, action) VALUES (?, ?)', [device_id, action]);
        res.json({ status: 'success', message: 'Lệnh đã được gửi thành công' });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
};

exports.getActiveHistory = async (req, res) => {
    try {
        let { limit = 100, search = '', sort = 'desc' } = req.query;
        limit = parseInt(limit);
        const sortOrder = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const searchParam = `%${search}%`;

        const sql = `
            SELECT ah.id, d.name as device_name, ah.action, ah.createAt
            FROM active_history ah JOIN devices d ON ah.deviceId = d.id
            WHERE ah.id LIKE ? OR d.name LIKE ? OR ah.action LIKE ? OR ah.createAt LIKE ?
            ORDER BY ah.id ${sortOrder} LIMIT ?
        `;
        const [rows] = await db.query(sql, [searchParam, searchParam, searchParam, searchParam, limit]);
        res.json({ status: 'success', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
};

---

# 6. MQTT CONFIG

File: backend/config/mqtt.js

Code hiện tại:

const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('✅ Đã kết nối thành công tới MQTT Broker (Mosquitto)');

    client.subscribe('iot/sensors/data');
    client.subscribe('iot/devices/status');
});

client.on('error', (err) => {
    console.error('Lỗi kết nối MQTT:', err.message);
});

module.exports = client;

Mosquitto:
- Đã tải và cài trên máy.
- Broker local.
- Port 1883.
- ESP32 MQTT thật CHƯA được kết nối/test.

---

# 7. BACKEND SERVER

File server chính hiện tại có cấu trúc:

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./config/db');
const mqttClient = require('./config/mqtt');

const sensorRoutes = require('./routes/sensor.routes');
const deviceRoutes = require('./routes/device.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend Server IoT đang chạy cực chuẩn MVC!');
});

app.use('/api/sensors', sensorRoutes);
app.use('/api', deviceRoutes);
app.use('/api', profileRoutes);

mqttClient.on('message', async (topic, message) => {
    if (topic === 'iot/sensors/data') {
        try {
            const data = JSON.parse(message.toString());
            const { temperature, humidity, light } = data;

            const sqlSensor = `
                INSERT INTO data_sensor (sensor_id, value)
                VALUES (1, ?), (2, ?), (3, ?)
            `;

            await db.query(sqlSensor, [temperature, humidity, light]);

            const now = new Date();
            const timeString = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

            io.emit('newData', {
                temperature,
                humidity,
                light,
                timeString
            });

            console.log(
                `[MQTT] Đã nhận & Lưu DB: ${temperature}°C, ${humidity}%, ${light}Lux`
            );
        } catch (err) {
            console.error("Lỗi xử lý dữ liệu MQTT:", err.message);
        }
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại địa chỉ: http://localhost:${PORT}`);
});

---

# 8. FRONTEND

File chính được cung cấp:
frontend/js/api.js

Chức năng:
- Socket.IO real-time
- Dashboard Chart.js
- điều khiển thiết bị qua REST
- bảng sensor history
- bảng active history
- profile

Dashboard:
- Chart.js line chart
- 3 dataset: temperature, humidity, light
- giữ 7 mốc thời gian gần nhất
- cập nhật qua Socket.IO

Sensor history:
- limit mặc định 100
- scrollable table
- max-height 500px
- overflow-y auto
- sticky header
- search
- sort

Active history:
- limit 100
- scrollable table
- search
- sort

Frontend hiện đang gọi backend:
http://localhost:5000

---

# 9. SIMULATION

Hiện project có:
sim.js

Mục đích:
- giả lập ESP32 gửi dữ liệu MQTT.
- giúp test backend/frontend trước khi có phần cứng thật.

Khi ESP32 thật hoạt động end-to-end:
- có thể bỏ/tắt sim.js.
- KHÔNG được coi sim.js là phần cứng thật.

Trạng thái:
- sim.js đã tồn tại.
- Chưa được thay thế hoàn toàn bằng ESP32 thật.

---

# 10. PHẦN CỨNG

Board:
ESP32-WROOM-32 / ESP32 DevKit V1
38 pin

USB-UART:
Silicon Labs CP210x USB to UART Bridge

Windows nhận board:
COM5

Lệnh đã chạy:

pio device list

Kết quả liên quan:
COM5
Hardware ID: USB VID:PID=10C4:EA60 SER=0001 LOCATION=1-5
Description: Silicon Labs CP210x USB to UART Bridge (COM5)

COM3 và COM4 là Bluetooth Serial Link, KHÔNG phải ESP32.

---

# 11. PLATFORMIO

Thư mục:
D:\coding\IOT-Project\hardware

platformio.ini:

[env:esp32doit-devkit-v1]
platform = espressif32
board = esp32doit-devkit-v1
framework = arduino
monitor_speed = 115200
lib_deps =
    knolleary/PubSubClient@^2.8
    adafruit/DHT sensor library@^1.4.6
    adafruit/Adafruit Unified Sensor@^1.1.14

---

# 12. ESP32 ĐÃ TEST THÀNH CÔNG

Đã chạy:

pio run

Kết quả:
SUCCESS
Firmware image được tạo thành công.

Đã chạy:

pio run --target upload

Kết quả:
SUCCESS
Hash of data verified.
Hard resetting via RTS pin.

=> Firmware đã được nạp thành công vào ESP32.

Đã chạy:

pio device monitor -b 115200

Kết quả:

ets Jul 29 2019 12:21:46

rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
ESP32 da khoi dong!
ESP32 dang chay...
ESP32 dang chay...
ESP32 dang chay...

=> ESP32 chạy firmware và Serial Monitor hoạt động ở 115200.

---

# 13. LỖI ĐÃ GẶP VÀ ĐÃ GIẢI QUYẾT

## Serial Monitor bị ký tự rác

Ban đầu chạy:
pio device monitor

Kết quả:
��������������������...

Nguyên nhân:
baud rate monitor không khớp.

Đã sửa bằng:
pio device monitor -b 115200

Sau đó ESP32 log đọc đúng.

Bài học:
- monitor_speed hiện là 115200.
- Serial.begin trong firmware phải khớp 115200.

---

# 14. PINOUT PHẦN CỨNG ĐÃ CHỐT

ESP32 38 pin, ưu tiên sử dụng một hàng chân để dây gọn.

Hàng chân người dùng xác định:

V5
CMD
SD3
SD2
G13
GND
G12
G14
G27
G26
G25
G33
G32
G23
G34
SN
SP
EN
3V3

Hàng còn lại:

GND
G23
G22
TXD
RXD
G21
GND
G19
G18
G5
G17
G16
G4
G0
G2
G15
SD1
SDO
CLK

Pinout dự kiến hiện tại:

DHT11:
- VCC -> 3V3 rail
- GND -> GND rail
- DATA -> GPIO13

LDR module:
- VCC/+ -> 3V3 rail
- GND/- -> GND rail
- AO -> GPIO34
- DO -> chưa sử dụng

LED:
- LED1 control -> GPIO27
- LED2 control -> GPIO26
- LED3 control -> GPIO25
- mỗi LED có điện trở riêng 330 ohm
- GPIO -> 330 ohm -> LED -> GND

Nguồn:
- ESP32 3V3 -> breadboard + rail
- ESP32 GND -> breadboard - rail
- VCC các cảm biến dùng chung + rail
- GND cảm biến dùng chung - rail
- cực âm LED dùng chung GND rail

LƯU Ý:
- Pinout là thiết kế hiện tại.
- Chưa xác nhận bằng test toàn bộ phần cứng.
- Không tự ý đổi pinout khi chưa kiểm tra với chủ project.
- GPIO34 là input-only và phù hợp cho LDR AO.
- DO của LDR chưa dùng.

---

# 15. BREADBOARD

Người dùng đang dùng breadboard:
- giữa là các nhóm 5 lỗ liên kết.
- hai phía có các cặp rail + / - dùng làm nguồn.
- ESP32 được cắm lệch sang một bên vì không thể cắm chính giữa theo ý muốn.

Nguyên tắc:
- ESP32 3V3 -> rail +
- ESP32 GND -> rail -
- tất cả VCC cảm biến -> rail +
- tất cả GND cảm biến -> rail -
- GND LED -> rail -
- không nối 3V3 trực tiếp với GND.
- mỗi LED dùng một điện trở hạn dòng riêng.

Cần kiểm tra rail trên/dưới của breadboard có bị ngắt đoạn hay không. Nếu bị ngắt thì phải nối jumper giữa hai đoạn nếu muốn dùng chung nguồn.

---

# 16. KIẾN THỨC PHẦN CỨNG ĐÃ GIẢI THÍCH

GPIO:
- là chân input/output lập trình được.
- OUTPUT: ESP32 điều khiển thiết bị.
- INPUT: ESP32 đọc tín hiệu từ cảm biến.
- HIGH trên GPIO ESP32 xấp xỉ mức 3.3V.
- LOW xấp xỉ 0V.

pinMode(pin, OUTPUT):
- cấu hình GPIO làm output.

digitalWrite(pin, HIGH/LOW):
- đưa GPIO lên HIGH hoặc LOW.

analogRead(pin):
- đọc giá trị analog.
- LDR AO sẽ dùng kiểu đọc này.

LDR:
- AO = Analog Output, dùng để lấy giá trị thay đổi theo ánh sáng.
- DO = Digital Output, chỉ cho HIGH/LOW theo ngưỡng chỉnh trên module.
- Project dùng AO, DO chưa sử dụng.

LED:
- LED rời có cực.
- chân dài thường là Anode (+).
- chân ngắn thường là Cathode (-).
- phải có điện trở hạn dòng.
- mỗi LED một điện trở riêng.
- đề xuất 330 ohm.

---

# 17. TÌNH TRẠNG PHẦN CỨNG HIỆN TẠI

ĐÃ:
- ESP32 cắm USB vào laptop.
- Windows nhận COM5.
- PlatformIO nhận COM5.
- Firmware test đã compile.
- Firmware test đã upload.
- Serial Monitor đã chạy đúng.

ĐANG:
- đấu mạch thật trên breadboard.
- pinout đã chọn nhưng cần kiểm tra thực tế.

CHƯA:
- test DHT11 thật.
- test LDR thật.
- test LED thật.
- test Wi-Fi ESP32.
- test ESP32 MQTT.
- test ESP32 -> Mosquitto.
- test MQTT -> backend.
- test end-to-end bằng hardware thật.
- tắt sim.js.
- deploy backend/frontend/database/MQTT để truy cập từ thiết bị khác.

---

# 18. WIFI / MQTT / DEPLOYMENT

Hiện web/backend vẫn chạy LOCAL.

Backend:
localhost:5000

Mosquitto:
localhost:1883

Điện thoại/máy khác hiện CHƯA thể điều khiển qua Internet.

Mục tiêu cuối:
- deploy hệ thống để có link truy cập web.
- điện thoại/máy khác truy cập link.
- web điều khiển ESP32 qua backend/MQTT.
- cần thiết kế lại host/network/broker khi deploy.

Không cần ESP32 "được deploy" như web.
ESP32 sẽ:
1. chạy firmware đã nạp.
2. kết nối Wi-Fi.
3. kết nối MQTT broker.
4. gửi/nhận dữ liệu qua mạng.

Ở giai đoạn local, ESP32 và laptop chạy broker/backend cần nằm trong mạng có thể liên lạc được.
Không được dùng mqtt://localhost:1883 trong ESP32 để trỏ về laptop, vì localhost trên ESP32 là chính ESP32. ESP32 phải dùng IP/hostname của máy chạy Mosquitto.

---

# 19. MÔ PHỎNG

Mục tiêu:
- dùng Wokwi để mô phỏng ESP32 + DHT11 + LDR + LED.
- Wokwi phù hợp hơn SimulIDE cho ESP32.
- Có thể dùng diagram.json để lưu sơ đồ mạch.

Wokwi:
https://wokwi.com/

Cần dựng:
- ESP32 DevKit V1
- DHT11
- LDR/photoresistor phù hợp
- 3 LED
- 3 điện trở 330 ohm
- wiring theo pinout hiện tại

Sơ đồ mô phỏng phải được kiểm tra trước khi coi là đúng.

---

# 20. CÔNG VIỆC TIẾP THEO — THỨ TỰ BẮT BUỘC

Không nhảy bước.

## Bước A — Hoàn tất đấu mạch
1. Xác nhận đúng loại DHT11.
2. Xác nhận đúng LDR module.
3. Xác nhận cực LED.
4. Kiểm tra từng dây.
5. Không cấp nguồn nếu chưa kiểm tra VCC/GND.

## Bước B — Test LED độc lập
1. Viết firmware cực nhỏ.
2. GPIO27/26/25 OUTPUT.
3. Bật/tắt LED.
4. Xác nhận cả 3 LED.
5. Serial log.

## Bước C — Test DHT11
1. Dùng thư viện DHT.
2. Đọc temperature/humidity.
3. Serial Monitor.
4. Xác nhận giá trị hợp lý.

## Bước D — Test LDR
1. Đọc GPIO34 bằng analogRead.
2. Che/sáng cảm biến.
3. Kiểm tra giá trị thay đổi.
4. Xác định chiều tăng/giảm.
5. Chưa gọi đó là Lux thật nếu chưa có calibration.

## Bước E — Wi-Fi
1. Viết code kết nối Wi-Fi.
2. Serial in trạng thái.
3. In IP ESP32.
4. Xác nhận ESP32 truy cập mạng.

## Bước F — MQTT
1. Mosquitto chạy local.
2. ESP32 kết nối broker bằng IP laptop, KHÔNG dùng localhost.
3. ESP32 publish sensor data.
4. Backend subscribe.
5. Backend lưu MySQL.
6. Socket.IO đẩy frontend.

## Bước G — MQTT command
1. Web POST /api/control.
2. Backend publish iot/devices/command.
3. ESP32 subscribe.
4. ESP32 bật/tắt LED.
5. ESP32 publish status.
6. Backend nhận status.

## Bước H — End-to-end
ESP32 sensor
-> MQTT
-> Backend
-> MySQL
-> Socket.IO
-> Web

Web
-> REST
-> Backend
-> MQTT
-> ESP32
-> LED

## Bước I — bỏ simulation
Chỉ bỏ/tắt sim.js sau khi hardware end-to-end chạy ổn định.

## Bước J — deployment
Sau khi local end-to-end ổn:
- chọn nơi deploy.
- deploy backend/frontend.
- database remote.
- MQTT broker remote.
- cấu hình domain/HTTPS nếu cần.
- ESP32 dùng Wi-Fi và MQTT broker public/remote phù hợp.
- kiểm tra điện thoại/máy khác.

---

# 21. QUY TẮC HỖ TRỢ PROJECT

1. Không giả định phần cứng đã hoạt động nếu chưa test.
2. Không đổi pinout mà không nói rõ.
3. Mỗi khi dùng API/hàm/thư viện/khái niệm mới phải giải thích trước nếu người dùng chưa biết.
4. Khi đưa code phải kiểm tra syntax và logic.
5. Ưu tiên C++ cho firmware.
6. Mỗi bước chỉ làm một phần và test trước khi sang bước kế tiếp.
7. Khi có lỗi, xác định nguyên nhân trước rồi mới sửa.
8. Không xóa sim.js cho đến khi ESP32 thật chạy end-to-end.
9. Khi hướng dẫn đấu dây phải chỉ rõ VCC/GND/SIGNAL.
10. Nếu chưa biết chính xác loại module thì yêu cầu xác nhận/chụp chữ trên module thay vì đoán.
11. Không coi Wokwi là bằng chứng phần cứng thật đã chạy.
12. Không coi compile/upload thành công là sensor/LED đã hoạt động.
13. Mục tiêu là hệ thống IoT hoàn chỉnh, không chỉ firmware.

---

# 22. CHECKLIST TIẾN ĐỘ

[✓] Node.js backend
[✓] Express/MVC
[✓] MySQL integration
[✓] MQTT config backend
[✓] Mosquitto installed
[✓] Frontend SPA
[✓] Chart.js
[✓] Socket.IO
[✓] Search/Sort
[✓] Scrollable 100-row tables
[✓] sim.js
[✓] ESP32 driver/COM5
[✓] PlatformIO project
[✓] Firmware compile test
[✓] Firmware upload test
[✓] Serial Monitor 115200

[ ] LED hardware test
[ ] DHT11 hardware test
[ ] LDR hardware test
[ ] Wi-Fi ESP32
[ ] ESP32 MQTT
[ ] Sensor hardware -> backend
[ ] Web -> ESP32 LED
[ ] Device status -> backend
[ ] Full end-to-end
[ ] Disable sim.js
[ ] Deployment
[ ] Remote MQTT
[ ] Remote database
[ ] Phone/other-device access

---

# 23. CURRENT NEXT ACTION

Ngay sau file này:
1. Hoàn tất/kiểm tra mạch thật.
2. Test LED trước.
3. Sau khi LED OK mới test DHT11.
4. Sau DHT11 mới test LDR.
5. Sau khi từng phần cứng OK mới tích hợp Wi-Fi + MQTT.

Trạng thái hiện tại KHÔNG được coi là IoT end-to-end.
ESP32 mới chỉ được chứng minh:
- nhận firmware;
- boot;
- chạy loop;
- xuất Serial 115200.
