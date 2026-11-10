/* ==========================================================================
   MỤC LỤC TÌM KIẾM NHANH (Bấm Ctrl + F gõ cụm từ khóa):
   --------------------------------------------------------------------------
   [JS-API]        : Cấu hình URL Backend API & Biến trạng thái toàn cục
   [JS-TOAST]      : THÔNG BÁO POPUP (TOAST) & HÀM SAO CHÉP THỜI GIAN
   [JS-SPA]        : Cơ chế chuyển trang mượt mà không load lại (Single Page App)
   [JS-DEVICE-SYNC]: Đồng bộ trạng thái công tắc dựa trên CSDL MySQL
   [JS-CHART]      : Cấu hình biểu đồ Chart.js & Realtime Polling Dashboard
   [JS-DEVICE]     : Hàm gửi lệnh POST bật/tắt thiết bị & Chờ phản hồi
   [JS-SENSOR-TAB] : Lấy dữ liệu, Lọc và Phân trang Bảng Data Sensor (Real-time 2s)
   [JS-HIST-TAB]   : Lấy dữ liệu và Phân trang Bảng Active History từ MySQL (Users)
   [JS-PROFILE-TAB]: Tải thông tin Tác giả website từ bảng Profile
   [JS-PAGINATION] : HÀM VẼ THANH PHÂN TRANG 3 NÚT SỐ VÀ CHUYỂN TRANG TRỰC TIẾP
   [JS-THEME]      : Đồng bộ chế độ Sáng / Tối (Dark / Light) cho web & Biểu đồ
   [JS-INIT]       : Sự kiện khởi chạy đầu tiên khi tải xong website
   ========================================================================== */

/* ==========================================================================
   [JS-API] 1. CẤU HÌNH BACKEND API & BIẾN TRẠNG THÁI TOÀN CỤC
   ========================================================================== */
const API_BASE = "http://localhost:5000/api";

let sensorPollingInterval = null; // Polling 2s cho Dashboard (Chart + Cards + Công tắc)
let tablePollingInterval = null;  // Polling 2s cho Bảng Data Sensor & Active History
let sensorChart = null;
let isLightMode = false;

let sensorCurrentPage = 1;
let sensorPageSize = 10;

let historyCurrentPage = 1;
let historyPageSize = 10;

// Hàm tạo Headers chứa JWT Token tự động từ localStorage
function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
    };
}

