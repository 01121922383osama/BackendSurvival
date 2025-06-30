import userService from '../services/user-service.js';
import { showToast } from '../utils/toast.js';

async function renderUsers() {
  const usersSection = document.getElementById('users-section');
  if (!usersSection) return;

  usersSection.innerHTML = `
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1>Firebase Users</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" id="add-user-btn">
          <i class="fas fa-user-plus"></i> Add User
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary ms-2" id="refresh-users-btn">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Devices</th>
            <th>Device Token</th>
            <th>Avatar</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="users-table-body">
          <!-- User rows will be populated here -->
        </tbody>
      </table>
      <div id="users-loading" class="text-center py-5 w-100">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading Firebase users...</p>
      </div>
      <div id="users-empty" class="text-center py-5 w-100 d-none">
        <i class="fas fa-users fa-3x text-muted"></i>
        <p class="mt-2">No Firebase users found</p>
      </div>
    </div>
  `;

  // Add event listeners
  const addUserBtn = document.getElementById('add-user-btn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', showAddUserModal);
  }

  const refreshBtn = document.getElementById('refresh-users-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadUsersData);
  }

  await loadUsersData();
}

async function loadUsersData() {
  const usersTableBody = document.getElementById('users-table-body');
  const loadingIndicator = document.getElementById('users-loading');
  const emptyIndicator = document.getElementById('users-empty');

  try {
    loadingIndicator.classList.remove('d-none');
    const users = await userService.getAllUsers();

    if (users.length === 0) {
      emptyIndicator.classList.remove('d-none');
    } else {
      usersTableBody.innerHTML = '';
      users.forEach(user => {
        const row = createUserRow(user);
        usersTableBody.appendChild(row);
      });
    }
  } catch (error) {
    showToast('Error', 'Failed to load users.', 'danger');
    console.error('Error loading users:', error);
    emptyIndicator.classList.remove('d-none');
    emptyIndicator.innerHTML = '<p class="text-danger">Could not load users.</p>';
  } finally {
    loadingIndicator.classList.add('d-none');
  }
}

function createUserRow(user) {
  const row = document.createElement('tr');

  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
  const updatedAt = user.firestoreUpdatedAt ? new Date(user.firestoreUpdatedAt).toLocaleDateString() : 'N/A';

  // Truncate device token for display
  const deviceToken = user.deviceToken || 'N/A';
  const truncatedToken = deviceToken.length > 30 ? deviceToken.substring(0, 30) + '...' : deviceToken;

  // Avatar display
  const avatarDisplay = user.imageUrl ?
    `<img src="${user.imageUrl}" alt="Avatar" class="rounded-circle" width="32" height="32">` :
    '<i class="fas fa-user-circle fa-2x text-muted"></i>';

  // Device count display
  const deviceCount = user.deviceCount || 0;
  const deviceCountDisplay = deviceCount > 0 ?
    `<span class="badge bg-primary">${deviceCount}</span>` :
    '<span class="badge bg-secondary">0</span>';

  row.innerHTML = `
    <td>${user.email || 'N/A'}</td>
    <td>${user.name || user.displayName || 'N/A'}</td>
    <td>${deviceCountDisplay}</td>
    <td>
      <code class="text-truncate d-inline-block" style="max-width: 200px;" title="${deviceToken}">
        ${truncatedToken}
      </code>
      <button class="btn btn-sm btn-outline-secondary ms-1" onclick="copyToClipboard('${deviceToken}')" title="Copy Token">
        <i class="fas fa-copy"></i>
      </button>
    </td>
    <td>${avatarDisplay}</td>
    <td>${createdAt}</td>
    <td>${updatedAt}</td>
    <td>
      <div class="btn-group" role="group">
        <button class="btn btn-sm btn-outline-primary" onclick="viewUser('${user.uid}')" title="View Details">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-warning" onclick="editUser('${user.uid}')" title="Edit User">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-success" onclick="viewUserDevices('${user.uid}')" title="View Devices">
          <i class="fas fa-microchip"></i>
        </button>
        <button class="btn btn-sm btn-outline-info" onclick="viewDeviceToken('${user.uid}')" title="View Full Token">
          <i class="fas fa-key"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.uid}', '${user.email}')" title="Delete User">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </td>
  `;

  return row;
}

// Global functions for user actions
window.viewUser = async function (uid) {
  try {
    const user = await userService.getUser(uid);
    if (user) {
      showUserDetailsModal(user);
    }
  } catch (error) {
    showToast('Error', 'Failed to load user details', 'danger');
  }
};

