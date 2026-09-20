#include <Arduino.h>
#include <DHT.h>
#include <math.h>

#include "config.h"
#include "sensors.h"

static DHT dht(DHT_PIN, DHT_TYPE);

void initSensors() {

    dht.begin();

    analogReadResolution(12);
}

bool readSensors(SensorData &sensorData) {

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {

        Serial.println("[ERROR] DHT11 read failed");

        return false;
    }

    int ldrRaw = analogRead(LDR_PIN);

    /*
     * Temporary Lux conversion.
     *
     * The final Lux formula will be determined later.
     * Do not treat the raw ADC value itself as Lux.
     */

    float lux =
        (1.0f - static_cast<float>(ldrRaw) / 4095.0f)
        * LIGHT_MAX_LUX;

    if (lux < 0.0f) {
        lux = 0.0f;
    }

    if (lux > LIGHT_MAX_LUX) {
        lux = LIGHT_MAX_LUX;
    }

    sensorData.temperature = temperature;
    sensorData.humidity = humidity;
    sensorData.light = static_cast<int>(lux);

    return true;
}