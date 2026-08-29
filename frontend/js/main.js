/**
 * FILE: main.js
 * CHỨC NĂNG: Bộ điều phối (Router) của mô hình SPA.
 * Xử lý việc chuyển trang không cần tải lại (reload) trình duyệt.
 */

async function loadPage(pageName, element) {
    // 1. Đổi màu mục đang chọn trên Menu
    if (element) {
        document.querySelectorAll('.sidebar nav ul li').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }

    try {
        // 2. Đi tới thư mục pages/ lấy mã HTML tương ứng
        const response = await fetch(`pages/${pageName}.html`);
        const html = await response.text();
        
        // 3. Đắp mã HTML vào vùng nội dung chính
        document.getElementById('app-content').innerHTML = html;
        
        // 4. Kích hoạt các hàm xử lý dữ liệu tương ứng (được viết bên file api.js)
        if (pageName === 'dashboard') {
            initDashboard();
        } else if (pageName === 'dataSensor') {
            initDataSensor(); 
        } else if (pageName === 'activeHistory') {
            initActiveHistory(); 
        } else if (pageName === 'profile') {
            initProfile(); 
        }
        
    } catch (error) {
        console.error("Lỗi khi tải trang:", error);
    }
}

// Tự động load trang Dashboard khi vừa truy cập web lần đầu
window.onload = () => {
    loadPage('dashboard', document.querySelector('.sidebar nav ul li.active'));
};