window.editUser = async function (uid) {
  try {
    const user = await userService.getUser(uid);
    if (user) {
      showEditUserModal(user);
    }
  } catch (error) {
    showToast('Error', 'Failed to load user for editing', 'danger');
  }
};

window.viewUserDevices = async function (uid) {
  try {
    const user = await userService.getUser(uid);
    if (user) {
      showUserDevicesModal(user);
    }
  } catch (error) {
    showToast('Error', 'Failed to load user devices', 'danger');
  }
};

window.viewDeviceToken = async function (uid) {
  try {
    const user = await userService.getUser(uid);
    if (user && user.deviceToken) {
      showDeviceTokenModal(user);
    } else {
      showToast('Info', 'No device token found for this user', 'info');
    }
  } catch (error) {
    showToast('Error', 'Failed to load device token', 'danger');
  }
};

window.copyToClipboard = function (text) {
  if (text && text !== 'N/A') {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Success', 'Device token copied to clipboard', 'success');
    }).catch(() => {
      showToast('Error', 'Failed to copy to clipboard', 'danger');
    });
  }
};

window.deleteUser = async function (uid, email) {
  if (confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
    try {
      await userService.deleteUser(uid);
      await loadUsersData(); // Refresh the table
      showToast('Success', 'User deleted successfully', 'success');
    } catch (error) {
      showToast('Error', 'Failed to delete user', 'danger');
    }
  }
};

