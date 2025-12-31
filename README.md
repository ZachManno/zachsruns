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
      "location": "Phield House",
      "address": "123 Main St, City, State",
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

Note: Participant usernames must match existing user accounts in the database.

## Development Notes

- The app is designed for a small user base (< 40 users)
- Local development uses SQLite for simplicity
- For Vercel deployment, configure Vercel Postgres and set the `POSTGRES_URL` environment variable
- JWT tokens are stored in localStorage on the frontend
- CORS is configured to allow requests from `localhost:3000`

## Next Steps for Deployment

1. Set up Vercel Postgres database
2. Configure environment variables in Vercel
3. Deploy backend as Vercel serverless functions
4. Deploy frontend to Vercel
5. Update API URL in frontend environment variables





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