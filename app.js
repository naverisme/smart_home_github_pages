// Global variables
let client = null;
let isConnected = false;
let sensorData = {};
let chartInstances = {};
let chartData = {
  temp: [],
  humidity: [],
  light: [],
  gas: []
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('[APP] Initializing...');
  
  initCharts();
  connectMQTT();
  
  // Update every second
  setInterval(updateUI, 1000);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (client && isConnected) {
      client.end();
    }
  });
});

// ============ MQTT Connection ============
function connectMQTT() {
  console.log('[MQTT] Connecting to:', MQTT_CONFIG.brokerURL);
  
  try {
    client = mqtt.connect(MQTT_CONFIG.brokerURL, MQTT_CONFIG.connectOptions);
    
    client.on('connect', onMQTTConnect);
    client.on('message', onMQTTMessage);
    client.on('error', onMQTTError);
    client.on('offline', onMQTTOffline);
  } catch (error) {
    console.error('[MQTT] Connection error:', error);
    addAlert('Failed to initialize MQTT', 'danger');
  }
}

function onMQTTConnect() {
  console.log('[MQTT] ✅ Connected');
  isConnected = true;
  setConnectionStatus(true);
  addAlert('Connected to MQTT broker', 'success');
  
  // Subscribe to all topics
  Object.values(MQTT_CONFIG.topics).forEach(topic => {
    client.subscribe(topic, {qos: 1});
    console.log('[MQTT] Subscribed:', topic);
  });
}

function onMQTTMessage(topic, message) {
  const payload = message.toString();
  console.log(`[MQTT] ${topic} = ${payload}`);
  
  // Parse topic and update state
  switch(topic) {
    case MQTT_CONFIG.topics.temp:
      sensorData.temp = parseFloat(payload);
      break;
    case MQTT_CONFIG.topics.humidity:
      sensorData.humidity = parseFloat(payload);
      break;
    case MQTT_CONFIG.topics.light:
      sensorData.light = parseInt(payload);
      break;
    case MQTT_CONFIG.topics.gas:
      sensorData.gas = parseInt(payload);
      break;
    case MQTT_CONFIG.topics.motion:
      sensorData.motion = payload === '1' ? true : false;
      break;
    case MQTT_CONFIG.topics.relayState:
      sensorData.relay = payload;
      break;
    case MQTT_CONFIG.topics.alert:
      handleAlert(payload);
      break;
  }
  
  // Update chart data
  addChartData();
  updateUI();
}

function onMQTTError(error) {
  console.error('[MQTT] Error:', error);
  setConnectionStatus(false);
  addAlert('MQTT Connection Error', 'danger');
}

function onMQTTOffline() {
  console.warn('[MQTT] Offline');
  isConnected = false;
  setConnectionStatus(false);
  addAlert('MQTT connection lost', 'warning');
}

// ============ UI Updates ============
function updateUI() {
  // Update sensor displays
  document.getElementById('tempValue').textContent = 
    sensorData.temp !== undefined ? sensorData.temp.toFixed(1) : '--';
  
  document.getElementById('humidityValue').textContent = 
    sensorData.humidity !== undefined ? sensorData.humidity.toFixed(0) : '--';
  
  document.getElementById('lightValue').textContent = 
    sensorData.light !== undefined ? sensorData.light : '--';
  
  document.getElementById('gasValue').textContent = 
    sensorData.gas !== undefined ? sensorData.gas : '--';
  
  document.getElementById('motionValue').textContent = 
    sensorData.motion ? '🚨 Detected' : '✓ None';
  
  document.getElementById('relayValue').textContent = 
    sensorData.relay ? sensorData.relay : '--';
  
  // Update progress bars
  updateProgressBars();
  
  // Update sensor cards (add warning/danger classes)
  updateSensorCardWarnings();
  
  // Update last update time
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
  
  // Update data points count
  document.getElementById('dataPoints').textContent = chartData.temp.length;
}

function updateProgressBars() {
  if (sensorData.temp !== undefined) {
    const tempPercent = Math.min(100, (sensorData.temp / 50) * 100);
    document.getElementById('tempBar').style.width = tempPercent + '%';
  }
  
  if (sensorData.humidity !== undefined) {
    document.getElementById('humidityBar').style.width = sensorData.humidity + '%';
  }
  
  if (sensorData.light !== undefined) {
    const lightPercent = Math.min(100, (sensorData.light / 65535) * 100);
    document.getElementById('lightBar').style.width = lightPercent + '%';
  }
  
  if (sensorData.gas !== undefined) {
    const gasPercent = Math.min(100, (sensorData.gas / 500) * 100);
    document.getElementById('gasBar').style.width = gasPercent + '%';
  }
}

function updateSensorCardWarnings() {
  // Temperature warning
  const tempCard = document.querySelector('.sensor-card:nth-child(1)');
  tempCard.classList.remove('warning', 'danger');
  if (sensorData.temp > MQTT_CONFIG.thresholds.tempWarning) {
    tempCard.classList.add('danger');
  } else if (sensorData.temp > MQTT_CONFIG.thresholds.tempWarning - 5) {
    tempCard.classList.add('warning');
  }
  
  // Gas warning
  const gasCard = document.querySelector('.sensor-card:nth-child(4)');
  gasCard.classList.remove('warning', 'danger');
  if (sensorData.gas > MQTT_CONFIG.thresholds.gasWarning) {
    gasCard.classList.add('danger');
  } else if (sensorData.gas > MQTT_CONFIG.thresholds.gasWarning * 0.7) {
    gasCard.classList.add('warning');
  }
  
  // Light warning
  const lightCard = document.querySelector('.sensor-card:nth-child(3)');
  lightCard.classList.remove('warning');
  if (sensorData.light < MQTT_CONFIG.thresholds.lightLow) {
    lightCard.classList.add('warning');
  }
}

