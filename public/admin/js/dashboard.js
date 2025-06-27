// Import Firebase modules
import { collection, doc, getDocs, limit, orderBy, query, setDoc, startAfter } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { auth, db, onAuthStateChanged, signOut } from './firebase-config.js';

// Global variables
let currentUser = null;
let mqttClient = null;
let deviceTopicMap = {};
let allowedDeviceIds = new Set();
let userDevicesMap = {};
let deviceDataCache = {};
let currentSection = 'dashboard-section';
let logsLastDoc = null;
let logsPageSize = 20;
let currentDeviceFilter = 'all';

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const deviceStatusCards = document.getElementById('device-status-cards');
const usersTableBody = document.getElementById('users-table-body');
const devicesList = document.getElementById('devices-list');
const logsTableBody = document.getElementById('logs-table-body');
const totalUsersCount = document.getElementById('total-users-count');
const activeDevicesCount = document.getElementById('active-devices-count');
const onlineDevicesCount = document.getElementById('online-devices-count');
const alertsCount = document.getElementById('alerts-count');
const refreshDashboardBtn = document.getElementById('refresh-dashboard');
const addUserBtn = document.getElementById('add-user-btn');
const saveUserBtn = document.getElementById('save-user-btn');
const addDeviceBtn = document.getElementById('add-device-btn');
const saveDeviceBtn = document.getElementById('save-device-btn');
const deviceFilterMenu = document.getElementById('device-filter-menu');
const refreshLogsBtn = document.getElementById('refresh-logs');
const logsPagination = document.getElementById('logs-pagination');
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.querySelectorAll('.sidebar .nav-link');

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard initialized');

  // Setup navigation right away
  setupNavigation();

  // Initialize Firebase Auth
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User authenticated:', user.email);
      currentUser = user;

      // Initialize dashboard
      initializeDashboard();
    } else {
      console.log('No authenticated user, redirecting to login...');
      window.location.href = '/admin/login.html';
    }
  });

  // Initialize event listeners
  initializeEventListeners();
});

// Setup navigation - handles switching between dashboard sections
function setupNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute('data-section');
      navigateTo(targetSection);
    });
  });
}

// Navigate to section - shows/hides sections based on navigation
function navigateTo(sectionId) {
  console.log('Navigating to section:', sectionId);

  // Hide all sections
  document.querySelectorAll('.section').forEach((section) => {
    section.classList.remove('active-section');
    console.log('Removed active-section from:', section.id);
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active-section');
    console.log('Added active-section to:', sectionId);
  } else {
    console.error('Target section not found:', sectionId);
  }

  // Update active nav item
  navLinks.forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('data-section') === sectionId) {
      link.classList.add('active');
      console.log('Set active nav link for:', sectionId);
    }
  });

  // Store current section
  currentSection = sectionId;
}

// Initialize dashboard
async function initializeDashboard() {
  try {
    // Show loading indicators
    showLoading();

    // Load user data
    await loadUsers();

    // Load devices data
    await loadDevices();

    // Load device logs
    await loadDeviceLogs();

    // Connect to MQTT
    connectMqtt();

    // Hide loading indicators
    hideLoading();

    // Show notification
    showToast('Dashboard', 'Dashboard initialized successfully', 'success');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Error', 'Failed to initialize dashboard', 'danger');
  }
}
// Connect to MQTT broker
function connectMqtt() {
  try {
    // Update connection status
    setConnectionStatus('connecting');

    // MQTT broker settings - should match your backend settings
    const broker = '167.71.52.138';
    const port = 1883;
    const username = '123456';
    const password = '123456';
    const clientId = `web_dashboard_${Math.random().toString(16).slice(2, 10)}`;

    // Connect to MQTT broker
    const connectUrl = `mqtt://${broker}:${port}`;
    console.log(`Connecting to MQTT broker at ${connectUrl}`);

    const options = {
      clientId,
      clean: true,
      username,
      password,
      reconnectPeriod: 5000
    };

    mqttClient = mqtt.connect(connectUrl, options);

    // Set up event handlers
    mqttClient.on('connect', onMqttConnect);
    mqttClient.on('message', onMqttMessage);
    mqttClient.on('error', onMqttError);
    mqttClient.on('close', onMqttClose);
  } catch (error) {
    console.error('Error connecting to MQTT:', error);
    setConnectionStatus('disconnected');
    showToast('MQTT Error', 'Failed to connect to MQTT broker', 'danger');
  }
}

// MQTT connect event handler
function onMqttConnect() {
  console.log('Connected to MQTT broker');
  setConnectionStatus('connected');
  showToast('MQTT', 'Connected to MQTT broker', 'success');

  // Subscribe to device topics
  subscribeToDeviceTopics();
}

