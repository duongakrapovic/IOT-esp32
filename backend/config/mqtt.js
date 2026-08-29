const mqtt = require('mqtt');

// Kết nối tới MQTT Broker (Mosquitto đang chạy cục bộ ở port 1883)
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('✅ Đã kết nối thành công tới MQTT Broker (Mosquitto)');
    
    // Đăng ký (Subscribe) lắng nghe các topic từ phần cứng ESP32 gửi lên
    client.subscribe('iot/sensors/data');
    client.subscribe('iot/devices/status');
});

client.on('error', (err) => {
    console.error('Lỗi kết nối MQTT:', err.message);
});

module.exports = client;