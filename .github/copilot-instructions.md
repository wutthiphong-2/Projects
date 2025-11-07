### Quick orientation

This repository is an Active Directory management web app with a React frontend and a Python (FastAPI) backend. Frontend lives in `frontend/`, backend in `backend/`.

High-level flow:
- Frontend (React) calls backend API under `/api/*` (proxy configured to `http://localhost:8000` in `frontend/package.json`).
- Backend (FastAPI) exposes routers at `/api/auth`, `/api/users`, `/api/groups`, `/api/ous` (see `backend/app/main.py`).
- Backend talks to Active Directory via LDAP using settings in `backend/.env` (use `.env.example` as a template).

### How to run locally
- Backend (Windows): run `run_backend.bat` which activates the `venv` and starts Uvicorn with reload on port 8000. Or from `backend/`:
  - Create and activate venv, install `requirements.txt`, then `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- Frontend (Windows): run `run_frontend.bat` (calls `npm start`). From `frontend/` you can also run `npm install` then `npm start`.

Notes: `frontend/package.json` uses `craco` (`craco start`) and has `proxy: "http://localhost:8000"` so frontend API requests under `/api` are proxied to the backend during development.

### Important files and why they matter
- `backend/app/main.py` — FastAPI app setup, CORS and router registration. Look here to see which routes are mounted and which middleware is applied.
- `backend/app/core/config.py` — centralized settings. It reads `.env` via Pydantic Settings and includes backward-compatible fallbacks for legacy env names (e.g., `JWT_SECRET`, `PORT`, `JWT_EXPIRES_IN`). When changing env var names prefer updating this file first.
- `backend/app/core/database.py` — LDAP connection initialization (used at startup). If modifying LDAP behavior search for `init_ldap_connection` usage.
- `backend/app/routers/*.py` — API endpoints implementation (auth, users, groups, ous).
- `frontend/src/components/*` — UI components. Example: `UserManagement.js` handles listing and editing users (look for axios calls to `/api/users`).
- `run_backend.bat`, `run_frontend.bat` — convenient Windows scripts used by developers here.

### Patterns & conventions
- API base path: `/api/*`. Frontend expects JSON responses and uses JWT for auth. See `POST /api/auth/login` in `backend/app/routers/auth.py`.
- Environment: `backend/.env` controls LDAP, JWT, PORT, etc. `app/core/config.py` maps legacy variables if present; prefer editing `.env.example` and copying to `.env`.
- LDAP data files: large fixtures live under `backend/` as `users.json`, `groups.json`, `ous.json` — useful for offline testing or seeding.
- Routing: routers are registered in `app/main.py` using `include_router(...)` — add new API areas by creating a router module and registering it there.
- Startup: `init_ldap_connection()` is called on FastAPI startup — heavy initialization should go there.

### Common tasks (examples for AI agents)
- Add a new API router:
  1. Create `backend/app/routers/<name>.py` with a FastAPI APIRouter.
  2. Import and `include_router` it in `backend/app/main.py` with prefix `/api/<name>`.
  3. Update frontend to call `/api/<name>` via axios and add a component under `frontend/src/components`.

- Update env var usage safely:
  - Prefer adding new names to `backend/app/core/config.py`. If the `.env` still uses legacy names, be aware config already supports `JWT_SECRET`, `JWT_EXPIRES_IN`, and `PORT` fallbacks.

### Debugging hints
- To reproduce backend issues: run `run_backend.bat` (Windows) or `python -m uvicorn app.main:app --reload` in `backend/` and inspect logs. Health endpoint `/api/health` is available.
- Common frontend network problem: ensure backend is running on `localhost:8000` (frontend proxy). If CORS errors appear, check `CORS_ORIGINS` in `backend/app/core/config.py`.

### What not to change without verification
- Do not rename env variables without updating `backend/app/core/config.py` because the code contains explicit fallbacks for legacy names.
- Avoid changing the API prefixes (`/api/*`) without updating the frontend proxy and axios calls.

### Where to look for more details
- Run scripts: `run_backend.bat`, `run_frontend.bat`.
- Backend entry: `backend/app/main.py` and `backend/app/core/config.py`.
- Frontend entry: `frontend/src/index.js` and `frontend/package.json` (scripts and proxy).
- LDAP fixtures and sample exports: `backend/users.json`, `backend/groups.json`, `backend/ous.json`.

If anything here is incomplete or you want examples of tests or a sample API addition, say which area to expand and I will iterate.
