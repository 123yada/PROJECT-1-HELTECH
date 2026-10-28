# Antigravity Health

Antigravity Health is a full-stack health-service web application prototype. It combines a static HTML, CSS, and JavaScript frontend with a FastAPI backend and a SQLite database.

## Features

- Symptom checker with preliminary guidance and emergency-keyword alerts
- Doctor directory and virtual consultation flows, including chat and video-call UI
- Medicine catalogue, shopping cart, checkout, and order tracking
- Address management
- Digital prescriptions and prescription-to-pharmacy flows
- Guest access and email/password registration and sign-in
- Health information library and language translation widget

The symptom checker is a preliminary software feature, not a medical diagnosis or a substitute for professional care. Seek urgent medical help for emergencies.

## Requirements

- Windows
- Python 3.10 or later
- Internet access for browser-loaded Firebase SDK modules, translation services, and externally hosted images

Python dependencies are listed in [`requirements.txt`](./requirements.txt).

## Run locally

### Windows launcher

Double-click `run.bat`, or run it from PowerShell in the project folder:

```powershell
.\run.bat
```

The launcher installs the listed Python dependencies, opens the site in a browser, and starts Uvicorn with auto-reload on port `8000`. Stop the server with `Ctrl+C` in the launcher window.

### Manual setup

From the project folder, install dependencies and start the server:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open <http://127.0.0.1:8000/> in a browser. Stop the server with `Ctrl+C`.

If `python` is not available in PowerShell, install Python and enable its PATH option, or use the full path to your Python executable in both commands.

## Useful URLs

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:8000/` | Web application |
| `http://127.0.0.1:8000/docs` | Interactive API documentation (Swagger UI) |
| `http://127.0.0.1:8000/redoc` | Alternative API documentation |
| `http://127.0.0.1:8000/api/status` | Backend health/status response |

## API overview

The backend exposes these route groups. Request and response schemas are available at `/docs`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/status` | Report backend status |
| `POST` | `/api/auth/register` | Register an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/medicines` | List or search medicines; supports `category` and `q` query parameters |
| `GET` | `/api/medicines/{medicine_id}` | Fetch a medicine |
| `GET`, `POST` | `/api/addresses` | List or add addresses; uses the `user_id` query parameter |
| `DELETE` | `/api/addresses/{address_id}` | Delete an address; uses the `user_id` query parameter |
| `PUT` | `/api/addresses/{address_id}/default` | Set a user's default address |
| `POST` | `/api/orders` | Create an order |
| `GET` | `/api/orders` | List orders for a `user_id` |
| `GET` | `/api/orders/{order_id}` | Fetch order details for a `user_id` |
| `POST` | `/api/orders/{order_id}/cancel` | Cancel an order for a `user_id` |
| `GET` | `/api/doctors` | List or search doctors; supports `specialty` and `q` |
| `GET` | `/api/doctors/{doctor_id}` | Fetch a doctor |
| `POST` | `/api/consultations` | Start a consultation |
| `POST` | `/api/consultations/{consultation_id}/complete` | Complete a consultation |
| `GET` | `/api/consultations` | List consultations for a `user_id` |
| `GET`, `POST` | `/api/consultations/{consultation_id}/messages` | Read or send consultation messages |
| `GET` | `/api/prescriptions` | List prescriptions for a `user_id` |
| `GET` | `/api/prescriptions/{prescription_id}` | Fetch a prescription |
| `POST` | `/api/prescriptions` | Create a prescription |
| `POST` | `/api/prescriptions/{prescription_id}/match-pharmacy` | Find pharmacy medicine matches |
| `POST` | `/api/analyze-symptoms` | Return preliminary symptom guidance |

## Project layout

```text
backend/
  main.py          FastAPI application, API routes, and SQLite setup
  health.db        SQLite database
frontend/
  index.html       Main page and UI
  script.js        Frontend interactions and API calls
  style.css        Page styles
  images/          Local image assets
requirements.txt   Python dependencies
run.bat            Windows install-and-run launcher
```

## Data and configuration

- The backend database is `backend/health.db`. The application creates its tables and initializes catalogue data when the backend starts. Keep a backup of this file if you need to preserve local app data.
- The frontend stores the current signed-in or guest session in browser `localStorage`.
- `frontend/firebase-config.js` contains Firebase project configuration and imports Firebase browser SDK modules. Backend API data is stored in SQLite.

## Important prototype limitations

This project is a demonstration/prototype and is not ready to handle real patient data or production traffic without a security and privacy review. In particular, do not deploy it publicly or enter real medical or payment information. Authentication, data protection, authorization, and payment flows require production-grade implementation and review.
