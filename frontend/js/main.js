/* ==========================================================================
   MỤC LỤC TÌM KIẾM NHANH (Bấm Ctrl + F gõ cụm từ khóa):
   --------------------------------------------------------------------------
   [JS-MOCK]       : Dữ liệu giả lập (Mock data) 50 dòng & Biến trạng thái
   [JS-SPA]        : Cơ chế chuyển trang mượt mà không load lại (Single Page App)
   [JS-CHART]      : Cấu hình biểu đồ Chart.js 2 trục Y & cập nhật thẻ số liệu
   [JS-DEVICE]     : Hàm gửi lệnh POST bật/tắt thiết bị về Backend Server
   [JS-SENSOR-TAB] : Tìm kiếm, lọc và phân trang bảng Data Sensor
   [JS-HIST-TAB]   : Tìm kiếm, lọc và phân trang bảng Active History
   [JS-THEME]      : Đồng bộ chế độ Sáng / Tối (Dark / Light) cho web & Biểu đồ
   [JS-INIT]       : Sự kiện khởi chạy đầu tiên khi tải xong website
   ========================================================================== */


/* ==========================================================================
   [JS-MOCK] 1. CẤU HÌNH API, BIẾN TOÀN CỤC & TẠO DỮ LIỆU GIẢ LẬP
   ========================================================================== */

// Đường dẫn gốc của máy chủ backend (Node.js/Express đang lắng nghe ở cổng 5000)[cite: 5]
const API_BASE = "http://localhost:5000/api";

// Biến lưu định danh của bộ đếm thời gian (setInterval), dùng để hủy polling khi rời Dashboard[cite: 5]
let sensorPollingInterval = null;

// Biến lưu đối tượng (instance) biểu đồ Chart.js để gọi các phương thức như .destroy(), .update()[cite: 5]
let sensorChart = null;

// Khai báo mảng rỗng để chứa 50 bản ghi mẫu cho bảng cảm biến và bảng lịch sử[cite: 5]
const mockSensors = [];
const mockHistory = [];

// Lấy mốc thời gian hiện tại tính bằng mili-giây (timestamp) làm mốc cơ sở[cite: 5]
const baseTime = Date.now();
const sampleStatuses = ["success", "fail", "pending"];
// Vòng lặp chạy 50 lần để sinh 50 dòng dữ liệu mẫu độc lập[cite: 5]
for (let i = 0; i < 50; i++) {
    // Mỗi bản ghi lùi lại 15 giây (i * 15000 ms) so với mốc thời gian trước đó để tạo chuỗi thời gian liên tục[cite: 5]
    const tStr = new Date(baseTime - i * 15000).toLocaleTimeString("vi-VN") + ", 12/10/2026";
    
    // Dùng phép chia lấy dư (%) cho 3 để sinh xen kẽ lần lượt 3 loại cảm biến[cite: 5]
    const typeMod = i % 3;

    if (typeMod === 0) {
        // Bản ghi Nhiệt độ: dao động từ 28.0°C đến 30.0°C[cite: 5]
        mockSensors.push({ 
            id: i,                                      // Mã định danh duy nhất của dòng[cite: 5]
            sensor_name: "nhiệt độ",                    // Tên hiển thị trên bảng[cite: 5]
            value: `${(28 + (i % 5) * 0.5).toFixed(1)}°C`, // Chuỗi hiển thị kèm đơn vị (°C)[cite: 5]
            time: tStr,                                 // Chuỗi thời gian đã định dạng ngày giờ[cite: 5]
            rawType: "temp",                            // Định danh dạng chuỗi ngắn dùng khi lọc dữ liệu[cite: 5]
            rawVal: +(28 + (i % 5) * 0.5).toFixed(1)    // Số thực thuần túy để thư viện Chart.js vẽ trục[cite: 5]
        });
    } else if (typeMod === 1) {
        // Bản ghi Độ ẩm: dao động từ 55% đến 64%[cite: 5]
        mockSensors.push({ 
            id: i, 
            sensor_name: "độ ẩm", 
            value: `${55 + (i % 10)}%`, 
            time: tStr, 
            rawType: "humid", 
            rawVal: 55 + (i % 10) 
        });
    } else {
        // Bản ghi Ánh sáng: dao động từ 250 đến 530 Lux[cite: 5]
        mockSensors.push({ 
            id: i, 
            sensor_name: "ánh sáng", 
            value: `${250 + (i % 15) * 20} Lux`, 
            time: tStr, 
            rawType: "light", 
            rawVal: 250 + (i % 15) * 20 
        });
    }

    // Sinh dữ liệu lịch sử thao tác điều khiển thiết bị đèn[cite: 5]
    mockHistory.push({
        id: i,                                          // ID hành động[cite: 5]
        device_name: `đèn ${(i % 3) + 1}`,              // Tên thiết bị: lần lượt từ đèn 1 đến đèn 3[cite: 5]
        user: "admin",
        action: i % 2 === 0 ? "bật" : "tắt",            // Xen kẽ thao tác Bật (chẵn) và Tắt (lẻ)[cite: 5]
        status: sampleStatuses[i % 3], 
        time: tStr                                      // Mốc thời gian kích hoạt[cite: 5]
    });
}

