let socket;

let currentSensorData = [];
let currentHistoryData = [];

// ==========================================
// 0. KẾT NỐI REAL-TIME (SOCKET.IO)
// ==========================================

if (!socket) {
    socket = io('http://localhost:5000');

    socket.on('newData', (data) => {
        const chart = document.getElementById('sensorChart');
        const status = document.getElementById('hardware-status');

        // Chỉ cập nhật khi đang ở Dashboard
        if (chart) {
            // ESP32 đã gửi dữ liệu thành công tới Backend
            if (status) {
                status.innerText = 'Trạng thái: Đang hoạt động · Cập nhật liên tục';
                status.style.color = '#4ade80';
            }

            updateDashboard(
                data.temperature,
                data.humidity,
                data.light,
                data.timeString
            );
        }
    });

    // Mất kết nối tới Backend
    socket.on('disconnect', () => {
        const status = document.getElementById('hardware-status');

        if (status) {
            status.innerText = 'Trạng thái: Mất kết nối Server';
            status.style.color = '#f87171';
        }
    });
}