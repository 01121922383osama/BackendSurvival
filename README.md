# IoT Device Management Backend

A comprehensive Node.js backend system for managing IoT devices with real-time MQTT streaming, user authentication, and database logging.

## Features

- **User Authentication**: JWT-based authentication with role-based access control (Admin/User)
- **Device Management**: CRUD operations for IoT devices with user-device relationships
- **MQTT Integration**: Real-time streaming from MQTT broker with automatic reconnection
- **Database Logging**: All device messages logged to PostgreSQL database
- **Firebase Integration**: Real-time updates stored in Firebase Firestore
- **Admin Dashboard**: Web-based admin interface for device and user management
- **API Documentation**: Swagger/OpenAPI documentation

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Devices   │    │   MQTT Broker   │    │   Backend API   │
│                 │────│                 │────│                 │
│ - Radar60FL     │    │ - 167.71.52.138 │    │ - Express.js    │
│ - Sensors       │    │ - Port 1883     │    │ - PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Firebase      │
                                              │                 │
                                              │ - Firestore     │
                                              │ - Real-time     │
                                              └─────────────────┘
```

## Device Model

The system supports devices with the following structure (matching Dart model):

```javascript
{
  serialNumber: "device123",
  name: "Living Room Sensor",
  location: "Living Room",
  isConnected: true,
  hasAlert: false,
  alertMessage: null,
  lastUpdated: "2024-01-01T12:00:00Z",
  registrationDate: "2024-01-01T00:00:00Z",
  notificationsEnabled: true,
  isFall: false,
  owners: ["user1", "user2"]
}
```

## API Endpoints

### Authentication
- `POST /signup` - Register new user
- `POST /login` - User login
- `POST /firebase-signup` - Firebase user registration
- `POST /verify-token` - Verify Firebase token
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Devices
- `GET /devices` - Get user's devices
- `GET /devices/all` - Get all devices (admin only)
- `POST /devices` - Create device (admin only)
- `GET /devices/:serialNumber` - Get device by serial number
- `PUT /devices/:serialNumber` - Update device
- `DELETE /devices/:serialNumber` - Delete device (admin only)
- `POST /devices/:serialNumber/assign` - Assign device to user (admin only)
- `DELETE /devices/:serialNumber/assign` - Remove device from user (admin only)
- `GET /devices/:serialNumber/users` - Get device users (admin only)

### Logs
- `GET /logs` - Get user's logs or all logs (admin)
- `GET /logs/all` - Get all logs (admin only)
- `GET /logs/device/:deviceId` - Get logs for specific device
- `GET /logs/id/:id` - Get log by ID
- `POST /logs` - Create log
- `PUT /logs/:id` - Update log (admin only)
- `DELETE /logs/:id` - Delete log (admin only)
- `GET /logs/count` - Get log count

### Users
- `GET /users` - Get all users (admin only)
- `GET /users/:id` - Get user by ID (admin only)
- `PUT /users/:id` - Update user (admin only)
- `DELETE /users/:id` - Delete user (admin only)

### System
- `GET /health` - Health check
- `GET /mqtt/status` - MQTT connection status
- `GET /api-docs` - API documentation

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   
   # JWT
   JWT_SECRET=your-secret-key
   
   # MQTT
   MQTT_BROKER=mqtt://167.71.52.138
   MQTT_PORT=1883
   MQTT_USERNAME=123456
   MQTT_PASSWORD=123456
   
   # Firebase (optional)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Initialize database
   npm run db:init
   
   # Run migrations
   npm run run:migrations
   
   # Create admin user
   node create-admin.js
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
npm start
```

## MQTT Configuration

The system automatically connects to the MQTT broker and subscribes to `/Radar60FL/#` topics. Device messages are processed and stored in both the database and Firebase.

### Message Format
    ```json
    { 
  "version": "1.0",
  "method": "post",
      "params": { 
    "fallStatus": "0",
    "residentStatus": "0",
    "motionStatus": "1",
    "movementSigns": "1",
    "someoneExists": "1",
    "online": "1",
    "heartBeat": "1"
      } 
    }
    ```

### Status Colors
- **Red**: Fall detected
- **Yellow**: Resident alert
- **Green**: Motion detected
- **Blue**: Online/heartbeat
- **Grey**: No activity

## User Roles

### Admin
- Full access to all devices and users
- Can create, update, and delete devices
- Can assign devices to users
- Can view all logs
- Can manage user accounts

