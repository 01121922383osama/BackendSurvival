# Self-Hosted API with Node.js and PostgreSQL

A self-hosted API built with Node.js (Express.js) and PostgreSQL that provides authentication and logging functionality.

## Features

- 🔐 **Authentication System**
  - User registration with email and password
  - Password hashing with bcrypt
  - JWT-based authentication
  - Protected routes

- 📥 **Log System**
  - Create logs with device ID, timestamp, and custom parameters
  - Store logs in PostgreSQL with JSONB support

- 📤 **Log Retrieval**
  - Retrieve logs by device ID
  - Sort by timestamp in descending order

## Tech Stack

- Node.js with Express.js
- PostgreSQL for database
- bcrypt for password hashing
- jsonwebtoken for JWT authentication
- dotenv for environment variables
- pg for PostgreSQL connection

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a PostgreSQL database:
   ```
   createdb api_db
   ```
4. Run the SQL script to create tables:
   ```
   psql -d api_db -f config/init.sql
   ```
5. Configure environment variables in `.env` file:
   ```
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=api_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   ```

## Running the API

Start the server:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

## API Endpoints

### Authentication

- **POST /signup**
  - Register a new user
  - Body: `{ "email": "user@example.com", "password": "password123" }`

- **POST /login**
  - Authenticate a user and get JWT token
  - Body: `{ "email": "user@example.com", "password": "password123" }`

### Logs

All log endpoints require JWT authentication with `Authorization: Bearer <token>` header.

- **POST /logs**
  - Create a new log
  - Body: 
    ```json
    { 
      "deviceId": "device123", 
      "timestamp": "2023-01-01T12:00:00Z", 
      "params": { 
        "fallStatus": "normal", 
        "motionStatus": "active" 
      } 
    }
    ```

- **GET /logs/:deviceId**
  - Get logs for a specific device
  - Returns the latest 1000 logs sorted by timestamp in descending order

## Performance

The API is designed to handle high log volume (10,000+ logs/day) with:
- Efficient database indexing
- Connection pooling
- Proper error handling

## Deployment

### Railway Deployment

1. Create a Railway account at [railway.app](https://railway.app/)
2. Push your code to GitHub
3. In Railway dashboard, select "Deploy from GitHub repo"
4. Connect your GitHub account and select this repository
5. After deployment, add a PostgreSQL database:
   - Click "New" in your project
   - Select "PostgreSQL"
   - Railway will automatically add the database connection variables
6. Add additional environment variables:
   - `JWT_SECRET` (generate a secure random string)
   - `NODE_ENV=production`
7. Your API will be automatically deployed and connected to the database

### Accessing API Documentation

Once deployed, you can access the Swagger API documentation at:
```
https://your-railway-url/api-docs
```

## Using the API with Flutter and Dio

This section explains how to integrate this API with a Flutter application using the Dio HTTP client package.

### 1. Setup Flutter Project

```bash
# Create a new Flutter project
flutter create my_app
cd my_app

# Add Dio and other required packages
flutter pub add dio
flutter pub add flutter_secure_storage
flutter pub add provider  # For state management
```

### 2. API Service Class

Create an API service class to handle all API requests:

```dart
// lib/services/api_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final Dio _dio = Dio();
  final FlutterSecureStorage _storage = FlutterSecureStorage();
  
  // Base URL for your Railway deployment
  final String baseUrl = 'https://backendsurvival-production.up.railway.app';
  
  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = Duration(seconds: 5);
    _dio.options.receiveTimeout = Duration(seconds: 3);
    
    // Add interceptor to include JWT token in requests
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) {
        // Handle 401 Unauthorized errors
        if (error.response?.statusCode == 401) {
          // Redirect to login or refresh token
        }
        return handler.next(error);
      }
    ));
  }
  
  // User Registration
  Future<Map<String, dynamic>> signup(String email, String password) async {
    try {
      final response = await _dio.post('/signup', 
        data: {'email': email, 'password': password});
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  // User Login
  Future<bool> login(String email, String password) async {
    try {
      final response = await _dio.post('/login', 
        data: {'email': email, 'password': password});
      
      // Save JWT token
      await _storage.write(key: 'jwt_token', value: response.data['token']);
      return true;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  // Create Log
  Future<Map<String, dynamic>> createLog(String deviceId, Map<String, dynamic> params) async {
    try {
      final response = await _dio.post('/logs', 
        data: {
          'device_id': deviceId,
          'timestamp': DateTime.now().toIso8601String(),
          'params': params
        });
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  // Get Logs by Device ID
  Future<List<dynamic>> getLogs(String deviceId) async {
    try {
      final response = await _dio.get('/logs/$deviceId');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  // Logout
  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }
  
  // Error handling
  String _handleError(DioException error) {
    if (error.response != null) {
      // Server responded with an error
      final errorData = error.response?.data;
      if (errorData is Map && errorData.containsKey('error')) {
        return errorData['error'];
      }
      return 'Server error: ${error.response?.statusCode}';
    } else if (error.type == DioExceptionType.connectionTimeout) {
      return 'Connection timeout';
    } else if (error.type == DioExceptionType.receiveTimeout) {
      return 'Receive timeout';
    } else {
      return 'Network error: ${error.message}';
    }
  }
}
```

### 3. Example Usage in Flutter

```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;
  String _errorMessage = '';

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    
    try {
      await _apiService.login(
        _emailController.text.trim(), 
        _passwordController.text
      );
      
      // Navigate to home screen on success
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 24),
            if (_errorMessage.isNotEmpty)
              Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(_errorMessage, style: TextStyle(color: Colors.red)),
              ),
            ElevatedButton(
              onPressed: _isLoading ? null : _login,
              child: _isLoading 
                ? CircularProgressIndicator(color: Colors.white)
                : Text('Login'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pushNamed('/signup'),
              child: Text('Create Account'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### 4. Creating and Retrieving Logs

```dart
// Example of creating a log
final apiService = ApiService();

// Create a log
await apiService.createLog(
  'device123',
  {
    'temperature': 22.5,
    'humidity': 45,
    'batteryLevel': 78,
    'location': {'lat': 37.7749, 'lng': -122.4194}
  }
);

// Retrieve logs for a device
final logs = await apiService.getLogs('device123');
print('Retrieved ${logs.length} logs');
```

### 5. Error Handling Best Practices

- Always wrap API calls in try-catch blocks
- Show appropriate error messages to users
- Implement retry logic for transient network failures
- Handle token expiration by redirecting to login

### 6. Performance Tips

- Use connection pooling in Dio
- Implement caching for frequently accessed data
- Consider pagination for large log datasets
- Use background isolates for processing large responses

## License

This project is open-source and free to host.
