#ifndef SENSORS_H
#define SENSORS_H

// ==========================================
// KHỞI TẠO CẢM BIẾN
// ==========================================

void initSensors();

// ==========================================
// ĐỌC DỮ LIỆU CẢM BIẾN
// ==========================================

bool readSensors(
    float &temperature,
    float &humidity,
    int &light
);

#endif