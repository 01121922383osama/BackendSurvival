import userService from '../services/user-service.js';
import { showToast } from '../utils/toast.js';

async function renderUsers() {
  const usersSection = document.getElementById('users-section');
  if (!usersSection) return;

  usersSection.innerHTML = `
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1>Users</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" id="add-user-btn">
          <i class="fas fa-user-plus"></i> Add User
        </button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Created</th>
            <th>Role</th>
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
        <p class="mt-2">Loading users...</p>
      </div>
      <div id="users-empty" class="text-center py-5 w-100 d-none">
        <i class="fas fa-users fa-3x text-muted"></i>
        <p class="mt-2">No users found</p>
      </div>
    </div>
  `;

  const usersTableBody = document.getElementById('users-table-body');
  const loadingIndicator = document.getElementById('users-loading');
  const emptyIndicator = document.getElementById('users-empty');

  try {
    loadingIndicator.classList.remove('d-none');
    const users = await userService.getAllUsers();

    if (users.length === 0) {
      emptyIndicator.classList.remove('d-none');
    } else {
      users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.email}</td>
          <td>${user.name || 'N/A'}</td>
          <td>${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
          <td>${user.isAdmin ? '<span class="badge bg-success">Admin</span>' : '<span class="badge bg-secondary">User</span>'}</td>
          <td>
            <button class="btn btn-sm btn-primary">View</button>
            <button class="btn btn-sm btn-warning">Edit</button>
            <button class="btn btn-sm btn-danger">Delete</button>
          </td>
        `;
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

export function loadUsers() {
  renderUsers();
  console.log('Users module loaded');
}