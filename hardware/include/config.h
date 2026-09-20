#ifndef CONFIG_H
#define CONFIG_H

#include "configLocal.h"

// ==========================================
// MQTT TOPICS
// ==========================================

#define MQTT_SENSOR_TOPIC "iot/sensors/data"
#define MQTT_COMMAND_TOPIC "iot/devices/command"
#define MQTT_STATUS_TOPIC "iot/devices/status"

// ==========================================
// MQTT
// ==========================================

#define MQTT_CLIENT_ID "esp32IotDevice"

#define MQTT_KEEP_ALIVE 60
#define MQTT_RECONNECT_DELAY 5000

// ==========================================
// SENSOR
// ==========================================

#define DHT_PIN 32
#define DHT_TYPE DHT11

#define LDR_PIN 34

// Publish sensor data every 2 seconds
#define SENSOR_INTERVAL 2000

// ==========================================
// LED DEVICES
// ==========================================

#define LED1_PIN 33
#define LED2_PIN 25
#define LED3_PIN 26

// ==========================================
// LDR
// ==========================================

// Temporary conversion range.
// The final Lux formula will be replaced later.
#define LIGHT_MAX_LUX 5000.0f

#endif