/**
 * @file main.cpp
 * @brief Chương trình chính tổng hợp toàn bộ logic ESP32 IoT System
 * @tag [MAIN_CPP_SINGLE] [SETUP_LOOP] [LOGIC_IMPL]
 */

#include "main.h"

// ==========================================
// [TAG_GLOBALS] KHAI BÁO BIẾN TOÀN CỤC VÀ ĐỐI TƯỢNG
// ==========================================
static DHT dht(DHT_PIN, DHT_TYPE);
static WiFiClient wifiClient;
static PubSubClient mqttClient(wifiClient);

static unsigned long lastSensorPublish = 0;
static unsigned long lastMqttReconnect = 0;
static bool deviceStates[3] = {false, false, false};

// Khai báo trước các hàm nội bộ trợ giúp
static bool connectWifi();
static bool connectMqtt();
static void mqttCallback(char* topic, byte* payload, unsigned int length);
static bool publishDeviceStatus(int deviceId, int historyId = 0);
static int getDevicePin(int deviceId);
static float calculateLdrResistance(float voltage);
static float calculateLux(float ldrResistance);

// ==========================================
// [TAG_DEVICE_IMPL] TRIỂN KHAI MODULE ĐIỀU KHIỂN THIẾT BỊ
// ==========================================
static int getDevicePin(int deviceId) {
    switch (deviceId) {
        case 1: return LED1_PIN;
        case 2: return LED2_PIN;
        case 3: return LED3_PIN;
        default: return -1;
    }
}

void initDevices() {
    pinMode(LED1_PIN, OUTPUT);
    pinMode(LED2_PIN, OUTPUT);
    pinMode(LED3_PIN, OUTPUT);

    digitalWrite(LED1_PIN, LOW);
    digitalWrite(LED2_PIN, LOW);
    digitalWrite(LED3_PIN, LOW);

    deviceStates[0] = false;
    deviceStates[1] = false;
    deviceStates[2] = false;
}

bool setDeviceState(int deviceId, const char* action) {
    if (deviceId < 1 || deviceId > 3) {
        Serial.print("[ERROR] Invalid device_id: ");
        Serial.println(deviceId);
        return false;
    }

    if (action == nullptr) {
        Serial.println("[ERROR] Missing action");
        return false;
    }

    bool state;
    if (strcmp(action, "ON") == 0) {
        state = true;
    } else if (strcmp(action, "OFF") == 0) {
        state = false;
    } else {
        Serial.print("[ERROR] Invalid action: ");
        Serial.println(action);
        return false;
    }

    int pin = getDevicePin(deviceId);
    if (pin == -1) return false;

    digitalWrite(pin, state ? HIGH : LOW);
    deviceStates[deviceId - 1] = state;
    return true;
}

const char* getDeviceState(int deviceId) {
    if (deviceId < 1 || deviceId > 3) return nullptr;
    return deviceStates[deviceId - 1] ? "ON" : "OFF";
}

// ==========================================
// [TAG_SENSOR_IMPL] TRIỂN KHAI MODULE ĐỌC CẢM BIẾN
// ==========================================
void initSensors() {
    dht.begin();
    analogReadResolution(12);
    analogSetPinAttenuation(LDR_PIN, ADC_11db);
}

static float calculateLdrResistance(float voltage) {
    if (voltage <= 0.0f) return 100000000.0f;
    if (voltage >= LDR_VCC) return 0.0f;
    return LDR_FIXED_RESISTANCE * voltage / (LDR_VCC - voltage);
}

static float calculateLux(float ldrResistance) {
    if (ldrResistance <= 0.0f) return LIGHT_MAX_LUX;
    float lux = 10.0f * pow(LDR_RESISTANCE_AT_10_LUX / ldrResistance, 1.0f / LDR_GAMMA);
    if (isnan(lux) || isinf(lux)) return 0.0f;
    if (lux < 0.0f) lux = 0.0f;
    if (lux > LIGHT_MAX_LUX) lux = LIGHT_MAX_LUX;
    return lux;
}

bool readSensors(SensorData &sensorData) {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("[LOI] Doc cam bien DHT11 that bai");
        return false;
    }

    uint32_t ldrVoltageMv = analogReadMilliVolts(LDR_PIN);
    float ldrVoltage = static_cast<float>(ldrVoltageMv) / 1000.0f;

    float ldrResistance = calculateLdrResistance(ldrVoltage);
    float lux = calculateLux(ldrResistance);

    sensorData.temperature = temperature;
    sensorData.humidity = humidity;
    sensorData.light = static_cast<int>(lux);

    return true;
}

// ==========================================
// [TAG_MQTT_IMPL] TRIỂN KHAI KẾT NỐI WIFI & MQTT
// ==========================================
static bool connectWifi() {
    if (WiFi.status() == WL_CONNECTED) return true;

    Serial.print("[WiFi] Connecting");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long startTime = millis();

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        if (millis() - startTime >= 30000) {
            Serial.println("\n[WiFi] Connection timeout");
            return false;
        }
    }

    Serial.println("\n[WiFi] Connected");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    return true;
}

