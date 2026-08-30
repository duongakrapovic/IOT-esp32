#include <Arduino.h>

#include "config.h"
#include "sensors.h"
#include "mqtt_handler.h"
#include "wifi_mqtt.h"
#include "led_control.h"
#include "data_publish.h"

// ==========================================
// THỜI GIAN ĐỌC SENSOR
// ==========================================

unsigned long lastMsg = 0;

// ==========================================
// SETUP
// ==========================================

void setup() {

    Serial.begin(115200);
    Serial.flush();

    // --------------------------------------
    // LED
    // --------------------------------------

    initLEDs();

    // --------------------------------------
    // DHT11 + LDR
    // --------------------------------------

    initSensors();

    // --------------------------------------
    // WIFI
    // --------------------------------------

    initWiFi();

    // --------------------------------------
    // MQTT
    // --------------------------------------

    initMQTT();

}

// ==========================================
// LOOP
// ==========================================

void loop() {

    // --------------------------------------
    // MQTT
    // --------------------------------------

    mqttLoop();

    // --------------------------------------
    // ĐỌC CẢM BIẾN MỖI 2 GIÂY
    // --------------------------------------

    unsigned long now = millis();

    if (now - lastMsg > SENSOR_INTERVAL) {

        lastMsg = now;

        float temperature;
        float humidity;
        int light;

        // ----------------------------------
        // ĐỌC SENSOR
        // ----------------------------------

        if (readSensors(
            temperature,
            humidity,
            light
        )) {

            // ------------------------------
            // GỬI MQTT
            // ------------------------------

            publishSensorData(
                temperature,
                humidity,
                light
            );

        } else {

            Serial.println(
                "Loi: Khong doc duoc DHT11"
            );
        }
    }
}