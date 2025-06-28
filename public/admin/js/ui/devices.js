import { showToast } from '../utils/toast.js';

function renderDevices() {
  const devicesSection = document.getElementById('devices-section');
  if (!devicesSection) return;

  devicesSection.innerHTML = `
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1>Devices</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <div class="input-group me-2">
          <input type="text" class="form-control form-control-sm" placeholder="Search devices..." id="device-search">
          <button class="btn btn-outline-secondary btn-sm" type="button">
            <i class="fas fa-search"></i>
          </button>
        </div>
        <button type="button" class="btn btn-sm btn-primary" id="add-device-btn">
          <i class="fas fa-plus"></i> Add Device
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
      <p class="mt-2">Loading devices...</p>
    </div>
    <div id="devices-empty-section" class="text-center py-5 d-none">
      <i class="fas fa-microchip fa-4x text-muted mb-3"></i>
      <p>No devices found.</p>
    </div>
  `;

  // Note: I've renamed the loading and empty indicators to avoid duplicate IDs
  // The original HTML had 'devices-loading' and 'devices-empty' in multiple sections.
  // This will be corrected in the main HTML file later.
}

export function loadDevices() {
  renderDevices();
  // Data loading for devices will be implemented here
  console.log('Devices module loaded');

  const loadingIndicator = document.getElementById('devices-loading-section');
  const emptyIndicator = document.getElementById('devices-empty-section');
  const devicesList = document.getElementById('devices-list');

  loadingIndicator.classList.remove('d-none');

  // Mock delay to simulate loading
  setTimeout(() => {
    loadingIndicator.classList.add('d-none');
    emptyIndicator.classList.remove('d-none');
    showToast('Info', 'Device loading not implemented yet.', 'info');
  }, 1000);
}