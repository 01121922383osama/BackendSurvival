// Users management JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }
  
  // Check if user is admin
  if (!isAdmin()) {
    showAlert('Access denied. Admin privileges required.', 'danger');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    return;
  }
  
  // Load users on page load
  loadUsers();
  
  // Add event listeners
  document.getElementById('createUserBtn').addEventListener('click', showCreateUserModal);
  document.getElementById('saveUserBtn').addEventListener('click', saveUser);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteUser);
  
  // Initialize form validation
  initFormValidation();
});

// Function to load users
async function loadUsers() {
  try {
    const token = getToken();
    
    const response = await fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        showAlert('Your session has expired. Please login again.', 'warning');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
        return;
      }
      if (response.status === 403) {
        showAlert('Access denied. Admin privileges required.', 'danger');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    displayUsers(data.users);
  } catch (error) {
    console.error('Error loading users:', error);
    showAlert('Failed to load users: ' + error.message, 'danger');
  }
}

// Function to display users in the table
function displayUsers(users) {
  const tableBody = document.getElementById('usersTableBody');
  tableBody.innerHTML = '';
  
  if (users.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4" class="text-center">No users found</td>';
    tableBody.appendChild(row);
    return;
  }
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    // Display role with badge
    const roleBadgeClass = user.role === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
    
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.email}</td>
      <td><span class="${roleBadgeClass}">${user.role || 'user'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}" data-email="${user.email}" data-role="${user.role || 'user'}">Edit</button>
        <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}" data-email="${user.email}">Delete</button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners to the edit and delete buttons
  addUserButtonEventListeners();
}

// Function to add event listeners to the edit and delete buttons
function addUserButtonEventListeners() {
  const editUserButtons = document.querySelectorAll('.edit-user');
  const deleteUserButtons = document.querySelectorAll('.delete-user');
  
  editUserButtons.forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.getAttribute('data-id');
      const userEmail = button.getAttribute('data-email');
      const userRole = button.getAttribute('data-role');
      showEditUserModal(userId, userEmail, userRole);
    });
  });
  
  deleteUserButtons.forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.getAttribute('data-id');
      const userEmail = button.getAttribute('data-email');
      showDeleteUserModal(userId, userEmail);
    });
  });
}

// Function to show the create user modal
function showCreateUserModal() {
  // Reset the form
  document.getElementById('userForm').reset();
  
  // Set form mode to create
  document.getElementById('userForm').setAttribute('data-mode', 'create');
  document.getElementById('userForm').removeAttribute('data-user-id');
  
  // Show password field and make it required
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('userPassword').setAttribute('required', 'required');
  
  // Show role field
  document.getElementById('roleGroup').style.display = 'block';
  
  // Update modal title and button text
  document.getElementById('userModalLabel').textContent = 'Create User';
  document.getElementById('saveUserBtn').textContent = 'Create';
  
  // Show the modal
  const userModal = new bootstrap.Modal(document.getElementById('userModal'));
  userModal.show();
}

// Function to show the edit user modal
function showEditUserModal(userId, userEmail, userRole) {
  // Reset the form
  document.getElementById('userForm').reset();
  
  // Set form mode to edit and store user ID
  document.getElementById('userForm').setAttribute('data-mode', 'edit');
  document.getElementById('userForm').setAttribute('data-user-id', userId);
  
  // Fill in the form fields
  document.getElementById('userEmail').value = userEmail;
  document.getElementById('userRole').value = userRole || 'user';
  
  // Hide password field and make it not required for edit
  document.getElementById('passwordGroup').style.display = 'none';
  document.getElementById('userPassword').removeAttribute('required');
  
  // Show role field
  document.getElementById('roleGroup').style.display = 'block';
  
  // Update modal title and button text
  document.getElementById('userModalLabel').textContent = 'Edit User';
  document.getElementById('saveUserBtn').textContent = 'Save Changes';
  
  // Show the modal
  const userModal = new bootstrap.Modal(document.getElementById('userModal'));
  userModal.show();
}

// Function to show the delete user modal
function showDeleteUserModal(userId, userEmail) {
  document.getElementById('deleteUserModal').setAttribute('data-user-id', userId);
  document.getElementById('deleteUserEmail').textContent = userEmail;
  
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
  deleteModal.show();
}

// Function to save a user (create or update)
async function saveUser() {
  try {
    const form = document.getElementById('userForm');
    const mode = form.getAttribute('data-mode');
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    
    // Validate form
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    
    const token = getToken();
    let url, method, body;
    
    if (mode === 'create') {
      url = '/api/auth/signup';
      method = 'POST';
      body = JSON.stringify({ email, password, role });
    } else if (mode === 'edit') {
      const userId = form.getAttribute('data-user-id');
      url = `/api/users/${userId}`;
      method = 'PUT';
      body = JSON.stringify({ 
        email, 
        password: password || undefined,
        role 
      });
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Close the modal
      const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
      userModal.hide();
      
      // Show success message
      showAlert(data.message || 'User saved successfully', 'success');
      
      // Reload users
      loadUsers();
    } else {
      showAlert(data.error || 'Failed to save user', 'danger');
    }
  } catch (error) {
    console.error('Error saving user:', error);
    showAlert('Failed to save user: ' + error.message, 'danger');
  }
}

// Function to confirm and delete a user
async function confirmDeleteUser() {
  try {
    const userId = document.getElementById('deleteUserModal').getAttribute('data-user-id');
    const token = getToken();
    
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    // Close the modal
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
    deleteModal.hide();
    
    if (response.ok) {
      showAlert(data.message || 'User deleted successfully', 'success');
      loadUsers();
    } else {
      showAlert(data.error || 'Failed to delete user', 'danger');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showAlert('Failed to delete user: ' + error.message, 'danger');
  }
}

// Function to initialize form validation
function initFormValidation() {
  const form = document.getElementById('userForm');
  
  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    
    if (form.checkValidity()) {
      saveUser();
    }
    
    form.classList.add('was-validated');
  });
}
