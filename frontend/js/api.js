/**
 * FILE: api.js
 * CHỨC NĂNG:
 * - Kết nối Socket.IO
 * - Hiển thị Dashboard
 * - Vẽ biểu đồ cảm biến
 * - Điều khiển thiết bị
 * - Lấy lịch sử cảm biến
 * - Lấy lịch sử thiết bị
 * - Hiển thị Profile
 */

let sensorChart;
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


// ==========================================
// 2. DATA SENSOR
// ==========================================

let sensorSearchKw = '';
let sensorSortType = 'desc';


function initDataSensor() {

    loadSensorData();


    const searchInput =
        document.getElementById(
            'search-sensor'
        );


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            (e) => {

                sensorSearchKw =
                    e.target.value;

                loadSensorData();
            }
        );
    }


    const sortSelect =
        document.getElementById(
            'sort-sensor'
        );


    if (sortSelect) {

        sortSelect.addEventListener(
            'change',
            (e) => {

                sensorSortType =
                    e.target.value;

                loadSensorData();
            }
        );
    }
}


// ==========================================
// LOAD SENSOR DATA
// ==========================================

function loadSensorData() {

    const url =
        `http://localhost:5000/api/sensors/history` +
        `?limit=100` +
        `&search=${sensorSearchKw}` +
        `&sort=${sensorSortType}`;


    fetch(url)

        .then(res => res.json())

        .then(data => {

            if (data.status === 'success') {

                renderSensorTable(
                    data.data
                );
            }
        });
}


// ==========================================
// RENDER SENSOR TABLE
// ==========================================

function renderSensorTable(data) {

    const tbody =
        document.getElementById(
            'table-sensor-body'
        );


    if (!tbody) return;


    tbody.innerHTML = '';


    data.forEach(row => {

        const timeObj =
            new Date(row.time);


        const formattedTime =
            `${timeObj.toLocaleTimeString('vi-VN')}, ` +
            `${timeObj.toLocaleDateString('vi-VN')}`;


        const temp =
            Math.round(
                row.temperature || 0
            );


        const hum =
            Math.round(
                row.humidity || 0
            );


        const light =
            Math.round(
                row.light || 0
            );


        tbody.innerHTML +=
            `<tr>
                <td>${row.id}</td>
                <td>${temp}</td>
                <td>${hum}</td>
                <td>${light}</td>
                <td>${formattedTime}</td>
            </tr>`;
    });
}


// ==========================================
// 3. ACTIVE HISTORY
// ==========================================

let historySearchKw = '';
let historySortType = 'desc';


function initActiveHistory() {

    loadHistoryData();


    const searchInput =
        document.getElementById(
            'search-history'
        );


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            (e) => {

                historySearchKw =
                    e.target.value;

                loadHistoryData();
            }
        );
    }


    const sortSelect =
        document.getElementById(
            'sort-history'
        );


    if (sortSelect) {

        sortSelect.addEventListener(
            'change',
            (e) => {

                historySortType =
                    e.target.value;

                loadHistoryData();
            }
        );
    }
}


// ==========================================
// LOAD HISTORY DATA
// ==========================================

function loadHistoryData() {

    const url =
        `http://localhost:5000/api/history` +
        `?limit=100` +
        `&search=${historySearchKw}` +
        `&sort=${historySortType}`;


    fetch(url)

        .then(res => res.json())

        .then(data => {

            if (data.status === 'success') {

                renderHistoryTable(
                    data.data
                );
            }
        });
}


// ==========================================
// RENDER HISTORY TABLE
// ==========================================

function renderHistoryTable(data) {

    const tbody =
        document.getElementById(
            'table-history-body'
        );


    if (!tbody) return;


    tbody.innerHTML = '';


    data.forEach(row => {

        const timeObj =
            new Date(row.createAt);


        const formattedTime =
            `${timeObj.toLocaleTimeString('vi-VN')}, ` +
            `${timeObj.toLocaleDateString('vi-VN')}`;


        const actionColor =
            row.action === 'ON'
                ? '#fbbf24'
                : '#94a3b8';


        tbody.innerHTML +=
            `<tr>
                <td>${row.id}</td>
                <td>${row.device_name}</td>
                <td style="color:${actionColor}; font-weight:bold">
                    ${row.action}
                </td>
                <td>${formattedTime}</td>
            </tr>`;
    });
}


// ==========================================
// 4. PROFILE
// ==========================================

function initProfile() {

    fetch(
        'http://localhost:5000/api/profile'
    )

        .then(res => res.json())

        .then(data => {

            if (data.status === 'success') {

                const info = data.data;


                document.getElementById(
                    'pro-name'
                ).innerText =
                    info.name ||
                    'Chưa cập nhật';


                document.getElementById(
                    'pro-email'
                ).innerText =
                    info.email ||
                    'Chưa cập nhật';


                const gh =
                    document.getElementById(
                        'pro-github'
                    );

                const githubUrl = info.gitlink || info.gitink || info.github;

                if (githubUrl) {

                    gh.innerText =
                        githubUrl;

                    gh.href =
                        githubUrl;

                } else {

                    gh.innerText =
                        'Chưa cập nhật';
                }


                const fg =
                    document.getElementById(
                        'pro-figma'
                    );

                const figmaUrl = info.figmalink || info.figma;

                if (figmaUrl) {

                    fg.innerText =
                        figmaUrl;

                    fg.href =
                        figmaUrl;

                } else {

                    fg.innerText =
                        'Chưa cập nhật';
                }


                if (info.avatar) {

                    document.getElementById(
                        'profile-avatar'
                    ).style.backgroundImage =
                        `url('${info.avatar}')`;
                }
            }
        })

        .catch(err =>
            console.error(
                "Lỗi lấy Profile:",
                err
            )
        );
}