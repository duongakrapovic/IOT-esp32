#include <Arduino.h>
#include <string.h>

#include "config.h"
#include "devices.h"
//[DEVICE] Internal device state
static bool deviceStates[3] = {
    false,
    false,
    false
};

static int getDevicePin(int deviceId) {

    switch (deviceId) {

        case 1:
            return LED1_PIN;

        case 2:
            return LED2_PIN;

        case 3:
            return LED3_PIN;

        default:
            return -1;
    }
}
// [INIT] Configure LED GPIO pins
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
// [DEVICE] Execute ON/OFF command
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

    if (pin == -1) {
        return false;
    }

    digitalWrite(pin, state ? HIGH : LOW);

    deviceStates[deviceId - 1] = state;

    return true;
}
// [STATUS] Read the stored device state
const char* getDeviceState(int deviceId) {

    if (deviceId < 1 || deviceId > 3) {
        return nullptr;
    }

    return deviceStates[deviceId - 1] ? "ON" : "OFF";
}