### User
- Can only view assigned devices
- Can update device settings for assigned devices
- Can view logs for assigned devices
- Can update their own profile

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Devices Table
```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  serial_number TEXT UNIQUE NOT NULL,
  name TEXT,
  location TEXT,
  is_connected BOOLEAN DEFAULT false,
  has_alert BOOLEAN DEFAULT false,
  alert_message TEXT,
  last_updated TIMESTAMPTZ,
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  is_fall BOOLEAN DEFAULT false,
  owners JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Logs Table
```sql
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  params JSONB NOT NULL,
  topic TEXT,
  status_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User-Devices Junction Table
```sql
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);
```

## Admin Dashboard

Access the web-based admin dashboard at `http://localhost:3000/admin/` after starting the server.

Features:
- User management
- Device management
- Real-time device status
- Log viewing and filtering
- MQTT connection status

## API Documentation

Access the interactive API documentation at `http://localhost:3000/api-docs/` after starting the server.

## Deployment

### Railway Deployment
The project includes Railway configuration for easy deployment:

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm run db:init` - Initialize database
- `npm run run:migrations` - Run database migrations
- `npm run railway:setup` - Setup Railway deployment

### Testing
```bash
# Run tests
npm test
```

## Troubleshooting

### MQTT Connection Issues
1. Check MQTT broker credentials in `.env`
2. Verify network connectivity to broker
3. Check MQTT status at `/mqtt/status`

### Database Connection Issues
1. Verify DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Check database permissions

### Authentication Issues
1. Verify JWT_SECRET is set
2. Check token expiration
3. Ensure user exists in database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Flutter Integration

This backend can be easily integrated with Flutter applications using the Dio HTTP client package and following clean architecture principles.

### Setup

1. **Add dependencies to your `pubspec.yaml`**:

```yaml
dependencies:
  flutter:
    sdk: flutter
  dio: ^5.3.2            # HTTP client
  get_it: ^7.6.0         # Dependency injection
  flutter_bloc: ^8.1.3   # State management
  equatable: ^2.0.5      # Value equality
  shared_preferences: ^2.2.0  # Local storage
```

### Clean Architecture Structure

```
lib/
├── core/
│   ├── constants/
│   │   └── api_constants.dart
│   ├── errors/
│   │   └── exceptions.dart
│   ├── network/
│   │   └── dio_client.dart
│   └── utils/
│       └── token_manager.dart
├── data/
│   ├── datasources/
│   │   ├── device_remote_datasource.dart
│   │   └── auth_remote_datasource.dart
│   ├── models/
│   │   ├── device_model.dart
│   │   └── user_model.dart
│   └── repositories/
│       ├── device_repository_impl.dart
│       └── auth_repository_impl.dart
├── domain/
│   ├── entities/
│   │   ├── device.dart
│   │   └── user.dart
│   ├── repositories/
│   │   ├── device_repository.dart
│   │   └── auth_repository.dart
│   └── usecases/
│       ├── get_devices.dart
│       └── login_user.dart
└── presentation/
    ├── bloc/
    │   ├── auth/
    │   └── device/
    ├── pages/
    └── widgets/
```

### Dio Client Setup

```dart
// lib/core/network/dio_client.dart
import 'package:dio/dio.dart';
import '../utils/token_manager.dart';
import '../constants/api_constants.dart';

class DioClient {
  final Dio _dio;
  final TokenManager _tokenManager;

  DioClient(this._dio, this._tokenManager) {
    _dio.options.baseUrl = ApiConstants.baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 10);
    _dio.options.contentType = Headers.jsonContentType;
    _dio.options.responseType = ResponseType.json;

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _tokenManager.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) {
        // Handle refresh token or authentication errors
        if (error.response?.statusCode == 401) {
          // Handle token refresh or logout
        }
        return handler.next(error);
      },
    ));
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path) {
    return _dio.delete(path);
  }
}
```

### API Constants

```dart
// lib/core/constants/api_constants.dart
class ApiConstants {
  static const String baseUrl = 'https://backendsurvival-production.up.railway.app';
  
  // Auth endpoints
  static const String login = '/login';
  static const String signup = '/signup';
  static const String profile = '/profile';
  
  // Device endpoints
  static const String devices = '/devices';
  static const String allDevices = '/devices/all';
  static const String deviceBySerial = '/devices/';
  
  // Logs endpoints
  static const String logs = '/logs';
  static const String logsByDevice = '/logs/device/';
}
```

### Repository Implementation

```dart
// lib/data/repositories/device_repository_impl.dart
import 'package:dartz/dartz.dart';
import '../../domain/entities/device.dart';
import '../../domain/repositories/device_repository.dart';
import '../datasources/device_remote_datasource.dart';
import '../../core/errors/exceptions.dart';

class DeviceRepositoryImpl implements DeviceRepository {
  final DeviceRemoteDataSource remoteDataSource;

