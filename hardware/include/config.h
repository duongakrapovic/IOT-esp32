#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// THÔNG TIN WIFI & MQTT BROKER
// ==========================================

extern const char* ssid;
extern const char* password;

// IPv4 của Laptop đang chạy Mosquitto + Backend
extern const char* mqtt_server;

// ==========================================
// CHÂN CẮM PHẦN CỨNG
// ==========================================

#define DHT_PIN 32
#define DHT_TYPE DHT11

#define LDR_PIN 34

#define LED1_PIN 33
#define LED2_PIN 25
#define LED3_PIN 26

// ==========================================
// CẤU HÌNH SENSOR
// ==========================================

#define SENSOR_INTERVAL 2000

// Thang ánh sáng hiện tại
#define LIGHT_MAX_LUX 5000.0

#endif