#!/bin/bash

echo "🚀 Starting Catmash deployment..."
echo "📥 Pulling latest changes..."
git pull

echo "🔨 Building Docker images..."
docker compose build --no-cache

echo "🛑 Stopping existing containers..."
docker compose down --volumes --remove-orphans

echo "🏗️ Starting containers..."
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking container status..."
docker compose ps

echo "📊 Checking service health..."
echo "Main app: http://localhost:6900"
echo "WebSocket: http://localhost:8084/health"

echo "📋 Tailing logs (press Ctrl+C to stop)..."
docker compose logs -f
