from fastapi import FastAPI, APIRouter, WebSocket, HTTPException, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import httpx
import asyncio
import base64
import json
from io import BytesIO
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

KINESIS_API_BASE = os.environ.get('KINESIS_API_BASE', 'https://api.alpha.atollkinesis.com/v1')
KINESIS_SITE_ID = os.environ.get('KINESIS_SITE_ID', 'atoll_demo')
KINESIS_API_KEY = os.environ.get('KINESIS_API_KEY', '')

ASSET_METADATA_FILE = ROOT_DIR / 'asset_metadata.json'

floor_plan_storage = {
    'image': None,
    'width': 800,
    'height': 600,
    'anchors': []
}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Keeps UI stable if upstream Kinesis has a temporary error
last_good_tags_by_id: dict = {}


class Anchor(BaseModel):
    id: str
    device_id: str
    name: str
    x: float
    y: float
    status: str = "offline"


class TagStatus(BaseModel):
    device_id: str
    status: str
    last_seen: Optional[str] = None
    position_ref: Optional[str] = None
    location_name: Optional[str] = None
    battery: Optional[int] = None
    motion_state: Optional[str] = None
    event: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class TrackingHistory(BaseModel):
    device_id: str
    timestamp: str
    position_ref: str
    x: Optional[float] = None
    y: Optional[float] = None


class AssetMetadata(BaseModel):
    device_id: str
    asset_name: Optional[str] = ''
    asset_type: Optional[str] = ''
    asset_id: Optional[str] = ''
    department: Optional[str] = ''
    ward: Optional[str] = ''
    maintenance_status: Optional[str] = 'none'


