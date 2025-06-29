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

  console.log('[DEBUG] logsTableBody:', logsTableBody);

  if (loadingIndicator) loadingIndicator.classList.remove('d-none');
  if (emptyIndicator) emptyIndicator.classList.add('d-none');
  if (logsTableBody) logsTableBody.innerHTML = '';

  try {
    let url = '/logs?limit=50';
    if (deviceId && deviceId !== 'all') {
      url += `&device=${deviceId}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const logs = data.logs || [];

    console.log('[DEBUG] logs fetched:', logs);

    if (loadingIndicator) loadingIndicator.classList.add('d-none');

    if (logs.length === 0) {
      if (emptyIndicator) emptyIndicator.classList.remove('d-none');
      emptyIndicator.innerHTML = `
        <i class="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
        <p>No logs found for the selected device.</p>
        <small class="text-muted">Try another device or check back later.</small>
      `;
      return;
    }

    // Render logs
    logs.forEach((log, idx) => {
      console.log('[DEBUG] Rendering log', idx, log);
      const row = createLogRow(log);
      if (logsTableBody) {
        logsTableBody.appendChild(row);
        console.log('[DEBUG] Row appended, tbody now has', logsTableBody.children.length, 'children');
      }
    });

    // Debug: Check final state
    console.log('[DEBUG] After rendering, tbody children count:', logsTableBody ? logsTableBody.children.length : 'N/A');
    console.log('[DEBUG] Table visibility check:', logsTableBody ? getComputedStyle(logsTableBody.parentElement.parentElement).display : 'N/A');
    console.log('[DEBUG] Section visibility check:', document.getElementById('logs-section') ? getComputedStyle(document.getElementById('logs-section')).display : 'N/A');

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
    showToast('Error', 'Failed to load logs', 'danger');
  }
}

function createLogRow(log) {
  console.log('[DEBUG] createLogRow called with:', log);
  const row = document.createElement('tr');
  
  const timestamp = new Date(log.timestamp).toLocaleString();
  const status = log.status || 'unknown';
  const statusClass = getStatusClass(status);
  const params = log.params ? JSON.stringify(log.params, null, 2) : '{}';
  
  row.innerHTML = `
    <td>${timestamp}</td>
    <td><code>${log.device_id || '-'}</code></td>
    <td><span class="badge ${statusClass}">${status}</span></td>
    <td>
      <button class="btn btn-sm btn-outline-info" onclick="viewLogDetails('${log.id}')" title="View Details" data-bs-toggle="tooltip" data-bs-placement="top">
        <i class="fas fa-eye"></i>
      </button>
    </td>
    <td>
      <button class="btn btn-sm btn-outline-secondary" onclick="viewLogParams('${log.id}')" title="View Parameters" data-bs-toggle="tooltip" data-bs-placement="top">
        <i class="fas fa-code"></i>
      </button>
    </td>
  `;

  // Add hover effect
  row.style.transition = 'background 0.2s';
  row.onmouseover = () => row.style.background = '#f8f9fa';
  row.onmouseout = () => row.style.background = '';

  // Enable Bootstrap tooltips
  setTimeout(() => {
    const tooltipTriggerList = [].slice.call(row.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }, 0);

  return row;
}

function getStatusClass(status) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'online' || statusLower === 'green') return 'bg-success';
  if (statusLower === 'offline' || statusLower === 'red') return 'bg-danger';
  if (statusLower === 'alert' || statusLower === 'yellow') return 'bg-warning';
  if (statusLower === 'blue') return 'bg-info';
  return 'bg-secondary';
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
window.viewLogDetails = function(logId) {
  showToast('Info', `Viewing details for log: ${logId}`, 'info');
  // TODO: Implement log details modal
};

window.viewLogParams = function(logId) {
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