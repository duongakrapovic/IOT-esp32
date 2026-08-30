#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt_handler.h"
#include "led_control.h"

// ==========================================
// XỬ LÝ LỆNH MQTT TỪ BACKEND
// ==========================================

void mqttCallback(
    char* topic,
    byte* payload,
    unsigned int length
) {

    Serial.print("Nhan lenh [");
    Serial.print(topic);
    Serial.print("]: ");

    StaticJsonDocument<200> doc;

    DeserializationError error =
        deserializeJson(doc, payload, length);

    if (error) {

        Serial.print("Loi parse JSON: ");
        Serial.println(error.f_str());

        return;
    }

    // Backend gửi:
    // {"device": "device1", "status": "ON"}

    const char* device = doc["device"];
    const char* status = doc["status"];

    if (device == nullptr || status == nullptr) {

        Serial.println(
            "Loi: JSON thieu device hoac status"
        );

        return;
    }

    Serial.printf(
        "Device: %s -> Status: %s\n",
        device,
        status
    );

    int pinState =
        (strcmp(status, "ON") == 0 ||
         strcmp(status, "on") == 0 ||
         strcmp(status, "1") == 0)
        ? HIGH
        : LOW;

    setLED(device, pinState);
}