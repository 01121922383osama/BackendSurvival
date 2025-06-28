import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { auth } from '../firebase-config.js';
import { showToast } from '../utils/toast.js';

function renderLogin() {
  const mainContent = document.querySelector('main');
  if (!mainContent) return;

  // Create a login section if it doesn't exist
  let loginSection = document.getElementById('login-section');
  if (!loginSection) {
    loginSection = document.createElement('section');
    loginSection.id = 'login-section';
    loginSection.className = 'section';
    mainContent.appendChild(loginSection);
  }

  loginSection.innerHTML = `
    <div class="container">
      <div class="row justify-content-center align-items-center vh-100">
        <div class="col-md-6 col-lg-4">
          <div class="card shadow-lg">
            <div class="card-body p-5">
              <h3 class="card-title text-center mb-4">Admin Login</h3>
              <form id="login-form">
                <div class="mb-3">
                  <label for="login-email" class="form-label">Email address</label>
                  <input type="email" class="form-control" id="login-email" required>
                </div>
                <div class="mb-3">
                  <label for="login-password" class="form-label">Password</label>
                  <input type="password" class="form-control" id="login-password" required>
                </div>
                <div class="d-grid">
                  <button type="submit" class="btn btn-primary" id="login-submit-btn">Login</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in app.js will handle the rest
      showToast('Success', 'Logged in successfully!', 'success');
    } catch (error) {
      console.error('Login failed:', error);
      showToast('Error', 'Login failed. Please check your credentials.', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Login';
    }
  });
}

export function loadLogin() {
  renderLogin();
  console.log('Login UI loaded');
}