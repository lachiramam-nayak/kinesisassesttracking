# Kinesis RTLS Monitoring Platform

A modern, real-time location tracking system for BLE-tagged assets built with React, FastAPI, and Kinesis RTLS API.

## Features

- **Home Dashboard** - Overview with KPIs and quick actions  
- **Asset Directory** - Complete searchable list of all tracked assets
- **RTLS Live Tracking** - Real-time floor plan visualization with asset sidebar
- **Floor Plan Management** - Upload floor plans and configure anchor positions
- **Movement History** - Playback historical movement traces

## Running Locally

### Backend

```bash
cd /app/backend
pip install fastapi uvicorn httpx pillow python-dotenv starlette websockets
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at: `https://assest-backend-z6uq.onrender.com`

### Frontend

```bash
cd /app/frontend
yarn install
echo "REACT_APP_BACKEND_URL=https://assest-backend-z6uq.onrender.com" > .env
yarn start
```

Frontend runs at: `http://localhost:3000`

## Remote Access

1. Update `REACT_APP_BACKEND_URL` in frontend/.env to your server IP
2. Ensure ports 8000 and 3000 are accessible
3. Backend listens on 0.0.0.0 by default

## API Endpoints

- `GET /api/stats` - Dashboard statistics
- `GET /api/tags/status` - All tag statuses  
- `GET /api/tags/{id}/history` - Movement history
- `GET /api/floor-plan` - Floor plan config
- `POST /api/floor-plan/image` - Upload floor plan
- `POST /api/floor-plan/anchors` - Add anchor
- `WS /api/ws/rtls` - Real-time WebSocket

## Configuration

Edit `/app/backend/.env`:

```
KINESIS_API_BASE="https://api.alpha.atollkinesis.com/v1"
KINESIS_SITE_ID="atoll_demo"
KINESIS_API_KEY="your_key_here"
CORS_ORIGINS="*"
```

## No MongoDB Required

This application uses **in-memory storage only** - no database installation needed!

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI app (no MongoDB)
│   └── .env              # API credentials
└── frontend/
    ├── src/
    │   ├── pages/        # Home, Assets, RTLS, FloorPlanEdit
    │   ├── components/   # Layout, UI components
    │   └── assets/       # Kinesis logo
    └── package.json
```

## License

Proprietary - Kinesis Location Systems
