import { showToast } from '../utils/toast.js';

// Utility to get token
function getToken() {
  return localStorage.getItem('token');
}

// Fetch and display total users
async function loadTotalUsers() {
  const token = getToken();
  if (!token) return;
  const res = await fetch('/users', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById('total-users-count').textContent = data.users.length;
}

// Fetch and display devices as cards
async function loadDevices() {
  const token = getToken();
  if (!token) return;
  
  try {
    // Get all devices for the dashboard overview
    const res = await fetch('/devices/all', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    const devices = data.devices || data;
    const deviceStatusCards = document.getElementById('device-status-cards');
    if (!deviceStatusCards) return;

    deviceStatusCards.innerHTML = '';
    let onlineCount = 0;
    let alertCount = 0;
    
    devices.forEach(device => {
      // Check if device is online based on is_connected field
      const isOnline = device.is_connected === true;
      const hasAlert = device.has_alert === true;
      
      if (isOnline) onlineCount++;
      if (hasAlert) alertCount++;
      
      let cardColor = 'bg-secondary';
      let statusText = 'Offline';
      
      if (isOnline && hasAlert) {
        cardColor = 'bg-warning text-dark';
        statusText = 'Alert';
      } else if (isOnline) {
        cardColor = 'bg-success text-white';
        statusText = 'Online';
      } else {
        cardColor = 'bg-danger text-white';
        statusText = 'Offline';
      }
      
      const lastUpdated = device.last_updated ? new Date(device.last_updated).toLocaleString() : 'Unknown';
      
      deviceStatusCards.innerHTML += `
        <div class="col-md-4 mb-3">
          <div class="card ${cardColor}">
            <div class="card-body">
              <h5 class="card-title">
                <i class="fas fa-microchip me-2"></i>
                ${device.name || device.serial_number}
              </h5>
              <p class="card-text">
                <strong>Status:</strong> ${statusText}
              </p>
              <p class="card-text">
                <strong>Device ID:</strong> ${device.serial_number}
              </p>
              <p class="card-text">
                <strong>Location:</strong> ${device.location || 'Unknown'}
              </p>
              <p class="card-text">
                <strong>Last Updated:</strong> ${lastUpdated}
              </p>
              ${device.alert_message ? `
              <div class="alert alert-warning alert-sm mb-0">
                <i class="fas fa-exclamation-triangle me-1"></i>
                ${device.alert_message}
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    document.getElementById('active-devices-count').textContent = devices.length;
    document.getElementById('online-devices-count').textContent = onlineCount;
    document.getElementById('alerts-count').textContent = alertCount;
    
  } catch (error) {
    console.error('Error loading devices:', error);
  }
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
  const logs = data.logs || data;
  const logsSection = document.getElementById('logs-section');
  if (!logsSection) return;

  let logsHtml = '<div class="row">';
  logs.forEach(log => {
    // Debug log
    console.log('Log:', log);
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
  // Note: Alerts count is now handled in loadDevices function
}

// Main dashboard loader with polling for real-time updates
let dashboardInterval = null;
export function loadDashboard() {
  // Initial load
  loadTotalUsers();
  loadDevices();
  loadLogs();

  // Clear any previous interval
  if (dashboardInterval) clearInterval(dashboardInterval);

  // Poll every 5 seconds
  dashboardInterval = setInterval(() => {
    loadTotalUsers();
    loadDevices();
    loadLogs();
  }, 5000); // 5000 ms = 5 seconds
}

// Call this on dashboard load
window.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});