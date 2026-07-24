# FinSight

FinSight is a reimbursement and billing intelligence app for finance teams. It combines policy checks, GST validation, duplicate detection, OCR receipt extraction, anomaly scoring, fraud probability signals, admin review workflows, and dashboard analytics in a React + FastAPI application.

## Features

- Employee claim submission with policy, GST, duplicate, behavioral, vendor, and department budget checks.
- AI-style recommendations for approving, reviewing, or flagging claims.
- Admin login, claim review, decision tracking, and dynamic policy updates.
- Billing invoice analysis with abnormal billing, vendor risk, budget usage, and suspicious invoice summaries.
- OCR receipt extraction with Tesseract, Pillow, and `pytesseract`.
- Analytics dashboards and charts built with React, Chart.js, Tailwind CSS, and Lucide icons.
- Single-service deployment support using Docker and Render's free web service plan.

## Tech Stack

- Frontend: React, Vite, React Router, Tailwind CSS, Chart.js.
- Backend: FastAPI, Pydantic, Uvicorn.
- Intelligence: scikit-learn with heuristic fallbacks.
- OCR: Tesseract, Pillow, pytesseract.
- Deployment: Docker, Render Blueprint.

## Project Structure

```text
finsight/
  backend/           FastAPI API, policy logic, risk scoring, OCR, ML helpers
  frontend/          React + Vite app
  Dockerfile         Production image that builds frontend and runs FastAPI
  render.yaml        Render free web service blueprint
  README.md          Project documentation
```

## Prerequisites

- Node.js and npm.
- Python 3.11 or newer.
- Tesseract OCR installed locally if you want receipt OCR to work outside Docker.

On Windows, install Tesseract and make sure one of these is true:

- `TESSERACT_CMD` points to `tesseract.exe`.
- Tesseract is installed at `C:\Program Files\Tesseract-OCR\tesseract.exe`.

## Local Development

### 1. Install Backend Dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Start the Backend

```powershell
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:

```text
http://127.0.0.1:8000
```

### 3. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

### 4. Start the Frontend

```powershell
cd frontend
npm run dev
```

The app will be available at the Vite URL shown in the terminal, usually:

```text
http://127.0.0.1:5173
```

By default, the frontend calls:

```text
http://127.0.0.1:8000
```

To use a different API URL, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Default Admin Login

```text
Username: admin
Password: admin123
```

These values are currently hardcoded for development in `backend/main.py`. Change them before using the app for anything real.

## API Overview

Common backend routes:

- `GET /` - API health message locally, or the frontend app in production builds.
- `POST /claims/submit` - submit and score a reimbursement claim.
- `GET /claims` - list submitted claims.
- `GET /dashboard/analytics` - dashboard analytics.
- `POST /ocr/extract` - extract receipt fields from an uploaded image.
- `POST /billing/analyze` - analyze billing invoice risk.
- `POST /admin/login` - get admin token.
- `GET /admin/claims` - list claims for admin review.
- `POST /admin/decision/{claim_id}` - submit an admin decision.
- `GET /policy` - get current policy.
- `POST /admin/policy/update` - update policy with admin authorization.

Interactive API docs are available while the backend is running:

```text
http://127.0.0.1:8000/docs
```

## Build

Build the frontend:

```powershell
cd frontend
npm run build
```

The production Docker image builds the frontend and serves the compiled files through FastAPI, so the deployed app runs as one web service.

## Tests and Checks

Run backend tests if `pytest` is installed:

```powershell
cd backend
python -m pytest
```

Run a Python syntax check:

```powershell
cd backend
python -m compileall .
```

Build-check the frontend:

```powershell
cd frontend
npm run build
```

## Free Deployment on Render

This repository includes a Dockerfile and `render.yaml` for a free Render deployment.

1. Push this repository to GitHub.
2. Open Render and create a new Blueprint.
3. Connect your GitHub repository.
4. Render should detect `render.yaml`.
5. Apply the Blueprint and wait for the Docker build to finish.

The deployed service builds the React app, installs the FastAPI backend, includes Tesseract OCR, and starts:

```text
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Render free services can spin down after inactivity, so the first request after a quiet period may take longer.

## Production Notes

- Replace the hardcoded admin credentials and token before real use.
- Add persistent storage if claim history and policy changes need to survive restarts.
- Tighten CORS settings for a known production domain.
- Keep secrets in environment variables, not source code.
- Review OCR behavior on your target receipt formats before relying on it operationally.


working deplyed link: https://finsight-9h1h.onrender.com 
render deployyment used: https://dashboard.render.com/