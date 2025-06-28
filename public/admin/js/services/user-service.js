import { auth } from '../firebase-config.js';
import { showToast } from '../utils/toast.js';

// Use relative URLs for same-origin requests
// This ensures that the requests are made to the same origin as the page
// which helps avoid CORS issues
const API_BASE_URL = '';

class UserService {
  async _getAuthHeaders() {
    console.log('Getting auth headers...');
    
    // Use local JWT token instead of Firebase
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/admin/login.html';
      throw new Error('User not authenticated.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Helper method to check if token might be expired
  _isTokenExpired(token) {
    if (!token) return true;

    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      // Decode the payload (middle part)
      const payload = JSON.parse(atob(parts[1]));

      // Check if token has expiration claim
      if (!payload.exp) return false;

      // Check if token is expired (with 5 minute buffer)
      const now = Math.floor(Date.now() / 1000);
      const bufferTime = 5 * 60; // 5 minutes in seconds
      return payload.exp < (now + bufferTime);
    } catch (e) {
      console.error('Error checking token expiration:', e);
      return true; // Assume expired if we can't parse it
    }
  }

  async getAllUsers() {
    try {
      console.log('Fetching all users...');
      const headers = await this._getAuthHeaders();
      console.log(`Auth headers obtained, fetching from ${API_BASE_URL}/users`);
      const response = await fetch(`${API_BASE_URL}/users`, { headers });

      if (!response.ok) {
        // Handle 401 errors specifically for token issues
        if (response.status === 401) {
          console.log('Unauthorized error - attempting token refresh and retry');
          // Force token refresh by clearing localStorage token
          localStorage.removeItem('token');
          // Try again with fresh token
          const freshHeaders = await this._getAuthHeaders();
          const retryResponse = await fetch(`${API_BASE_URL}/users`, { headers: freshHeaders });

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.json().catch(() => ({ error: 'Failed to parse error response.' }));
            throw new Error(`Failed to fetch users after token refresh: ${retryResponse.statusText} - ${retryErrorBody.error}`);
          }

          const retryData = await retryResponse.json();
          console.log('Users fetched successfully after token refresh.');
          return retryData.users;
        }

        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(`Failed to fetch users: ${response.statusText} - ${errorBody.error}`);
      }

      const data = await response.json();
      console.log('Users fetched successfully.');
      return data.users;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      showToast('Error', `Could not fetch users: ${error.message}`, 'danger');
      return [];
    }
  }

  async getUser(userId) {
    try {
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, { headers });

      if (!response.ok) {
        // Handle 401 errors specifically for token issues
        if (response.status === 401) {
          console.log('Unauthorized error - attempting token refresh and retry');
          // Force token refresh by clearing localStorage token
          localStorage.removeItem('token');
          // Try again with fresh token
          const freshHeaders = await this._getAuthHeaders();
          const retryResponse = await fetch(`${API_BASE_URL}/users/${userId}`, { headers: freshHeaders });

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.json().catch(() => ({ error: 'Failed to parse error response.' }));
            throw new Error(`Failed to fetch user after token refresh: ${retryResponse.statusText} - ${retryErrorBody.error}`);
          }

          const retryData = await retryResponse.json();
          console.log('User fetched successfully after token refresh.');
          return retryData.user;
        }

        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(`Failed to fetch user: ${response.statusText} - ${errorBody.error}`);
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      showToast('Error', `Could not fetch user: ${error.message}`, 'danger');
      return null;
    }
  }

  async createUser(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      const data = await response.json();
      showToast('Success', 'User created successfully!', 'success');
      return data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Error', error.message, 'danger');
      return null;
    }
  }

  async updateUser(userId, userData) {
    try {
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        // Handle 401 errors specifically for token issues
        if (response.status === 401) {
          console.log('Unauthorized error - attempting token refresh and retry');
          // Force token refresh by clearing localStorage token
          localStorage.removeItem('token');
          // Try again with fresh token
          const freshHeaders = await this._getAuthHeaders();
          const retryResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: freshHeaders,
            body: JSON.stringify(userData),
          });

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.json().catch(() => ({ error: 'Failed to parse error response.' }));
            throw new Error(`Failed to update user after token refresh: ${retryResponse.statusText} - ${retryErrorBody.error}`);
          }

          console.log('User updated successfully after token refresh.');
          showToast('Success', 'User updated successfully!', 'success');
          return;
        }

        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(`Failed to update user: ${response.statusText} - ${errorBody.error}`);
      }

      showToast('Success', 'User updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Error', `Could not update user: ${error.message}`, 'danger');
    }
  }

  async deleteUser(userId) {
    try {
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        // Handle 401 errors specifically for token issues
        if (response.status === 401) {
          console.log('Unauthorized error - attempting token refresh and retry');
          // Force token refresh by clearing localStorage token
          localStorage.removeItem('token');
          // Try again with fresh token
          const freshHeaders = await this._getAuthHeaders();
          const retryResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: freshHeaders,
          });

          if (!retryResponse.ok) {
            const retryErrorBody = await retryResponse.json().catch(() => ({ error: 'Failed to parse error response.' }));
            throw new Error(`Failed to delete user after token refresh: ${retryResponse.statusText} - ${retryErrorBody.error}`);
          }

          console.log('User deleted successfully after token refresh.');
          showToast('Success', 'User deleted successfully!', 'success');
          return;
        }

        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(`Failed to delete user: ${response.statusText} - ${errorBody.error}`);
      }

      showToast('Success', 'User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error', `Could not delete user: ${error.message}`, 'danger');
    }
  }
}

export default new UserService();
