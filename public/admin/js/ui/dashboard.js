import { showToast } from '../utils/toast.js';

function renderDashboard() {
  const dashboardSection = document.getElementById('dashboard-section');
  if (!dashboardSection) return;

  // Initial rendering, can be expanded with data
  dashboardSection.innerHTML = `
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1>Dashboard</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" id="refresh-dashboard">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
        <span id="connection-status" class="badge bg-danger ms-2">
          <i class="fas fa-circle"></i> Disconnected
        </span>
      </div>
    </div>
    <!-- Stats Cards and other content will be loaded here -->
  `;

  const refreshButton = document.getElementById('refresh-dashboard');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      showToast('Info', 'Dashboard refreshed!');
      // Here you would typically re-fetch data
      loadDashboard();
    });
  }
}

export function loadDashboard() {
  renderDashboard();
  // Any data loading for the dashboard would go here
  console.log('Dashboard loaded');
}