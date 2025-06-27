// Check if user is authenticated
document.addEventListener('DOMContentLoaded', function() {
  updateAuthUI();
  checkUserRole();
  
  // Add logout event listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});

// Update UI based on authentication status
function updateAuthUI() {
  const token = localStorage.getItem('token');
  const loginNav = document.getElementById('loginNav');
  const logoutNav = document.getElementById('logoutNav');
  
  if (token) {
    // User is logged in
    if (loginNav) loginNav.classList.add('d-none');
    if (logoutNav) logoutNav.classList.remove('d-none');
  } else {
    // User is logged out
    if (loginNav) loginNav.classList.remove('d-none');
    if (logoutNav) logoutNav.classList.add('d-none');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  showAlert('Logged out successfully', 'success');
  updateAuthUI();
  
  // Redirect to home page after a short delay
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

// Show alert message
function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.appendChild(alert);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => {
      if (alertContainer.contains(alert)) {
        alertContainer.removeChild(alert);
      }
    }, 150);
  }, 5000);
}

// Function to check if user is authenticated
function isAuthenticated() {
  return !!localStorage.getItem('token');
}

// Function to get the authentication token
function getToken() {
  return localStorage.getItem('token');
}

// Function to check if user is admin
function isAdmin() {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'admin';
}

// Function to get the current user role
function getUserRole() {
  return localStorage.getItem('userRole') || 'user';
}

// Function to check user role and restrict access accordingly
function checkUserRole() {
  if (!isAuthenticated()) return;
  
  const role = getUserRole();
  const currentPath = window.location.pathname;
  
  // Pages that require admin access
  const adminPages = ['/users.html'];
  
  // If user is not admin and trying to access admin page, redirect to home
  if (role !== 'admin' && adminPages.includes(currentPath)) {
    showAlert('Access denied. Admin privileges required.', 'danger');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  }
}

// Function to handle API errors
function handleApiError(error, defaultMessage = 'An error occurred') {
  console.error('API Error:', error);
  
  if (error.status === 401) {
    // Unauthorized, redirect to login
    showAlert('Your session has expired. Please login again.', 'warning');
    setTimeout(() => {
      logout();
      window.location.href = '/login.html';
    }, 2000);
  } else {
    showAlert(error.message || defaultMessage, 'danger');
  }
}
