const API_BASE = "http://localhost:5000/api";

let sensorPollingInterval = null;
let sensorChart = null;

// Dữ liệu tĩnh (50 dòng mỗi bảng để test phân trang)
const mockSensors = [];
const mockHistory = [];
const baseTime = Date.now();

for (let i = 0; i < 50; i++) {
    const tStr = new Date(baseTime - i * 15000).toLocaleTimeString("vi-VN") + ", 12/10/2026";
    const typeMod = i % 3;
    if (typeMod === 0) mockSensors.push({ id: i, sensor_name: "nhiệt độ", value: `${(28 + (i % 5) * 0.5).toFixed(1)}°C`, time: tStr, rawType: "temp", rawVal: +(28 + (i % 5) * 0.5).toFixed(1) });
    else if (typeMod === 1) mockSensors.push({ id: i, sensor_name: "độ ẩm", value: `${55 + (i % 10)}%`, time: tStr, rawType: "humid", rawVal: 55 + (i % 10) });
    else mockSensors.push({ id: i, sensor_name: "ánh sáng", value: `${250 + (i % 15) * 20} Lux`, time: tStr, rawType: "light", rawVal: 250 + (i % 15) * 20 });

    mockHistory.push({
        id: i,
        device_name: `đèn ${(i % 3) + 1}`,
        action: i % 2 === 0 ? "bật" : "tắt",
        status: i % 5 === 0 ? "lỗi" : (i % 2 === 0 ? "on" : "off"),
        time: tStr
    });
}

// State quản lý phân trang
let sensorCurrentPage = 1;
let sensorPageSize = 10;
let sensorFilteredList = [...mockSensors];

let historyCurrentPage = 1;
let historyPageSize = 10;
let historyFilteredList = [...mockHistory];

// ==========================================
// SPA NAVIGATION
// ==========================================
function switchPage(pageName, element) {
    document.querySelectorAll(".sidebar nav li").forEach(li => li.classList.remove("active"));
    if (element) element.classList.add("active");

    if (sensorPollingInterval) {
        clearInterval(sensorPollingInterval);
        sensorPollingInterval = null;
    }

    fetch(`pages/${pageName}.html`)
        .then(res => res.text())
        .then(html => {
            document.getElementById("app-content").innerHTML = html;
            if (pageName === "dashboard") initDashboard();
            if (pageName === "dataSensor") {
                sensorCurrentPage = 1;
                applySensorFilter();
            }
            if (pageName === "activeHistory") {
                historyCurrentPage = 1;
                applyHistoryFilter();
            }
        })
        .catch(err => {
            document.getElementById("app-content").innerHTML = `<p style="color:red">Lỗi tải trang: ${err.message}</p>`;
        });
}

// ==========================================
// DASHBOARD: KHÔNG SINH RANDOM - TẮT ANIMATION
// ==========================================
function initDashboard() {
    const themeCheckbox = document.getElementById("theme-checkbox");
    if (themeCheckbox) {
        themeCheckbox.checked = isLightMode;
        if (isLightMode) {
            document.getElementById("label-light")?.classList.add("active");
            document.getElementById("label-dark")?.classList.remove("active");
        } else {
            document.getElementById("label-light")?.classList.remove("active");
            document.getElementById("label-dark")?.classList.add("active");
        }
    }

    const chartCanvas = document.getElementById("sensorChart");
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext("2d");

    // Lấy đúng 10 bản ghi gần nhất theo từng loại từ mockSensors đã có, không gen random
    const tempRecords = mockSensors.filter(s => s.rawType === "temp").slice(0, 10).reverse();
    const humidRecords = mockSensors.filter(s => s.rawType === "humid").slice(0, 10).reverse();
    const lightRecords = mockSensors.filter(s => s.rawType === "light").slice(0, 10).reverse();

    const initialLabels = tempRecords.map(item => item.time.split(",")[0].trim());
    const initTemp = tempRecords.map(item => item.rawVal);
    const initHumid = humidRecords.map(item => item.rawVal);
    const initLight = lightRecords.map(item => item.rawVal);

    const textColor = isLightMode ? "#0f172a" : "#ffffff";
    const gridColor = isLightMode ? "#e2e8f0" : "#334155";

    if (sensorChart) {
        sensorChart.destroy();
    }

    sensorChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: initialLabels,
            datasets: [
                {
                    label: "Nhiệt độ (°C)",
                    borderColor: "#f87171",
                    backgroundColor: "#f87171",
                    data: initTemp,
                    yAxisID: "yTempHumid",
                    tension: 0.3
                },
                {
                    label: "Độ ẩm (%)",
                    borderColor: "#38bdf8",
                    backgroundColor: "#38bdf8",
                    data: initHumid,
                    yAxisID: "yTempHumid",
                    tension: 0.3
                },
                {
                    label: "Ánh sáng (Lux)",
                    borderColor: "#facc15",
                    backgroundColor: "#facc15",
                    data: initLight,
                    yAxisID: "yLight",
                    tension: 0.3
                }
            ]
        },
        options: {
            animation: false, // TẮT TOÀN BỘ HOẠT ẢNH TỰ CHẠY
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                yTempHumid: {
                    type: "linear",
                    position: "left",
                    min: 0,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: val => `${val}`
                    },
                    title: {
                        display: true,
                        text: "Nhiệt độ (°C) / Độ ẩm (%)",
                        color: textColor
                    }
                },
                yLight: {
                    type: "linear",
                    position: "right",
                    min: 0,
                    suggestedMax: 800,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: textColor,
                        callback: val => `${val} Lx`
                    },
                    title: {
                        display: true,
                        text: "Ánh sáng (Lux)",
                        color: textColor
                    }
                }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        }
    });

    if (initTemp.length > 0) {
        updateStatDisplay(
            initTemp[initTemp.length - 1],
            initHumid[initHumid.length - 1],
            initLight[initLight.length - 1]
        );
    }
}