// --- BIẾN TRẠNG THÁI (STATE) BẢNG DATA SENSOR ---
let sensorCurrentPage = 1;                    // Lưu trang hiện tại người dùng đang xem (mặc định là trang 1)[cite: 5]
let sensorPageSize = 10;                       // Số lượng dòng hiển thị tối đa trên một trang[cite: 5]
let sensorFilteredList = [...mockSensors];     // Mảng chứa kết quả sau khi tìm kiếm/lọc (sao chép mảng gốc)[cite: 5]

// --- BIẾN TRẠNG THÁI (STATE) BẢNG ACTIVE HISTORY ---
let historyCurrentPage = 1;                   // Trang hiện tại của bảng lịch sử[cite: 5]
let historyPageSize = 10;                      // Số lượng dòng hiển thị mỗi trang[cite: 5]
let historyFilteredList = [...mockHistory];    // Mảng dữ liệu lịch sử sau khi áp dụng bộ lọc[cite: 5]


/* ==========================================================================
   [JS-SPA] 2. ĐIỀU HƯỚNG TRANG CON (SINGLE PAGE APPLICATION)
   - Không tải lại toàn trang web, dùng fetch lấy HTML con đổ vào #app-content[cite: 5]
   ========================================================================== */
function switchPage(pageName, element) {
    // 1. Duyệt qua tất cả các thẻ <li> trong Sidebar để xóa class 'active' cũ[cite: 5]
    document.querySelectorAll(".sidebar nav li").forEach(li => li.classList.remove("active"));
    
    // 2. Nếu có truyền thẻ được click vào thì gắn class 'active' để đổi màu sáng menu[cite: 5]
    if (element) element.classList.add("active");

    // 3. Dọn dẹp tài nguyên: Dừng việc gọi API nền của trang Dashboard nếu chuyển sang trang khác[cite: 5]
    if (sensorPollingInterval) {
        clearInterval(sensorPollingInterval); // Xóa hàm đếm lặp thời gian[cite: 5]
        sensorPollingInterval = null;         // Đưa con trỏ về null[cite: 5]
    }

    // 4. Gửi yêu cầu HTTP ngầm để đọc nội dung file HTML tương ứng trong thư mục pages/[cite: 5]
    fetch(`pages/${pageName}.html`)
        .then(res => res.text()) // Chuyển đổi dữ liệu nhận được thành chuỗi văn bản HTML[cite: 5]
        .then(html => {
            // Nhúng trực tiếp toàn bộ khối HTML vừa tải vào thẻ chứa chính[cite: 5]
            document.getElementById("app-content").innerHTML = html;

            // 5. Kiểm tra trang nào vừa được tải xong để gọi hàm khởi tạo logic tương ứng[cite: 5]
            if (pageName === "dashboard") {
                initDashboard(); // Khởi tạo biểu đồ và đồng bộ nút theme[cite: 5]
            }
            if (pageName === "dataSensor") {
                sensorCurrentPage = 1; // Luôn đưa người dùng về trang 1 khi mới mở bảng[cite: 5]
                applySensorFilter();   // Áp dụng bộ lọc mặc định và đổ dữ liệu vào bảng cảm biến[cite: 5]
            }
            if (pageName === "activeHistory") {
                historyCurrentPage = 1; // Luôn đưa về trang 1[cite: 5]
                applyHistoryFilter();  // Áp dụng bộ lọc mặc định và đổ dữ liệu vào bảng lịch sử[cite: 5]
            }
        })
        .catch(err => {
            // Xử lý bắt lỗi nếu đường dẫn file sai hoặc mất mạng cục bộ[cite: 5]
            document.getElementById("app-content").innerHTML = `<p style="color:red">Lỗi tải trang: ${err.message}</p>`;
        });
}


