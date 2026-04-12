
  ______               _    _____                      
 |  ____|             | |  / ____|                     
 | |__ __   _____ _ __| |_| (___  _ __   __ _  ___ ___ 
 |  __|\ \ / / _ \ '__| __|\___ \| '_ \ / _` |/ __/ _ \
 | |____\ V /  __/ |  | |_ ____) | |_) | (_| | (_|  __/
 |______|\_/ \___|_|   \__|_____/| .__/ \__,_|\___\___|
                                 | |                   
                                 |_|                   


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

# Testing Instruction Report

## Overview
This document outlines the testing strategy, tools, and execution steps for the Event Management System. It ensures that any regressions are caught early and that both UI and Backend components are stable.

---

# Deployment Report

## Overview
The Event Management System (MERN Stack) has been successfully deployed, separating concerns across specialized hosting platforms to ensure optimal performance, scalability, and security.

## Infrastructure Architecture

### 1. Frontend Infrastructure (Vercel)
- **Framework:** React.js, Tailwind CSS
- **Host:** Vercel (Edge Network)
- **URL:** [https://eventspace-mern.vercel.app](https://eventspace-mern.vercel.app)
- **Deployment Strategy:** 
  - **CD/CI:** Automatic Continuous Deployment integrated via GitHub Webhooks. Any push to the `feature/deployment` or `master` branch instantly triggers a new Vercel build.
  - **Routing Proxy Setup:** Vercel's `vercel.json` intercepts `api/*` requests and maps them locally to mitigate mixed-content CORS issues, acting as an inverted proxy handler for dynamic fallback injection.

### 2. Backend Infrastructure (Railway)
- **Environment:** Node.js Environment (v18+)
- **Framework:** Express.js 
- **Host:** Railway.app
- **URL:** [https://eventspace-mern-production.up.railway.app](https://eventspace-mern-production.up.railway.app)
- **Deployment Strategy:** 
  - Monitored Docker/Nixpacks builds handled automatically by Railway via GitHub integration.

### 3. Database Infrastructure (MongoDB Atlas)
- **Provider:** MongoDB Atlas (Cloud Database)
- **Security:** IP Safelisting bypass mechanism configured for Vercel/Railway dynamic IPs (Allow access from anywhere `0.0.0.0/0` with strong authentication credentials).

## Environment Variables Configuration

### Frontend Secrets (Vercel Dashboard)
- `REACT_APP_API_URL`: Configured to bridge frontend components with the Railway backend directly.
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`: Initialized for secure frontend credit card tokenization.

### Backend Secrets (Railway Dashboard)
- `MONGODB_URI`: Pointing to the production Atlas Cluster.
- `JWT_SECRET`: 256-bit entropy key for signing session tokens.
- `FRONTEND_URL`: Hosted Vercel domain to secure CORS preflight mappings.
- `STRIPE_SECRET_KEY`: Interacting with Stripe Payments securely on the server side.

## Post-Deployment Analysis
- **CORS Hardening:** `app.js` is strictly bound to allow `*vercel.app` dynamically, blocking unverified origins.
- **Static Assets:** Development static file delivery blocks removed off the Express instance offloading all asset CDN work to Vercel's global edge network.
- **Monitoring:** Traffic logs available live within the Railway container metrics console.

## I. Unit Testing Execution

### Frontend (React Component Tests)
We use **Jest** and **React Testing Library** to validate component logic and rendering loops.

**Execution Steps:**
1. Navigate to the frontend workspace:
   ```bash
   cd frontend
   ```
2. Execute the test runner:
   ```bash
   npm test
   ```
   *This command runs Jest in interactive watch mode.*
3. To generate a coverage report or run all tests silently without watch mode:
   ```bash
   CI=true npm test -- --coverage
   ```

### Backend (Logic & Utility Tests)
Backend logic (e.g., token generation, date sanitization) is validated primarily via Jest.

**Execution Steps:**
1. Navigate to the backend workspace:
   ```bash
   cd backend
   ```
2. Run standard backend tests:
   ```bash
   npm test
   ```

---

## II. Integration Testing Setup & Execution
Integration tests are designed to strike the backend API architecture using **Supertest** mixed with **Jest**, bypassing UI rendering delays and hitting APIs directly.

### Initial Setup
1. Integration tests invoke a volatile `.env.test` environment variable configuration to intercept real database pings and redirect them strictly to a test cluster (MongoDB Atlas Dedicated Test Cluster or generic In-Memory DB).
2. Install integration utilities globally if required:
   ```bash
   cd backend
   npm install --save-dev supertest mongodb-memory-server
   ```

### Execution Steps
1. Make sure to specify the test script context in the root directory:
   ```bash
   npm run test:integration
   ```
2. *Alternative Manual Execution:*
   ```bash
   NODE_ENV=test jest --config jest.integration.config.js
   ```

---

## III. Performance Testing Setup & Execution
To guarantee platform resiliency under high booking demand periods, we perform bottleneck testing utilizing **Artillery** (or Apache JMeter).

### Setup Instructions
1. Install Artillery globally on your local machine:
   ```bash
   npm install -g artillery
   ```
2. Prepare an `artillery-script.yml` configured against a Staging Server *never run load tests strictly against Production pipelines unless specifically benchmarking load balancers*.

### Execution Steps
1. Run a quick baseline ping check to 100 virtual users across 10 seconds:
   ```bash
   artillery quick --count 10 -n 20 https://eventspace-mern-production.up.railway.app/api/facilities
   ```
2. Run the structured YAML benchmark pipeline:
   ```bash
   artillery run load_test.yml
   ```
3. Generate detailed visual HTML reports based off telemetry:
   ```bash
   artillery report execution_log.json
   ```

---

## IV. Testing Environment Configuration Details

Maintaining isolated environments prevents fatal test-data leaks into production logic loops. 

### `.env.test` Configurations
Create a dedicated `.env.test` file exactly parallel to your standard backend `.env`.
```env
# test db connection isolated from the production payload
MONGODB_URI=mongodb+srv://test_admin:test_password@cluster-test.mongodb.net/testdb
JWT_SECRET=super_secret_isolated_testing_key
FRONTEND_URL=http://localhost:3000
NODE_ENV=test
PORT=5001
```

### Continuous Integration (CI) Automation
If utilizing GitHub Actions, these environments should be synced as `repository secrets`. Within the Github workflow file, `npm test` runs across all PR implementations automatically gating branch approvals if failure thresholds trigger.

#  EventSpace MERN - Testing & Performance Guide

This project now includes a comprehensive testing suite covering **Facilities**, **Events**, **Bookings**, and **Payments**.

## 🚀 How to Run (Automated)

We have provided an automated runner that detects dependencies, installs them locally (without changing your `package.json`), and executes the entire suite.

```powershell
cd backend
node tests/runner.js
```

## 📂 Test Structure

- **Unit Tests (`tests/unit/`)**: Tests individual controllers in isolation using mocks.
  - `FacilitiesController.test.js`
  - `EventController.test.js`
  - `BookingController.test.js`
  - `PaymentController.test.js`
- **Integration Tests (`tests/integration/`)**: Tests the API endpoints using `supertest` and an in-memory MongoDB server.
  - `api.test.js`
- **Performance Tests (`tests/performance/`)**: Measures API performance under load using `autocannon`.
  - `load_test.js`

## 🛠️ Manual Commands

If you prefer to run tests manually:

### Unit & Integration (Jest)
```bash
npx jest --config tests/jest.config.js
```

### Performance (Autocannon)
*Ensure the server is running (`npm start`) before running this.*
```bash
node tests/performance/load_test.js
```

## 📝 Note on "No-Save" Dependencies
The automation script uses `npm install --no-save`. This means testing libraries (`jest`, `supertest`, etc.) are installed to your `node_modules` for execution but are **not added to your `package.json`**, respecting the project's established structure.