/* ==========================================================================
   [JS-TOAST] 2. THÔNG BÁO POPUP (TOAST) & HÀM SAO CHÉP THỜI GIAN
   ========================================================================== */
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    container.innerHTML = "";

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✅" : (type === "info" ? "ℹ️" : "⚠️");
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function copyTimeText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Đã chép: "${text}"`, "info");
    }).catch(() => {
        showToast("Không thể chép!", "info");
    });
}

/* ==========================================================================
   [JS-SPA] 3. ĐIỀU HƯỚNG TRANG CON (SINGLE PAGE APPLICATION)
   ========================================================================== */
function switchPage(pageName, element) {
    document.querySelectorAll(".sidebar nav li").forEach(li => li.classList.remove("active"));
    if (element) element.classList.add("active");

    if (sensorPollingInterval) {
        clearInterval(sensorPollingInterval);
        sensorPollingInterval = null;
    }
    if (tablePollingInterval) {
        clearInterval(tablePollingInterval);
        tablePollingInterval = null;
    }

    fetch(`pages/${pageName}.html`)
        .then(res => res.text())
        .then(html => {
            document.getElementById("app-content").innerHTML = html;

            if (pageName === "dashboard") {
                initDashboard();
            } else if (pageName === "dataSensor") {
                sensorCurrentPage = 1;
                fetchSensorData();
                tablePollingInterval = setInterval(fetchSensorData, 2000);
            } else if (pageName === "activeHistory") {
                historyCurrentPage = 1;
                fetchHistoryData();
                tablePollingInterval = setInterval(fetchHistoryData, 2000);
            } else if (pageName === "profile") {
                loadProfileData();
            }
        })
        .catch(err => {
            document.getElementById("app-content").innerHTML = `<p style="color:red">Lỗi tải trang: ${err.message}</p>`;
        });
}

/* ==========================================================================
   [JS-DEVICE-SYNC] 4. ĐỒNG BỘ TRẠNG THÁI CÔNG TẮC TỪ CSDL
   ========================================================================== */
async function syncDeviceStatus() {
    try {
        const res = await fetch(`${API_BASE}/devices/status`, {
            headers: getAuthHeaders()
        });
        const result = await res.json();
        if (result.success && result.data) {
            result.data.forEach(item => {
                const switchElem = document.getElementById(`device-switch-${item.device_id}`);
                if (switchElem && !switchElem.disabled) {
                    const actionStr = (item.action || "").toLowerCase().trim();
                    const isON = ['on', 'bật', '1', 'true'].includes(actionStr);
                    switchElem.checked = isON;
                }
            });
        }
    } catch (err) {
        console.error("Lỗi lấy trạng thái công tắc:", err);
    }
}

/* ==========================================================================
   [JS-CHART] 5. BIỂU ĐỒ CHART.JS & REAL-TIME DASHBOARD DATA
   ========================================================================== */
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

    const textColor = isLightMode ? "#0f172a" : "#ffffff";
    const gridColor = isLightMode ? "#e2e8f0" : "#334155";

    if (sensorChart) sensorChart.destroy();

    sensorChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Nhiệt độ (°C)",
                    borderColor: "#f87171",
                    backgroundColor: "#f87171",
                    data: [],
                    yAxisID: "yTempHumid",
                    tension: 0.3
                },
                {
                    label: "Độ ẩm (%)",
                    borderColor: "#38bdf8",
                    backgroundColor: "#38bdf8",
                    data: [],
                    yAxisID: "yTempHumid",
                    tension: 0.3
                },
                {
                    label: "Ánh sáng (Lux)",
                    borderColor: "#facc15",
                    backgroundColor: "#facc15",
                    data: [],
                    yAxisID: "yLight",
                    tension: 0.3
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                yTempHumid: {
                    type: "linear",
                    position: "left",
                    min: 0,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: textColor },
                    title: { display: true, text: "Nhiệt độ (°C) / Độ ẩm (%)", color: textColor }
                },
                yLight: {
                    type: "linear",
                    position: "right",
                    min: 0,
                    suggestedMax: 800,
                    grid: { drawOnChartArea: false },
                    ticks: { color: textColor, callback: val => `${val} Lx` },
                    title: { display: true, text: "Ánh sáng (Lux)", color: textColor }
                }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        }
    });

    loadDashboardData();
    syncDeviceStatus();
    sensorPollingInterval = setInterval(() => {
        loadDashboardData();
        syncDeviceStatus();
    }, 2000);
}

async function loadDashboardData() {
    try {
        const res = await fetch(`${API_BASE}/sensors/latest`, {
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success && result.data) {
            const rawData = result.data;

            const latestTemp = rawData.find(d => d.sensor_id === 1)?.value || 0;
            const latestHumid = rawData.find(d => d.sensor_id === 2)?.value || 0;
            const latestLight = rawData.find(d => d.sensor_id === 3)?.value || 0;

            updateStatDisplay(latestTemp, latestHumid, latestLight);

            const grouped = {};
            rawData.forEach(item => {
                const timeStr = item.time ? new Date(item.time).toLocaleTimeString("vi-VN") : "";
                if (!grouped[timeStr]) grouped[timeStr] = {};
                if (item.sensor_id === 1) grouped[timeStr].temp = item.value;
                if (item.sensor_id === 2) grouped[timeStr].humid = item.value;
                if (item.sensor_id === 3) grouped[timeStr].light = item.value;
            });

            const labels = Object.keys(grouped).reverse().slice(-10);
            const tempData = labels.map(t => grouped[t].temp || 0);
            const humidData = labels.map(t => grouped[t].humid || 0);
            const lightData = labels.map(t => grouped[t].light || 0);

            if (sensorChart) {
                sensorChart.data.labels = labels;
                sensorChart.data.datasets[0].data = tempData;
                sensorChart.data.datasets[1].data = humidData;
                sensorChart.data.datasets[2].data = lightData;
                sensorChart.update("none");
            }
        }
    } catch (err) {
        console.error("Lỗi cập nhật Dashboard:", err);
    }
}

function updateStatDisplay(t, h, l) {
    const tempElem = document.getElementById("temp-value");
    const humidElem = document.getElementById("humid-value");
    const lightElem = document.getElementById("light-value");

    if (tempElem) tempElem.innerText = `${t}°C`;
    if (humidElem) humidElem.innerText = `${h}%`;
    if (lightElem) lightElem.innerText = `${l} Lux`;
}

/* ==========================================================================
   [JS-DEVICE] 6. ĐIỀU KHIỂN BẬT / TẮT ĐÈN (TRUYỀN TOKEN AUTH)
   ========================================================================== */
function toggleDevice(deviceId, isChecked) {
    const itemElem = document.getElementById(`device-item-${deviceId}`);
    const switchElem = document.getElementById(`device-switch-${deviceId}`);
    const deviceName = `Đèn ${deviceId}`;
    const action = isChecked ? "ON" : "OFF";
    const statusText = isChecked ? "bật" : "tắt";

    if (itemElem) itemElem.classList.add("loading");
    if (switchElem) switchElem.disabled = true;

    fetch(`${API_BASE}/control`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ device_id: deviceId, action: action })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            showToast(data.message || `Lỗi gửi lệnh đến ${deviceName}`, "info");
            if (itemElem) itemElem.classList.remove("loading");
            if (switchElem) {
                switchElem.disabled = false;
                switchElem.checked = !isChecked;
            }
            return;
        }

        const historyId = data.history_id;
        showToast(`Đang gửi lệnh ${statusText} đến ${deviceName}...`, "info");

        setTimeout(() => {
            if (itemElem) itemElem.classList.remove("loading");
            if (switchElem) switchElem.disabled = false;

            let checkCount = 0;
            const checkInterval = setInterval(async () => {
                checkCount++;
                try {
                    const resStatus = await fetch(`${API_BASE}/history?limit=5`, {
                        headers: getAuthHeaders()
                    });
                    const resData = await resStatus.json();
                    
                    if (resData.success && resData.data) {
                        const targetRecord = resData.data.find(r => r.id === historyId);
                        
                        if (targetRecord && targetRecord.status !== 'pending') {
                            clearInterval(checkInterval);

                            if (targetRecord.status === 'success') {
                                showToast(`Đã ${statusText} thành công ${deviceName}!`, "success");
                                switchElem.checked = isChecked;
                            } else {
                                showToast(`Thất bại: ${deviceName} không phản hồi!`, "info");
                                switchElem.checked = !isChecked;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Lỗi kiểm tra phản hồi:", err);
                }

                if (checkCount >= 9) {
                    clearInterval(checkInterval);
                    switchElem.checked = !isChecked;
                    showToast(`Thất bại: Mất kết nối đến ${deviceName}!`, "info");
                }
            }, 500);

        }, 1000);
    })
    .catch(err => {
        if (itemElem) itemElem.classList.remove("loading");
        if (switchElem) {
            switchElem.disabled = false;
            switchElem.checked = !isChecked;
        }
        showToast("Không thể kết nối Backend Server!", "info");
    });
}

/* ==========================================================================
   [JS-SENSOR-TAB] 7. QUẢN LÝ BẢNG DATA SENSOR (REST API & REAL-TIME 2S)
   ========================================================================== */
function applySensorFilter() {
    sensorCurrentPage = 1;
    fetchSensorData();
}

async function fetchSensorData() {
    const tbody = document.getElementById("table-sensor-body");
    if (!tbody) return;

    const sortVal = document.getElementById("sort-sensor")?.value || "time_desc";
    const filterVal = document.getElementById("filter-sensor")?.value || "";
    const keyword = document.getElementById("search-sensor")?.value.trim() || "";
    const pageSize = document.getElementById("pagesize-sensor")?.value || sensorPageSize;

    const params = new URLSearchParams({
        page: sensorCurrentPage,
        limit: pageSize,
        search: keyword,
        type: filterVal,
        sort: sortVal
    });

    try {
        const res = await fetch(`${API_BASE}/sensors?${params}`, {
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success) {
            const { data, pagination } = result;
            tbody.innerHTML = "";

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không tìm thấy bản ghi phù hợp</td></tr>`;
            } else {
                data.forEach(item => {
                    const timeFormatted = item.time ? new Date(item.time).toLocaleString("vi-VN") : "--";
                    tbody.innerHTML += `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.sensor_name}</td>
                            <td>${item.value}</td>
                            <td class="copyable-time" title="Click để copy thời gian" onclick="copyTimeText('${timeFormatted}')">${timeFormatted} 📋</td>
                        </tr>
                    `;
                });
            }

            renderPaginationControls("sensor", pagination.currentPage, pagination.totalPages);
            document.getElementById("page-info-sensor").innerText = 
                `Trang ${pagination.currentPage} / ${pagination.totalPages} (Tổng ${pagination.totalItems} bản ghi)`;
        }
    } catch (err) {
        console.error("Lỗi lấy bảng cảm biến:", err);
    }
}

