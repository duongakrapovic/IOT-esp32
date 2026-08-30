#ifndef WIFI_MQTT_H
#define WIFI_MQTT_H

#include <PubSubClient.h>

// ==========================================
// MQTT CLIENT DÙNG CHUNG
// ==========================================

extern PubSubClient client;

// ==========================================
// KHỞI TẠO WIFI & MQTT
// ==========================================

void initWiFi();
void initMQTT();

// ==========================================
// KIỂM TRA / KẾT NỐI LẠI MQTT
// ==========================================

void reconnectMQTT();

// ==========================================
// DUY TRÌ MQTT
// ==========================================

void mqttLoop();

#endif