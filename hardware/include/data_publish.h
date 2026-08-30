#ifndef DATA_PUBLISH_H
#define DATA_PUBLISH_H

// ==========================================
// GỬI DỮ LIỆU SENSOR QUA MQTT
// ==========================================

void publishSensorData(
    float temperature,
    float humidity,
    int light
);

#endif