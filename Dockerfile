# NEXMI — React(Vite) 정적 빌드 + FastAPI(계산 엔진) 단일 이미지. Railway 용.
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul \
    FRONTEND_DIST=/app/frontend/dist
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/app backend/app
COPY backend/model backend/model
COPY --from=web /web/dist frontend/dist
RUN useradd --create-home --uid 10001 app && chown -R app /app
USER app
EXPOSE 8000
# Railway 가 PORT 를 주입한다. 프록시 뒤에서 실행되므로 forwarded 헤더를 신뢰한다.
CMD ["sh", "-c", "exec uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