/* ==========================================================================
   [JS-CHART] 3. KHỞI TẠO BIỂU ĐỒ & HIỂN THỊ THÔNG SỐ TRÊN DASHBOARD
   ========================================================================== */
function initDashboard() {
    // 1. Tìm phần tử nút checkbox chuyển Theme trên giao diện vừa được tải vào[cite: 5]
    const themeCheckbox = document.getElementById("theme-checkbox");
    if (themeCheckbox) {
        // Gán lại trạng thái checked cho checkbox theo đúng biến toàn cục isLightMode[cite: 5]
        themeCheckbox.checked = isLightMode;
        
        // Cập nhật chữ sáng/tối (Dark/Light) bên cạnh nút gạt[cite: 5]
        if (isLightMode) {
            document.getElementById("label-light")?.classList.add("active");
            document.getElementById("label-dark")?.classList.remove("active");
        } else {
            document.getElementById("label-light")?.classList.remove("active");
            document.getElementById("label-dark")?.classList.add("active");
        }
    }

    // 2. Tìm thẻ <canvas> vẽ biểu đồ; nếu chưa tồn tại trong DOM thì thoát hàm để tránh crash[cite: 5]
    const chartCanvas = document.getElementById("sensorChart");
    if (!chartCanvas) return;
    
    // Lấy ngữ cảnh vẽ 2D (Rendering Context) của thẻ Canvas[cite: 5]
    const ctx = chartCanvas.getContext("2d");

    // 3. Trích xuất đúng 10 bản ghi gần nhất theo từng loại cảm biến từ mảng mockSensors[cite: 5]
    // .slice(0, 10): Lấy 10 bản ghi đầu tiên[cite: 5]
    // .reverse(): Đảo ngược lại thứ tự để dữ liệu cũ nằm bên trái, dữ liệu mới nhất nằm bên phải trục thời gian[cite: 5]
    const tempRecords = mockSensors.filter(s => s.rawType === "temp").slice(0, 10).reverse();
    const humidRecords = mockSensors.filter(s => s.rawType === "humid").slice(0, 10).reverse();
    const lightRecords = mockSensors.filter(s => s.rawType === "light").slice(0, 10).reverse();

    // 4. Tạo mảng nhãn thời gian trục hoành X (cắt chuỗi chỉ lấy giờ:phút:giây)[cite: 5]
    const initialLabels = tempRecords.map(item => item.time.split(",")[0].trim());
    
    // Tạo 3 mảng dữ liệu số thực tương ứng để vẽ 3 đường cong[cite: 5]
    const initTemp = tempRecords.map(item => item.rawVal);
    const initHumid = humidRecords.map(item => item.rawVal);
    const initLight = lightRecords.map(item => item.rawVal);

    // 5. Tính toán màu sắc chữ và lưới tọa độ sao cho tương phản với nền giao diện hiện tại[cite: 5]
    const textColor = isLightMode ? "#0f172a" : "#ffffff"; // Nền sáng chữ đen, nền tối chữ trắng[cite: 5]
    const gridColor = isLightMode ? "#e2e8f0" : "#334155"; // Màu đường kẻ mờ phân cách tọa độ[cite: 5]

    // 6. Nếu đã có biểu đồ cũ đang chạy ngầm thì phải hủy trước khi tạo mới để tránh xung đột bộ nhớ[cite: 5]
    if (sensorChart) {
        sensorChart.destroy();
    }

    // 7. Khởi tạo đối tượng biểu đồ đường Chart.js[cite: 5]
    sensorChart = new Chart(ctx, {
        type: "line", // Kiểu biểu đồ đường cong[cite: 5]
        data: {
            labels: initialLabels, // Trục hoành X (Danh sách mốc thời gian)[cite: 5]
            datasets: [
                {
                    label: "Nhiệt độ (°C)",           // Tên hiển thị trên chú thích (Legend)[cite: 5]
                    borderColor: "#f87171",          // Màu đường kẻ (Đỏ cam)[cite: 5]
                    backgroundColor: "#f87171",      // Màu điểm chấm tròn[cite: 5]
                    data: initTemp,                  // Mảng số liệu nhiệt độ[cite: 5]
                    yAxisID: "yTempHumid",           // Gán vào trục tung bên trái[cite: 5]
                    tension: 0.3                     // Độ uốn cong của đường (0 = gấp khúc nhọn, 1 = rất cong)[cite: 5]
                },
                {
                    label: "Độ ẩm (%)",
                    borderColor: "#38bdf8",          // Màu đường kẻ (Xanh da trời)[cite: 5]
                    backgroundColor: "#38bdf8",
                    data: initHumid,
                    yAxisID: "yTempHumid",           // Dùng chung trục tung bên trái với nhiệt độ[cite: 5]
                    tension: 0.3
                },
                {
                    label: "Ánh sáng (Lux)",
                    borderColor: "#facc15",          // Màu đường kẻ (Vàng nắng)[cite: 5]
                    backgroundColor: "#facc15",
                    data: initLight,
                    yAxisID: "yLight",               // Gán vào trục tung độc lập bên phải[cite: 5]
                    tension: 0.3
                }
            ]
        },
        options: {
            animation: false,          // Tắt hiệu ứng di chuyển khi vẽ để giao diện không bị giật lag[cite: 5]
            responsive: true,         // Tự động co dãn theo kích thước màn hình[cite: 5]
            maintainAspectRatio: false, // Bỏ tỉ lệ cố định để biểu đồ lấp đầy khung 380px của CSS[cite: 5]
            scales: {
                // Cấu hình trục hoành X (Trục ngang thời gian)[cite: 5]
                x: {
                    grid: { color: gridColor }, // Màu đường kẻ dọc[cite: 5]
                    ticks: { color: textColor }  // Màu chữ các mốc giờ[cite: 5]
                },
                // Trục tung Y bên trái: Đo Nhiệt độ (0-100) và Độ ẩm (0-100)[cite: 5]
                yTempHumid: {
                    type: "linear",
                    position: "left",           // Đặt ở mép trái biểu đồ[cite: 5]
                    min: 0,                     // Giá trị nhỏ nhất là 0[cite: 5]
                    max: 100,                   // Giá trị lớn nhất là 100[cite: 5]
                    grid: { color: gridColor }, // Kẻ các đường ngang chuẩn[cite: 5]
                    ticks: {
                        color: textColor,
                        callback: val => `${val}` // Hiển thị số nguyên thuần túy trên trục[cite: 5]
                    },
                    title: {
                        display: true,          // Bật hiển thị tên trục[cite: 5]
                        text: "Nhiệt độ (°C) / Độ ẩm (%)",
                        color: textColor
                    }
                },
                // Trục tung Y bên phải: Đo Ánh sáng (Thang đo lên đến 800 Lux)[cite: 5]
                yLight: {
                    type: "linear",
                    position: "right",          // Đặt ở mép phải biểu đồ[cite: 5]
                    min: 0,
                    suggestedMax: 800,          // Mở rộng trục lên 800 Lux để bao quát giá trị quang trở[cite: 5]
                    grid: { drawOnChartArea: false }, // Tắt kẻ đường ngang trục này để không đè rối mắt lên trục trái[cite: 5]
                    ticks: {
                        color: textColor,
                        callback: val => `${val} Lx` // Gắn thêm đơn vị 'Lx' vào số trên trục[cite: 5]
                    },
                    title: {
                        display: true,
                        text: "Ánh sáng (Lux)",
                        color: textColor
                    }
                }
            },
            plugins: {
                // Cấu hình bảng chú thích 3 màu ở đầu biểu đồ[cite: 5]
                legend: { 
                    labels: { color: textColor } // Đổi màu chữ chú thích theo Theme sáng/tối[cite: 5]
                }
            }
        }
    });

    // 8. Đổ giá trị số đo mới nhất ra 3 thẻ hiển thị ở hàng dưới[cite: 5]
    if (initTemp.length > 0) {
        updateStatDisplay(
            initTemp[initTemp.length - 1],   // Giá trị nhiệt độ phần tử cuối cùng[cite: 5]
            initHumid[initHumid.length - 1], // Giá trị độ ẩm cuối cùng[cite: 5]
            initLight[initLight.length - 1]  // Giá trị ánh sáng cuối cùng[cite: 5]
        );
    }
}

