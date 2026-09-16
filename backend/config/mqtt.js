const mqtt = require('mqtt');

const options = {
    username: 'iot_project',
    password: '12345678'
};

const client = mqtt.connect(
    'mqtts://c8b86407ac1540f19bc71edc98150df0.s1.eu.hivemq.cloud:8883',
    options
);

client.on('connect', () => {

    console.log('Kết nối thành công tới HiveMQ Cloud');

    client.subscribe('iot/sensors/data');

    client.subscribe('iot/devices/status');

});

client.on('error', (err) => {

    console.error('Lỗi kết nối MQTT:', err.message);

});

module.exports = client;