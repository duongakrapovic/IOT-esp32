
#include <Arduino.h>
#include <DHT.h>
#include <math.h>

#include "config.h"
#include "sensors.h"

// ==========================================
// [KHAI BAO] Khoi tao cam bien DHT11
// ==========================================

static DHT dht(DHT_PIN, DHT_TYPE);

// ==========================================
// [KHOI TAO] Khoi tao DHT11 va ADC
// ==========================================

void initSensors() {
    // Khoi dong cam bien DHT11
    dht.begin();

    // Cai dat ADC 12 bit
    // Gia tri ADC ly thuyet nam trong khoang 0 - 4095
    analogReadResolution(12);

    // Cai dat do suy giam ADC cho chan LDR
    // Giup ADC do duoc dien ap cao hon
    analogSetPinAttenuation(LDR_PIN, ADC_11db);
}

static float calculateLdrResistance(float voltage) {

    if (voltage <= 0.0f) {
        return 100000000.0f;
    }

    if (voltage >= LDR_VCC) {
        return 0.0f;
    }

    float ldrResistance =
        LDR_FIXED_RESISTANCE
        * voltage
        / (LDR_VCC - voltage);

    return ldrResistance;
}
static float calculateLux(float ldrResistance) {

    // Khi dien tro bang 0 hoac khong hop le
    if (ldrResistance <= 0.0f) {
        return LIGHT_MAX_LUX;
    }

    float lux =
        10.0f
        * pow(
            LDR_RESISTANCE_AT_10_LUX / ldrResistance,
            1.0f / LDR_GAMMA
        );

    // Kiem tra ket qua khong hop le
    if (isnan(lux) || isinf(lux)) {
        return 0.0f;
    }

    // Gioi han gia tri Lux
    if (lux < 0.0f) {
        lux = 0.0f;
    }

    if (lux > LIGHT_MAX_LUX) {
        lux = LIGHT_MAX_LUX;
    }

    return lux;
}

// ==========================================
// [CAM BIEN] Doc nhiet do, do am va anh sang
// ==========================================

bool readSensors(SensorData &sensorData) {

    // --------------------------------------
    // [DHT11] Doc nhiet do va do am
    // --------------------------------------

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Kiem tra du lieu DHT11
    // isnan() kiem tra gia tri co phai NaN hay khong
    if (isnan(temperature) || isnan(humidity)) {

        Serial.println("[LOI] Doc cam bien DHT11 that bai");

        return false;
    }

    // --------------------------------------
    // [ADC] Doc dien ap analog tu chan AO
    // --------------------------------------

    // Ham tra ve dien ap theo don vi mV
    uint32_t ldrVoltageMv =
        analogReadMilliVolts(LDR_PIN);

    // Chuyen mV sang V
    float ldrVoltage =
        static_cast<float>(ldrVoltageMv) / 1000.0f;

    // --------------------------------------
    // [LDR] Tinh dien tro cua quang tro
    // --------------------------------------

    float ldrResistance =
        calculateLdrResistance(ldrVoltage);

    // --------------------------------------
    // [LDR] Tinh Lux uoc luong
    // --------------------------------------

    float lux =
        calculateLux(ldrResistance);

    // --------------------------------------
    // [DU LIEU] Luu ket qua vao SensorData
    // --------------------------------------

    sensorData.temperature = temperature;
    sensorData.humidity = humidity;
    sensorData.light = static_cast<int>(lux);

    //debug

    // Serial.print("[LDR] Dien ap: ");
    // Serial.print(ldrVoltage, 3);
    // Serial.println(" V");

    // Serial.print("[LDR] Dien tro: ");
    // Serial.print(ldrResistance, 2);
    // Serial.println(" Ohm");

    // Serial.print("[LDR] Lux uoc luong: ");
    // Serial.println(lux, 2);

    return true;
}