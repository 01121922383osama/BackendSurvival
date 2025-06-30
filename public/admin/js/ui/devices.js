import { showToast } from '../utils/toast.js';
import realtimeService from '../services/realtime-service.js';

function getToken() {
  return localStorage.getItem('token');
}

// Store current devices data
let devicesData = [];

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
        <div class="ms-2">
          <span class="badge bg-success" id="realtime-status">
            <i class="fas fa-wifi"></i> Real-time
          </span>
        </div>
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
    devicesData = data.devices || [];
    updateDevicesDisplay();

  } catch (error) {
    console.error('Error loading online devices:', error);
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
    if (emptyIndicator) emptyIndicator.classList.remove('d-none');
    showToast('Error', 'Failed to load online devices', 'danger');
  }
}

// Update devices display with current data
function updateDevicesDisplay() {
  const loadingIndicator = document.getElementById('devices-loading-section');
  const emptyIndicator = document.getElementById('devices-empty-section');
  const devicesList = document.getElementById('devices-list');

  if (loadingIndicator) loadingIndicator.classList.add('d-none');

  if (devicesData.length === 0) {
    if (emptyIndicator) emptyIndicator.classList.remove('d-none');
    if (devicesList) devicesList.innerHTML = '';
    return;
  }

  if (emptyIndicator) emptyIndicator.classList.add('d-none');
  if (devicesList) devicesList.innerHTML = '';

  // Render device cards
  devicesData.forEach(device => {
    const deviceCard = createDeviceCard(device);
    if (devicesList) devicesList.appendChild(deviceCard);
  });
}

