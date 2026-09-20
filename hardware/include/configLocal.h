#ifndef CONFIG_LOCAL_H
#define CONFIG_LOCAL_H

// ==========================================
// WIFI
// ==========================================

#define WIFI_SSID "asusTufF152022"
#define WIFI_PASSWORD "12345678"

// ==========================================
// HIVEMQ CLOUD
// ==========================================

#define MQTT_SERVER "c8b86407ac1540f19bc71edc98150df0.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
//1883: MQTT không mã hóa (Port giao tiếp chính mặc định ban đầu).
//8883: MQTT có mã hóa bảo mật ( đã cấu hình chứng chỉ SSL/TLS).
//(Secure Sockets Layer) &  (Transport Layer Security)

#define MQTT_USERNAME "iot_project"
#define MQTT_PASSWORD "12345678"

#endif