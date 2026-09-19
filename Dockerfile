FROM node:20-bookworm-slim

# Install Python, ffmpeg, and curl
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package.json for both frontend and backend
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm ci
RUN cd backend && npm ci

# Copy source code
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 3001

# Start the server
WORKDIR /app/backend
CMD ["npm", "start"]
