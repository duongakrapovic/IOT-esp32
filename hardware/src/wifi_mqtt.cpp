#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

#include "config.h"
#include "wifi_mqtt.h"
#include "mqtt_handler.h"

// ==========================================
// WIFI & MQTT CLIENT
// ==========================================

WiFiClient espClient;
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

    client.setServer(mqtt_server, 1883);
    client.setCallback(mqttCallback);

    Serial.println(
        "[OK] MQTT configuration ready!"
    );
}

// ==========================================
// KẾT NỐI LẠI MQTT
// ==========================================

void reconnectMQTT() {

    while (!client.connected()) {

        Serial.print(
            "Dang ket noi MQTT Broker..."
        );

        if (client.connect("ESP32_IoT_Gateway")) {

            Serial.println(
                " [OK] Da ket noi!"
            );

            // Nhận lệnh điều khiển LED
            client.subscribe(
                "iot/devices/command"
            );

        } else {

            Serial.print(
                " That bai, rc="
            );

            Serial.print(client.state());

            Serial.println(
                " - thu lai sau 5s"
            );

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