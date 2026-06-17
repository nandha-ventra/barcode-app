# QR Quantity Tracking System

A system to generate, update, and verify distributor quantity using QR codes.

## Project Structure
- `backend/`: FastAPI application with PostgreSQL database.
- `qr-offline-app/`: React + Vite frontend with Tailwind CSS.

## Local Development with Docker
1. Make sure you have Docker and Docker Compose installed.
2. Run `docker-compose up --build`.
3. Frontend will be available at `http://localhost`.
4. Backend API will be available at `http://localhost:8000`.

## Deployment to Railway.com

### Backend Deployment
1. Go to Railway and create a new project.
2. Add a **PostgreSQL** database to your project.
3. Connect your GitHub repo.
4. Add a new Service from the `backend` folder.
5. Set the following environment variables for the backend:
   - `DATABASE_URL`: (Railway automatically provides this if you link the Postgres database).
   - `PORT`: 8000 (Railway handles this).
6. Railway will use the `Dockerfile` in the `backend` folder.

### Frontend Deployment
1. Add a new Service from the `qr-offline-app` folder.
2. Set the following environment variables for the frontend:
   - `VITE_API_BASE_URL`: The URL of your deployed backend service.
3. Railway will use the `Dockerfile` in the `qr-offline-app` folder.

## Features
- **Generate QR**: Create batches for distributors with initial quantities.
- **Update Stock**: Update remaining quantities for specific batches.
- **Verify Status**: Scan or upload QR codes to see live balance and history.
