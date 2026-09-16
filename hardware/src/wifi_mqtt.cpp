#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#include "config.h"
#include "wifi_mqtt.h"
#include "mqtt_handler.h"

// ==========================================
// WIFI & MQTT CLIENT
// ==========================================

WiFiClientSecure espClient;
PubSubClient client(espClient);

// ==========================================
// KHỞI TẠO WIFI
// ==========================================

void initWiFi() {

    WiFi.begin(ssid, password);

    Serial.print("Dang ket noi WiFi");

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("[OK] WiFi connected!");

    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
}

// ==========================================
// KHỞI TẠO MQTT
// ==========================================

void initMQTT() {

    // Cho phép kết nối TLS tới HiveMQ Cloud
    espClient.setInsecure();

    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(mqttCallback);

    Serial.println("[OK] MQTT configuration ready!");
}

// ==========================================
// KẾT NỐI LẠI MQTT
// ==========================================

void reconnectMQTT() {

    while (!client.connected()) {

        Serial.print("Dang ket noi MQTT Broker...");

        if (client.connect(
            "ESP32_IoT_Gateway",
            mqtt_username,
            mqtt_password
        )) {

            Serial.println(" [OK] Da ket noi!");

            client.subscribe("iot/devices/command");

        } else {

            Serial.print(" That bai, rc=");
            Serial.print(client.state());

            Serial.println(" - thu lai sau 5s");

            delay(5000);
        }
    }
}

// ==========================================
// DUY TRÌ MQTT
// ==========================================

void mqttLoop() {

    if (!client.connected()) {
        reconnectMQTT();
    }

    client.loop();
}