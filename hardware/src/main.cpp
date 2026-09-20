#include <Arduino.h>

#include "config.h"
#include "sensors.h"
#include "devices.h"
#include "mqtt.h"

static unsigned long lastSensorPublish = 0;

void setup() {

    Serial.begin(115200);

    delay(500);

    Serial.println();
    Serial.println("==============================");
    Serial.println("ESP32 IoT SYSTEM START");
    Serial.println("==============================");

    initDevices();

    Serial.println(
        "[OK] Devices initialized"
    );

    initSensors();

    Serial.println(
        "[OK] Sensors initialized"
    );

    initMqtt();

    Serial.println(
        "[OK] MQTT initialized"
    );
}

void loop() {

    mqttLoop();

    unsigned long currentTime =
        millis();

    if (
        currentTime - lastSensorPublish
        >= SENSOR_INTERVAL
    ) {

        lastSensorPublish =
            currentTime;

        SensorData sensorData;

        if (
            readSensors(sensorData)
        ) {

            Serial.print(
                "[SENSOR] Temperature: "
            );

            Serial.print(
                sensorData.temperature
            );

            Serial.println(
                " C"
            );


            Serial.print(
                "[SENSOR] Humidity: "
            );

            Serial.print(
                sensorData.humidity
            );

            Serial.println(
                " %"
            );


            Serial.print(
                "[SENSOR] Light: "
            );

            Serial.print(
                sensorData.light
            );

            Serial.println(
                " Lux"
            );


            publishSensorData(
                sensorData
            );

        } else {

            Serial.println(
                "[ERROR] Sensor reading failed"
            );
        }
    }
}