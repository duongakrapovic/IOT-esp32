/**
 * FILE: main.js
 * CHỨC NĂNG: Bộ điều phối (Router) của mô hình SPA.
 * Xử lý việc chuyển trang không cần tải lại (reload) trình duyệt.
 */

async function loadPage(pageName, element) {
    // Lưu lại trang hiện tại vào localStorage
    localStorage.setItem('currentPage', pageName);

    // 1. Đổi màu mục đang chọn trên Menu
    document.querySelectorAll('.sidebar nav ul li').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        // Tự động tìm và active thẻ menu tương ứng khi tải lại trang
        const targetLi = Array.from(document.querySelectorAll('.sidebar nav ul li')).find(li => 
            li.getAttribute('onclick') && li.getAttribute('onclick').includes(pageName)
        );
        if (targetLi) targetLi.classList.add('active');
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

// Khi F5 hoặc vào web: Lấy lại trang đã lưu trước đó (mặc định là 'dashboard')
// window.onload = () => {
//     const savedPage = localStorage.getItem('currentPage') || 'dashboard';
//     loadPage(savedPage);
// };
// Tự động load trang Dashboard khi vừa truy cập web lần đầu , f5 cũng về dashboard
window.onload = () => {
    loadPage('dashboard', document.querySelector('.sidebar nav ul li.active'));
};