  DeviceRepositoryImpl(this.remoteDataSource);

  @override
  Future<List<Device>> getDevices() async {
    try {
      final deviceModels = await remoteDataSource.getDevices();
      return deviceModels.map((model) => model.toEntity()).toList();
    } on ServerException {
      throw ServerException();
    }
  }
  
  @override
  Future<Device> getDeviceBySerial(String serialNumber) async {
    try {
      final deviceModel = await remoteDataSource.getDeviceBySerial(serialNumber);
      return deviceModel.toEntity();
    } on ServerException {
      throw ServerException();
    }
  }
}
```

### Data Source Implementation

```dart
// lib/data/datasources/device_remote_datasource.dart
import 'package:dio/dio.dart';
import '../models/device_model.dart';
import '../../core/network/dio_client.dart';
import '../../core/constants/api_constants.dart';
import '../../core/errors/exceptions.dart';

class DeviceRemoteDataSource {
  final DioClient dioClient;

  DeviceRemoteDataSource(this.dioClient);

  Future<List<DeviceModel>> getDevices() async {
    try {
      final response = await dioClient.get(ApiConstants.devices);
      return (response.data as List)
          .map((json) => DeviceModel.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw ServerException(message: e.message);
    }
  }
  
  Future<DeviceModel> getDeviceBySerial(String serialNumber) async {
    try {
      final response = await dioClient.get('${ApiConstants.deviceBySerial}$serialNumber');
      return DeviceModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ServerException(message: e.message);
    }
  }
}
```

### Model Implementation

```dart
// lib/data/models/device_model.dart
import '../../domain/entities/device.dart';

class DeviceModel {
  final String serialNumber;
  final String? name;
  final String? location;
  final bool isConnected;
  final bool hasAlert;
  final String? alertMessage;
  final DateTime? lastUpdated;
  final DateTime registrationDate;
  final bool notificationsEnabled;
  final bool isFall;
  final List<String> owners;

  DeviceModel({
    required this.serialNumber,
    this.name,
    this.location,
    required this.isConnected,
    required this.hasAlert,
    this.alertMessage,
    this.lastUpdated,
    required this.registrationDate,
    required this.notificationsEnabled,
    required this.isFall,
    required this.owners,
  });

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      serialNumber: json['serial_number'],
      name: json['name'],
      location: json['location'],
      isConnected: json['is_connected'] ?? false,
      hasAlert: json['has_alert'] ?? false,
      alertMessage: json['alert_message'],
      lastUpdated: json['last_updated'] != null
          ? DateTime.parse(json['last_updated'])
          : null,
      registrationDate: DateTime.parse(json['registration_date']),
      notificationsEnabled: json['notifications_enabled'] ?? true,
      isFall: json['is_fall'] ?? false,
      owners: List<String>.from(json['owners'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'serial_number': serialNumber,
      'name': name,
      'location': location,
      'is_connected': isConnected,
      'has_alert': hasAlert,
      'alert_message': alertMessage,
      'last_updated': lastUpdated?.toIso8601String(),
      'registration_date': registrationDate.toIso8601String(),
      'notifications_enabled': notificationsEnabled,
      'is_fall': isFall,
      'owners': owners,
    };
  }

  Device toEntity() {
    return Device(
      serialNumber: serialNumber,
      name: name,
      location: location,
      isConnected: isConnected,
      hasAlert: hasAlert,
      alertMessage: alertMessage,
      lastUpdated: lastUpdated,
      registrationDate: registrationDate,
      notificationsEnabled: notificationsEnabled,
      isFall: isFall,
      owners: owners,
    );
  }
}
```

### Dependency Injection

```dart
// lib/injection_container.dart
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/network/dio_client.dart';
import 'core/utils/token_manager.dart';
import 'data/datasources/device_remote_datasource.dart';
import 'data/repositories/device_repository_impl.dart';
import 'domain/repositories/device_repository.dart';
import 'domain/usecases/get_devices.dart';
import 'presentation/bloc/device/device_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  sl.registerLazySingleton(() => Dio());

  // Core
  sl.registerLazySingleton(() => TokenManager(sl()));
  sl.registerLazySingleton(() => DioClient(sl(), sl()));

  // Data sources
  sl.registerLazySingleton(() => DeviceRemoteDataSource(sl()));

  // Repositories
  sl.registerLazySingleton<DeviceRepository>(
    () => DeviceRepositoryImpl(sl()),
  );

  // Use cases
  sl.registerLazySingleton(() => GetDevices(sl()));

  // BLoCs
  sl.registerFactory(() => DeviceBloc(getDevices: sl()));
}
```

## License

This project is licensed under the ISC License.