void initMqtt() {
    connectWifi();
    mqttClient.setBufferSize(512);
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setKeepAlive(MQTT_KEEP_ALIVE);
    Serial.println("[MQTT] Configuration ready");
}

static bool connectMqtt() {
    if (mqttClient.connected()) return true;

    if (WiFi.status() != WL_CONNECTED) {
        if (!connectWifi()) return false;
    }

    Serial.print("[MQTT] Connecting...");
    const char* willTopic = MQTT_STATUS_TOPIC;
    const char* willMessage = "{\"device_status\":\"OFFLINE\"}";

    bool connected = mqttClient.connect(
        MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD,
        willTopic, 1, true, willMessage
    );

    if (!connected) {
        Serial.print(" failed, state=");
        Serial.println(mqttClient.state());
        return false;
    }

    Serial.println(" connected");
    if (mqttClient.subscribe(MQTT_COMMAND_TOPIC)) {
        Serial.print("[MQTT] Subscribed: ");
        Serial.println(MQTT_COMMAND_TOPIC);
    } else {
        Serial.println("[MQTT] Subscribe failed");
    }

    return true;
}

void mqttLoop() {
    if (WiFi.status() != WL_CONNECTED) connectWifi();

    if (!mqttClient.connected()) {
        unsigned long currentTime = millis();
        if (currentTime - lastMqttReconnect >= MQTT_RECONNECT_DELAY) {
            lastMqttReconnect = currentTime;
            connectMqtt();
        }
        return;
    }

    mqttClient.loop();
}

bool publishSensorData(const SensorData &sensorData) {
    if (!mqttClient.connected()) {
        Serial.println("[MQTT] Cannot publish sensor data: disconnected");
        return false;
    }

    StaticJsonDocument<192> document;
    document["temperature"] = sensorData.temperature;
    document["humidity"] = sensorData.humidity;
    document["light"] = sensorData.light;

    char payload[192];
    size_t length = serializeJson(document, payload, sizeof(payload));
    if (length == 0) return false;

    if (!mqttClient.publish(MQTT_SENSOR_TOPIC, payload)) {
        Serial.println("[MQTT] Sensor publish failed");
        return false;
    }

    Serial.print("[MQTT] Sensor publish: ");
    Serial.println(payload);
    return true;
}

static void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.print("[MQTT] Received [");
    Serial.print(topic);
    Serial.print("]: ");

    if (strcmp(topic, MQTT_COMMAND_TOPIC) != 0) {
        Serial.println("ignored");
        return;
    }

    StaticJsonDocument<128> document;
    DeserializationError error = deserializeJson(document, payload, length);
    if (error) return;

    if (!document.containsKey("device_id") || !document.containsKey("action")) return;

    int deviceId = document["device_id"].as<int>();
    const char* action = document["action"];
    int historyId = document.containsKey("history_id") ? document["history_id"].as<int>() : 0;

    if (action == nullptr) return;

    bool success = setDeviceState(deviceId, action);
    if (!success) return;

    publishDeviceStatus(deviceId, historyId);
}

static bool publishDeviceStatus(int deviceId, int historyId) {
    int pin = getDevicePin(deviceId);
    if (pin == -1) return false;

    bool actualState = digitalRead(pin) == HIGH;

    StaticJsonDocument<128> document;
    document["device_id"] = deviceId;
    document["status"] = actualState ? "ON" : "OFF";
    if (historyId > 0) document["history_id"] = historyId;

    char payload[128];
    serializeJson(document, payload, sizeof(payload));

    if (!mqttClient.publish(MQTT_STATUS_TOPIC, payload)) return false;

    Serial.print("[MQTT] Status publish: ");
    Serial.println(payload);
    return true;
}

// ==========================================
// [TAG_ENTRY] HÀM SETUP VÀ LOOP CHÍNH
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n==============================");
    Serial.println("ESP32 IoT SYSTEM START");
    Serial.println("==============================");

    initDevices();
    Serial.println("[OK] Devices initialized");

    initSensors();
    Serial.println("[OK] Sensors initialized");

    initMqtt();
    Serial.println("[OK] MQTT initialized");
}

void loop() {
    mqttLoop();

    unsigned long currentTime = millis();
    if (currentTime - lastSensorPublish >= SENSOR_INTERVAL) {
        lastSensorPublish = currentTime;

        SensorData sensorData;
        if (readSensors(sensorData)) {
            Serial.print("[SENSOR] Temperature: "); Serial.print(sensorData.temperature); Serial.println(" C");
            Serial.print("[SENSOR] Humidity: "); Serial.print(sensorData.humidity); Serial.println(" %");
            Serial.print("[SENSOR] Light: "); Serial.print(sensorData.light); Serial.println(" Lux");

            publishSensorData(sensorData);
        } else {
            Serial.println("[ERROR] Sensor reading failed");
        }
    }
}