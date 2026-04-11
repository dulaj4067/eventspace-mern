# 🚀 Split Deployment: Railway (Backend) + Vercel (Frontend)

This guide explains how to deploy your backend to Railway and your frontend to Vercel.

## 1. Backend (Railway)
Railway will host your API and Database.

### Steps:
1.  Connect this repository to Railway.
2.  Set the **Root Directory** to `backend`.
3.  Add the following **Environment Variables**:
    - `FRONTEND_URL`: `https://your-app.vercel.app` (Your Vercel domain).
    - `MONGODB_URI`: Your MongoDB connection string.
    - `JWT_SECRET`: Your secure secret.
    - (Other keys like `STRIPE_SECRET_KEY`, etc.)

## 2. Frontend (Vercel)
Vercel will host your React frontend.

### Steps:
1.  Connect this repository to Vercel.
2.  Set the **Framework Preset** to `Create React App`.
3.  Set the **Root Directory** to `frontend`.
4.  **Important**: Update `frontend/vercel.json` and replace `https://BACKEND_URL` with your actual Railway backend URL (e.g., `https://backend-production-xyz.up.railway.app`).
5.  Deploy.

### Why this setup?
- **Cost**: Vercel is free and extremely fast for static frontends.
- **Scale**: Railway handles server-side logic and databases reliably.
- **Proxy**: We use `vercel.json` rewrites so your frontend code doesn't need to change its API paths (it keeps using `/api/...`).

## 🛠️ Configuration Details
- **Backend CORS**: The backend is configured to allow requests from your `FRONTEND_URL`.
- **Frontend Proxy**: Requests to `/api` on Vercel are automatically forwarded to Railway.
