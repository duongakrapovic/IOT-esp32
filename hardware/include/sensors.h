#ifndef SENSORS_H
#define SENSORS_H

struct SensorData {
    float temperature;
    float humidity;
    int light;
};

void initSensors();

bool readSensors(SensorData &sensorData);

#endif