# Event Management System

**Classification: Public-SLIIT**

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB (Local instance or MongoDB Atlas cluster)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/dulaj4067/eventspace-mern.git
cd eventspace-mern
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the following configuration:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
SENDGRID_API_KEY=your_sendgrid_key
```

Start the backend server:
```bash
npm start
# The server should now be running on http://localhost:5000
```

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory with the following:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Start the frontend development server:
```bash
npm start
# The application should now be accessible at http://localhost:3000
```

---

## API Endpoint Documentation

### Base URL: `/api`

### 1. User Authentication (`/api/users`)

#### `POST /register`
- **Description:** Register a new user.
- **Payload:** `{ "name": "John Doe", "email": "john@example.com", "password": "password123" }`
- **Response:** `{ "token": "jwt_token", "user": { ... } }`

#### `POST /login`
- **Description:** Authenticate an existing user.
- **Payload:** `{ "email": "john@example.com", "password": "password123" }`
- **Response:** `{ "token": "jwt_token", "user": { ... } }`

### 2. Events (`/api/events`)

#### `GET /`
- **Description:** Fetch all available events.
- **Authentication:** None
- **Response:** `[ { "_id": "...", "title": "...", "date": "...", "price": ... } ]`

#### `POST /`
- **Description:** Create a new event.
- **Authentication:** Requires valid Bearer Token (Admin).
- **Payload:** `{ "title": "Concert", "description": "...", "date": "...", "location": "...", "capacity": 100 }`
- **Response:** `{ "success": true, "event": { ... } }`

### 3. Bookings (`/api/bookings`)

#### `POST /`
- **Description:** Book an event or facility.
- **Authentication:** Requires valid Bearer Token.
- **Payload:** `{ "eventId": "...", "tickets": 2 }`
- **Response:** `{ "success": true, "bookingId": "..." }`

#### `GET /my-bookings`
- **Description:** Fetch the logged-in user's bookings.
- **Authentication:** Requires valid Bearer Token.
- **Response:** `[ { "bookingId": "...", "event": { ... }, "status": "confirmed" } ]`

### 4. Facilities (`/api/facilities`)

#### `GET /`
- **Description:** Get all community centers and facilities.
- **Authentication:** None
- **Response:** `{ "success": true, "data": [ ... ] }`

### 5. Payments (`/api/payments`)

#### `POST /create-checkout-session`
- **Description:** Initialize Stripe checkout.
- **Authentication:** Requires valid Bearer Token.
- **Payload:** `{ "bookingId": "...", "amount": 1500 }`
- **Response:** `{ "clientSecret": "pi_..." }`

### 6. Ratings & Reviews (`/api/ratings`)

#### `POST /`
- **Description:** Submit a review for a facility or event.
- **Authentication:** Requires valid Bearer Token.
- **Payload:** `{ "targetId": "...", "rating": 5, "review": "Great experience!" }`
- **Response:** `{ "success": true, "data": { ... } }`