// Hàm đẩy điểm dữ liệu mới vào biểu đồ theo thời gian thực (Dùng cho WebSocket / MQTT / Polling)[cite: 5]
function pushChartData(timeLabel, temp, humid, light) {
    if (!sensorChart) return; // Nếu biểu đồ chưa vẽ thì bỏ qua[cite: 5]

    // Thêm mốc thời gian mới và các số liệu mới vào cuối mảng[cite: 5]
    sensorChart.data.labels.push(timeLabel);
    sensorChart.data.datasets[0].data.push(temp);
    sensorChart.data.datasets[1].data.push(humid);
    sensorChart.data.datasets[2].data.push(light);

    // Luôn giữ tối đa 10 điểm trên biểu đồ; nếu quá 10 điểm thì xóa điểm cũ nhất ở đầu mảng (.shift())[cite: 5]
    if (sensorChart.data.labels.length > 10) {
        sensorChart.data.labels.shift();
        sensorChart.data.datasets[0].data.shift();
        sensorChart.data.datasets[1].data.shift();
        sensorChart.data.datasets[2].data.shift();
    }
    
    // Cập nhật lại giao diện biểu đồ; tham số 'none' giúp cập nhật ngay mà không chạy lại hiệu ứng[cite: 5]
    sensorChart.update("none");
}

