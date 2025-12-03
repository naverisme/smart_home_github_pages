const MQTT_CONFIG = {
  // HiveMQ Public Broker
  brokerURL: 'wss://broker.hivemq.com:8884/mqtt',
  
  // Client ID (must be unique)
  clientId: 'esp32_web_' + Math.random().toString(36).substr(2, 9),
  
  // Connection options
  connectOptions: {
    keepaliveInterval: 30,
    reconnectPeriod: 5000,
    clean: true,
    username: '',
    password: ''
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
