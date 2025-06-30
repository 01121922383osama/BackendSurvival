import { loadDashboard } from './ui/dashboard.js';
import { loadDevices } from './ui/devices.js';
import { loadLogin } from './ui/login.js';
import { loadLogs, loadLogsData } from './ui/logs.js';
import { loadUsers } from './ui/users.js';
import { showToast } from './utils/toast.js';

class Router {
  constructor(app) {
    this.app = app;
    this.routes = {
      '/': loadDashboard,
      '/dashboard': loadDashboard,
      '/users': loadUsers,
      '/devices': loadDevices,
      '/logs': loadLogs,
      '/login': loadLogin,
    };

    window.addEventListener('hashchange', () => this.loadRoute());
  }

  loadRoute() {
    const hash = window.location.hash.substring(1) || '/';
    const path = hash.startsWith('/') ? hash : `/${hash}`;

    // Custom route for logs-device/:deviceId
    const logsDeviceMatch = path.match(/^\/logs-device-(.+)$/);
    if (logsDeviceMatch) {
      const deviceId = logsDeviceMatch[1];
      this.setActiveSection('/logs');
      // Ensure logs UI is rendered, then load logs for the device
      loadLogs();
      setTimeout(() => loadLogsData(deviceId), 0);
      return;
    }

    const routeHandler = this.routes[path];

    if (routeHandler) {
      if (path !== '/login') {
        this.app.authReady.then(() => {
          this.setActiveSection(path);
          routeHandler();
        });
      } else {
        this.setActiveSection(path);
        routeHandler();
      }
    } else {
      showToast('Error', `Route not found: ${path}`, 'danger');
      // Optionally, redirect to a default route
      // window.location.hash = '/dashboard';
    }
  }

  setActiveSection(path) {
    const sectionId = `${path.substring(1)}-section`;

    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active-section');
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
      activeSection.classList.add('active-section');
    }
  }
}

export default Router;