// Cập nhật nội dung text hiển thị trên 3 thẻ Card ở góc phải hàng dưới[cite: 5]
function updateStatDisplay(t, h, l) {
    const tempElem = document.getElementById("temp-value");
    const humidElem = document.getElementById("humid-value");
    const lightElem = document.getElementById("light-value");

    if (tempElem) tempElem.innerText = `${t}°C`;
    if (humidElem) humidElem.innerText = `${h}%`;
    if (lightElem) lightElem.innerText = `${l} Lux`;
}


/* ==========================================================================
   [JS-DEVICE] 4. ĐIỀU KHIỂN BẬT / TẮT THIẾT BỊ ĐÈN (POST API)
   - Kích hoạt vòng xoay loading tròn trong đúng 1 giây trước khi đổi đèn
   ========================================================================== */
function toggleDevice(deviceId, isChecked) {
    const itemElem = document.getElementById(`device-item-${deviceId}`);
    const switchElem = document.getElementById(`device-switch-${deviceId}`);

    // Bật hiệu ứng loading xoay tròn trong 1 giây (1000ms)
    if (itemElem) {
        itemElem.classList.add("loading");
        if (switchElem) switchElem.disabled = true; // Khóa công tắc tạm thời để tránh spam click

        setTimeout(() => {
            itemElem.classList.remove("loading");
            if (switchElem) switchElem.disabled = false; // Mở lại công tắc sau 1 giây
        }, 1000);
    }

    // Gửi lệnh API POST về backend
    const action = isChecked ? "ON" : "OFF";
    fetch(`${API_BASE}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, action: action })
    }).catch(() => {});
}

/* ==========================================================================
   [JS-SENSOR-TAB] 5. QUẢN LÝ BẢNG DỮ LIỆU CẢM BIẾN (DATA SENSOR)
   ========================================================================== */
function applySensorFilter() {
    // Đọc giá trị riêng từ box Sort và box Filter
    const sortVal = document.getElementById("sort-sensor")?.value || "time_desc";
    const filterVal = document.getElementById("filter-sensor")?.value || "";
    const keyword = document.getElementById("search-sensor")?.value.toLowerCase().trim() || "";

    // 1. Lọc theo từ khóa tìm kiếm và lọc theo loại cảm biến
    sensorFilteredList = mockSensors.filter(item => {
        const matchText = item.sensor_name.toLowerCase().includes(keyword) || 
                          item.value.toLowerCase().includes(keyword) || 
                          item.time.toLowerCase().includes(keyword);
        if (!matchText) return false;

        // Lọc theo box Filter riêng
        if (filterVal && item.rawType !== filterVal) {
            return false;
        }

        return true;
    });

    // 2. Sắp xếp theo box Sort riêng (Mới nhất / Cũ nhất)
    if (sortVal === "time_asc") {
        sensorFilteredList.sort((a, b) => a.id - b.id);
    } else {
        sensorFilteredList.sort((a, b) => b.id - a.id);
    }

    sensorCurrentPage = 1;
    renderSensorPage();
}
// Hàm render dữ liệu ra các dòng <tr> bên trong thẻ <tbody> của bảng cảm biến[cite: 5]
function renderSensorPage() {
    const tbody = document.getElementById("table-sensor-body");
    if (!tbody) return; // Nếu bảng chưa hiển thị trên trang thì dừng[cite: 5]

    const totalRecords = sensorFilteredList.length; // Tổng số bản ghi sau khi lọc[cite: 5]
    
    // Tính tổng số trang: Làm tròn lên bằng Math.ceil; nếu không có bản ghi nào thì mặc định là 1 trang[cite: 5]
    const totalPages = Math.ceil(totalRecords / sensorPageSize) || 1;
    
    // Rào chắn bảo vệ: Không để trang hiện tại vượt quá tổng số trang[cite: 5]
    if (sensorCurrentPage > totalPages) sensorCurrentPage = totalPages;

    // Tính chỉ số bắt đầu cắt mảng: (Trang hiện tại - 1) * Số dòng mỗi trang[cite: 5]
    const startIdx = (sensorCurrentPage - 1) * sensorPageSize;
    
    // Dùng hàm .slice() cắt mảng lấy đúng số bản ghi cần hiển thị trên trang này[cite: 5]
    const pageItems = sensorFilteredList.slice(startIdx, startIdx + sensorPageSize);

    // Xóa sạch nội dung cũ của <tbody> trước khi tạo dòng mới[cite: 5]
    tbody.innerHTML = "";

    // Nếu không có bản ghi nào thì hiển thị dòng thông báo báo rỗng[cite: 5]
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không tìm thấy bản ghi phù hợp</td></tr>`;
    } else {
        // Duyệt qua từng bản ghi và nối thẻ <tr> vào thân bảng[cite: 5]
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

    // Cập nhật số trang hiện tại vào thẻ nhãn màu xanh ở footer[cite: 5]
    document.getElementById("page-num-sensor").innerText = sensorCurrentPage;
    
    // Cập nhật thông tin chi tiết: Trang X / Y (Tổng Z bản ghi)[cite: 5]
    document.getElementById("page-info-sensor").innerText = `Trang ${sensorCurrentPage} / ${totalPages} (Tổng ${totalRecords} bản ghi)`;
}

// Thay đổi số lượng dòng hiển thị trên mỗi trang từ ô chọn (5, 10, 20 dòng)[cite: 5]
function changeSensorPageSize(size) {
    sensorPageSize = parseInt(size); // Ép kiểu chuỗi sang số nguyên[cite: 5]
    sensorCurrentPage = 1;           // Đưa về trang đầu tiên[cite: 5]
    renderSensorPage();              // Vẽ lại bảng[cite: 5]
}

// Xử lý sự kiện bấm nút lùi trang (<)[cite: 5]
function prevSensorPage() {
    if (sensorCurrentPage > 1) {
        sensorCurrentPage--; // Giảm trang đi 1[cite: 5]
        renderSensorPage();  // Vẽ lại bảng[cite: 5]
    }
}

// Xử lý sự kiện bấm nút tiến trang (>)[cite: 5]
function nextSensorPage() {
    const totalPages = Math.ceil(sensorFilteredList.length / sensorPageSize) || 1;
    if (sensorCurrentPage < totalPages) {
        sensorCurrentPage++; // Tăng trang lên 1[cite: 5]
        renderSensorPage();  // Vẽ lại bảng[cite: 5]
    }
}


/* ==========================================================================
   [JS-HIST-TAB] 6. QUẢN LÝ BẢNG LỊCH SỬ THAO TÁC (ACTIVE HISTORY)
   ========================================================================== */

// Hàm lọc và tìm kiếm kết hợp cho bảng lịch sử[cite: 5]
function applyHistoryFilter() {
    const sortVal = document.getElementById("sort-history")?.value || "time_desc";
    const deviceVal = document.getElementById("filter-device")?.value || "";
    const actionVal = document.getElementById("filter-action")?.value || "";
    const statusVal = document.getElementById("filter-status")?.value || "";
    const timeKeyword = document.getElementById("search-history")?.value.toLowerCase().trim() || "";

    historyFilteredList = mockHistory.filter(item => {
        if (timeKeyword && !item.time.toLowerCase().includes(timeKeyword)) {
            return false;
        }
        if (deviceVal && item.device_name.toLowerCase() !== deviceVal.toLowerCase()) {
            return false;
        }
        if (actionVal && item.action.toLowerCase() !== actionVal.toLowerCase()) {
            return false;
        }
        // Lọc chính xác theo success / fail / pending
        if (statusVal && item.status.toLowerCase() !== statusVal.toLowerCase()) {
            return false;
        }

        return true;
    });

    if (sortVal === "time_asc") {
        historyFilteredList.sort((a, b) => a.id - b.id);
    } else {
        historyFilteredList.sort((a, b) => b.id - a.id);
    }

    historyCurrentPage = 1;
    renderHistoryPage();
}
// Hiển thị dữ liệu lịch sử ra các dòng <tr> của bảng[cite: 5]
function renderHistoryPage() {
    const tbody = document.getElementById("table-history-body");
    if (!tbody) return;

    const totalRecords = historyFilteredList.length;
    const totalPages = Math.ceil(totalRecords / historyPageSize) || 1;
    if (sensorCurrentPage > totalPages) historyCurrentPage = totalPages;

    const startIdx = (historyCurrentPage - 1) * historyPageSize;
    const pageItems = historyFilteredList.slice(startIdx, startIdx + historyPageSize);

    tbody.innerHTML = "";
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không tìm thấy bản ghi phù hợp</td></tr>`;
    } else {
        pageItems.forEach(item => {
            let statusHtml = "";
            const st = item.status.toLowerCase();

            if (st === "pending") {
                statusHtml = `
                    <span class="status-badge pending">
                        <span class="status-spinner"></span> pending
                    </span>`;
            } else if (st === "success") {
                statusHtml = `<span class="status-badge success">success</span>`;
            } else {
                statusHtml = `<span class="status-badge fail">fail</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.device_name}</td>
                    <td>${item.user || "admin"}</td>
                    <td>${item.action}</td>
                    <td>${statusHtml}</td>
                    <td>${item.time}</td>
                </tr>
            `;
        });
    }

    document.getElementById("page-num-history").innerText = historyCurrentPage;
    document.getElementById("page-info-history").innerText = `Trang ${historyCurrentPage} / ${totalPages} (Tổng ${totalRecords} bản ghi)`;
}

// Thay đổi số dòng trên 1 trang cho bảng lịch sử[cite: 5]
function changeHistoryPageSize(size) {
    historyPageSize = parseInt(size);
    historyCurrentPage = 1;
    renderHistoryPage();
}

// Nút lùi trang cho bảng lịch sử[cite: 5]
function prevHistoryPage() {
    if (historyCurrentPage > 1) {
        historyCurrentPage--;
        renderHistoryPage();
    }
}

// Nút tiến trang cho bảng lịch sử[cite: 5]
function nextHistoryPage() {
    const totalPages = Math.ceil(historyFilteredList.length / historyPageSize) || 1;
    if (historyCurrentPage < totalPages) {
        historyCurrentPage++;
        renderHistoryPage();
    }
}


/* ==========================================================================
   [JS-THEME] 7. ĐỒNG BỘ CHẾ ĐỘ SÁNG / TỐI (DARK / LIGHT MODE)
   ========================================================================== */

// Biến cờ (flag) toàn cục: false là Dark Mode (mặc định), true là Light Mode[cite: 5]
let isLightMode = false;

function toggleTheme(isChecked) {
    // Cập nhật trạng thái theo vị trí gạt của checkbox[cite: 5]
    isLightMode = isChecked;

    // 1. Thêm hoặc gỡ class 'light-mode' ở thẻ <body> để kích hoạt bộ biến màu CSS tương ứng[cite: 5]
    if (isLightMode) {
        document.body.classList.add("light-mode");
        document.getElementById("label-light")?.classList.add("active"); // Làm sáng chữ Light[cite: 5]
        document.getElementById("label-dark")?.classList.remove("active");
    } else {
        document.body.classList.remove("light-mode");
        document.getElementById("label-light")?.classList.remove("active");
        document.getElementById("label-dark")?.classList.add("active");  // Làm sáng chữ Dark[cite: 5]
    }

    // 2. Nếu biểu đồ Chart.js đang mở thì cập nhật lại màu trục tọa độ và chữ[cite: 5]
    if (sensorChart) {
        const textColor = isLightMode ? "#0f172a" : "#ffffff";
        const gridColor = isLightMode ? "#e2e8f0" : "#334155";

        // Cập nhật màu chữ và đường kẻ cho trục hoành X[cite: 5]
        sensorChart.options.scales.x.ticks.color = textColor;
        sensorChart.options.scales.x.grid.color = gridColor;

        // Cập nhật màu chữ và đường kẻ cho trục Y bên trái[cite: 5]
        sensorChart.options.scales.yTempHumid.ticks.color = textColor;
        sensorChart.options.scales.yTempHumid.title.color = textColor;
        sensorChart.options.scales.yTempHumid.grid.color = gridColor;

        // Cập nhật màu chữ cho trục Y bên phải[cite: 5]
        sensorChart.options.scales.yLight.ticks.color = textColor;
        sensorChart.options.scales.yLight.title.color = textColor;

        // Cập nhật màu chữ phần chú thích (Legend)[cite: 5]
        sensorChart.options.plugins.legend.labels.color = textColor;

        // Gọi lệnh update('none') để vẽ lại biểu đồ với màu mới mà không làm chạy lại hoạt ảnh[cite: 5]
        sensorChart.update("none");
    }
}


/* ==========================================================================
   [JS-INIT] 8. KHỞI CHẠY TRANG WEB BAN ĐẦU
   ========================================================================== */

// Lắng nghe sự kiện DOMContentLoaded: Chỉ chạy khi cây DOM của index.html đã sẵn sàng[cite: 5]
document.addEventListener("DOMContentLoaded", () => {
    // Tự động mở trang Dashboard đầu tiên và kích hoạt trạng thái active cho menu dòng 1[cite: 5]
    switchPage("dashboard", document.querySelector(".sidebar nav li.active"));
});