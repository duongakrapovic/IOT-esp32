#include <Arduino.h>
#include "config.h"
#include "led_control.h"

// ==========================================
// KHỞI TẠO LED
// ==========================================

void initLEDs() {

    pinMode(LED1_PIN, OUTPUT);
    pinMode(LED2_PIN, OUTPUT);
    pinMode(LED3_PIN, OUTPUT);

    digitalWrite(LED1_PIN, LOW);
    digitalWrite(LED2_PIN, LOW);
    digitalWrite(LED3_PIN, LOW);
}

// ==========================================
// ĐIỀU KHIỂN LED
// ==========================================

void setLED(
    const char* device,
    int pinState
) {

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