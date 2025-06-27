document.addEventListener('DOMContentLoaded', function () {
  // Check authentication
  if (!isAuthenticated()) {
    showAlert('Please login to access this page', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
    return;
  }

  // Initialize variables
  let currentPage = 0;
  let pageSize = 100;
  let currentDeviceId = '';
  let hasMoreLogs = false;

  // Initialize modals
  const createLogModal = new bootstrap.Modal(document.getElementById('createLogModal'));
  const editLogModal = new bootstrap.Modal(document.getElementById('editLogModal'));
  const deleteLogModal = new bootstrap.Modal(document.getElementById('deleteLogModal'));
  const filterModal = new bootstrap.Modal(document.getElementById('filterModal'));

  // Add event listeners
  document.getElementById('saveLogBtn').addEventListener('click', createLog);
  document.getElementById('updateLogBtn').addEventListener('click', updateLog);
  document.getElementById('confirmDeleteLogBtn').addEventListener('click', deleteLog);
  document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
  document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);
  document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

  // Set default timestamp to now for the create form
  document.getElementById('timestamp').value = new Date().toISOString().slice(0, 16);

  // Load logs
  loadLogs();

  // Function to load logs with pagination and filtering
  async function loadLogs(page = 1, limit = 100, deviceId = null) {
    console.log('Loading logs with page:', page, 'limit:', limit, 'deviceId:', deviceId);
    try {
      // Get the token
      const token = getToken();
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build the URL based on user role
      let url;
      const userRole = getUserRole();
      const userId = localStorage.getItem('userId');

      console.log('User role:', userRole);

      if (userRole === 'admin') {
        // Admin can see all logs
        if (deviceId) {
          url = `/logs/${deviceId}`;
        } else {
          url = `/logs?limit=${limit}&offset=${offset}`;
        }
      } else {
        // Regular users can only see their own logs
        // For this implementation, we'll assume device IDs include user ID
        // In a real app, you'd have a proper relationship between users and devices
        if (deviceId) {
          url = `/logs/${deviceId}`;
        } else {
          // Filter logs by user ID (assuming a naming convention like user_123_device)
          url = `/logs?limit=${limit}&offset=${offset}&userId=${userId}`;
        }
      }

      console.log('Fetching logs from URL:', url);

      // Fetch logs
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Logs data received:', data);

      // Update the logs table
      updateLogsTable(data, deviceId);

      // Update pagination if not filtering by device ID
      if (!deviceId && data.pagination) {
        updatePagination(data.pagination, page);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      showAlert('Failed to load logs', 'danger');
    }
  }

  // Function to update the logs table
  function updateLogsTable(data, deviceId) {
    console.log('Updating logs table with data:', data);
    const tableBody = document.getElementById('logsTableBody');
    tableBody.innerHTML = '';

    let logs;
    if (deviceId) {
      logs = data; // When filtering by device ID, data is an array
    } else if (data.logs) {
      logs = data.logs; // When using pagination, data has a logs property
    } else if (Array.isArray(data)) {
      logs = data; // Data is already an array
    } else {
      logs = []; // Default to empty array if no valid data format
      console.error('Unexpected data format:', data);
    }

    console.log('Logs to display:', logs);

    if (logs.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="5" class="text-center">No logs found</td>`;
      tableBody.appendChild(row);
      return;
    }

    const isAdminUser = isAdmin();

    logs.forEach(log => {
      const row = document.createElement('tr');

      // Format the timestamp
      const timestamp = new Date(log.timestamp).toLocaleString();

      // Format the params as JSON string
      const params = JSON.stringify(log.params);

      // Only show edit/delete buttons for admins
      const actionButtons = isAdminUser ? `
        <button class="btn btn-sm btn-primary edit-log" data-id="${log.id}">Edit</button>
        <button class="btn btn-sm btn-danger delete-log" data-id="${log.id}">Delete</button>
      ` : '';

      row.innerHTML = `
        <td>${log.id}</td>
        <td>${log.device_id}</td>
        <td>${timestamp}</td>
        <td><pre class="params-pre">${params}</pre></td>
        <td>${actionButtons}</td>
      `;

      tableBody.appendChild(row);
    });

    // Add event listeners to the edit and delete buttons if user is admin
    if (isAdminUser) {
      addLogButtonEventListeners();
    }

    // Hide the create log button for non-admin users
    const createLogBtn = document.getElementById('createLogBtn');
    if (createLogBtn) {
      createLogBtn.style.display = isAdminUser ? 'block' : 'none';
    }
  }

  // Function to add event listeners to the edit and delete buttons
  function addLogButtonEventListeners() {
    const editLogButtons = document.querySelectorAll('.edit-log');
    const deleteLogButtons = document.querySelectorAll('.delete-log');

    editLogButtons.forEach(button => {
      button.addEventListener('click', () => {
        const logId = button.getAttribute('data-id');
        editLogItem(logId);
      });
    });

    deleteLogButtons.forEach(button => {
      button.addEventListener('click', () => {
        const logId = button.getAttribute('data-id');
        deleteLogItem(logId);
      });
    });
  }

  // Function to display logs in the table
  function displayLogs(logs) {
    const tableBody = document.getElementById('logsTableBody');

    if (logs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No logs found</td></tr>';
      document.getElementById('logsCount').textContent = '0';
      return;
    }

    document.getElementById('logsCount').textContent = logs.length.toString();

    tableBody.innerHTML = '';
    logs.forEach(log => {
      const row = document.createElement('tr');

      // Format the parameters as a string
      let paramsDisplay;
      try {
        if (typeof log.params === 'string') {
          paramsDisplay = JSON.stringify(JSON.parse(log.params), null, 2);
        } else {
          paramsDisplay = JSON.stringify(log.params, null, 2);
        }

        if (paramsDisplay.length > 100) {
          paramsDisplay = paramsDisplay.substring(0, 100) + '...';
        }
      } catch (e) {
        paramsDisplay = String(log.params);
      }

      row.innerHTML = `
        <td>${log.id}</td>
        <td>${log.device_id}</td>
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td><pre class="mb-0" style="max-height: 100px; overflow-y: auto;">${paramsDisplay}</pre></td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="editLogItem(${log.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteLogItem(${log.id}, '${log.device_id}')">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Function to update pagination controls
  function updatePagination(total, page) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    prevBtn.disabled = page === 1;
    nextBtn.disabled = page * pageSize >= total;

    document.getElementById('logsCount').textContent = total.toString();
  }

  // Function to change page
  function changePage(direction) {
    currentPage += direction;
    if (currentPage < 0) currentPage = 0;
    loadLogs();
  }

  // Function to create a new log
  async function createLog() {
    try {
      const deviceId = document.getElementById('deviceId').value;
      const timestampLocal = document.getElementById('timestamp').value;
      const paramsText = document.getElementById('params').value;

      if (!deviceId || !timestampLocal || !paramsText) {
        showAlert('All fields are required', 'warning');
        return;
      }

      // Convert local datetime to ISO string
      const timestamp = new Date(timestampLocal).toISOString();

      // Parse params JSON
      let params;
      try {
        params = JSON.parse(paramsText);
      } catch (e) {
        showAlert('Parameters must be valid JSON', 'danger');
        return;
      }

      console.log('Creating log with data:', { deviceId, timestamp, params });

      const response = await fetch('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ deviceId, timestamp, params })
      });

      console.log('Create log response status:', response.status);

      const data = await response.json();
      console.log('Create log response data:', data);

      if (response.ok) {
        showAlert('Log created successfully', 'success');
        createLogModal.hide();
        document.getElementById('createLogForm').reset();
        loadLogs();
      } else {
        showAlert(data.error || 'Failed to create log', 'danger');
      }
    } catch (error) {
      console.error('Error creating log:', error);
      showAlert('An error occurred while creating the log', 'danger');
    }
  }

  // Function to prepare edit log modal
  window.editLogItem = async function (id) {
    try {
      const response = await fetch(`/logs/id/${id}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const log = await response.json();

      document.getElementById('editLogId').value = log.id;
      document.getElementById('editDeviceId').value = log.device_id;

      // Format the timestamp for datetime-local input
      const timestamp = new Date(log.timestamp);
      const formattedTimestamp = timestamp.toISOString().slice(0, 16);
      document.getElementById('editTimestamp').value = formattedTimestamp;

      // Format the params as JSON string
      let paramsText;
      if (typeof log.params === 'string') {
        paramsText = JSON.stringify(JSON.parse(log.params), null, 2);
      } else {
        paramsText = JSON.stringify(log.params, null, 2);
      }
      document.getElementById('editParams').value = paramsText;

      editLogModal.show();
    } catch (error) {
      console.error('Error loading log details:', error);
      showAlert('Failed to load log details', 'danger');
    }
  };

  // Function to update a log
  async function updateLog() {
    try {
      const id = document.getElementById('editLogId').value;
      const deviceId = document.getElementById('editDeviceId').value;
      const timestampLocal = document.getElementById('editTimestamp').value;
      const paramsText = document.getElementById('editParams').value;

      if (!deviceId || !timestampLocal || !paramsText) {
        showAlert('All fields are required', 'warning');
        return;
      }

      // Convert local datetime to ISO string
      const timestamp = new Date(timestampLocal).toISOString();

      // Parse params JSON
      let params;
      try {
        params = JSON.parse(paramsText);
      } catch (e) {
        showAlert('Parameters must be valid JSON', 'danger');
        return;
      }

      const response = await fetch(`/logs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ deviceId, timestamp, params })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Log updated successfully', 'success');
        editLogModal.hide();
        loadLogs();
      } else {
        showAlert(data.error || 'Failed to update log', 'danger');
      }
    } catch (error) {
      console.error('Error updating log:', error);
      showAlert('An error occurred while updating the log', 'danger');
    }
  }

  // Function to prepare delete log modal
  window.deleteLogItem = function (id, deviceId) {
    document.getElementById('deleteLogId').textContent = id;
    document.getElementById('deleteLogDevice').textContent = deviceId;
    deleteLogModal.show();
  };

  // Function to delete a log
  async function deleteLog() {
    try {
      const id = document.getElementById('deleteLogId').textContent;

      const response = await fetch(`/logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Log deleted successfully', 'success');
        deleteLogModal.hide();
        loadLogs();
      } else {
        showAlert(data.message || 'Failed to delete log', 'danger');
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      showAlert('An error occurred while deleting the log', 'danger');
    }
  }

  // Function to apply filter
  function applyFilter() {
    const deviceId = document.getElementById('filterDeviceId').value.trim();
    currentDeviceId = deviceId;
    currentPage = 0;
    filterModal.hide();
    loadLogs();
  }

  // Function to clear filter
  function clearFilter() {
    document.getElementById('filterDeviceId').value = '';
    currentDeviceId = '';
    currentPage = 0;
    filterModal.hide();
    loadLogs();
  }
});
