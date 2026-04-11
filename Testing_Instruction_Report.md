# Testing Instruction Report

## Overview
This document outlines the testing strategy, tools, and execution steps for the Event Management System. It ensures that any regressions are caught early and that both UI and Backend components are stable.

---

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
