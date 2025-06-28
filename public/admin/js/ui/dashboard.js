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
  const res = await fetch('/devices', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) return;
  const data = await res.json();
  const devices = data.devices || data;
  const deviceStatusCards = document.getElementById('device-status-cards');
  if (!deviceStatusCards) return;

  deviceStatusCards.innerHTML = '';
  let onlineCount = 0;
  devices.forEach(device => {
    // Debug log
    console.log('Device:', device);
    let status = (device.status || 'offline').toString().trim().toLowerCase();
    let cardColor = 'bg-secondary';
    if (status === 'online') {
      cardColor = 'bg-success text-white';
      onlineCount++;
    } else if (status === 'offline') {
      cardColor = 'bg-danger text-white';
    } else if (status === 'alert') {
      cardColor = 'bg-warning text-dark';
    }
    deviceStatusCards.innerHTML += `
      <div class="col-md-4 mb-3">
        <div class="card ${cardColor}">
          <div class="card-body">
            <h5 class="card-title">${device.serial_number || device.id}</h5>
            <p class="card-text">Status: ${device.status || '-'}</p>
            <p class="card-text">Owner: ${device.owner_id || '-'}</p>
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById('active-devices-count').textContent = devices.length;
  document.getElementById('online-devices-count').textContent = onlineCount;
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
  document.getElementById('alerts-count').textContent = logs.filter(l => (l.status || '').toString().trim().toLowerCase() === 'alert').length;
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