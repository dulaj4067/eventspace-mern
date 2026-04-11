# 🚂 Railway Deployment Guide

This project is optimized for "One-Click" deployment on Railway using a single service that hosts both the Backend and Frontend.

## 📋 Prerequisites
1.  A [Railway](https://railway.app/) account.
2.  A MongoDB database (you can use Railway's MongoDB or MongoDB Atlas).

## 🚀 Deployment Steps

### 1. Connect Repository
- Go to Railway and click **"New Project"**.
- Select **"Deploy from GitHub repo"** and choose this repository.

### 2. Configure Environment Variables
Add the following variables in the Railway dashboard:
- `NODE_ENV`: `production` (Crucial for serving the frontend build).
- `MONGODB_URI`: Your MongoDB connection string.
- `PORT`: `5000` (Optional, Railway will assign one automatically).
- `JWT_SECRET`: A secure random string for authentication.
- `STRIPE_SECRET_KEY`: Your Stripe secret key.
- `ALGOLIA_APP_ID`: Your Algolia App ID.
- `ALGOLIA_ADMIN_KEY`: Your Algolia Admin Key.
- `SENDGRID_API_KEY`: Your SendGrid API key.

### 3. Automatic Build & Deploy
Railway will detect the `package.json` in the root and use the following logic:
- **Build**: Runs `npm run build` which builds the React frontend.
- **Start**: Runs `node backend/app.js` which starts the Express server.

## 🛠️ How it Works
- In **Development**, the frontend and backend run on separate ports for a better developer experience.
- In **Production** (`NODE_ENV=production`), the backend serves the compiled React app from `frontend/build`, avoiding CORS issues and simplifying deployment.

## 📝 Important Notes
- Ensure you have added the redirect URLs in Stripe/Google if they are environment-specific.
- The `uploads/` directory is local. For persistent file uploads in production, consider Cloudinary or AWS S3.
