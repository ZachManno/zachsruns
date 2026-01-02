# Zach's Runs - Basketball Run Organizer

A lightweight full-stack web application for organizing basketball pickup games ("runs").

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Flask (Python) with SQLAlchemy
- **Database**: SQLite (local development) / Vercel Postgres (production)

## Project Structure

```
zachs-runs/
├── frontend/          # Next.js application
├── backend/           # Flask API
├── api/               # Vercel serverless function entry point
├── vercel.json        # Vercel deployment configuration
└── requirements.md   # Project requirements
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```

   The backend will run on `http://localhost:5001`

   Note: On first run, the database will be created and a default admin user will be set up:
   - Username: `zmann`
   - Password: Set via `ADMIN_PASSWORD` environment variable (see Environment Variables section)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

## Environment Variables

### Backend

Create a `.env` file in the `backend` directory:

```
ADMIN_PASSWORD=your-admin-password-here
JWT_SECRET=your-secret-key-change-in-production
POSTGRES_URL=your-postgres-url  # Only needed for Vercel Postgres
```

**Required**: `ADMIN_PASSWORD` - The password for the default admin user (username: `zmann`). This is used when creating the admin account on first run.

For local development, the app uses SQLite by default. The database file will be created as `zachs_runs.db` in the backend directory.

### Frontend

Create a `.env.local` file in the `frontend` directory (optional):

```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

If not set, it defaults to `http://localhost:5001`.

## Features

- **User Authentication**: Sign up, login, and JWT-based session management
- **Run Management**: View, create, and RSVP to basketball runs
- **User Profiles**: View your runs and history
- **Admin Dashboard**: 
  - Create new runs
  - Verify/unverify users
  - Manage announcements
  - Import historical run data from JSON

## Default Admin Account

- **Username**: `zmann`
- **Password**: Set via `ADMIN_PASSWORD` environment variable in the backend `.env` file

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)

### Runs
- `GET /api/runs` - List all runs
- `GET /api/runs/:id` - Get single run
- `POST /api/runs` - Create run (admin only)
- `PUT /api/runs/:id` - Update run (admin only)
- `DELETE /api/runs/:id` - Delete run (admin only)
- `POST /api/runs/:id/rsvp` - Update RSVP status (protected)

### Users
- `GET /api/users/me` - Get profile (protected)
- `PUT /api/users/me` - Update profile (protected)
- `GET /api/users/me/runs` - Get user's runs (protected)

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `PUT /api/admin/users/:id/verify` - Verify/unverify user (admin only)
- `GET /api/admin/announcements` - Get current announcement
- `POST /api/admin/announcements` - Create/update announcement (admin only)
- `POST /api/admin/runs/import` - Import historical runs (admin only)

## Historical Data Import Format

When importing historical runs, use the following JSON format:

```json
{
  "runs": [
    {
      "title": "Tuesday January 6th Run",
      "date": "2024-01-06",
      "start_time": "19:00",
      "end_time": "21:00",
      "location_id": "uuid-of-location",
      "description": "Optional description",
      "capacity": 20,
      "cost": 10.00,
      "participants": {
        "confirmed": ["Alec", "Zach", "Allen"],
        "interested": ["Steve", "Mike"],
        "out": ["AJ", "Jim"]
      }
    }
  ]
}
```

**Location Options:**
- `location_id` (recommended): The UUID of an existing location
- `location` (legacy): Location name - will be matched to existing locations by name
- `address` (legacy): Location address - will be matched if name doesn't match

If no location_id is provided, the system will attempt to match by location name or address. If no match is found, it will default to the first available location.

Note: Participant usernames must match existing user accounts in the database.

## Development Notes

- The app is designed for a small user base (< 40 users)
- Local development uses SQLite for simplicity
- For Vercel deployment, configure Vercel Postgres and set the `POSTGRES_URL` environment variable
- JWT tokens are stored in localStorage on the frontend
- CORS is configured to allow requests from `localhost:3000`



# Deployment to Vercel

This application is configured to deploy to Vercel with Vercel Postgres. Follow these steps:

### Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to a GitHub repository
2. **Vercel Account**: Sign up or log in at [vercel.com](https://vercel.com)

### Step 1: Create Postgres Database via Vercel Marketplace

Since Vercel now offers Postgres through the marketplace, you have several options:

**Option A: Neon (Recommended for serverless)**
1. In your Vercel dashboard, go to your project
2. Navigate to **Storage** tab or go to [Vercel Marketplace](https://vercel.com/marketplace/category/storage?category=storage&search=postgres)
3. Click **Add Integration** on **Neon** (or another Postgres provider)
4. Follow the setup wizard to create a new Neon database
5. The connection string will be automatically added as `POSTGRES_URL` environment variable

**Option B: Supabase**
1. Similar process - add Supabase integration from the marketplace
2. Create a new Supabase project
3. Connection string will be added automatically

**Option C: Other Marketplace Providers**
- Any Postgres provider from the marketplace will work
- Just ensure the connection string is set as `POSTGRES_URL` environment variable

**Note:** Your code already supports Postgres - no code changes needed! SQLAlchemy works perfectly with any Postgres database.

### Step 2: Connect GitHub Repository to Vercel

1. In Vercel dashboard, click **Add New** → **Project**
2. Import your GitHub repository
3. Vercel will detect the `vercel.json` configuration file
4. The configuration handles both frontend (Next.js) and backend (Python API)

### Step 3: Configure Project Settings

In the Vercel project settings:

1. **Root Directory**: Leave as root (`.` - the `vercel.json` handles routing)
2. **Build Command**: `cd frontend && npm install && npm run build` (configured in `vercel.json`)
3. **Output Directory**: `frontend/.next` (configured in `vercel.json`)
4. **Framework Preset**: None (or Next.js - Vercel will auto-detect from `vercel.json`)

**Note**: The `vercel.json` file in the root directory configures:
- Frontend build from `frontend/` directory
- API routes to `/api/*` which are handled by Python serverless functions
- Backend code is included via `includeFiles` in the function configuration

### Step 4: Set Environment Variables

In your Vercel project settings, go to **Settings** → **Environment Variables** and add:

#### Backend Environment Variables:
- `ADMIN_PASSWORD` - Your admin password (required)
- `JWT_SECRET` - A strong random string for JWT signing (required)
- `POSTGRES_URL` - Automatically provided by Vercel Postgres (already set)
- `FRONTEND_URL` - Your Vercel frontend URL (e.g., `https://your-project.vercel.app`) - Optional, will use VERCEL_URL if not set

#### Frontend Environment Variables:
- `NEXT_PUBLIC_API_URL` - Your Vercel deployment URL (e.g., `https://your-project.vercel.app`)

**Important Notes:**
- Set these for **Production**, **Preview**, and **Development** environments as needed
- `POSTGRES_URL` is automatically provided by Vercel Postgres - don't manually set it
- After setting environment variables, you'll need to redeploy

### Step 5: Deploy

1. Click **Deploy** in Vercel
2. Vercel will:
   - Build your Next.js frontend
   - Set up serverless functions for the Flask backend API
   - Connect to your Vercel Postgres database

### Step 6: Verify Deployment

1. Once deployed, visit your Vercel URL
2. The database will be initialized on first API call
3. The default admin user will be created:
   - Username: `zmann`
   - Password: The value you set for `ADMIN_PASSWORD`

### Post-Deployment Checklist

- [ ] Verify frontend loads correctly
- [ ] Test API endpoints (e.g., `/api/health`)
- [ ] Log in with admin credentials
- [ ] Verify database connection (create a test run)
- [ ] Check that images load from `/public/locations/`
- [ ] Test CORS is working (frontend can call backend)

### Troubleshooting

**Database Connection Issues:**
- Verify `POSTGRES_URL` is set in Vercel environment variables
- Check that Vercel Postgres database is running
- Review Vercel function logs for connection errors

**CORS Errors:**
- Ensure `FRONTEND_URL` or `VERCEL_URL` is set correctly
- Check that your frontend URL matches the allowed origins in `backend/app.py`

**API Not Found:**
- Verify `vercel.json` is in the root directory
- Check that `api/index.py` exists and imports the Flask app correctly
- Verify `api/requirements.txt` exists with all Python dependencies
- Ensure backend code is accessible (check `includeFiles` in `vercel.json`)
- Review Vercel function logs in the dashboard

**Build Failures:**
- Check that all dependencies are in `package.json` and `requirements.txt`
- Verify Python version compatibility (Vercel uses Python 3.9 by default)
- Ensure `api/requirements.txt` exists with all Python dependencies
- Review build logs in Vercel dashboard

**Python Runtime Issues:**
- Vercel uses Python 3.9 by default (configured in `vercel.json`)
- All Python dependencies must be in `api/requirements.txt`
- Backend code is included via `includeFiles` in `vercel.json`

### Important Notes

1. **Monorepo Structure**: This is a monorepo with frontend and backend. The `vercel.json` handles routing:
   - Frontend routes go to Next.js (built from `frontend/`)
   - API routes (`/api/*`) go to Python serverless functions (`api/index.py`)

2. **Database Migrations**: The app automatically runs migrations on startup. SQLite-specific code has been made database-agnostic to work with both SQLite (local) and Postgres (Vercel).

3. **Environment Variables**: 
   - `POSTGRES_URL` is automatically provided by Vercel Postgres
   - `VERCEL_URL` is automatically set by Vercel for each deployment
   - You only need to manually set `ADMIN_PASSWORD`, `JWT_SECRET`, and `NEXT_PUBLIC_API_URL`

4. **Static Assets**: Location images in `frontend/public/locations/` will be served automatically by Vercel.

### Environment Variable Reference

For local development, see:
- `backend/.env.example` - Backend environment variables template
- `frontend/.env.example` - Frontend environment variables template

**Note**: `.env` files are gitignored. Copy the `.env.example` files and fill in your values.





zmann (admin)
testuser
stevesheeran
plusoneguy
ranman
Barry
kantuk
Diego1
Dre
Leem