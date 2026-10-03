FROM node:20-bookworm-slim AS webbuild
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json ./web/package.json
RUN npm ci --include-workspace-root
COPY web ./web
RUN npm --prefix web run build
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV STRATA_DIST=/app/web/dist
WORKDIR /app
COPY python ./python
COPY --from=webbuild /app/web/dist ./web/dist
RUN pip install --no-cache-dir fastapi uvicorn pydantic numpy scipy xarray h5netcdf copernicusmarine
EXPOSE 8000
CMD ["sh", "-c", "python -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir python"]
