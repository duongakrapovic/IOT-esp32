#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ==========================================
// THÔNG TIN WIFI & MQTT BROKER
// ==========================================

const char* ssid = "Mr Hiep2";
const char* password = "73780509";

// IPv4 của Laptop đang chạy Mosquitto + Backend
const char* mqtt_server = "192.168.0.136";

// ==========================================
// CHÂN CẮM PHẦN CỨNG
// ==========================================

#define DHT_PIN 32
#define DHT_TYPE DHT11

#define LDR_PIN 34

#define LED1_PIN 33
#define LED2_PIN 25
#define LED3_PIN 26

// ==========================================
// KHỞI TẠO
// ==========================================

DHT dht(DHT_PIN, DHT_TYPE);

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;

// ==========================================
// XỬ LÝ LỆNH MQTT TỪ BACKEND
// ==========================================

void callback(char* topic, byte* payload, unsigned int length) {

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

    // Backend hiện tại gửi:
    // {"device": "device1", "status": "ON"}

    const char* device = doc["device"];
    const char* status = doc["status"];

    if (device == nullptr || status == nullptr) {
        Serial.println("Loi: JSON thieu device hoac status");
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

    if (strcmp(device, "device1") == 0) {

        digitalWrite(LED1_PIN, pinState);

    } else if (strcmp(device, "device2") == 0) {

        digitalWrite(LED2_PIN, pinState);

    } else if (strcmp(device, "device3") == 0) {

        digitalWrite(LED3_PIN, pinState);

    } else {

        Serial.println("Loi: Khong tim thay device");
    }
}

// ==========================================
// KẾT NỐI LẠI MQTT
// ==========================================

void reconnect() {

    while (!client.connected()) {

        Serial.print("Dang ket noi MQTT Broker...");

        if (client.connect("ESP32_IoT_Gateway")) {

            Serial.println(" [OK] Da ket noi!");

            // Nhận lệnh điều khiển LED
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
// SETUP
// ==========================================

void setup() {

    Serial.begin(115200);
    Serial.flush();

    // --------------------------------------
    // LED
    // --------------------------------------

    pinMode(LED1_PIN, OUTPUT);
    pinMode(LED2_PIN, OUTPUT);
    pinMode(LED3_PIN, OUTPUT);

    digitalWrite(LED1_PIN, LOW);
    digitalWrite(LED2_PIN, LOW);
    digitalWrite(LED3_PIN, LOW);

    // --------------------------------------
    // DHT11
    // --------------------------------------

    dht.begin();

    // --------------------------------------
    // WIFI
    // --------------------------------------

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

    // --------------------------------------
    // MQTT
    // --------------------------------------

    client.setServer(mqtt_server, 1883);
    client.setCallback(callback);

    Serial.println("[OK] MQTT configuration ready!");
}

// ==========================================
// LOOP
// ==========================================

void loop() {

    // --------------------------------------
    // MQTT
    // --------------------------------------

    if (!client.connected()) {
        reconnect();
    }

    client.loop();

    // --------------------------------------
    // ĐỌC CẢM BIẾN MỖI 2 GIÂY
    // --------------------------------------

    unsigned long now = millis();

    if (now - lastMsg > 2000) {

        lastMsg = now;

        // ----------------------------------
        // DHT11
        // ----------------------------------

        float t = dht.readTemperature();
        float h = dht.readHumidity();

        // ----------------------------------
        // LDR
        // ----------------------------------

        int ldrRaw = analogRead(LDR_PIN);

        /*
         * Module LDR thực tế của bạn:
         *
         * Tối hoàn toàn  -> RAW ~4095
         * Phòng + đèn    -> RAW ~1850
         * Flash          -> RAW ~0
         *
         * Vì vậy RAW càng thấp thì càng sáng.
         *
         * Tạm thời quy đổi sang thang 0-5000 Lux.
         * Sau này có thể thay công thức calibration.
         */

        float lux =
            (1.0 - ((float)ldrRaw / 4095.0))
            * 5000.0;

        if (lux < 0) {
            lux = 0;
        }

        if (lux > 5000) {
            lux = 5000;
        }

        // ----------------------------------
        // KIỂM TRA DHT
        // ----------------------------------

        if (!isnan(t) && !isnan(h)) {

            /*
             * Giữ temperature và humidity
             * dưới dạng chuỗi như code hiện tại.
             */

            StaticJsonDocument<128> doc;

            doc["temperature"] =
                serialized(String(t, 1));

            doc["humidity"] =
                serialized(String(h, 1));

            doc["light"] =
                (int)lux;

            char payload[128];

            serializeJson(doc, payload);

            // ----------------------------------
            // GỬI MQTT
            // ----------------------------------

            client.publish(
                "iot/sensors/data",
                payload
            );

            // ----------------------------------
            // SERIAL LOG
            // ----------------------------------

            Serial.print("Publish sensors: ");
            Serial.println(payload);

            Serial.print("LDR RAW: ");
            Serial.print(ldrRaw);

            Serial.print(" -> Light: ");
            Serial.print((int)lux);

            Serial.println(" Lux");

        } else {

            Serial.println(
                "Loi: Khong doc duoc DHT11"
            );
        }
    }
}