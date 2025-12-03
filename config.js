const MQTT_CONFIG = {
  brokerURL: 'wss://d18c5dd25e7a4986abf418059d679cc2.s1.eu.hivemq.cloud:8884/mqtt',
  clientId: 'esp32_web_' + Date.now() + '_' + Math.random().toString(36),
  
  connectOptions: {
    keepaliveInterval: 30,
    reconnectPeriod: 5000,
    clean: true,
    username: 'user_1',  // ← ĐIỀN VÀO ĐÂY
    password: 'Nguyenanhvu22052005'   // ← ĐIỀN VÀO ĐÂY
  },

  // Topics
  topics: {
    temp: 'esp32/sensor/temp',
    humidity: 'esp32/sensor/humidity',
    light: 'esp32/sensor/light',
    gas: 'esp32/sensor/gas',
    motion: 'esp32/sensor/motion',
    relayState: 'esp32/relay/state',
    relayCmd: 'esp32/relay/cmd',
    alert: 'esp32/alert'
  },

  // Thresholds (for UI alerts)
  thresholds: {
    tempWarning: 40,
    gasWarning: 100,
    lightLow: 200
  }
};
