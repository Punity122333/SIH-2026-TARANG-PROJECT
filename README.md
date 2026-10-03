# STRATA — Physics-Informed Spatio-Temporal Deep Learning Framework
Physics-Informed Subsurface Ocean Temperature Reconstruction.
## Run
Requirements: Node 20+, Python 3.11+.
```sh
npm install
npm --prefix web install
npm run dev
```
`npm run dev` starts the Vite web app on 5173 and the FastAPI server on 8000 together. If Python dependencies are missing the web app still works in Demo mode. Open the printed Vite URL.
Backend health: `GET http://localhost:8000/api/health`. Frontend uses the Vite proxy `/api` by default. Override with `VITE_STRATA_API_URL` or the Backend URL field in Session controls.
Demo mode works with no backend and no network.
Set secrets locally in `.env` (never commit). Names are listed in `.env.example`.
## Live data
SST-first. Observed OSTIA SST flows into Live reconstructions, other inputs stay synthetic until their adapters land. Export the local env before starting the API so the server can read it:
```sh
pip install copernicusmarine
set -a; . ./.env; set +a
npm run dev
```
Then pick Live data mode and run. Downloads cache under `artifacts/live` keyed by region and date, so repeats are instant and deterministic. Without credentials the server answers 503 with the missing variable names. Without the package it falls back explicitly per source and says so in provenance. Model weights are still untrained, so Live output is real observations through an untrained model, validated against held-out profiles.
## Checks
```sh
npm run check
```
Runs web typecheck, lint, unit tests, Python pytest, ruff, mypy, and the no-comments check.
## Layout
`web/` React Vite app. `python/strata/` scientific package. `python/api/` FastAPI service. `scripts/` tooling.
## Deploy
One container serves the built web app and the API on port 8000.
```sh
docker build -t strata .
docker run --rm -p 8000:8000 --env-file .env strata
```
Or with compose:
```sh
docker compose up --build
```
Open `http://localhost:8000`. Same origin serves `/` and `/api/health`. For a hosted URL set `STRATA_CORS_ORIGINS` to the public origin and `STRATA_API_URL` in the web Session controls if the API lives elsewhere. Secrets stay in local `.env`, never in the image. Demo works with no keys. Live surface inputs need Copernicus plus NASA token. Argo validation is open access, INCOIS keys stay blank.