function showAddUserModal() {
  const modal = createModal('Add New User', `
    <form id="add-user-form" onsubmit="return false;">
      <div class="mb-3">
        <label for="user-email" class="form-label">Email *</label>
        <input type="email" class="form-control" id="user-email" required>
      </div>
      <div class="mb-3">
        <label for="user-password" class="form-label">Password *</label>
        <input type="password" class="form-control" id="user-password" minlength="6" required>
      </div>
      <div class="mb-3">
        <label for="user-name" class="form-label">Name</label>
        <input type="text" class="form-control" id="user-name">
      </div>
      <div class="mb-3">
        <label for="user-imageUrl" class="form-label">Avatar URL</label>
        <input type="url" class="form-control" id="user-imageUrl" placeholder="https://example.com/avatar.jpg">
      </div>
    </form>
  `, async () => {
    // Prevent any default form submission
    event?.preventDefault();

    const emailInput = document.getElementById('user-email');
    const passwordInput = document.getElementById('user-password');
    const nameInput = document.getElementById('user-name');
    const imageUrlInput = document.getElementById('user-imageUrl');

    if (!emailInput || !passwordInput) {
      showToast('Error', 'Form elements not found', 'danger');
      return false;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const name = nameInput ? nameInput.value.trim() : '';
    const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';

    // Debug logging
    console.log('Form values:', {
      email: `"${email}"`,
      emailLength: email.length,
      password: password ? '***' : 'empty',
      passwordLength: password.length,
      name: `"${name}"`,
      imageUrl: `"${imageUrl}"`
    });

    // Improved validation
    if (!email || email.length === 0) {
      showToast('Error', 'Email is required', 'danger');
      emailInput.focus();
      return false;
    }

    if (!password || password.length === 0) {
      showToast('Error', 'Password is required', 'danger');
      passwordInput.focus();
      return false;
    }

    if (password.length < 6) {
      showToast('Error', 'Password must be at least 6 characters long', 'danger');
      passwordInput.focus();
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Error', 'Please enter a valid email address', 'danger');
      emailInput.focus();
      return false;
    }

    try {
      const userData = {
        email,
        password,
        displayName: name || undefined,
        imageUrl: imageUrl || undefined
      };

      console.log('Creating user with data:', { ...userData, password: '***' });

      await userService.createUser(userData);
      await loadUsersData(); // Refresh the table
      showToast('Success', 'User created successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Error', error.message || 'Failed to create user', 'danger');
      return false;
    }
  });
}

function showEditUserModal(user) {
  const modal = createModal('Edit User', `
    <form id="edit-user-form">
      <div class="mb-3">
        <label for="edit-user-email" class="form-label">Email</label>
        <input type="email" class="form-control" id="edit-user-email" value="${user.email || ''}">
      </div>
      <div class="mb-3">
        <label for="edit-user-name" class="form-label">Name</label>
        <input type="text" class="form-control" id="edit-user-name" value="${user.name || user.displayName || ''}">
      </div>
      <div class="mb-3">
        <label for="edit-user-imageUrl" class="form-label">Avatar URL</label>
        <input type="url" class="form-control" id="edit-user-imageUrl" value="${user.imageUrl || ''}" placeholder="https://example.com/avatar.jpg">
      </div>
    </form>
  `, async () => {
    const email = document.getElementById('edit-user-email').value;
    const name = document.getElementById('edit-user-name').value;
    const imageUrl = document.getElementById('edit-user-imageUrl').value;

    try {
      await userService.updateUser(user.uid, {
        email: email || undefined,
        displayName: name || undefined,
        imageUrl: imageUrl || undefined
      });
      await loadUsersData(); // Refresh the table
      showToast('Success', 'User updated successfully!', 'success');
      return true;
    } catch (error) {
      showToast('Error', error.message || 'Failed to update user', 'danger');
      return false;
    }
  });
}

function showUserDetailsModal(user) {
  const modal = createModal('User Details', `
    <div class="row">
      <div class="col-md-6">
        <h6>Basic Information</h6>
        <p><strong>ID:</strong> ${user.uid || 'N/A'}</p>
        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
        <p><strong>Name:</strong> ${user.name || user.displayName || 'N/A'}</p>
        <p><strong>Avatar URL:</strong> ${user.imageUrl || 'N/A'}</p>
        <p><strong>Devices Owned:</strong> <span class="badge bg-primary">${user.deviceCount || 0}</span></p>
      </div>
      <div class="col-md-6">
        <h6>Timestamps</h6>
        <p><strong>Created:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</p>
        <p><strong>Updated:</strong> ${user.firestoreUpdatedAt ? new Date(user.firestoreUpdatedAt).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
    ${user.imageUrl ? `<div class="mt-3"><h6>Avatar</h6><img src="${user.imageUrl}" alt="Avatar" class="img-thumbnail" style="max-width: 200px;"></div>` : ''}
    ${user.deviceToken ? `
    <div class="mt-3">
      <h6>Device Token</h6>
      <div class="input-group">
        <input type="text" class="form-control" value="${user.deviceToken}" readonly>
        <button class="btn btn-outline-secondary" type="button" onclick="copyToClipboard('${user.deviceToken}')">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    ` : ''}
  `, null, 'Close');
}

function showDeviceTokenModal(user) {
  const modal = createModal('Device Token', `
    <div class="mb-3">
      <h6>Full Device Token</h6>
      <p class="text-muted">This token is used for push notifications to this user's device.</p>
      <div class="input-group">
        <textarea class="form-control" rows="4" readonly>${user.deviceToken}</textarea>
        <button class="btn btn-outline-secondary" type="button" onclick="copyToClipboard('${user.deviceToken}')">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <strong>Note:</strong> This token is automatically generated by Firebase and is used to send push notifications to the user's device.
    </div>
  `, null, 'Close');
}

function showUserDevicesModal(user) {
  const modal = createModal('User Devices', `
    <div class="mb-3">
      <h6>Devices Owned by ${user.name || user.displayName || user.email}</h6>
      <p class="text-muted">This user owns <strong>${user.deviceCount || 0}</strong> device(s).</p>
    </div>
    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <strong>Note:</strong> Device details are stored in the 'devices' collection in Firebase. 
      Each device has an 'owners' array containing user IDs.
    </div>
    <div class="mt-3">
      <p><strong>User ID:</strong> <code>${user.uid}</code></p>
      <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
      <p><strong>Device Count:</strong> <span class="badge bg-primary">${user.deviceCount || 0}</span></p>
    </div>
  `, null, 'Close');
}

function createModal(title, content, onSave, saveText = 'Save') {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">${title}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          ${onSave ? `<button type="button" class="btn btn-primary" id="modal-save-btn">${saveText}</button>` : ''}
        </div>
      </div>
    </div>
  `;

  if (onSave) {
    modal.addEventListener('shown.bs.modal', () => {
      const saveBtn = modal.querySelector('#modal-save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          // Add a small delay to ensure form elements are properly rendered
          setTimeout(async () => {
            const shouldClose = await onSave();
            if (shouldClose) {
              if (window.bootstrap && window.bootstrap.Modal) {
                const bootstrapModal = window.bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                  bootstrapModal.hide();
                }
              }
              modal.remove();
            }
          }, 100);
        });
      }
    });
  }

  modal.addEventListener('hidden.bs.modal', () => {
    modal.remove();
  });

  document.body.appendChild(modal);

  if (window.bootstrap && window.bootstrap.Modal) {
    const bootstrapModal = new window.bootstrap.Modal(modal);
    bootstrapModal.show();
  } else {
    modal.classList.add('show');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
  }

  return modal;
}

export function loadUsers() {
  renderUsers();
  console.log('Firebase Users module loaded');
}