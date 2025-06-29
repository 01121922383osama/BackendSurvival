import { showToast } from '../utils/toast.js';

function getToken() {
  return localStorage.getItem('token');
}

function renderDevices() {
  const devicesSection = document.getElementById('devices-section');
  if (!devicesSection) return;

  devicesSection.innerHTML = `
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1>Online Devices</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <div class="input-group me-2">
          <input type="text" class="form-control form-control-sm" placeholder="Search devices..." id="device-search">
          <button class="btn btn-outline-secondary btn-sm" type="button">
            <i class="fas fa-search"></i>
          </button>
        </div>
        <button type="button" class="btn btn-sm btn-success" id="refresh-devices-btn">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
    </div>
    <div class="row" id="devices-list">
      <!-- Device cards will be populated here -->
    </div>
    <div id="devices-loading-section" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading online devices...</p>
    </div>
    <div id="devices-empty-section" class="text-center py-5 d-none">
      <i class="fas fa-wifi fa-4x text-muted mb-3"></i>
      <p>No online devices found.</p>
      <small class="text-muted">Devices will appear here when they connect via MQTT</small>
    </div>
  `;

  // Add event listeners
  const refreshBtn = document.getElementById('refresh-devices-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadOnlineDevices);
  }

  const searchInput = document.getElementById('device-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleDeviceSearch);
  }
}

async function loadOnlineDevices() {
  const token = getToken();
  if (!token) {
    showToast('Error', 'Authentication required', 'danger');
    return;
  }

  const loadingIndicator = document.getElementById('devices-loading-section');
  const emptyIndicator = document.getElementById('devices-empty-section');
  const devicesList = document.getElementById('devices-list');

  if (loadingIndicator) loadingIndicator.classList.remove('d-none');
  if (emptyIndicator) emptyIndicator.classList.add('d-none');
  if (devicesList) devicesList.innerHTML = '';

  try {
    const response = await fetch('/devices/online', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const devices = data.devices || [];

    if (loadingIndicator) loadingIndicator.classList.add('d-none');

    if (devices.length === 0) {
      if (emptyIndicator) emptyIndicator.classList.remove('d-none');
      return;
    }

    // Render device cards
    devices.forEach(device => {
      const deviceCard = createDeviceCard(device);
      if (devicesList) devicesList.appendChild(deviceCard);
    });

    showToast('Success', `Loaded ${devices.length} online device(s)`, 'success');

  } catch (error) {
    console.error('Error loading online devices:', error);
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
    if (emptyIndicator) emptyIndicator.classList.remove('d-none');
    showToast('Error', 'Failed to load online devices', 'danger');
  }
}

function createDeviceCard(device) {
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-4';
  
  const lastUpdated = device.last_updated ? new Date(device.last_updated).toLocaleString() : 'Unknown';
  const statusClass = device.has_alert ? 'border-warning' : 'border-success';
  const statusIcon = device.has_alert ? 'fa-exclamation-triangle text-warning' : 'fa-wifi text-success';
  const statusText = device.has_alert ? 'Alert' : 'Online';

  card.innerHTML = `
    <div class="card ${statusClass} h-100 shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">
          <i class="fas fa-microchip me-2"></i>
          ${device.name || device.serial_number}
        </h6>
        <span class="badge ${device.has_alert ? 'bg-warning' : 'bg-success'}">
          <i class="fas ${statusIcon}"></i> ${statusText}
        </span>
      </div>
      <div class="card-body">
        <div class="row mb-2">
          <div class="col-6">
            <small class="text-muted">Device ID:</small>
            <div class="fw-bold">${device.serial_number}</div>
          </div>
          <div class="col-6">
            <small class="text-muted">Location:</small>
            <div class="fw-bold">${device.location || 'Unknown'}</div>
          </div>
        </div>
        <div class="row mb-2">
          <div class="col-6">
            <small class="text-muted">Last Updated:</small>
            <div class="fw-bold">${lastUpdated}</div>
          </div>
          <div class="col-6">
            <small class="text-muted">Status:</small>
            <div class="fw-bold">
              <i class="fas ${statusIcon}"></i> ${statusText}
            </div>
          </div>
        </div>
        ${device.alert_message ? `
        <div class="alert alert-warning alert-sm mb-0">
          <i class="fas fa-exclamation-triangle me-1"></i>
          ${device.alert_message}
        </div>
        ` : ''}
      </div>
      <div class="card-footer">
        <button class="btn btn-sm btn-outline-primary" onclick="viewDeviceDetails('${device.serial_number}')">
          <i class="fas fa-eye me-1"></i> View Details
        </button>
        <button class="btn btn-sm btn-outline-secondary" onclick="viewDeviceLogs('${device.serial_number}')">
          <i class="fas fa-list me-1"></i> Logs
        </button>
      </div>
    </div>
  `;

  return card;
}

function handleDeviceSearch() {
  const searchTerm = document.getElementById('device-search').value.toLowerCase();
  const deviceCards = document.querySelectorAll('#devices-list .col-md-6');
  
  deviceCards.forEach(card => {
    const deviceName = card.querySelector('.card-header h6').textContent.toLowerCase();
    const deviceId = card.querySelector('.fw-bold').textContent.toLowerCase();
    
    if (deviceName.includes(searchTerm) || deviceId.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Global functions for device actions
window.viewDeviceDetails = function(serialNumber) {
  // Navigate to device details or open modal
  showToast('Info', `Viewing details for device: ${serialNumber}`, 'info');
  // TODO: Implement device details view
};

window.viewDeviceLogs = function(serialNumber) {
  // Navigate to logs page with device filter
  window.location.hash = `/logs?device=${serialNumber}`;
};

export function loadDevices() {
  renderDevices();
  loadOnlineDevices();
  
  // Set up auto-refresh every 30 seconds
  setInterval(loadOnlineDevices, 30000);
}