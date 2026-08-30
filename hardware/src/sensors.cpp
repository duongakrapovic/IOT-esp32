#include <Arduino.h>
#include <DHT.h>
#include "config.h"
#include "sensors.h"

// ==========================================
// KHỞI TẠO DHT
// ==========================================

DHT dht(DHT_PIN, DHT_TYPE);

// ==========================================
// KHỞI TẠO CẢM BIẾN
// ==========================================

void initSensors() {
    dht.begin();
}

// ==========================================
// ĐỌC DỮ LIỆU CẢM BIẾN
// ==========================================

bool readSensors(
    float &temperature,
    float &humidity,
    int &light
) {
    // --------------------------------------
    // DHT11
    // --------------------------------------

    temperature = dht.readTemperature();
    humidity = dht.readHumidity();

    // --------------------------------------
    // LDR
    // --------------------------------------

    int ldrRaw = analogRead(LDR_PIN);

    /*
     * Module LDR thực tế:
     *
     * Tối hoàn toàn  -> RAW ~4095
     * Phòng + đèn    -> RAW ~1850
     * Flash          -> RAW ~0
     *
     * RAW càng thấp thì càng sáng.
     *
     * Quy đổi sang thang 0-5000 Lux.
     */

    float lux =
        (1.0 - ((float)ldrRaw / 4095.0))
        * LIGHT_MAX_LUX;

    if (lux < 0) {
        lux = 0;
    }

    if (lux > LIGHT_MAX_LUX) {
        lux = LIGHT_MAX_LUX;
    }

    light = (int)lux;

    // --------------------------------------
    // KIỂM TRA DHT
    // --------------------------------------

    if (isnan(temperature) || isnan(humidity)) {
        return false;
    }

    return true;
}