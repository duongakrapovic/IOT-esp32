-- 1. TẠO CƠ SỞ DỮ LIỆU MỚI (DB)
CREATE DATABASE IF NOT EXISTS iot_project;

-- 2. CHỌN DB VỪA TẠO ĐỂ LÀM VIỆC
USE iot_project;

-- 3. TẠO CÁC BẢNG DANH MỤC (BẢNG CHA - KHÔNG CÓ KHÓA NGOẠI)
-- Bảng Profile
CREATE TABLE Profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    gitlink VARCHAR(100),
    figmalink VARCHAR(100)
);

-- Bảng Sensor
CREATE TABLE Sensor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Bảng Devices
CREATE TABLE Devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- 4. TẠO CÁC BẢNG DỮ LIỆU (BẢNG CON - CÓ KHÓA NGOẠI)
-- Bảng data_sensor
CREATE TABLE data_sensor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    value FLOAT NOT NULL,
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES Sensor(id)
);

-- Bảng Active_history
CREATE TABLE Active_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deviceId INT NOT NULL,
    action VARCHAR(20) NOT NULL,
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deviceId) REFERENCES Devices(id)
);

-- 5. (TÙY CHỌN) INSERT SẴN DỮ LIỆU MẪU CHO DANH MỤC
INSERT INTO Sensor (name) VALUES ('Nhiệt độ'), ('Độ ẩm'), ('Ánh sáng');
INSERT INTO Devices (name) VALUES ('Đèn 1'), ('Đèn 2'), ('Đèn 3');