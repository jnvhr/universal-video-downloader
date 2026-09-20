# Stage 1: Build Frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY frontend/ ./
RUN npm run build

# Stage 2: Minimal Runtime Image
FROM node:20-bookworm-slim
WORKDIR /app

# Install minimal runtime dependencies: python3, ffmpeg, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary with timeout and retry to prevent hanging
RUN curl -L --connect-timeout 10 --max-time 60 --retry 3 \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Install backend production dependencies only (no devDependencies)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev --prefer-offline --no-audit

# Copy backend application source
COPY backend/ ./backend/

# Copy only the compiled frontend production assets (discards massive node_modules)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 3001

WORKDIR /app/backend
CMD ["npm", "start"]