def load_asset_metadata() -> Dict[str, dict]:
    try:
        if ASSET_METADATA_FILE.exists():
            with open(ASSET_METADATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except Exception as e:
        logger.error(f"Failed to load asset metadata: {str(e)}")
    return {}


def save_asset_metadata(metadata: Dict[str, dict]) -> None:
    try:
        with open(ASSET_METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save asset metadata: {str(e)}")
        raise


asset_metadata_storage: Dict[str, dict] = load_asset_metadata()


async def get_kinesis_headers():
    return {'Authorization': f'Bearer {KINESIS_API_KEY}', 'Content-Type': 'application/json'}


async def fetch_tag_status():
    global last_good_tags_by_id
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = await get_kinesis_headers()
            url = f"{KINESIS_API_BASE}/sites/{KINESIS_SITE_ID}/tagd/status"
            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json().get('data', [])
                if isinstance(data, list) and len(data) > 0:
                    # Update cache per individual tag, not the whole list
                    for tag in data:
                        device_id = tag.get('device_id')
                        if device_id:
                            last_good_tags_by_id[device_id] = tag
                    return list(last_good_tags_by_id.values())

            logger.warning(f"Kinesis returned {response.status_code}, serving per-tag cache")
            return list(last_good_tags_by_id.values())

    except Exception as e:
        logger.error(f"Error fetching tags: {str(e)}")
        return list(last_good_tags_by_id.values())


async def fetch_tracking_history(device_id: str, hours: int = 8):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = await get_kinesis_headers()
            after_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
            url = f"{KINESIS_API_BASE}/sites/{KINESIS_SITE_ID}/tagd/trac"
            params = {'device_id': device_id, 'after': after_time, 'limit': 100, 'sort': 'time'}
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                return response.json().get('data', [])
            return []
    except Exception as e:
        logger.error(f"Error fetching tracking history: {str(e)}")
        return []


def get_anchor_by_device_id(device_id: Optional[str]):
    if not device_id:
        return None
    for anchor in floor_plan_storage['anchors']:
        if anchor.get('device_id') == device_id:
            return anchor
    return None


def resolve_location_name(position_ref: Optional[str]) -> Optional[str]:
    anchor = get_anchor_by_device_id(position_ref)
    if anchor:
        # If a friendly anchor name exists, show that everywhere.
        # If not, fall back to the raw MAC/device_id.
        return anchor.get('name') or anchor.get('device_id')
    return position_ref


def calculate_tag_position(position_ref: Optional[str]):
    anchor = get_anchor_by_device_id(position_ref)
    if anchor:
        import random
        return anchor['x'] + random.uniform(-20, 20), anchor['y'] + random.uniform(-20, 20)
    return None, None


def normalize_tag_data(tag_data: dict):
    latest_trac = tag_data.get('latest_trac', {}) or {}
    latest_tele = tag_data.get('latest_tele', {}) or {}

    position_ref = latest_trac.get('pos_ref')
    x, y = calculate_tag_position(position_ref) if position_ref else (None, None)

    # These event values now flow through to frontend:
    # free_fall, long_press, btn_1click, btn_2click
    event = latest_tele.get('event')

    return {
        'device_id': tag_data.get('device_id'),
        'status': tag_data.get('status', 'offline'),
        'last_seen': tag_data.get('last_seen') or latest_trac.get('timestamp'),
        'position_ref': position_ref,
        'location_name': resolve_location_name(position_ref),
        'battery': latest_tele.get('batt'),
        'motion_state': latest_tele.get('motion_state'),
        'event': event,
        'x': x,
        'y': y
    }


@api_router.get("/")
async def root():
    return {"message": "Kinesis RTLS Platform"}


@api_router.get("/tags/status")
async def get_tags_status():
    raw_tags = await fetch_tag_status()
    return [normalize_tag_data(tag_data) for tag_data in raw_tags]


@api_router.get("/tags/{device_id}/history")
async def get_tag_history(device_id: str, hours: int = 8):
    raw_history = await fetch_tracking_history(device_id, hours)
    history = []
    for entry in raw_history:
        trac_data = entry.get('trac', {})
        position_ref = trac_data.get('ref')
        x, y = calculate_tag_position(position_ref) if position_ref else (None, None)
        history.append({
            'device_id': device_id,
            'timestamp': entry.get('device_ts') or entry.get('server_ts'),
            'position_ref': position_ref,
            'location_name': resolve_location_name(position_ref),
            'x': x,
            'y': y
        })
    return history


@api_router.get("/assets/metadata")
async def get_asset_metadata():
    return asset_metadata_storage


@api_router.get("/assets/metadata/{device_id}")
async def get_asset_metadata_by_device(device_id: str):
    if device_id not in asset_metadata_storage:
        raise HTTPException(status_code=404, detail="Asset metadata not found")
    return asset_metadata_storage[device_id]


@api_router.post("/assets/metadata")
async def create_or_update_asset_metadata(asset: AssetMetadata):
    asset_metadata_storage[asset.device_id] = asset.model_dump()
    save_asset_metadata(asset_metadata_storage)
    return {"success": True, "data": asset_metadata_storage[asset.device_id]}


@api_router.put("/assets/metadata/{device_id}")
async def update_asset_metadata(device_id: str, asset: AssetMetadata):
    if device_id != asset.device_id:
        raise HTTPException(status_code=400, detail="device_id in path and body must match")

    asset_metadata_storage[device_id] = asset.model_dump()
    save_asset_metadata(asset_metadata_storage)
    return {"success": True, "data": asset_metadata_storage[device_id]}


@api_router.get("/assets/live")
async def get_assets_live():
    raw_tags = await fetch_tag_status()
    tags = [normalize_tag_data(tag_data) for tag_data in raw_tags]
    enriched = []

    for tag in tags:
        metadata = asset_metadata_storage.get(tag['device_id'], {})
        enriched.append({
            **tag,
            'metadata': metadata
        })

    return enriched


@api_router.get("/floor-plan")
async def get_floor_plan():
    return floor_plan_storage


@api_router.post("/floor-plan/image")
async def upload_floor_plan_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        width, height = image.size
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        floor_plan_storage['image'] = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
        floor_plan_storage['width'] = width
        floor_plan_storage['height'] = height
        return {"success": True, "width": width, "height": height}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/floor-plan/anchors")
async def add_anchor(anchor: Anchor):
    for i, a in enumerate(floor_plan_storage['anchors']):
        if a['id'] == anchor.id:
            floor_plan_storage['anchors'][i] = anchor.model_dump()
            return {"success": True}
    floor_plan_storage['anchors'].append(anchor.model_dump())
    return {"success": True}


@api_router.delete("/floor-plan/anchors/{anchor_id}")
async def delete_anchor(anchor_id: str):
    floor_plan_storage['anchors'] = [a for a in floor_plan_storage['anchors'] if a['id'] != anchor_id]
    return {"success": True}


@api_router.get("/stats")
async def get_stats():
    tags = await fetch_tag_status()
    total = len(tags)
    active = sum(1 for t in tags if t.get('status') == 'online')
    alerts = sum(
        1 for t in tags
        if (t.get('latest_tele', {}) or {}).get('event') in ['free_fall', 'long_press', 'btn_1click', 'btn_2click']
    )
    return {
        'total_assets': total,
        'active_assets': active,
        'alerts': alerts,
        'offline_assets': total - active
    }


active_connections: List[WebSocket] = []


@app.websocket("/api/ws/rtls")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            tags_data = await fetch_tag_status()
            tags = [normalize_tag_data(tag_data) for tag_data in tags_data]
            await websocket.send_json({'type': 'tag_update', 'data': tags})
            await asyncio.sleep(3)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=["*"],
    allow_headers=["*"]
)