function changeSensorPageSize(size) {
    sensorPageSize = parseInt(size);
    sensorCurrentPage = 1;
    fetchSensorData();
}

function prevSensorPage() {
    if (sensorCurrentPage > 1) {
        sensorCurrentPage--;
        fetchSensorData();
    }
}

function nextSensorPage() {
    sensorCurrentPage++;
    fetchSensorData();
}

function goToSensorPage(page) {
    sensorCurrentPage = page;
    fetchSensorData();
}

/* ==========================================================================
   [JS-HIST-TAB] 8. QUẢN LÝ BẢNG ACTIVE HISTORY (HIỂN THỊ USER TỪ USERS TABLE)
   ========================================================================== */
function applyHistoryFilter() {
    historyCurrentPage = 1;
    fetchHistoryData();
}

async function fetchHistoryData() {
    const tbody = document.getElementById("table-history-body");
    if (!tbody) return;

    const pageSize = document.getElementById("pagesize-history")?.value || historyPageSize;
    const deviceVal = document.getElementById("filter-device")?.value || "";
    const actionVal = document.getElementById("filter-action")?.value || "";
    const statusVal = document.getElementById("filter-status")?.value || "";
    const searchKeyword = document.getElementById("search-history")?.value.trim() || "";

    const params = new URLSearchParams({
        page: historyCurrentPage,
        limit: pageSize,
        device: deviceVal,
        action: actionVal,
        status: statusVal,
        search: searchKeyword
    });

    try {
        const res = await fetch(`${API_BASE}/history?${params}`, {
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success) {
            const { data, pagination } = result;
            tbody.innerHTML = "";

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không tìm thấy bản ghi phù hợp</td></tr>`;
            } else {
                data.forEach(item => {
                    const timeFormatted = item.time ? new Date(item.time).toLocaleString("vi-VN") : "--";
                    const st = (item.status || "").toLowerCase().trim();
                    let statusHtml = "";

                    if (st === "pending") {
                        statusHtml = `<span class="status-badge pending"><span class="status-spinner"></span> PENDING</span>`;
                    } else if (st === "fail" || st === "error") {
                        statusHtml = `<span class="status-badge fail">FAIL</span>`;
                    } else {
                        statusHtml = `<span class="status-badge success">SUCCESS</span>`;
                    }

                    const displayUser = item.username || item.full_name || "admin";

                    tbody.innerHTML += `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.device_name}</td>
                            <td>${displayUser}</td>
                            <td>${item.action}</td>
                            <td>${statusHtml}</td>
                            <td class="copyable-time" title="Click để copy thời gian" onclick="copyTimeText('${timeFormatted}')">${timeFormatted} 📋</td>
                        </tr>
                    `;
                });
            }

            renderPaginationControls("history", pagination.currentPage, pagination.totalPages);
            document.getElementById("page-info-history").innerText = 
                `Trang ${pagination.currentPage} / ${pagination.totalPages} (Tổng ${pagination.totalItems} bản ghi)`;
        }
    } catch (err) {
        console.error("Lỗi lấy lịch sử thiết bị:", err);
    }
}

function changeHistoryPageSize(size) {
    historyPageSize = parseInt(size);
    historyCurrentPage = 1;
    fetchHistoryData();
}

function prevHistoryPage() {
    if (historyCurrentPage > 1) {
        historyCurrentPage--;
        fetchHistoryData();
    }
}

function nextHistoryPage() {
    historyCurrentPage++;
    fetchHistoryData();
}

function goToHistoryPage(page) {
    historyCurrentPage = page;
    fetchHistoryData();
}

/* ==========================================================================
   [JS-PROFILE-TAB] 9. TẢI THÔNG TIN TÁC GIẢ WEBSITE TỪ CSDL MYSQL (PROFILE)
   ========================================================================== */
async function loadProfileData() {
    try {
        const res = await fetch(`${API_BASE}/profile`, {
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success && result.data) {
            const p = result.data;
            if (document.getElementById("pro-name")) document.getElementById("pro-name").innerText = p.name || "--";
            if (document.getElementById("pro-email")) document.getElementById("pro-email").innerText = p.email || "--";
            
            if (document.getElementById("pro-github")) {
                document.getElementById("pro-github").innerText = p.gitlink || "--";
                document.getElementById("pro-github").href = p.gitlink || "#";
            }
            if (document.getElementById("pro-figma")) {
                document.getElementById("pro-figma").innerText = p.figmalink || "--";
                document.getElementById("pro-figma").href = p.figmalink || "#";
            }
            if (document.getElementById("pro-postman")) {
                document.getElementById("pro-postman").innerText = p.postmanlink || "--";
                document.getElementById("pro-postman").href = p.postmanlink || "#";
            }
            if (document.getElementById("pro-report")) {
                document.getElementById("pro-report").innerText = p.reportlink || "--";
                document.getElementById("pro-report").href = p.reportlink || "#";
            }
        }
    } catch (err) {
        console.error("Lỗi lấy thông tin Profile tác giả:", err);
    }
}

/* ==========================================================================
   [JS-PAGINATION] 10. HÀM VẼ THANH PHÂN TRANG 3 NÚT SỐ
   ========================================================================== */
function renderPaginationControls(type, currentPage, totalPages) {
    const container = document.querySelector(`#page-info-${type}`)?.parentElement?.querySelector(".pagination-controls");
    if (!container) return;

    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    const prevFunc = type === 'sensor' ? 'prevSensorPage()' : 'prevHistoryPage()';
    const nextFunc = type === 'sensor' ? 'nextSensorPage()' : 'nextHistoryPage()';

    let html = `<button class="btn-page" onclick="${prevFunc}">‹ Trước</button>`;

    for (let p = startPage; p <= endPage; p++) {
        if (p >= 1 && p <= totalPages) {
            const activeClass = p === currentPage ? "active" : "";
            const goToFunc = type === 'sensor' ? `goToSensorPage(${p})` : `goToHistoryPage(${p})`;
            html += `<button class="btn-page-num ${activeClass}" onclick="${goToFunc}">${p}</button>`;
        }
    }

    html += `<button class="btn-page" onclick="${nextFunc}">Sau ›</button>`;
    container.innerHTML = html;
}

/* ==========================================================================
   [JS-THEME] 11. ĐỒNG BỘ CHẾ ĐỘ SÁNG / TỐI (DARK / LIGHT MODE)
   ========================================================================== */
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

/* ==========================================================================
   [JS-INIT] 12. KHỞI CHẠY TRANG WEB
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    switchPage("dashboard", document.querySelector(".sidebar nav li.active"));
});
/* ==========================================================================
   [JS-INIT] HỆ THỐNG KIỂM TRA ĐĂNG NHẬP & CHUYỂN HƯỚNG AUTH
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
   const token = localStorage.getItem("token");
    const currentPath = window.location.pathname;

    // 1. Nếu đang ở trang auth.html: Nếu đã đăng nhập rồi thì tự động đẩy về index.html
    if (currentPath.includes("auth.html")) {
        if (token) {
            window.location.href = "index.html";
        }
        return;
    }

    // 2. Nếu đang ở trang index.html (file mẹ):
    // Kiểm tra xem có token chưa, nếu CHƯA CÓ thì bắt buộc đẩy sang auth.html
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    // 3. Nếu đã có token, chạy trang web (SPA Dashboard) bình thường
    if (document.getElementById("app-content")) {
        switchPage("dashboard", document.querySelector(".sidebar nav li.active"));
    }
});

// Hàm Đăng xuất (Xóa token và đưa về trang auth)
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast("Đã đăng xuất!", "info");
    setTimeout(() => {
        window.location.href = "auth.html";
    }, 500);
}

// Hàm Đăng xuất nhanh
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast("Đã đăng xuất!", "info");
    setTimeout(() => {
        window.location.href = "auth.html";
    }, 800);
}

// Thêm nút Đăng xuất nhanh (Nếu bạn muốn gọi từ console hoặc gán vào sự kiện nào đó)
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("Đã đăng xuất!");
    window.location.reload();
}