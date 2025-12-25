Deployment notes — Render

This project expects the frontend and backend to communicate using the following Render URLs:

- Backend (Django) URL: https://kdb-hospital.onrender.com
- Frontend (React) URL: https://kdb-hospital-8e4t.onrender.com

Backend build note for Render
--------------------------------
Render builds Docker images from your repository. There are two common options:

- Keep the repository as-is and point Render to the `backend` folder as the build context (recommended):
  - On Render when creating the service, set `Root Directory` (or Build Context) to `backend` and leave `Dockerfile` path as `Dockerfile`.
  - This ensures Docker's `COPY . /app` references files inside `backend` and avoids errors like `"/backend": not found`.

- Alternatively, keep build context as the repo root and set `Dockerfile Path` to `backend/Dockerfile`. Either approach works, but make sure the Dockerfile's COPY paths match the build context.

Common Render error explained
--------------------------------
If you see an error like:

```
error: failed to solve: failed to compute cache key: failed to calculate checksum of ref ...: "/backend": not found
error: exit status 1
```

That usually means the Dockerfile attempted to `COPY backend /app` while the build context was already `backend` (so `backend` does not exist inside the context). The fixes above will resolve that: either change Dockerfile paths or point Render to the correct build context.

Steps to configure environment variables on Render

1) Backend (service `kdb-hospital`):
   - Ensure `ALLOWED_HOSTS` and CORS are configured. The project currently allows all hosts in `backend/hms/settings.py` (`ALLOWED_HOSTS=['*']` and `CORS_ALLOW_ALL_ORIGINS = True`). For production you should restrict these, for example:
     - `CORS_ALLOW_ALL_ORIGINS = False`
     - `CORS_ALLOWED_ORIGINS = ['https://kdb-hospital-8e4t.onrender.com']`
   - Set required secrets in Render environment variables (recommended):
     - `DJANGO_SECRET` (a secure secret key)
     - Database variables if using Postgres: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`

2) Frontend (service `kdb-hospital-frontend`):
   - Set the build-time environment variable `REACT_APP_API_URL` to the backend URL, for example:
     - `REACT_APP_API_URL = https://kdb-hospital.onrender.com`
   - When the frontend is built on Render, Create React App will embed this variable and the client will use it as the API base URL.

Local development

- The frontend `package.json` uses `proxy: "http://127.0.0.1:8000"` so local `npm start` / `npm run dev` will proxy `/api/*` requests to a local Django dev server.
- To test the production behavior locally, you can set the env var before building or running the dev server (PowerShell):

```powershell
# temporary for current shell
$env:REACT_APP_API_URL = 'https://kdb-hospital.onrender.com'
npm run build
# or for dev (note CRA only reads env at build/start time)
npm run start
```

Security note

- Allowing all origins (`CORS_ALLOW_ALL_ORIGINS = True`) is convenient for development but not secure for production. Restrict `CORS_ALLOWED_ORIGINS` to the frontend URL in production and set proper `ALLOWED_HOSTS`.

If you want, I can:
- Add a safe production-ready change to `backend/hms/settings.py` to read CORS/ALLOWED_HOSTS from env vars (recommended).
- Run a quick build locally with `REACT_APP_API_URL` set to verify the frontend uses the production API URL.
Let me know which of those you'd like me to do next.

Recommended backend Render environment variables
-----------------------------------------------
On the backend service (Render), set these environment variables for a production deployment:

- `DJANGO_SECRET`: a long random secret string.
- `DJANGO_DEBUG`: `False`
- `ALLOWED_HOSTS`: comma-separated list, e.g. `kdb-hospital.onrender.com`
- `CORS_ALLOW_ALL_ORIGINS`: `False` (recommended in production)
- `CORS_ALLOWED_ORIGINS`: comma-separated allowed frontend URLs, e.g. `https://kdb-hospital-8e4t.onrender.com`
- Database variables (if using Postgres): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`

With the `backend/Dockerfile` updated to use the local backend directory as context, Render should build successfully when you point its build context to the `backend` folder or set the Dockerfile path to `backend/Dockerfile` (see notes above).
