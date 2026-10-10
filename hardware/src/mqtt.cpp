#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <string.h>

#include "config.h"
#include "mqtt.h"
#include "devices.h"

static WiFiClientSecure wifiClient;
static PubSubClient mqttClient(wifiClient);

static unsigned long lastMqttReconnect = 0;

static void mqttCallback(
    char* topic,
    byte* payload,
    unsigned int length
);

static bool connectWifi();
static bool connectMqtt();
static bool publishDeviceStatus(int deviceId);


// ======================================================
// WIFI
// ======================================================

static bool connectWifi() {

    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    Serial.print("[WiFi] Connecting");

    WiFi.begin(
        WIFI_SSID,
        WIFI_PASSWORD
    );

    unsigned long startTime = millis();

    while (WiFi.status() != WL_CONNECTED) {

        delay(500);

        Serial.print(".");

        if (
            millis() - startTime
            >= 30000
        ) {

            Serial.println();
            Serial.println(
                "[WiFi] Connection timeout"
            );

            return false;
        }
    }

    Serial.println();
    Serial.println("[WiFi] Connected");

    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());

    return true;
}


// ======================================================
// MQTT INITIALIZATION
// ======================================================

void initMqtt() {

    connectWifi();

    /*
     * HiveMQ Cloud:
     * MQTT over TLS
     * Port 8883
     *
     * setInsecure() is used for initial testing.
     * It encrypts the connection but does not verify
     * the broker certificate.
     */

    wifiClient.setInsecure();

    mqttClient.setServer(
        MQTT_SERVER,
        MQTT_PORT
    );

    mqttClient.setCallback(
        mqttCallback
    );

    mqttClient.setKeepAlive(
        MQTT_KEEP_ALIVE
    );

    Serial.println(
        "[MQTT] Configuration ready"
    );
}


// ======================================================
// MQTT CONNECTION
// ======================================================

static bool connectMqtt() {

    if (mqttClient.connected()) {
        return true;
    }

    if (WiFi.status() != WL_CONNECTED) {

        if (!connectWifi()) {
            return false;
        }
    }

    Serial.print("[MQTT] Connecting...");

    bool connected = mqttClient.connect(
        MQTT_CLIENT_ID,
        MQTT_USERNAME,
        MQTT_PASSWORD
    );

    if (!connected) {

        Serial.print(
            " failed, state="
        );

        Serial.println(
            mqttClient.state()
        );

        return false;
    }

    Serial.println(
        " connected"
    );

    bool subscribed =
        mqttClient.subscribe(
            MQTT_COMMAND_TOPIC
        );

    if (subscribed) {

        Serial.print(
            "[MQTT] Subscribed: "
        );

        Serial.println(
            MQTT_COMMAND_TOPIC
        );

    } else {

        Serial.println(
            "[MQTT] Subscribe failed"
        );
    }

    return true;
}


// ======================================================
// MQTT LOOP
// ======================================================

void mqttLoop() {

    if (WiFi.status() != WL_CONNECTED) {

        connectWifi();
    }

    if (!mqttClient.connected()) {

        unsigned long currentTime =
            millis();

        if (
            currentTime - lastMqttReconnect
            >= MQTT_RECONNECT_DELAY
        ) {

            lastMqttReconnect =
                currentTime;

            connectMqtt();
        }

        return;
    }

    mqttClient.loop();
}


// ======================================================
// PUBLISH SENSOR DATA
// ======================================================

bool publishSensorData(const SensorData &sensorData) {

    if (!mqttClient.connected()) {

        Serial.println(
            "[MQTT] Cannot publish sensor data: disconnected"
        );

        return false;
    }

    StaticJsonDocument<192> document;

    document["temperature"] =
        sensorData.temperature;

    document["humidity"] =
        sensorData.humidity;

    document["light"] =
        sensorData.light;

    char payload[192];

    size_t length =
        serializeJson(
            document,
            payload,
            sizeof(payload)
        );

    if (length == 0) {

        Serial.println(
            "[MQTT] Sensor JSON serialization failed"
        );

        return false;
    }

    bool published =
        mqttClient.publish(
            MQTT_SENSOR_TOPIC,
            payload
        );

    if (!published) {

        Serial.println(
            "[MQTT] Sensor publish failed"
        );

        return false;
    }

    Serial.print(
        "[MQTT] Sensor publish: "
    );

    Serial.println(payload);

    return true;
}


// ======================================================
// MQTT CALLBACK
// ======================================================

static void mqttCallback(char* topic, byte* payload, unsigned int length) {

    Serial.print(
        "[MQTT] Received ["
    );

    Serial.print(topic);

    Serial.print("]: ");

    if (
        strcmp(
            topic,
            MQTT_COMMAND_TOPIC
        ) != 0
    ) {

        Serial.println(
            "ignored"
        );

        return;
    }

    StaticJsonDocument<128> document;

    DeserializationError error =
        deserializeJson(
            document,
            payload,
            length
        );

    if (error) {

        Serial.print(
            "[ERROR] Invalid JSON: "
        );

        Serial.println(
            error.f_str()
        );

        return;
    }

    if (
        !document.containsKey(
            "device_id"
        ) ||
        !document.containsKey(
            "action"
        )
    ) {

        Serial.println(
            "[ERROR] JSON must contain device_id and action"
        );

        return;
    }

    int deviceId =
        document["device_id"].as<int>();

    const char* action =
        document["action"];

    if (action == nullptr) {

        Serial.println(
            "[ERROR] Invalid action"
        );

        return;
    }

    Serial.print(
        "[COMMAND] device_id="
    );

    Serial.print(deviceId);

    Serial.print(
        ", action="
    );

    Serial.println(action);


    // ==================================================
    // EXECUTE DEVICE COMMAND
    // ==================================================

    bool success =
        setDeviceState(
            deviceId,
            action
        );

    if (!success) {

        Serial.println(
            "[ERROR] Device command failed"
        );

        return;
    }

    Serial.print(
        "[DEVICE] device_id="
    );

    Serial.print(deviceId);

    Serial.print(
        " state="
    );

    Serial.println(
        getDeviceState(deviceId)
    );


    // ==================================================
    // PUBLISH ACTUAL DEVICE STATUS
    // ==================================================

    publishDeviceStatus(
        deviceId
    );
}


// ======================================================
// PUBLISH DEVICE STATUS
// ======================================================

static bool publishDeviceStatus(int deviceId) {

    int pin;

    switch (deviceId) {

        case 1:
            pin = LED1_PIN;
            break;

        case 2:
            pin = LED2_PIN;
            break;

        case 3:
            pin = LED3_PIN;
            break;

        default:

            Serial.println(
                "[ERROR] Cannot publish status: invalid device_id"
            );

            return false;
    }

    bool actualState =
        digitalRead(pin) == HIGH;

    StaticJsonDocument<128> document;

    document["device_id"] =
        deviceId;

    document["status"] =
        actualState
            ? "ON"
            : "OFF";

    char payload[128];

    size_t length =
        serializeJson(
            document,
            payload,
            sizeof(payload)
        );

    if (length == 0) {

        Serial.println(
            "[ERROR] Status JSON serialization failed"
        );

        return false;
    }

    bool published =
        mqttClient.publish(
            MQTT_STATUS_TOPIC,
            payload
        );

    if (!published) {

        Serial.println(
            "[ERROR] Failed to publish device status"
        );

        return false;
    }

    Serial.print(
        "[MQTT] Status publish: "
    );

    Serial.println(payload);

    return true;
}