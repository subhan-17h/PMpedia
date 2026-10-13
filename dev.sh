#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

case "${1:-start}" in
  start)
    echo ""
    echo "▶  Starting backend..."
    cd "$BACKEND"
    source venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
    BACKEND_PID=$!

    echo "▶  Starting frontend..."
    cd "$FRONTEND"
    npm run dev &
    FRONTEND_PID=$!

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  PMPedia is running"
    echo ""
    echo "  Frontend  →  http://localhost:5173"
    echo "  Backend   →  http://localhost:8001"
    echo "  Health    →  http://localhost:8001/api/health"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Press Ctrl+C to stop everything."
    echo ""

    trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
    wait
    ;;

  stop)
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    echo "Stopped."
    ;;

  *)
    echo "Usage: $0 [start|stop]"
    exit 1
    ;;
esac
