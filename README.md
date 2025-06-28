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

## License

This project is licensed under the ISC License.
