# Structure Scan

Next.js frontend and FastAPI inference service for the supplied Keras crack-detection model.

## Run the model API

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r model/requirements.txt
uvicorn model.index:app --reload --port 8000
```

Set `MODEL_API_ALLOWED_ORIGINS` on the Python service to a comma-separated list of frontend origins in production, for example `https://your-app.vercel.app`.

## Run the web app

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

For Vercel, deploy this Next.js project and set `MODEL_API_URL` to the public URL of the running FastAPI service. Keep the Keras model on the Python host; do not expose API keys in the browser or repository.