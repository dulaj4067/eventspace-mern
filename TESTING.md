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