function setConnectionStatus(connected) {
  const dot = document.getElementById('connectionDot');
  const text = document.getElementById('connectionText');
  
  if (connected) {
    dot.classList.add('connected');
    dot.classList.remove('disconnected');
    text.textContent = 'Connected';
  } else {
    dot.classList.remove('connected');
    dot.classList.add('disconnected');
    text.textContent = 'Disconnected';
  }
}

// ============ Control ============
function setRelay(state) {
  if (!isConnected) {
    addAlert('Not connected to MQTT broker', 'warning');
    return;
  }
  
  console.log(`[CONTROL] Setting relay to: ${state}`);
  client.publish(MQTT_CONFIG.topics.relayCmd, state, {qos: 1});
  addAlert(`Relay command sent: ${state}`, 'info');
}

document.getElementById('reconnectBtn').addEventListener('click', function() {
  console.log('[APP] Reconnecting...');
  if (client) {
    client.end();
  }
  connectMQTT();
  addAlert('Reconnecting...', 'info');
});

// ============ Charts ============
function initCharts() {
  const chartConfig = {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      },
      animation: {
        duration: 300
      }
    }
  };

  // Temperature Chart
  chartInstances.temp = new Chart(document.getElementById('tempChart'), {
    ...chartConfig,
    data: {
      labels: [],
      datasets: [{
        label: 'Temperature (°C)',
        data: [],
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    }
  });

  // Humidity Chart
  chartInstances.humidity = new Chart(document.getElementById('humidityChart'), {
    ...chartConfig,
    data: {
      labels: [],
      datasets: [{
        label: 'Humidity (%)',
        data: [],
        borderColor: '#4ecdc4',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    }
  });

  // Light Chart
  chartInstances.light = new Chart(document.getElementById('lightChart'), {
    ...chartConfig,
    data: {
      labels: [],
      datasets: [{
        label: 'Light (lux)',
        data: [],
        borderColor: '#ffd93d',
        backgroundColor: 'rgba(255, 217, 61, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    }
  });

  // Gas Chart
  chartInstances.gas = new Chart(document.getElementById('gasChart'), {
    ...chartConfig,
    data: {
      labels: [],
      datasets: [{
        label: 'Gas (ppm)',
        data: [],
        borderColor: '#a8dadc',
        backgroundColor: 'rgba(168, 218, 220, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    }
  });
}

function addChartData() {
  const now = new Date().toLocaleTimeString();
  
  // Keep only last 60 data points (1 minute of 1-second updates)
  const maxPoints = 60;
  
  if (sensorData.temp !== undefined) {
    chartData.temp.push(sensorData.temp);
    if (chartData.temp.length > maxPoints) chartData.temp.shift();
    updateChart('temp', chartData.temp);
  }
  
  if (sensorData.humidity !== undefined) {
    chartData.humidity.push(sensorData.humidity);
    if (chartData.humidity.length > maxPoints) chartData.humidity.shift();
    updateChart('humidity', chartData.humidity);
  }
  
  if (sensorData.light !== undefined) {
    chartData.light.push(sensorData.light);
    if (chartData.light.length > maxPoints) chartData.light.shift();
    updateChart('light', chartData.light);
  }
  
  if (sensorData.gas !== undefined) {
    chartData.gas.push(sensorData.gas);
    if (chartData.gas.length > maxPoints) chartData.gas.shift();
    updateChart('gas', chartData.gas);
  }
}

function updateChart(chartName, data) {
  if (chartInstances[chartName]) {
    const labels = Array.from({length: data.length}, (_, i) => i);
    chartInstances[chartName].data.labels = labels;
    chartInstances[chartName].data.datasets[0].data = data;
    chartInstances[chartName].update('none'); // Update without animation
  }
}

// ============ Alerts ============
function handleAlert(alertType) {
  console.log('[ALERT] Received:', alertType);
  
  let message = '';
  let type = 'info';
  
  switch(alertType) {
    case 'GAS_HIGH':
      message = '⚠️ Gas level is dangerously high!';
      type = 'danger';
      break;
    case 'TEMP_HIGH':
      message = '🔥 Temperature is too high!';
      type = 'danger';
      break;
    case 'OK':
      message = '✅ System status: OK';
      type = 'success';
      break;
    default:
      message = `Alert: ${alertType}`;
  }
  
  addAlert(message, type);
}

function addAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  
  // Remove "No alerts" message if exists
  if (container.innerHTML.includes('No alerts')) {
    container.innerHTML = '';
  }
  
  const alert = document.createElement('div');
  alert.className = `alert-item ${type}`;
  alert.textContent = message;
  
  container.insertBefore(alert, container.firstChild);
  
  // Keep only last 10 alerts
  while (container.children.length > 10) {
    container.removeChild(container.lastChild);
  }
  
  // Auto-remove after 5 seconds (except danger)
  if (type !== 'danger') {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  }
  
  console.log(`[ALERT] ${type.toUpperCase()}: ${message}`);
}
