#!/bin/sh
set -e

mkdir -p /app/data

if [ ! -f /app/data/config.json ]; then
    KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    printf '{"encryption_key":"%s"}\n' "$KEY" > /app/data/config.json
    echo "First run: generated encryption key at /app/data/config.json"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
