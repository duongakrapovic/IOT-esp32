#ifndef MQTT_H
#define MQTT_H

#include "sensors.h"

void initMqtt();

void mqttLoop();

bool publishSensorData(const SensorData &sensorData);

#endif