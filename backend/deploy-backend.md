# Sanna Billing - Cloud Deployment Guide

This guide explains how to host your backend and database in the cloud for free so that your mobile APK works 24/7, even when your laptop is turned off!

---

## Step 1: Create a Free Database on Neon

[Neon](https://neon.tech) offers a permanently free cloud-hosted PostgreSQL database with great performance and automatic scaling.

1. Go to [neon.tech](https://neon.tech) and sign up for a free account.
2. Create a new project (e.g. named `SannaBilling`). Select the region closest to you (e.g. Asia Pacific or US East).
3. Once created, you will see a connection string (`Connection Details`) in your Neon dashboard. It will look like this:
   ```env
   postgresql://alex:abc123xyz@ep-cool-waterfall-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy this connection string. This is your `DATABASE_URL`.

---

## Step 2: Initialize Database Tables (Run Cloud Migrations)

Now that you have your cloud database, you need to create the tables, triggers, and procedures. Because we updated `backend/setup-db.js` to support cloud migrations, you can run this easily from your laptop's terminal:

1. Open a terminal (command prompt or PowerShell) and navigate to the backend directory:
   ```cmd
   cd c:\Users\Dell\Desktop\FamilyBusiness\backend
   ```
2. Set the `DATABASE_URL` environment variable temporarily and run the setup script:
   - **In PowerShell**:
     ```powershell
     $env:DATABASE_URL="YOUR_NEON_CONNECTION_STRING_HERE"
     npm run setup-db
     ```
   - **In standard Windows Command Prompt (CMD)**:
     ```cmd
     set DATABASE_URL=YOUR_NEON_CONNECTION_STRING_HERE
     npm run setup-db
     ```
3. You should see:
   ```
   --- Starting PostgreSQL database setup (Cloud Mode) ---
   Connected to cloud PostgreSQL database successfully.
   Executing schema script tables & trigger initialization...
   Database tables, triggers, and procedures setup COMPLETED successfully.
   --- Database Setup Finished! ---
   ```
   Your cloud database is now fully ready!

---

## Step 3: Deploy the Backend API on Render

[Render](https://render.com) is a cloud platform that lets you host Node.js Express APIs for free.

1. Go to [render.com](https://render.com) and sign up/login (you can sign in using your GitHub account).
2. Click **New** -> **Web Service**.
3. Under the **Connect a repository** list, connect your GitHub repository:
   `https://github.com/sanskarmandlik/BusinessBilling.git`
   *(If you haven't pushed your latest code to GitHub, open git and push it first: `git add .`, `git commit -m "add cloud configuration"`, `git push origin main`)*
4. Configure the Web Service settings:
   - **Name**: `sanna-billing` (or any name you like)
   - **Region**: (Choose the same region as your Neon database)
   - **Branch**: `main` (or whatever branch contains your code)
   - **Root Directory**: `backend` (⚠️ IMPORTANT: Make sure to type `backend` here since the server lives inside the backend subfolder!)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: **Free**
5. Add Environment Variables:
   Click **Advanced** or scroll down to the environment variables section and add:
   - `DATABASE_URL` = `YOUR_NEON_CONNECTION_STRING_HERE` (The same string from Step 1)
   - `JWT_SECRET` = `choose_any_secure_random_text` (e.g. `sanna_secret_token_998877`)
   - `NODE_ENV` = `production`
6. Click **Create Web Service**.

Render will build and start your backend. Once complete, it will display a public URL (e.g. `https://sanna-billing.onrender.com`). Copy this URL.

---

## Step 4: Rebuild your Mobile APK with the Cloud URL

With your backend online at the Render URL, we want to compile a new mobile APK that connects to this URL by default. We have created a script `build-apk.bat` in the root folder of your project to automate this process:

1. Double-click the `build-apk.bat` file in your `FamilyBusiness` folder.
2. It will ask you for your backend server URL. Paste your Render URL (e.g., `https://sanna-billing.onrender.com`).
3. The script will:
   - Inject the URL into the frontend build environment (`VITE_API_URL`).
   - Run the frontend production build (`npm run build`).
   - Sync the built assets with the Capacitor Android project (`npx cap sync android`).
4. Once completed, open **Android Studio**, load your `frontend/android` project, and build your new APK:
   - In Android Studio, go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
5. Install the generated APK on your phone!

Now, your mobile app will work directly, sign up and login will be fully online, and the database will sync 24/7 without your laptop needing to be on!
