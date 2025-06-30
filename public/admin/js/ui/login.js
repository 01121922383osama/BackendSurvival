import { showToast } from '../utils/toast.js';
import { auth, signInWithEmailAndPassword, onAuthStateChanged } from '../firebase-config.js';

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
      // Use Firebase Auth for login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user) throw new Error('Login failed: No user');
      // Get the latest ID token
      const token = await user.getIdToken(true);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
      showToast('Success', 'Logged in successfully!', 'success');
      window.location.hash = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error);
      showToast('Error', error.message || 'Login failed. Please check your credentials.', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Login';
    }
  });

  // Listen for token refresh and keep it updated in localStorage
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  });
}

export function loadLogin() {
  renderLogin();
  console.log('Login UI loaded');
}