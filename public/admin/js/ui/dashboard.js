import { showToast } from '../utils/toast.js';
import realtimeService from '../services/realtime-service.js';

// Utility to get token
function getToken() {
  return localStorage.getItem('token');
}

// Store current dashboard data
let dashboardData = {
  users: [],
  devices: [],
  logs: [],
  stats: {
    totalUsers: 0,
    totalDevices: 0,
    onlineDevices: 0,
    alertsCount: 0
  }
};

// Fetch and display total users
async function loadTotalUsers() {
  const token = getToken();
  if (!token) return;
  
  try {
    // Get Firebase users instead of local database users
    const res = await fetch('/firebase-users', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) return;
  const data = await res.json();
    dashboardData.users = data.users || [];
    dashboardData.stats.totalUsers = dashboardData.users.length;
    document.getElementById('total-users-count').textContent = dashboardData.stats.totalUsers;
  } catch (error) {
    console.error('Error loading Firebase users:', error);
  }
}

// Fetch and display devices as cards
async function loadDevices() {
  const token = getToken();
  if (!token) return;
  const loadingIndicator = document.getElementById('dashboard-devices-loading');
  const emptyIndicator = document.getElementById('dashboard-devices-empty');
  const deviceStatusCards = document.getElementById('device-status-cards');
  if (loadingIndicator) loadingIndicator.classList.remove('d-none');
  if (emptyIndicator) emptyIndicator.classList.add('d-none');
  if (deviceStatusCards) deviceStatusCards.innerHTML = '';
  try {
    // Get all devices for the dashboard overview
    const res = await fetch('/devices/all', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Failed to fetch devices');
    const data = await res.json();
    dashboardData.devices = data.devices || data;
    updateDeviceDisplay();
  } catch (error) {
    console.error('Error loading devices:', error);
    if (emptyIndicator) emptyIndicator.classList.remove('d-none');
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
  }
}

// Update device display with current data (modern UI)
function updateDeviceDisplay() {
  const devices = dashboardData.devices;
  const deviceStatusCards = document.getElementById('device-status-cards');
  const emptyIndicator = document.getElementById('dashboard-devices-empty');
  if (!deviceStatusCards) return;

  deviceStatusCards.innerHTML = '';
  let onlineCount = 0;
  let alertCount = 0;

  if (!devices || devices.length === 0) {
    if (emptyIndicator) emptyIndicator.classList.remove('d-none');
    return;
  } else {
    if (emptyIndicator) emptyIndicator.classList.add('d-none');
  }

  devices.forEach(device => {
    // Check if device is online based on is_connected field
    const isOnline = device.is_connected === true;
    const hasAlert = device.has_alert === true;
    if (isOnline) onlineCount++;
    if (hasAlert) alertCount++;

    let statusBadge = isOnline
      ? (hasAlert ? '<span class="badge bg-warning text-dark ms-2">Alert</span>' : '<span class="badge bg-success ms-2">Online</span>')
      : '<span class="badge bg-danger ms-2">Offline</span>';
    let cardBorder = isOnline
      ? (hasAlert ? 'border-warning' : 'border-success')
      : 'border-danger';
    let cardShadow = 'shadow-sm';
    let lastUpdated = device.last_updated ? new Date(device.last_updated).toLocaleString() : 'Unknown';

    deviceStatusCards.innerHTML += `
      <div class="col-xl-4 col-lg-6 col-md-12 mb-4">
        <div class="card ${cardBorder} ${cardShadow} h-100 device-card" style="transition: box-shadow 0.2s;">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-microchip fa-2x text-primary me-3"></i>
              <h5 class="card-title mb-0 flex-grow-1 fw-bold">${device.name || device.serial_number}</h5>
              ${statusBadge}
            </div>
            <div class="mb-2"><strong>Device ID:</strong> ${device.serial_number}</div>
            <div class="mb-2"><strong>Location:</strong> ${device.location || 'Unknown'}</div>
            <div class="mb-2"><strong>Last Updated:</strong> ${lastUpdated}</div>
            ${device.alert_message ? `<div class='alert alert-warning d-flex align-items-center mt-2 mb-0'><i class='fas fa-exclamation-triangle me-2'></i> ${device.alert_message}</div>` : ''}
            <div class="d-flex justify-content-end gap-2 mt-3">
              <button class="btn btn-outline-primary btn-sm" onclick="viewDeviceDetails('${device.serial_number}')"><i class="fas fa-eye me-1"></i> Details</button>
              <button class="btn btn-outline-secondary btn-sm" onclick="viewDeviceLogs('${device.serial_number}')"><i class="fas fa-list me-1"></i> Logs</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  // Update dashboard stats
  dashboardData.stats.totalDevices = devices.length;
  dashboardData.stats.onlineDevices = onlineCount;
  dashboardData.stats.alertsCount = alertCount;

  document.getElementById('active-devices-count').textContent = dashboardData.stats.totalDevices;
  document.getElementById('online-devices-count').textContent = dashboardData.stats.onlineDevices;
  document.getElementById('alerts-count').textContent = dashboardData.stats.alertsCount;
}

// Fetch and display logs as cards
async function loadLogs() {
  const token = getToken();
  if (!token) return;
  const res = await fetch('/logs?limit=10', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) return;
  const data = await res.json();
  dashboardData.logs = data.logs || data;
  updateLogsDisplay();
}

// Update logs display with current data
function updateLogsDisplay() {
  const logs = dashboardData.logs;
  const logsSection = document.getElementById('logs-section');
  if (!logsSection) return;

  let logsHtml = '<div class="row">';
  logs.forEach(log => {
    let status = (log.status || '').toString().trim().toLowerCase();
    let cardColor = 'bg-light';
    if (status === 'online') cardColor = 'bg-success text-white';
    else if (status === 'offline') cardColor = 'bg-danger text-white';
    else if (status === 'alert') cardColor = 'bg-warning text-dark';

    logsHtml += `
      <div class="col-md-4 mb-3">
        <div class="card ${cardColor}">
          <div class="card-body">
            <h5 class="card-title">Device: ${log.device_id || '-'}</h5>
            <p class="card-text">Status: ${log.status || '-'}</p>
            <p class="card-text">Time: ${new Date(log.timestamp).toLocaleString()}</p>
            <pre class="card-text" style="white-space:pre-wrap;">${JSON.stringify(log.params, null, 2)}</pre>
          </div>
        </div>
      </div>
    `;
  });
  logsHtml += '</div>';
  logsSection.innerHTML = logsHtml;
}

// Handle real-time device updates
function handleDeviceUpdate(data) {
  console.log('Real-time device update received:', data);
  
  // Update device in local data
  const deviceIndex = dashboardData.devices.findIndex(d => d.serial_number === data.deviceId);
  if (deviceIndex !== -1) {
    dashboardData.devices[deviceIndex] = { ...dashboardData.devices[deviceIndex], ...data.data };
  } else {
    // Add new device if it doesn't exist
    dashboardData.devices.push({
      serial_number: data.deviceId,
      name: data.data.name || `Device ${data.deviceId}`,
      location: data.data.location || 'Unknown',
      ...data.data
    });
  }
  
  // Update display immediately
  updateDeviceDisplay();
  
  // Show notification for alerts
  if (data.data.hasAlert) {
    showToast(`Alert: ${data.data.alertMessage || 'Device alert'}`, 'warning');
  }
  
  // Add to recent logs
  const newLog = {
    device_id: data.deviceId,
    timestamp: data.timestamp,
    status: data.data.hasAlert ? 'alert' : (data.data.isConnected ? 'online' : 'offline'),
    params: data.data
  };
  
  dashboardData.logs.unshift(newLog);
  if (dashboardData.logs.length > 10) {
    dashboardData.logs = dashboardData.logs.slice(0, 10);
  }
  updateLogsDisplay();
}

// Handle dashboard statistics updates
function handleDashboardStats(data) {
  console.log('Dashboard statistics update received:', data);
  
  // Update dashboard statistics
  const stats = data.data;
  dashboardData.stats = {
    totalUsers: stats.totalUsers,
    totalDevices: stats.totalDevices,
    onlineDevices: stats.onlineDevices,
    alertsCount: stats.devicesWithAlerts
  };
  
  // Update dashboard counters
  document.getElementById('total-users-count').textContent = stats.totalUsers;
  document.getElementById('active-devices-count').textContent = stats.totalDevices;
  document.getElementById('online-devices-count').textContent = stats.onlineDevices;
  document.getElementById('alerts-count').textContent = stats.devicesWithAlerts;
  
  // Add a subtle visual indicator that data was updated
  const counters = document.querySelectorAll('#total-users-count, #active-devices-count, #online-devices-count, #alerts-count');
  counters.forEach(counter => {
    counter.style.transition = 'background-color 0.3s ease';
    counter.style.backgroundColor = '#e8f5e8';
    setTimeout(() => {
      counter.style.backgroundColor = '';
    }, 300);
  });
}

// Initialize real-time updates
function initializeRealtimeUpdates() {
  // Listen for device updates
  realtimeService.on('device_update', handleDeviceUpdate);
  
  // Listen for dashboard statistics updates
  realtimeService.on('dashboard_stats', handleDashboardStats);
  
  // Show connection status
  const connectionStatus = realtimeService.getConnectionStatus();
  if (connectionStatus.isConnected) {
    showToast('Real-time updates connected', 'success');
  } else {
    showToast('Connecting to real-time updates...', 'info');
  }
}

// Main dashboard loader with real-time updates
export function loadDashboard() {
  // Initial load
  loadTotalUsers();
  loadDevices();
  loadLogs();

  // Initialize real-time updates
  initializeRealtimeUpdates();

  // Fallback polling every 30 seconds (much less frequent since we have real-time)
  setInterval(() => {
    // Only poll if WebSocket is not connected
    if (!realtimeService.getConnectionStatus().isConnected) {
    loadTotalUsers();
    loadDevices();
    loadLogs();
    }
  }, 30000); // 30 seconds
}

// Cleanup function
export function cleanupDashboard() {
  realtimeService.off('device_update', handleDeviceUpdate);
  realtimeService.off('dashboard_stats', handleDashboardStats);
}

// Call this on dashboard load
window.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupDashboard();
});