// MQTT message event handler
function onMqttMessage(topic, message) {
  try {
    console.log(`Message received on topic ${topic}`);

    // Extract device ID from topic
    // Expected format: /Radar60FL/{deviceId}/...
    const topicParts = topic.split('/');
    if (topicParts.length >= 3) {
      const deviceId = topicParts[2];

      // Check if this is an allowed device
      if (allowedDeviceIds.has(deviceId)) {
        // Parse message
        const payload = JSON.parse(message.toString());

        // Update device data cache
        deviceDataCache[deviceId] = {
          ...deviceDataCache[deviceId],
          lastUpdate: new Date(),
          ...payload.params
        };

        // Update UI
        updateDeviceCards();
        updateDeviceStatusBadges();
        updateStatistics();
      }
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
}

// MQTT error event handler
function onMqttError(error) {
  console.error('MQTT error:', error);
  setConnectionStatus('disconnected');
  showToast('MQTT Error', error.message, 'danger');
}

// MQTT close event handler
function onMqttClose() {
  console.log('Disconnected from MQTT broker');
  setConnectionStatus('disconnected');
}

// Subscribe to device topics
function subscribeToDeviceTopics() {
  if (!mqttClient) return;

  // Unsubscribe from all topics first
  mqttClient.unsubscribe('/Radar60FL/#');

  // Subscribe to all topics under /Radar60FL/
  mqttClient.subscribe('/Radar60FL/#', (error) => {
    if (error) {
      console.error('Error subscribing to topics:', error);
      showToast('MQTT Error', 'Failed to subscribe to device topics', 'danger');
    } else {
      console.log('Subscribed to device topics');
    }
  });
}

// Update connection status indicator
function setConnectionStatus(status) {
  connectionStatus.className = `badge ${status === 'connected' ? 'bg-success' : status === 'connecting' ? 'bg-warning' : 'bg-danger'} ms-2`;
  connectionStatus.innerHTML = `<i class="fas fa-circle"></i> ${status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}`;
}

// Load users from Firebase
async function loadUsers() {
  try {
    // Clear the table
    usersTableBody.innerHTML = '';

    // Show loading indicator
    document.getElementById('users-loading').classList.remove('d-none');
    document.getElementById('users-empty').classList.add('d-none');

    // Fetch users from Firestore
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    // Process users
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Update user count
    totalUsersCount.textContent = users.length;

    // Hide loading indicator
    document.getElementById('users-loading').classList.add('d-none');

    if (users.length === 0) {
      document.getElementById('users-empty').classList.remove('d-none');
      return;
    }

    // Render users table
    users.forEach((user) => {
      renderUserRow(user);

      // Fetch user devices
      loadUserDevices(user.id, user.email);
    });

    // Populate device user select in add device modal
    const deviceUserSelect = document.getElementById('device-user');
    deviceUserSelect.innerHTML = '<option value="">Select User</option>';
    users.forEach((user) => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.email || user.displayName || 'Unknown User';
      deviceUserSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Error', 'Failed to load users', 'danger');
  }
}
// Load devices for a specific user
async function loadUserDevices(userId, userEmail) {
  try {
    const devicesRef = collection(db, 'users', userId, 'devices');
    const devicesSnapshot = await getDocs(devicesRef);

    const devices = [];
    devicesSnapshot.forEach((doc) => {
      const deviceData = {
        id: doc.id,
        userId,
        userEmail,
        ...doc.data()
      };
      devices.push(deviceData);

      // Add to allowed device IDs
      allowedDeviceIds.add(doc.id);

      // Add to device-user mapping
      deviceTopicMap[doc.id] = userId;
    });

    // Store user devices
    userDevicesMap[userId] = devices;

    // Update device count
    activeDevicesCount.textContent = getAllDevices().length;

    // Update device list
    renderDevicesList();
    renderDeviceStatusCards();

    // Update device filter dropdown in logs section
    updateDeviceFilterDropdown();

    return devices;
  } catch (error) {
    console.error(`Error loading devices for user ${userId}:`, error);
    return [];
  }
}

// Get all devices across all users
function getAllDevices() {
  return Object.values(userDevicesMap).flat();
}

// Load device logs with pagination
async function loadDeviceLogs(startAfterDoc = null) {
  try {
    // Show loading indicator
    document.getElementById('logs-loading').classList.remove('d-none');
    document.getElementById('logs-empty').classList.add('d-none');

    // Clear logs table if starting from first page
    if (!startAfterDoc) {
      logsTableBody.innerHTML = '';
    }

    // Get all device IDs
    const deviceIds = Array.from(allowedDeviceIds);
    if (deviceIds.length === 0) {
      // No devices, show empty message
      document.getElementById('logs-loading').classList.add('d-none');
      document.getElementById('logs-empty').classList.remove('d-none');
      return;
    }

    // Fetch logs for all devices or filtered device
    let logEntries = [];

    // Filter by device if needed
    if (currentDeviceFilter !== 'all') {
      // Fetch logs for specific device
      const userId = deviceTopicMap[currentDeviceFilter];
      if (userId) {
        const logsRef = collection(db, 'users', userId, 'devices', currentDeviceFilter, 'logs');
        let q = query(
          logsRef,
          orderBy('timestamp', 'desc'),
          limit(logsPageSize)
        );

        if (startAfterDoc) {
          q = query(q, startAfter(startAfterDoc));
        }

        const logsSnapshot = await getDocs(q);

        if (!logsSnapshot.empty) {
          logsSnapshot.forEach((doc) => {
            logEntries.push({
              id: doc.id,
              deviceId: currentDeviceFilter,
              ...doc.data()
            });
          });

          // Store last document for pagination
          logsLastDoc = logsSnapshot.docs[logsSnapshot.docs.length - 1];
        }
      }
    } else {
      // Fetch logs for all devices (limited for performance)
      // In a real app, you might want to implement server-side aggregation
      for (const deviceId of deviceIds) {
        const userId = deviceTopicMap[deviceId];
        if (userId) {
          const logsRef = collection(db, 'users', userId, 'devices', deviceId, 'logs');
          let q = query(
            logsRef,
            orderBy('timestamp', 'desc'),
            limit(5) // Limit logs per device when showing all devices
          );

          const logsSnapshot = await getDocs(q);

          if (!logsSnapshot.empty) {
            logsSnapshot.forEach((doc) => {
              logEntries.push({
                id: doc.id,
                deviceId,
                ...doc.data()
              });
            });
          }
        }
      }

      // Sort combined logs by timestamp
      logEntries.sort((a, b) => {
        return b.timestamp.toMillis() - a.timestamp.toMillis();
      });

      // Limit total logs
      logEntries = logEntries.slice(0, logsPageSize);
    }

    // Hide loading indicator
    document.getElementById('logs-loading').classList.add('d-none');

    if (logEntries.length === 0) {
      document.getElementById('logs-empty').classList.remove('d-none');
      return;
    }

    // Render logs
    logEntries.forEach((log) => {
      renderLogEntry(log);
    });

    // Update pagination
    updateLogsPagination(logEntries.length === logsPageSize);
  } catch (error) {
    console.error('Error loading device logs:', error);
    document.getElementById('logs-loading').classList.add('d-none');
    showToast('Error', 'Failed to load device logs', 'danger');
  }
}

// Render device status cards in dashboard
function renderDeviceStatusCards() {
  // Clear the container
  deviceStatusCards.innerHTML = '';

  // Get all devices
  const devices = getAllDevices();

  if (devices.length === 0) {
    deviceStatusCards.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-microchip fa-4x text-muted mb-3"></i>
        <p>No devices found.</p>
      </div>
    `;
    return;
  }

  // Render device cards
  devices.forEach((device) => {
    const deviceData = deviceDataCache[device.id] || {};
    const isOnline = deviceData.online === "1";
    const hasFall = deviceData.fallStatus === "1";
    const hasMotion = deviceData.motionStatus === "1";
    const hasResident = deviceData.residentStatus === "1";

    let statusClass = 'status-offline';
    let statusText = 'Offline';

    if (isOnline) {
      if (hasFall) {
        statusClass = 'status-alert';
        statusText = 'Fall Alert!';
      } else if (hasResident) {
        statusClass = 'status-warning';
        statusText = 'Resident Alert';
      } else {
        statusClass = 'status-online';
        statusText = 'Online';
      }
    }

    const cardHtml = `
      <div class="col-md-6 col-xl-4">
        <div class="card device-card" data-device-id="${device.id}">
          <div class="card-header">
            <div class="status-indicator ${statusClass}"></div>
            <h5 class="card-title">${device.name || device.id}</h5>
          </div>
          <div class="card-body">
            <div class="device-info">
              <div class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}">${isOnline ? 'Online' : 'Offline'}</div>
              <div class="mt-2">
                <span class="badge ${hasFall ? 'bg-danger' : 'bg-secondary'} me-1">Fall: ${hasFall ? 'YES' : 'No'}</span>
                <span class="badge ${hasResident ? 'bg-warning' : 'bg-secondary'} me-1">Resident: ${hasResident ? 'YES' : 'No'}</span>
                <span class="badge ${hasMotion ? 'bg-info' : 'bg-secondary'}">Motion: ${hasMotion ? 'YES' : 'No'}</span>
              </div>
            </div>
            <div class="mt-3">
              <div class="last-update">
                ${deviceData.lastUpdate ? `<small class="text-muted">Last updated: ${formatDateTime(deviceData.lastUpdate)}</small>` : ''}
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-primary view-device-btn" data-device-id="${device.id}">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn btn-sm btn-secondary view-logs-btn" data-device-id="${device.id}" data-user-id="${device.userId}">
              <i class="fas fa-list"></i> Logs
            </button>
          </div>
        </div>
      </div>
    `;

    deviceStatusCards.innerHTML += cardHtml;
  });

  // Add event listeners to buttons
  addDeviceCardEventListeners();
}

// Render device list in devices section
function renderDevicesList() {
  // Clear the container
  devicesList.innerHTML = '';

  // Get all devices
  const devices = getAllDevices();

  // Hide/show appropriate elements
  document.getElementById('devices-loading').classList.add('d-none');

  if (devices.length === 0) {
    document.getElementById('devices-empty').classList.remove('d-none');
    return;
  } else {
    document.getElementById('devices-empty').classList.add('d-none');
  }

  // Render device cards
  devices.forEach((device) => {
    const deviceData = deviceDataCache[device.id] || {};
    const isOnline = deviceData.online === "1";

    const cardHtml = `
      <div class="col-md-6 col-xl-4">
        <div class="card device-card" data-device-id="${device.id}">
          <div class="card-header">
            <div class="status-indicator ${isOnline ? 'status-online' : 'status-offline'}"></div>
            <h5 class="card-title">${device.name || device.id}</h5>
          </div>
          <div class="card-body">
            <p class="card-text"><strong>ID:</strong> ${device.id}</p>
            <p class="card-text"><strong>Status:</strong> <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}">${isOnline ? 'Online' : 'Offline'}</span></p>
            <p class="card-text"><strong>Last Seen:</strong> ${deviceData.lastUpdate ? formatDateTime(deviceData.lastUpdate) : 'Never'}</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-primary view-device-btn" data-device-id="${device.id}">
              <i class="fas fa-eye"></i> View Details
            </button>
          </div>
        </div>
      </div>
    `;

    devicesList.innerHTML += cardHtml;

    row.innerHTML = `
    <td>${formatDateTime(log.timestamp.toDate())}</td>
    <td>${log.deviceId}</td>
    <td>${statusBadge}</td>
    <td>
      <button class="btn btn-sm btn-outline-info view-params-btn" data-bs-toggle="tooltip" title="View Parameters">
        <i class="fas fa-list"></i>
      </button>
    </td>
    <td>
      <button class="btn btn-sm btn-outline-secondary view-log-btn">
        <i class="fas fa-eye"></i>
      </button>
    </td>
  `;

    logsTableBody.appendChild(row);

    // Add event listener to view parameters button
    row.querySelector('.view-params-btn').addEventListener('click', () => {
      showLogParams(log);
    });

    // Add event listener to view log button
    row.querySelector('.view-log-btn').addEventListener('click', () => {
      showLogDetails(log);
    });
  },

    // Show user details modal
    function showUserDetails(user) {
      const modalTitle = document.getElementById('userDetailModalLabel');
      const modalContent = document.getElementById('user-detail-content');

      modalTitle.textContent = user.displayName || user.email || 'User Details';

      // Get user devices
      const devices = userDevicesMap[user.id] || [];

      modalContent.innerHTML = `
    <div class="user-info mb-4">
      <div class="row">
        <div class="col-md-6">
          <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p><strong>Name:</strong> ${user.displayName || 'N/A'}</p>
          <p><strong>Last Login:</strong> ${user.lastLogin ? formatDateTime(user.lastLogin.toDate()) : 'Never'}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Devices:</strong> ${devices.length}</p>
          <p><strong>Created:</strong> ${user.createdAt ? formatDateTime(user.createdAt.toDate()) : 'N/A'}</p>
        </div>
      </div>
    </div>

    <h5>User Devices</h5>
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="user-devices-table">
          ${devices.length === 0 ? '<tr><td colspan="4" class="text-center">No devices found</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;

      // Add devices to table
      if (devices.length > 0) {
        const userDevicesTable = document.getElementById('user-devices-table');
        devices.forEach((device) => {
          const deviceData = deviceDataCache[device.id] || {};
          const isOnline = deviceData.online === "1";

          const row = document.createElement('tr');
          row.innerHTML = `
        <td>${device.id}</td>
        <td>${device.name || 'N/A'}</td>
        <td>
          <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}">${isOnline ? 'Online' : 'Offline'}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary view-user-device-btn" data-device-id="${device.id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;

          userDevicesTable.appendChild(row);

          // Add event listener
          row.querySelector('.view-user-device-btn').addEventListener('click', () => {
            // Close current modal
            bootstrap.Modal.getInstance(document.getElementById('userDetailModal')).hide();

            // Show device details
            showDeviceDetails(device.id);
          });
        });
      }

      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
      modal.show();
    },
    // Show device details modal
    function showDeviceDetails(deviceId) {
      // Find device
      const device = getAllDevices().find(d => d.id === deviceId);
      if (!device) {
        showToast('Error', 'Device not found', 'danger');
        return;
      }

      const modalTitle = document.getElementById('deviceDetailModalLabel');
      const deviceInfoTab = document.getElementById('device-info');
      const deviceStatusTab = document.getElementById('device-status');
      const deviceLogsTab = document.getElementById('device-logs');

      modalTitle.textContent = device.name || device.id;

      // Device data
      const deviceData = deviceDataCache[device.id] || {};
      const isOnline = deviceData.online === "1";
      const hasFall = deviceData.fallStatus === "1";
      const hasResident = deviceData.residentStatus === "1";
      const hasMotion = deviceData.motionStatus === "1";

      // Info tab content
      deviceInfoTab.innerHTML = `
    <div class="device-info">
      <div class="row">
        <div class="col-md-6">
          <p><strong>Device ID:</strong> ${device.id}</p>
          <p><strong>Name:</strong> ${device.name || 'N/A'}</p>
          <p><strong>User:</strong> ${device.userEmail}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Status:</strong>
            <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}">${isOnline ? 'Online' : 'Offline'}</span>
          </p>
          <p><strong>Last Seen:</strong> ${deviceData.lastUpdate ? formatDateTime(deviceData.lastUpdate) : 'Never'}</p>
        </div>
      </div>
    </div>
  `;

      // Status tab content
      deviceStatusTab.innerHTML = `
    <div class="alert ${hasFall ? 'alert-danger' : hasResident ? 'alert-warning' : 'alert-info'}">
      <strong>Current Status:</strong>
      ${hasFall ? 'Fall Detected!' : hasResident ? 'Resident Alert' : isOnline ? 'Normal' : 'Offline'}
    </div>

    <div class="device-values">
      <div class="value-card ${deviceData.fallStatus === '1' ? 'highlight-animation' : ''}">
        <div class="value-title">Fall Status</div>
        <div class="value-data ${deviceData.fallStatus === '1' ? 'text-danger' : ''}">${deviceData.fallStatus === '1' ? 'DETECTED' : 'Normal'}</div>
      </div>

      <div class="value-card ${deviceData.residentStatus === '1' ? 'highlight-animation' : ''}">
        <div class="value-title">Resident Status</div>
        <div class="value-data ${deviceData.residentStatus === '1' ? 'text-warning' : ''}">${deviceData.residentStatus === '1' ? 'ALERT' : 'Normal'}</div>
      </div>

      <div class="value-card ${deviceData.motionStatus === '1' ? 'highlight-animation' : ''}">
        <div class="value-title">Motion Status</div>
        <div class="value-data ${deviceData.motionStatus === '1' ? 'text-info' : ''}">${deviceData.motionStatus === '1' ? 'Active' : 'Inactive'}</div>
      </div>

      <div class="value-card">
        <div class="value-title">Someone Exists</div>
        <div class="value-data">${deviceData.someoneExists === '1' ? 'Yes' : 'No'}</div>
      </div>

      <div class="value-card">
        <div class="value-title">Movement Signs</div>
        <div class="value-data">${deviceData.movementSigns === '1' ? 'Yes' : 'No'}</div>
      </div>

      <div class="value-card">
        <div class="value-title">Heart Beat</div>
        <div class="value-data">${deviceData.heartBeat || 'N/A'}</div>
      </div>
    </div>
  `;

      // Load device logs
      loadDeviceLogsForTab(device.id, device.userId);

      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('deviceDetailModal'));
      modal.show();
    },

    // Load device logs for device detail tab
    async function loadDeviceLogsForTab(deviceId, userId) {
      const deviceLogsTab = document.getElementById('device-logs');
      deviceLogsTab.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading logs...</p>
    </div>
  `;

      try {
        // Fetch logs for device
        const logsRef = collection(db, 'users', userId, 'devices', deviceId, 'logs');
        const q = query(
          logsRef,
          orderBy('timestamp', 'desc'),
          limit(10)
        );

        const logsSnapshot = await getDocs(q);

        if (logsSnapshot.empty) {
          deviceLogsTab.innerHTML = `
        <div class="text-center py-3">
          <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
          <p>No logs found for this device.</p>
        </div>
      `;
          return;
        }

        // Render logs
        deviceLogsTab.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Status</th>
              <th>Parameters</th>
            </tr>
          </thead>
          <tbody id="device-detail-logs-tbody"></tbody>
        </table>
      </div>
    `;

        const tbody = document.getElementById('device-detail-logs-tbody');

        logsSnapshot.forEach((doc) => {
          const log = {
            id: doc.id,
            ...doc.data()
          };

          // Get status indicators
          const hasFall = log.params?.fallStatus === "1";
          const hasResident = log.params?.residentStatus === "1";

          let statusBadge = '<span class="badge bg-secondary">Normal</span>';
          if (hasFall) {
            statusBadge = '<span class="badge bg-danger">Fall Alert</span>';
          } else if (hasResident) {
            statusBadge = '<span class="badge bg-warning">Resident Alert</span>';
          }

          const row = document.createElement('tr');
          row.innerHTML = `
        <td>${formatDateTime(log.timestamp.toDate())}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-info view-tab-params-btn">
            <i class="fas fa-list"></i>
          </button>
        </td>
      `;

          tbody.appendChild(row);

          // Add event listener
          row.querySelector('.view-tab-params-btn').addEventListener('click', () => {
            showLogParams(log);
          });
        });
      } catch (error) {
        console.error('Error loading device logs for tab:', error);
        deviceLogsTab.innerHTML = `
      <div class="alert alert-danger">
        Error loading logs: ${error.message}
      </div>
    `;
      }
    },

    // Show log parameters in a modal
    function showLogParams(log) {
      const params = log.params || {};

      // Create a formatted string of parameters
      let paramsHtml = '';
      for (const [key, value] of Object.entries(params)) {
        paramsHtml += `<tr><td>${key}</td><td>${value}</td></tr>`;
      }

      // Create the modal
      const modalHtml = `
    <div class="modal fade" id="paramsModal" tabindex="-1" aria-labelledby="paramsModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="paramsModalLabel">Log Parameters</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p><strong>Device:</strong> ${log.deviceId}</p>
            <p><strong>Timestamp:</strong> ${formatDateTime(log.timestamp.toDate())}</p>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${paramsHtml || '<tr><td colspan="2">No parameters available</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

      // Add modal to the body
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);

      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('paramsModal'));
      modal.show();

      // Remove the modal from DOM after it's hidden
      document.getElementById('paramsModal').addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modalContainer);
      });
    },

    // Show log details in a modal
    function showLogDetails(log) {
      // Create the modal HTML
      const modalHtml = `
    <div class="modal fade" id="logDetailModal" tabindex="-1" aria-labelledby="logDetailModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="logDetailModalLabel">Log Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <p><strong>Device ID:</strong> ${log.deviceId}</p>
                <p><strong>Timestamp:</strong> ${formatDateTime(log.timestamp.toDate())}</p>
              </div>
              <div class="col-md-6">
                <p><strong>Fall Status:</strong>
                  <span class="badge ${log.params?.fallStatus === '1' ? 'bg-danger' : 'bg-secondary'}">
                    ${log.params?.fallStatus === '1' ? 'DETECTED' : 'Normal'}
                  </span>
                </p>
                <p><strong>Resident Status:</strong>
                  <span class="badge ${log.params?.residentStatus === '1' ? 'bg-warning' : 'bg-secondary'}">
                    ${log.params?.residentStatus === '1' ? 'ALERT' : 'Normal'}
                  </span>
                </p>
              </div>
            </div>

            <h6 class="mt-3">All Parameters</h6>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(log.params || {}).map(([key, value]) => `
                    <tr>
                      <td>${key}</td>
                      <td>${value}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

      // Add modal to the body
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);

      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('logDetailModal'));
      modal.show();

      // Remove the modal from DOM after it's hidden
      document.getElementById('logDetailModal').addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modalContainer);
      });
    },
    // Update device status badges
    function updateDeviceStatusBadges() {
      // Update device cards
      document.querySelectorAll('.device-card').forEach((card) => {
        const deviceId = card.dataset.deviceId;
        const deviceData = deviceDataCache[deviceId] || {};
        const isOnline = deviceData.online === "1";
        const hasFall = deviceData.fallStatus === "1";
        const hasResident = deviceData.residentStatus === "1";

        // Update status indicator
        const statusIndicator = card.querySelector('.status-indicator');
        if (statusIndicator) {
          statusIndicator.className = 'status-indicator';

          if (isOnline) {
            if (hasFall) {
              statusIndicator.classList.add('status-alert');
            } else if (hasResident) {
              statusIndicator.classList.add('status-warning');
            } else {
              statusIndicator.classList.add('status-online');
            }
          } else {
            statusIndicator.classList.add('status-offline');
          }
        }

        // Update online badge
        const onlineBadge = card.querySelector('.badge');
        if (onlineBadge) {
          onlineBadge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
          onlineBadge.textContent = isOnline ? 'Online' : 'Offline';
        }

        // Update parameter badges if they exist
        const fallBadge = card.querySelector('.badge:nth-of-type(1)');
        const residentBadge = card.querySelector('.badge:nth-of-type(2)');
        const motionBadge = card.querySelector('.badge:nth-of-type(3)');

        if (fallBadge) {
          fallBadge.className = `badge ${hasFall ? 'bg-danger' : 'bg-secondary'} me-1`;
          fallBadge.textContent = `Fall: ${hasFall ? 'YES' : 'No'}`;
        }

        if (residentBadge) {
          residentBadge.className = `badge ${hasResident ? 'bg-warning' : 'bg-secondary'} me-1`;
          residentBadge.textContent = `Resident: ${hasResident ? 'YES' : 'No'}`;
        }

        if (motionBadge) {
          motionBadge.className = `badge ${deviceData.motionStatus === "1" ? 'bg-info' : 'bg-secondary'}`;
          motionBadge.textContent = `Motion: ${deviceData.motionStatus === "1" ? 'YES' : 'No'}`;
        }

        // Update last update time
        const lastUpdateEl = card.querySelector('.last-update');
        if (lastUpdateEl && deviceData.lastUpdate) {
          lastUpdateEl.innerHTML = `<small class="text-muted">Last updated: ${formatDateTime(deviceData.lastUpdate)}</small>`;
        }
      });
    },

    // Update device cards with new data
    function updateDeviceCards() {
      // Update device cards if they exist
      renderDeviceStatusCards();
    },

    // Update device filter dropdown in logs section
    function updateDeviceFilterDropdown() {
      // Clear current items, keeping the "All Devices" option
      const allDevicesItem = deviceFilterMenu.querySelector('[data-device-id="all"]');
      deviceFilterMenu.innerHTML = '';
      deviceFilterMenu.appendChild(allDevicesItem);

      // Add devices to dropdown
      const devices = getAllDevices();
      devices.forEach((device) => {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-device-id="${device.id}">${device.name || device.id}</a>`;
        deviceFilterMenu.appendChild(li);

        // Add event listener
        li.querySelector('a').addEventListener('click', (e) => {
          e.preventDefault();
          currentDeviceFilter = device.id;

          // Update dropdown button text
          document.getElementById('device-filter-dropdown').textContent = device.name || device.id;

          // Update active class
          deviceFilterMenu.querySelectorAll('a').forEach(item => item.classList.remove('active'));
          e.target.classList.add('active');

          // Reload logs
          logsLastDoc = null;
          loadDeviceLogs();
        });
      });

      // Set the current filter text
      if (currentDeviceFilter === 'all') {
        document.getElementById('device-filter-dropdown').textContent = 'All Devices';
        deviceFilterMenu.querySelector('[data-device-id="all"]').classList.add('active');
      } else {
        const currentDevice = devices.find(d => d.id === currentDeviceFilter);
        if (currentDevice) {
          document.getElementById('device-filter-dropdown').textContent = currentDevice.name || currentDevice.id;
          deviceFilterMenu.querySelector(`[data-device-id="${currentDeviceFilter}"]`).classList.add('active');
        }
      }

      // Add event listener to "All Devices" option
      deviceFilterMenu.querySelector('[data-device-id="all"]').addEventListener('click', (e) => {
        e.preventDefault();
        currentDeviceFilter = 'all';

        // Update dropdown button text
        document.getElementById('device-filter-dropdown').textContent = 'All Devices';

        // Update active class
        deviceFilterMenu.querySelectorAll('a').forEach(item => item.classList.remove('active'));
        e.target.classList.add('active');

        // Reload logs
        logsLastDoc = null;
        loadDeviceLogs();
      });
    },

    // Update logs pagination
    function updateLogsPagination(hasMore) {
      // Clear pagination
      logsPagination.innerHTML = '';

      if (!hasMore) {
        return;
      }

      // Add "Load More" button
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'btn btn-primary';
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.addEventListener('click', function () {
        loadDeviceLogs(logsLastDoc);
      });

      const li = document.createElement('li');
      li.className = 'page-item';
      li.appendChild(loadMoreBtn);

      logsPagination.appendChild(li);
    },

    // Update statistics
    function updateStatistics() {
      // Count online devices
      const onlineDevices = getAllDevices().filter(device => {
        const deviceData = deviceDataCache[device.id] || {};
        return deviceData.online === "1";
      });
      onlineDevicesCount.textContent = onlineDevices.length;

      // Count alerts (devices with fallStatus=1 or residentStatus=1)
      const alertDevices = getAllDevices().filter(device => {
        const deviceData = deviceDataCache[device.id] || {};
        return deviceData.online === "1" && (deviceData.fallStatus === "1" || deviceData.residentStatus === "1");
      });
      alertsCount.textContent = alertDevices.length;
    },

    // Update statistics placeholder
  );
}
// Initialize event listeners
function initializeEventListeners() {
  // Refresh dashboard button
  refreshDashboardBtn.addEventListener('click', () => {
    initializeDashboard();
  });

  // Add user button
  addUserBtn.addEventListener('click', () => {
    // Show add user modal
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
  });

  // Save user button
  saveUserBtn.addEventListener('click', async () => {
    // Get form data
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;

    // Validate form
    if (!name || !email || !password) {
      showToast('Error', 'Please fill all required fields', 'danger');
      return;
    }

    try {
      // Show loading
      saveUserBtn.disabled = true;
      saveUserBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

      // Call backend API to create user
      const response = await fetch('/firebase/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();

      // Reset form
      document.getElementById('add-user-form').reset();

      // Show success message
      showToast('Success', 'User created successfully', 'success');

      // Reload users
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Error', error.message, 'danger');
    } finally {
      // Reset button
      saveUserBtn.disabled = false;
      saveUserBtn.textContent = 'Add User';
    }
  });

  // Add device button
  addDeviceBtn.addEventListener('click', () => {
    // Show add device modal
    const modal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
    modal.show();
  });

  // Save device button
  saveDeviceBtn.addEventListener('click', async () => {
    // Get form data
    const deviceId = document.getElementById('device-id').value;
    const deviceName = document.getElementById('device-name').value;
    const userId = document.getElementById('device-user').value;

    // Validate form
    if (!deviceId || !deviceName || !userId) {
      showToast('Error', 'Please fill all required fields', 'danger');
      return;
    }

    try {
      // Show loading
      saveDeviceBtn.disabled = true;
      saveDeviceBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

      // Add device to Firestore
      const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
      await setDoc(deviceRef, {
        name: deviceName,
        createdAt: new Date()
      });

      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('addDeviceModal')).hide();

      // Reset form
      document.getElementById('add-device-form').reset();

      // Show success message
      showToast('Success', 'Device added successfully', 'success');

      // Add to allowed device IDs
      allowedDeviceIds.add(deviceId);

      // Add to device-user mapping
      deviceTopicMap[deviceId] = userId;

      // Subscribe to device topics
      subscribeToDeviceTopics();

      // Reload devices for the user
      loadUserDevices(userId, null);
    } catch (error) {
      console.error('Error adding device:', error);
      showToast('Error', error.message, 'danger');
    } finally {
      // Reset button
      saveDeviceBtn.disabled = false;
      saveDeviceBtn.textContent = 'Add Device';
    }
  });

  // Refresh logs button
  refreshLogsBtn.addEventListener('click', function () {
    logsLastDoc = null;
    loadDeviceLogs();
  });

  // Logout button
  logoutBtn.addEventListener('click', async function () {
    try {
      // Sign out from Firebase
      await signOut(auth);

      // Redirect to login page
      window.location.href = '/admin/login.html';
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Error', 'Failed to sign out', 'danger');
    }
  });
}

// Helper: Format date and time
function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Show loading indicators
function showLoading() {
  document.getElementById('users-loading').classList.remove('d-none');
  document.getElementById('devices-loading').classList.remove('d-none');
  document.getElementById('logs-loading').classList.remove('d-none');
}

// Hide loading indicators
function hideLoading() {
  document.getElementById('users-loading').classList.add('d-none');
  document.getElementById('devices-loading').classList.add('d-none');
  document.getElementById('logs-loading').classList.add('d-none');
}

// Show toast notification
function showToast(title, message, type = 'primary') {
  const toast = document.getElementById('notification-toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  const toastTime = document.getElementById('toast-time');

  // Set toast content
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  toastTime.textContent = new Date().toLocaleTimeString();

  // Set toast type
  toast.className = 'toast';
  toast.classList.add(`text-bg-${type}`);

  // Show toast
  const bsToast = new bootstrap.Toast(toast, {
    delay: 5000
  });
  bsToast.show();
}

// Initialize dashboard
initializeDashboard();