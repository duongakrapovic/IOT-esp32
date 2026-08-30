let sensorChart;
// ==========================================
// 1. TRANG DASHBOARD
// ==========================================

function initDashboard() {
    const ctx = document.getElementById('sensorChart');

    if (!ctx) return;


    sensorChart = new Chart(ctx.getContext('2d'), {

        type: 'line',

        data: {

            labels: [],

            datasets: [

                {
                    label: 'Nhiệt độ',
                    borderColor: '#f87171',
                    backgroundColor: '#f87171',
                    data: [],
                    tension: 0.4,
                    yAxisID: 'yTemperature'
                },

                {
                    label: 'Độ ẩm',
                    borderColor: '#34d399',
                    backgroundColor: '#34d399',
                    data: [],
                    tension: 0.4,
                    yAxisID: 'yHumidity'
                },

                {
                    label: 'Ánh sáng',
                    borderColor: '#fbbf24',
                    backgroundColor: '#fbbf24',
                    data: [],
                    tension: 0.4,
                    yAxisID: 'yLight'
                }

            ]
        },


        options: {

            responsive: true,

            maintainAspectRatio: false,


            plugins: {

                legend: {
                    display: false
                }

            },


            scales: {

                // ==============================
                // TRỤC THỜI GIAN
                // ==============================

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {

                        autoSkip: false,

                        maxRotation: 0,

                        minRotation: 0

                    }

                },


                // ==============================
                // NHIỆT ĐỘ
                // ==============================

                yTemperature: {

                    type: 'linear',

                    position: 'left',

                    min: 0,

                    max: 50,

                    offset: false,

                    ticks: {

                        color: '#f87171'

                    },

                    grid: {

                        drawOnChartArea: true

                    }

                },


                // ==============================
                // ĐỘ ẨM
                // ==============================

                yHumidity: {

                    type: 'linear',

                    position: 'left',

                    min: 0,

                    max: 100,

                    offset: false,

                    ticks: {

                        color: '#34d399'

                    },

                    grid: {

                        drawOnChartArea: false

                    }

                },


                // ==============================
                // ÁNH SÁNG
                // ==============================

                yLight: {

                    type: 'linear',

                    position: 'right',

                    min: 0,

                    max: 5000,

                    offset: false,

                    ticks: {

                        color: '#fbbf24',

                        callback: function(value) {
                            return value.toLocaleString('en-US');
                        }

                    },

                    grid: {

                        drawOnChartArea: false

                    }

                }

            }

        }

    });


    // ==========================================
    // ĐIỀU KHIỂN ĐÈN
    // ==========================================

    document.querySelectorAll('.switch input').forEach(toggle => {

        toggle.addEventListener('change', function() {

            fetch('http://localhost:5000/api/control', {

                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    device_id: this.id,

                    action: this.checked ? 'ON' : 'OFF'

                })

            })

            .catch(() => {

                this.checked = !this.checked;

            });

        });

    });
    // Gọi lấy 13 bản ghi gần nhất để hiển thị biểu đồ ngay lập tức
    fetch('http://localhost:5000/api/sensors/history?limit=13&sort=desc')
        .then(res => res.json())
        .then(resData => {
            if (resData.status === 'success' && resData.data.length > 0) {
                const recentData = resData.data.reverse();
                sensorChart.data.labels = recentData.map(item => new Date(item.time).toLocaleTimeString('vi-VN'));
                sensorChart.data.datasets[0].data = recentData.map(item => Math.round(item.temperature || 0));
                sensorChart.data.datasets[1].data = recentData.map(item => Math.round(item.humidity || 0));
                sensorChart.data.datasets[2].data = recentData.map(item => Math.round(item.light || 0));
                sensorChart.update();

                const latest = recentData[recentData.length - 1];
                document.getElementById('temp-value').innerText = Math.round(latest.temperature || 0) + ' °C';
                document.getElementById('humid-value').innerText = Math.round(latest.humidity || 0) + ' %';
                document.getElementById('light-value').innerText = Math.round(latest.light || 0) + ' Lux';
            }
        })
        .catch(err => console.error("Lỗi tải lịch sử sensor:", err));
    // Đồng bộ trạng thái công tắc theo lịch sử gần nhất
    fetch('http://localhost:5000/api/history?limit=50&sort=desc')
        .then(res => res.json())
        .then(resData => {
            if (resData.status === 'success' && resData.data.length > 0) {
                ['device1', 'device2', 'device3'].forEach(devId => {
                    const devName = devId === 'device1' ? 'Đèn 1' : (devId === 'device2' ? 'Đèn 2' : 'Đèn 3');
                    const lastAction = resData.data.find(item => item.device_name === devName);
                    const toggleInput = document.getElementById(devId);
                    if (toggleInput && lastAction) {
                        toggleInput.checked = (lastAction.action === 'ON');
                    }
                });
            }
        })
        .catch(err => console.error("Lỗi đồng bộ công tắc:", err));    
}

// ==========================================
// CẬP NHẬT DASHBOARD
// ==========================================

function updateDashboard(
    temp,
    humid,
    light,
    timeString
) {

    // ------------------------------------------
    // GIÁ TRỊ HIỆN TẠI
    // ------------------------------------------

    document.getElementById(
        'temp-value'
    ).innerText =
        Math.round(temp) + ' °C';


    document.getElementById(
        'humid-value'
    ).innerText =
        Math.round(humid) + ' %';


    document.getElementById(
        'light-value'
    ).innerText =
        Math.round(light) + ' Lux';


    // ------------------------------------------
    // THÊM DỮ LIỆU VÀO BIỂU ĐỒ
    // ------------------------------------------

    sensorChart.data.labels.push(
        timeString
    );


    sensorChart.data.datasets[0].data.push(
        temp
    );


    sensorChart.data.datasets[1].data.push(
        humid
    );


    sensorChart.data.datasets[2].data.push(
        light
    );


    // ------------------------------------------
    // CHỈ GIỮ 13 MỐC THỜI GIAN
    // ------------------------------------------

    if (sensorChart.data.labels.length > 13) {
        sensorChart.data.labels.shift();
        sensorChart.data.datasets.forEach(ds => {ds.data.shift();});
    }
    sensorChart.update();
}