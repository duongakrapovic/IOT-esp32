#ifndef MQTT_HANDLER_H
#define MQTT_HANDLER_H

#include <Arduino.h>

// ==========================================
// XỬ LÝ LỆNH MQTT TỪ BACKEND
// ==========================================

void mqttCallback(
    char* topic,
    byte* payload,
    unsigned int length
);

#endif