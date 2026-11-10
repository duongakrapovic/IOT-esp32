/**
 * @file main.h
 * @brief File header tổng hợp cấu hình, kết nối và khai báo hàm (All-in-One Header)
 * @tag [MAIN_H_SINGLE] [CONFIG_WIFI_MQTT] [PINS_CONFIG]
 */

#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <math.h>
#include <string.h>

// ==========================================
// [TAG_CREDENTIALS] THÔNG TIN WIFI & HIVEMQ CLOUD
// ==========================================
#define WIFI_SSID "asusTufF152022"
#define WIFI_PASSWORD "12345678"

#define MQTT_SERVER "192.168.137.1"
#define MQTT_PORT 1884
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""

// ==========================================
// [TAG_TOPICS] CẤU HÌNH MQTT TOPIC
// ==========================================
#define MQTT_SENSOR_TOPIC "iot/sensors/data"
#define MQTT_COMMAND_TOPIC "iot/devices/command"
#define MQTT_STATUS_TOPIC "iot/devices/status"

#define MQTT_CLIENT_ID "esp32IotDevice"
#define MQTT_KEEP_ALIVE 60
#define MQTT_RECONNECT_DELAY 5000

// ==========================================
// [TAG_PINS] CẤU HÌNH CHÂN GPIO PHẦN CỨNG
// ==========================================
#define DHT_PIN 32
#define DHT_TYPE DHT11
#define LDR_PIN 34

#define LED1_PIN 33
#define LED2_PIN 25
#define LED3_PIN 26

#define SENSOR_INTERVAL 2000

// ==========================================
// [TAG_LDR_CALIB] THAM SỐ HIỆU CHUẨN QUANG TRỞ LDR
// ==========================================
#define LDR_VCC 3.3f
#define LDR_FIXED_RESISTANCE 10000.0f
#define LDR_RESISTANCE_AT_10_LUX 15000.0f
#define LDR_GAMMA 0.7f
#define LIGHT_MAX_LUX 100000.0f

// ==========================================
// [TAG_STRUCTS] CẤU TRÚC DỮ LIỆU
// ==========================================
struct SensorData {
    float temperature;
    float humidity;
    int light;
};

// ==========================================
// [TAG_PROTOTYPES] KHAI BÁO CÁC HÀM HỆ THỐNG
// ==========================================
// Quản lý thiết bị (Devices)
void initDevices();
bool setDeviceState(int deviceId, const char* action);
const char* getDeviceState(int deviceId);

// Quản lý cảm biến (Sensors)
void initSensors();
bool readSensors(SensorData &sensorData);

// Quản lý mạng & MQTT
void initMqtt();
void mqttLoop();
bool publishSensorData(const SensorData &sensorData);

#endif // MAIN_H