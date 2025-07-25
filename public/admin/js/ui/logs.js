import { showToast } from '../utils/toast.js';

function getToken() {
  return localStorage.getItem('token');
}

function renderLogs() {
  // The HTML structure already exists, so we just need to add event listeners
  const refreshBtn = document.getElementById('refresh-logs');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLogsData();
      showToast('Info', 'Refreshing logs...', 'info');
    });
    refreshBtn.title = 'Refresh logs';
  }

  // Add device filter event listeners
  const deviceFilterMenu = document.getElementById('device-filter-menu');
  if (deviceFilterMenu) {
    deviceFilterMenu.addEventListener('click', handleDeviceFilter);
  }
}

async function loadLogsData(deviceId = null) {
  const token = getToken();
  if (!token) {
    showToast('Error', 'Authentication required', 'danger');
    return;
  }

  const loadingIndicator = document.getElementById('logs-loading-section');
  const emptyIndicator = document.getElementById('logs-empty-section');
  const logsTableBody = document.getElementById('logs-table-body');
  // Add a container for cards
  let logsCardContainer = document.getElementById('logs-card-container');
  if (!logsCardContainer) {
    logsCardContainer = document.createElement('div');
    logsCardContainer.id = 'logs-card-container';
    logsCardContainer.className = 'row';
    // Insert after the table
    const table = logsTableBody ? logsTableBody.closest('table') : null;
    if (table && table.parentElement) {
      table.parentElement.parentElement.insertBefore(logsCardContainer, table.parentElement.nextSibling);
    } else {
      document.getElementById('logs-section').appendChild(logsCardContainer);
    }
  }
  logsCardContainer.innerHTML = '';
  if (logsTableBody) logsTableBody.innerHTML = '';
  if (loadingIndicator) loadingIndicator.classList.remove('d-none');
  if (emptyIndicator) emptyIndicator.classList.add('d-none');

  try {
    let url = '/logs?limit=50';
    if (deviceId && deviceId !== 'all') {
      url = `/logs/device/${deviceId}?limit=50`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let logs = [];
    if (url.startsWith('/logs/device/')) {
      logs = await response.json();
    } else {
      const data = await response.json();
      logs = data.logs || [];
    }

    if (loadingIndicator) loadingIndicator.classList.add('d-none');

    if (logs.length === 0) {
      if (emptyIndicator) emptyIndicator.classList.remove('d-none');
      emptyIndicator.innerHTML = `
        <i class="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
        <p>No logs found for the selected device.</p>
        <small class="text-muted">Try another device or check back later.</small>
      `;
      logsCardContainer.innerHTML = '';
      return;
    }

    // Hide the table when rendering cards
    const table = logsTableBody ? logsTableBody.closest('table') : null;
    if (table) table.style.display = 'none';
    logsCardContainer.style.display = '';

    // Render logs as cards
    logs.forEach((log, idx) => {
      const card = createLogCard(log);
      logsCardContainer.appendChild(card);
    });

    showToast('Success', `Loaded ${logs.length} log(s)`, 'success');

  } catch (error) {
    console.error('Error loading logs:', error);
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
    if (emptyIndicator) emptyIndicator.classList.remove('d-none');
    emptyIndicator.innerHTML = `
      <i class="fas fa-exclamation-triangle fa-4x text-danger mb-3"></i>
      <p>Failed to load logs.</p>
      <small class="text-muted">Please try again later.</small>
    `;
    logsCardContainer.innerHTML = '';
    showToast('Error', 'Failed to load logs', 'danger');
  }
}

// Dart-to-JS color logic for log.params
function getColorForParams(p) {
  if (p['online']?.toString() === '?') {
    return 'secondary'; // grey
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
    return 'danger'; // red
  } else if (p['residentStatus']?.toString() === '1') {
    return 'warning'; // yellow
  } else if (
    isGreenField('motionStatus') ||
    isGreenField('movementSigns') ||
    isGreenField('someoneExists')
  ) {
    return 'success'; // green
  } else if (isBlueField('online') || isGreenField('heartBeat')) {
    return 'primary'; // blue
  } else if (isGreenField('fallStatus')) {
    return 'success'; // green
  } else if (
    isNoMotionNoMoveNoSomeOneNoSomeExistField('motionStatus') ||
    isNoMotionNoMoveNoSomeOneNoSomeExistField('movementSigns') ||
    isNoMotionNoMoveNoSomeOneNoSomeExistField('someoneExists')
  ) {
    return 'primary'; // blue
  } else {
    return 'secondary'; // grey
  }
}

function createLogCard(log) {
  // Use params (payload) for color logic
  const paramsObj = log.params || {};
  const color = getColorForParams(paramsObj); // 'success', 'danger', etc.
  const colorMap = {
    danger: '#dc3545', // red
    warning: '#ffc107', // yellow
    success: '#198754', // green
    primary: '#0d6efd', // blue
    secondary: '#6c757d', // grey
  };
  const statusBadge =
    color === 'danger'
      ? '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle me-1"></i>Alert</span>'
      : color === 'warning'
        ? '<span class="badge bg-warning text-dark">Warning</span>'
        : color === 'success'
          ? '<span class="badge bg-success">Online</span>'
          : color === 'primary'
            ? '<span class="badge bg-primary">Info</span>'
            : '<span class="badge bg-secondary">Unknown</span>';
  const statusCircle = `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${colorMap[color] || colorMap.secondary};margin-right:8px;vertical-align:middle;"></span>`;
  const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '';
  const params = Object.keys(paramsObj).length ? JSON.stringify(paramsObj, null, 2) : '{}';

  const col = document.createElement('div');
  col.className = 'col-xl-4 col-lg-6 col-md-12 mb-4';

  col.innerHTML = `
    <div class="card shadow-sm border-0 h-100 bg-white" style="border-radius: 1rem; transition: box-shadow 0.2s;">
      <div class="card-body">
        <div class="d-flex align-items-center mb-3">
          <div class="me-3">
            <i class="fas fa-microchip fa-2x text-primary"></i>
          </div>
          <div class="flex-grow-1">
            <h5 class="card-title mb-0 fw-bold">Device: ${log.device_id || '-'}</h5>
            <div class="d-flex align-items-center mt-1">
              ${statusCircle}
              ${statusBadge}
            </div>
          </div>
        </div>
        <ul class="list-unstyled mb-3">
          <li><strong>Time:</strong> ${timestamp}</li>
        </ul>
        <div class="mb-2"><strong>Parameters:</strong>
          <pre class="mb-0 bg-light p-2 rounded" style="white-space:pre-wrap; font-size:0.9em;">${params}</pre>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-sm btn-outline-info" onclick="viewLogDetails('${log.id}')" title="View Details" data-bs-toggle="tooltip" data-bs-placement="top">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="viewLogParams('${log.id}')" title="View Parameters" data-bs-toggle="tooltip" data-bs-placement="top">
            <i class="fas fa-code"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  // Enable Bootstrap tooltips
  setTimeout(() => {
    const tooltipTriggerList = [].slice.call(col.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }, 0);

  return col;
}

function handleDeviceFilter(event) {
  event.preventDefault();
  const deviceId = event.target.getAttribute('data-device-id');

  // Update active filter
  const dropdownButton = document.getElementById('device-filter-dropdown');
  if (dropdownButton) {
    dropdownButton.textContent = event.target.textContent;
  }

  // Update active class
  document.querySelectorAll('#device-filter-menu .dropdown-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.classList.add('active');

  // Load logs for selected device
  loadLogsData(deviceId);
}

async function loadDeviceFilter() {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch('/devices/all', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) return;

    const data = await response.json();
    const devices = data.devices || [];

    const deviceFilterMenu = document.getElementById('device-filter-menu');
    if (!deviceFilterMenu) return;

    // Clear existing device options (keep "All Devices")
    const allDevicesOption = deviceFilterMenu.querySelector('[data-device-id="all"]');
    deviceFilterMenu.innerHTML = '';
    if (allDevicesOption) {
      deviceFilterMenu.appendChild(allDevicesOption);
    }

    // Add device options
    devices.forEach(device => {
      const li = document.createElement('li');
      li.innerHTML = `
        <a class="dropdown-item" href="#" data-device-id="${device.serial_number}">
          ${device.name || device.serial_number}
        </a>
      `;
      deviceFilterMenu.appendChild(li);
    });

  } catch (error) {
    console.error('Error loading device filter:', error);
  }
}

// Global functions for log actions
window.viewLogDetails = function (logId) {
  showToast('Info', `Viewing details for log: ${logId}`, 'info');
  // TODO: Implement log details modal
};

window.viewLogParams = function (logId) {
  showToast('Info', `Viewing parameters for log: ${logId}`, 'info');
  // TODO: Implement log parameters modal
};

export function loadLogs() {
  renderLogs();
  loadLogsData();
  loadDeviceFilter();
  // Set up auto-refresh every 30 seconds
  setInterval(() => {
    loadLogsData();
  }, 30000);
}

export { loadLogsData };