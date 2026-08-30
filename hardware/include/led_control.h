#ifndef LED_CONTROL_H
#define LED_CONTROL_H

// ==========================================
// KHỞI TẠO LED
// ==========================================

void initLEDs();

// ==========================================
// ĐIỀU KHIỂN LED
// ==========================================

void setLED(
    const char* device,
    int pinState
);

#endif