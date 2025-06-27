// Navigation JavaScript
document.addEventListener('DOMContentLoaded', function() {
  updateNavigation();
});

// Function to update navigation based on authentication and role
function updateNavigation() {
  const isUserLoggedIn = isAuthenticated();
  const userRole = getUserRole();
  
  // Get navigation elements
  const loginNav = document.getElementById('loginNav');
  const logoutNav = document.getElementById('logoutNav');
  const usersNavItem = document.getElementById('usersNavItem');
  
  // Update authentication links
  if (isUserLoggedIn) {
    loginNav.classList.add('d-none');
    logoutNav.classList.remove('d-none');
  } else {
    loginNav.classList.remove('d-none');
    logoutNav.classList.add('d-none');
  }
  
  // Show/hide admin-only navigation items
  if (usersNavItem) {
    if (userRole === 'admin') {
      usersNavItem.classList.remove('d-none');
    } else {
      usersNavItem.classList.add('d-none');
    }
  }
  
  // Update user info in navbar if available
  const userInfoElement = document.getElementById('userInfo');
  if (userInfoElement && isUserLoggedIn) {
    const userEmail = localStorage.getItem('userEmail');
    const roleBadgeClass = userRole === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
    
    userInfoElement.innerHTML = `
      ${userEmail} <span class="${roleBadgeClass}">${userRole}</span>
    `;
    userInfoElement.classList.remove('d-none');
  }
}
