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

## License

This project is open-source and free to host.
