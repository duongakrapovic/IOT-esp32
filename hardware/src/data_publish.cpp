#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

#include "data_publish.h"
#include "wifi_mqtt.h"

// ==========================================
// GỬI DỮ LIỆU SENSOR QUA MQTT
// ==========================================

void publishSensorData(
    float temperature,
    float humidity,
    int light
) {

    /*
     * Giữ temperature và humidity
     * dưới dạng chuỗi như code hiện tại.
     */

    StaticJsonDocument<128> doc;

    doc["temperature"] =
        serialized(String(temperature, 1));

    doc["humidity"] =
        serialized(String(humidity, 1));

    doc["light"] =
        light;

    char payload[128];

    serializeJson(doc, payload);

    // --------------------------------------
    // GỬI MQTT
    // --------------------------------------

    client.publish(
        "iot/sensors/data",
        payload
    );

    // --------------------------------------
    // SERIAL LOG
    // --------------------------------------

    Serial.print("Publish sensors: ");
    Serial.println(payload);

    Serial.print("Light: ");
    Serial.print(light);
    Serial.println(" Lux");
}