function createDeviceCard(device) {
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-4';
  card.setAttribute('data-device-id', device.serial_number);

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

// Handle real-time device updates
function handleDeviceUpdate(data) {
  console.log('Real-time device update received in devices page:', data);

  const deviceIndex = devicesData.findIndex(d => d.serial_number === data.deviceId);

  if (deviceIndex !== -1) {
    // Update existing device
    devicesData[deviceIndex] = { ...devicesData[deviceIndex], ...data.data };
  } else {
    // Add new device if it's online
    if (data.data.isConnected) {
      devicesData.push({
        serial_number: data.deviceId,
        name: data.data.name || `Device ${data.deviceId}`,
        location: data.data.location || 'Unknown',
        ...data.data
      });
    }
  }

  // Update display
  updateDevicesDisplay();

  // Show notification for alerts
  if (data.data.hasAlert) {
    showToast(`Alert: ${data.data.alertMessage || 'Device alert'}`, 'warning');
  }
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

// Update real-time status indicator
function updateRealtimeStatus() {
  const statusBadge = document.getElementById('realtime-status');
  if (!statusBadge) return;

  const connectionStatus = realtimeService.getConnectionStatus();

  if (connectionStatus.isConnected) {
    statusBadge.className = 'badge bg-success';
    statusBadge.innerHTML = '<i class="fas fa-wifi"></i> Real-time';
  } else {
    statusBadge.className = 'badge bg-warning';
    statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connecting...';
  }
}

// Initialize real-time updates
function initializeRealtimeUpdates() {
  // Listen for device updates
  realtimeService.on('device_update', handleDeviceUpdate);

  // Update status indicator
  updateRealtimeStatus();

  // Update status every 5 seconds
  setInterval(updateRealtimeStatus, 5000);
}

// Helper to create and show the device details modal
function showDeviceDetailsModal(device) {
  // Remove any existing modal
  let modalDiv = document.getElementById('deviceDetailsModal');
  if (modalDiv) modalDiv.remove();

  // Build modal HTML
  modalDiv = document.createElement('div');
  modalDiv.className = 'modal fade';
  modalDiv.id = 'deviceDetailsModal';
  modalDiv.tabIndex = -1;
  modalDiv.setAttribute('aria-labelledby', 'deviceDetailsModalLabel');
  modalDiv.setAttribute('aria-hidden', 'true');
  modalDiv.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="deviceDetailsModalLabel">Device Details: ${device.name || device.serial_number}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <dl class="row">
            <dt class="col-sm-4">Device ID</dt>
            <dd class="col-sm-8">${device.serial_number}</dd>
            <dt class="col-sm-4">Name</dt>
            <dd class="col-sm-8">${device.name || '-'}</dd>
            <dt class="col-sm-4">Location</dt>
            <dd class="col-sm-8">${device.location || '-'}</dd>
            <dt class="col-sm-4">Status</dt>
            <dd class="col-sm-8">${device.has_alert ? 'Alert' : 'Online'}</dd>
            <dt class="col-sm-4">Last Updated</dt>
            <dd class="col-sm-8">${device.last_updated ? new Date(device.last_updated).toLocaleString() : '-'}</dd>
            <dt class="col-sm-4">Owner Name</dt>
            <dd class="col-sm-8">${device.owner_name || '-'}</dd>
            <dt class="col-sm-4">Owner Contact</dt>
            <dd class="col-sm-8">${device.owner_contact || '-'}</dd>
            <dt class="col-sm-4">Type</dt>
            <dd class="col-sm-8">${device.type || '-'}</dd>
            <dt class="col-sm-4">Firmware</dt>
            <dd class="col-sm-8">${device.firmware || '-'}</dd>
            <dt class="col-sm-4">Metadata</dt>
            <dd class="col-sm-8"><pre style="white-space:pre-wrap;">${device.metadata ? JSON.stringify(device.metadata, null, 2) : '-'}</pre></dd>
          </dl>
          ${device.alert_message ? `<div class='alert alert-warning'><i class='fas fa-exclamation-triangle me-1'></i> ${device.alert_message}</div>` : ''}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);
  // Show modal using Bootstrap
  const modal = new bootstrap.Modal(modalDiv);
  modal.show();
}

// Update the global function to show details modal
window.viewDeviceDetails = function (serialNumber) {
  const device = devicesData.find(d => d.serial_number === serialNumber);
  if (!device) {
    showToast('Error', 'Device not found', 'danger');
    return;
  }
  showDeviceDetailsModal(device);
};

// Helper to create and show the device logs modal
function showDeviceLogsModal(serialNumber) {
  // Remove any existing modal
  let modalDiv = document.getElementById('deviceLogsModal');
  if (modalDiv) modalDiv.remove();

  modalDiv = document.createElement('div');
  modalDiv.className = 'modal fade';
  modalDiv.id = 'deviceLogsModal';
  modalDiv.tabIndex = -1;
  modalDiv.setAttribute('aria-labelledby', 'deviceLogsModalLabel');
  modalDiv.setAttribute('aria-hidden', 'true');
  modalDiv.innerHTML = `
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="deviceLogsModalLabel">Logs for Device: ${serialNumber}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="device-logs-loading" class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading logs...</p>
          </div>
          <div id="device-logs-error" class="alert alert-danger d-none"></div>
          <div id="device-logs-list" class="row"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);
  const modal = new bootstrap.Modal(modalDiv);
  modal.show();

  // Fetch and render logs
  fetchAndRenderDeviceLogs(serialNumber);
  // Set up auto-refresh every 10 seconds
  let interval = setInterval(() => fetchAndRenderDeviceLogs(serialNumber), 10000);
  // Clear interval when modal is closed
  modalDiv.addEventListener('hidden.bs.modal', () => clearInterval(interval));
}

async function fetchAndRenderDeviceLogs(serialNumber) {
  const loading = document.getElementById('device-logs-loading');
  const errorDiv = document.getElementById('device-logs-error');
  const logsList = document.getElementById('device-logs-list');
  if (loading) loading.classList.remove('d-none');
  if (errorDiv) errorDiv.classList.add('d-none');
  if (logsList) logsList.innerHTML = '';

  try {
    const token = getToken();
    const response = await fetch(`/logs/device/${serialNumber}?limit=50`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const logs = await response.json();
    if (loading) loading.classList.add('d-none');
    if (!logs || logs.length === 0) {
      logsList.innerHTML = '<div class="text-center text-muted">No logs found for this device.</div>';
      return;
    }
    logs.forEach(log => {
      const card = createDeviceLogCard(log);
      logsList.appendChild(card);
    });
  } catch (err) {
    if (loading) loading.classList.add('d-none');
    if (errorDiv) {
      errorDiv.textContent = 'Failed to load logs: ' + err.message;
      errorDiv.classList.remove('d-none');
    }
  }
}

// Inline getColorForParams and card rendering logic for device logs
function getColorForParams(p) {
  if (p['online']?.toString() === '?') {
    return 'secondary';
  }
  function isNoMotionNoMoveNoSomeOneNoSomeExistField(key) {
    const v = p[key]?.toString();
    if (v == null) return false;
    if (v === '?') return true;
    const n = parseInt(v, 10);
    return !isNaN(n) && n === 0;
  }
  function isBlueField(key) {
    const v = p[key]?.toString();
    if (v == null) return false;
    if (v === '?') return true;
    const n = parseInt(v, 10);
    return !isNaN(n) && n !== 0;
  }
  function isGreenField(key) {
    const v = p[key]?.toString();
    if (v == null) return false;
    if (v === '?') return true;
    const n = parseInt(v, 10);
    return !isNaN(n) && n !== 0;
  }
  if (p['fallStatus']?.toString() === '1') {
    return 'danger';
  } else if (p['residentStatus']?.toString() === '1') {
    return 'warning';
  } else if (
    isGreenField('motionStatus') ||
    isGreenField('movementSigns') ||
    isGreenField('someoneExists')
  ) {
    return 'success';
  } else if (isBlueField('online') || isGreenField('heartBeat')) {
    return 'primary';
  } else if (isGreenField('fallStatus')) {
    return 'success';
  } else if (
    isNoMotionNoMoveNoSomeOneNoSomeExistField('motionStatus') ||
    isNoMotionNoMoveNoSomeOneNoSomeExistField('movementSigns') ||
    isNoMotionNoMoveNoSomeOneNoSomeExistField('someoneExists')
  ) {
    return 'primary';
  } else {
    return 'secondary';
  }
}

function createDeviceLogCard(log) {
  const paramsObj = log.params || {};
  const color = getColorForParams(paramsObj);
  const cardColor = `border-${color}`;
  const statusClass = `bg-${color}`;
  const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '';
  const params = Object.keys(paramsObj).length ? JSON.stringify(paramsObj, null, 2) : '{}';
  const col = document.createElement('div');
  col.className = 'col-md-6 col-lg-4 mb-4';
  col.innerHTML = `
    <div class="card h-100 shadow-sm ${cardColor}">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="badge ${statusClass}">${color.toUpperCase()}</span>
        <span class="text-muted small">${timestamp}</span>
      </div>
      <div class="card-body">
        <div class="mb-2"><strong>Device ID:</strong> <code>${log.device_id || '-'}</code></div>
        <div class="mb-2"><strong>Parameters:</strong>
          <pre class="mb-0" style="white-space:pre-wrap; font-size:0.9em;">${params}</pre>
        </div>
      </div>
    </div>
  `;
  return col;
}

// Update the global function to show logs modal
window.viewDeviceLogs = function (serialNumber) {
  showDeviceLogsModal(serialNumber);
};

export function loadDevices() {
  renderDevices();
  loadOnlineDevices();

  // Initialize real-time updates
  initializeRealtimeUpdates();

  // Fallback polling every 60 seconds (much less frequent since we have real-time)
  setInterval(() => {
    // Only poll if WebSocket is not connected
    if (!realtimeService.getConnectionStatus().isConnected) {
      loadOnlineDevices();
    }
  }, 60000);
}

// Cleanup function
export function cleanupDevices() {
  realtimeService.off('device_update', handleDeviceUpdate);
}