// Chỉ gọi hàm này khi có data thật bắn về (từ API / MQTT / Socket)
function pushChartData(timeLabel, temp, humid, light) {
    if (!sensorChart) return;
    sensorChart.data.labels.push(timeLabel);
    sensorChart.data.datasets[0].data.push(temp);
    sensorChart.data.datasets[1].data.push(humid);
    sensorChart.data.datasets[2].data.push(light);

    if (sensorChart.data.labels.length > 10) {
        sensorChart.data.labels.shift();
        sensorChart.data.datasets[0].data.shift();
        sensorChart.data.datasets[1].data.shift();
        sensorChart.data.datasets[2].data.shift();
    }
    sensorChart.update("none"); // Tắt hiệu ứng co giãn khi update
}

function updateStatDisplay(t, h, l) {
    const tempElem = document.getElementById("temp-value");
    const humidElem = document.getElementById("humid-value");
    const lightElem = document.getElementById("light-value");
    if (tempElem) tempElem.innerText = `${t}°C`;
    if (humidElem) humidElem.innerText = `${h}%`;
    if (lightElem) lightElem.innerText = `${l} Lux`;
}

function toggleDevice(deviceId, isChecked) {
    const action = isChecked ? "ON" : "OFF";
    fetch(`${API_BASE}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, action: action })
    }).catch(() => {});
}

// ==========================================
// DATA SENSOR: TÌM KIẾM, SORT & PHÂN TRANG
// ==========================================
function applySensorFilter() {
    const sortVal = document.getElementById("sort-sensor").value;
    const keyword = document.getElementById("search-sensor").value.toLowerCase().trim();

    sensorFilteredList = mockSensors.filter(item => {
        const matchText = item.sensor_name.toLowerCase().includes(keyword) || 
                          item.value.toLowerCase().includes(keyword) || 
                          item.time.toLowerCase().includes(keyword);
        if (!matchText) return false;

        if (sortVal === "type_temp") return item.rawType === "temp";
        if (sortVal === "type_humid") return item.rawType === "humid";
        if (sortVal === "type_light") return item.rawType === "light";
        return true;
    });

    if (sortVal === "time_asc") sensorFilteredList.sort((a, b) => a.id - b.id);
    if (sortVal === "time_desc") sensorFilteredList.sort((a, b) => b.id - a.id);

    sensorCurrentPage = 1;
    renderSensorPage();
}

function renderSensorPage() {
    const tbody = document.getElementById("table-sensor-body");
    if (!tbody) return;

    const totalRecords = sensorFilteredList.length;
    const totalPages = Math.ceil(totalRecords / sensorPageSize) || 1;
    if (sensorCurrentPage > totalPages) sensorCurrentPage = totalPages;

    const startIdx = (sensorCurrentPage - 1) * sensorPageSize;
    const pageItems = sensorFilteredList.slice(startIdx, startIdx + sensorPageSize);

    tbody.innerHTML = "";
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không tìm thấy bản ghi phù hợp</td></tr>`;
    } else {
        pageItems.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.sensor_name}</td>
                    <td>${item.value}</td>
                    <td>${item.time}</td>
                </tr>
            `;
        });
    }

    document.getElementById("page-num-sensor").innerText = sensorCurrentPage;
    document.getElementById("page-info-sensor").innerText = `Trang ${sensorCurrentPage} / ${totalPages} (Tổng ${totalRecords} bản ghi)`;
}

function changeSensorPageSize(size) {
    sensorPageSize = parseInt(size);
    sensorCurrentPage = 1;
    renderSensorPage();
}

function prevSensorPage() {
    if (sensorCurrentPage > 1) {
        sensorCurrentPage--;
        renderSensorPage();
    }
}

function nextSensorPage() {
    const totalPages = Math.ceil(sensorFilteredList.length / sensorPageSize) || 1;
    if (sensorCurrentPage < totalPages) {
        sensorCurrentPage++;
        renderSensorPage();
    }
}

// ==========================================
// ACTIVE HISTORY: TÌM KIẾM, SORT & PHÂN TRANG
// ==========================================
function applyHistoryFilter() {
    const sortVal = document.getElementById("sort-history").value;
    const keyword = document.getElementById("search-history").value.toLowerCase().trim();

    historyFilteredList = mockHistory.filter(item => {
        const matchText = item.device_name.toLowerCase().includes(keyword) || 
                          item.action.toLowerCase().includes(keyword) || 
                          item.status.toLowerCase().includes(keyword) || 
                          item.time.toLowerCase().includes(keyword);
        if (!matchText) return false;

        if (sortVal === "dev_1") return item.device_name === "đèn 1";
        if (sortVal === "dev_2") return item.device_name === "đèn 2";
        if (sortVal === "dev_3") return item.device_name === "đèn 3";
        if (sortVal === "act_on") return item.action === "bật";
        if (sortVal === "act_off") return item.action === "tắt";
        return true;
    });

    if (sortVal === "time_asc") historyFilteredList.sort((a, b) => a.id - b.id);
    if (sortVal === "time_desc") historyFilteredList.sort((a, b) => b.id - a.id);

    historyCurrentPage = 1;
    renderHistoryPage();
}

function renderHistoryPage() {
    const tbody = document.getElementById("table-history-body");
    if (!tbody) return;

    const totalRecords = historyFilteredList.length;
    const totalPages = Math.ceil(totalRecords / historyPageSize) || 1;
    if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;

    const startIdx = (historyCurrentPage - 1) * historyPageSize;
    const pageItems = historyFilteredList.slice(startIdx, startIdx + historyPageSize);

    tbody.innerHTML = "";
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Không tìm thấy bản ghi phù hợp</td></tr>`;
    } else {
        pageItems.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.device_name}</td>
                    <td>${item.action}</td>
                    <td>${item.status}</td>
                    <td>${item.time}</td>
                </tr>
            `;
        });
    }

    document.getElementById("page-num-history").innerText = historyCurrentPage;
    document.getElementById("page-info-history").innerText = `Trang ${historyCurrentPage} / ${totalPages} (Tổng ${totalRecords} bản ghi)`;
}

function changeHistoryPageSize(size) {
    historyPageSize = parseInt(size);
    historyCurrentPage = 1;
    renderHistoryPage();
}

function prevHistoryPage() {
    if (historyCurrentPage > 1) {
        historyCurrentPage--;
        renderHistoryPage();
    }
}

function nextHistoryPage() {
    const totalPages = Math.ceil(historyFilteredList.length / historyPageSize) || 1;
    if (historyCurrentPage < totalPages) {
        historyCurrentPage++;
        renderHistoryPage();
    }
}

// ==========================================
// THEME
// ==========================================
let isLightMode = false;

function toggleTheme(isChecked) {
    isLightMode = isChecked;

    if (isLightMode) {
        document.body.classList.add("light-mode");
        document.getElementById("label-light")?.classList.add("active");
        document.getElementById("label-dark")?.classList.remove("active");
    } else {
        document.body.classList.remove("light-mode");
        document.getElementById("label-light")?.classList.remove("active");
        document.getElementById("label-dark")?.classList.add("active");
    }

    if (sensorChart) {
        const textColor = isLightMode ? "#0f172a" : "#ffffff";
        const gridColor = isLightMode ? "#e2e8f0" : "#334155";

        sensorChart.options.scales.x.ticks.color = textColor;
        sensorChart.options.scales.x.grid.color = gridColor;

        sensorChart.options.scales.yTempHumid.ticks.color = textColor;
        sensorChart.options.scales.yTempHumid.title.color = textColor;
        sensorChart.options.scales.yTempHumid.grid.color = gridColor;

        sensorChart.options.scales.yLight.ticks.color = textColor;
        sensorChart.options.scales.yLight.title.color = textColor;

        sensorChart.options.plugins.legend.labels.color = textColor;

        sensorChart.update("none");
    }
}

// Khởi chạy Dashboard mặc định khi load trang
document.addEventListener("DOMContentLoaded", () => {
    switchPage("dashboard", document.querySelector(".sidebar nav li.active"));
});