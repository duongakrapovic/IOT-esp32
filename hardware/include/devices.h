#ifndef DEVICES_H
#define DEVICES_H

void initDevices();

bool setDeviceState(int deviceId, const char* action);

const char* getDeviceState(int deviceId);

#endif