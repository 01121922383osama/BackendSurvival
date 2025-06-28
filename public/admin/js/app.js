import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { auth } from './firebase-config.js';
import Router from './router.js';
import Navigation from './ui/navigation.js';
import { showToast } from './utils/toast.js';

class App {
  constructor() {
    this.auth = auth;
    this.router = new Router(this);
    this.navigation = new Navigation(this.router);
    this.authReady = new Promise((resolve) => {
      this.resolveAuthReady = resolve;
    });
  }

  async start() {
    this.navigation.init();
    this.handleAuthentication();
  }

  handleAuthentication() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        await this.onLogin(user);
        this.resolveAuthReady();
      } else {
        this.onLogout();
      }
    });
  }

  async onLogin(user) {
    try {
      // Get a fresh token
      const token = await user.getIdToken(true);
      localStorage.setItem('token', token);
      
      // Update UI for logged in state
      document.body.classList.remove('logged-out');
      document.body.classList.add('logged-in');

      const userEmailElement = document.getElementById('user-email');
      if (userEmailElement) {
        userEmailElement.textContent = user.email;
      }

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await signOut(this.auth);
            showToast('Success', 'You have been logged out.');
          } catch (error) {
            console.error('Logout failed:', error);
            showToast('Error', 'Logout failed. Please try again.', 'danger');
          }
        });
      }

      // Load the default or current route
      this.router.loadRoute();
    } catch (error) {
      console.error('Login process failed:', error);
      showToast('Error', 'Login failed. Please try again.', 'danger');
      await signOut(this.auth);
    }
  }

  onLogout() {
    document.body.classList.remove('logged-in');
    document.body.classList.add('logged-out');
    localStorage.removeItem('token');
    window.location.hash = '#/login';
    this.router.loadRoute();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.start();
});