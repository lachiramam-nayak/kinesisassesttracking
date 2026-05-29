from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import httpx
import asyncio
import base64
import smtplib
from io import BytesIO
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Kinesis API Configuration
KINESIS_API_BASE = os.environ.get('KINESIS_API_BASE', 'https://api.alpha.atollkinesis.com/v1')
KINESIS_SITE_ID = os.environ.get('KINESIS_SITE_ID', 'atoll_demo')
KINESIS_API_KEY = os.environ.get('KINESIS_API_KEY', '')

# Email alert configuration
ALERT_EMAIL_ENABLED = os.environ.get('ALERT_EMAIL_ENABLED', 'false').lower() == 'true'
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
ALERT_FROM_EMAIL = os.environ.get('ALERT_FROM_EMAIL', SMTP_USERNAME)
ALERT_TO_EMAIL = os.environ.get('ALERT_TO_EMAIL', '')
OFFLINE_ALERT_GRACE_SECONDS = int(os.environ.get('OFFLINE_ALERT_GRACE_SECONDS', '30'))
OFFLINE_ALERT_POLL_SECONDS = int(os.environ.get('OFFLINE_ALERT_POLL_SECONDS', '15'))

# In-memory storage (no MongoDB)
floor_plan_storage = {
    'image': None,
    'width': 800,
    'height': 600,
    'anchors': []
}

tag_alert_state = {}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def email_alert_configured():
    placeholder_password = SMTP_PASSWORD == 'PASTE_YOUR_GMAIL_APP_PASSWORD_HERE'
    return all([
        ALERT_EMAIL_ENABLED,
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USERNAME,
        SMTP_PASSWORD,
        not placeholder_password,
        ALERT_FROM_EMAIL,
        ALERT_TO_EMAIL,
    ])

def send_email(subject: str, body: str):
    if not email_alert_configured():
        logger.warning("Offline alert email is enabled but SMTP settings are incomplete.")
        return False

    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = ALERT_FROM_EMAIL
    message['To'] = ALERT_TO_EMAIL
    message.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except Exception as e:
        logger.error(f"Failed to send offline alert email: {str(e)}")
        return False

async def send_offline_email_alert(tag):
    device_id = tag.get('device_id', 'unknown')
    last_seen = tag.get('last_seen') or 'unknown'
    position_ref = tag.get('position_ref') or 'unknown'
    battery = tag.get('battery')
    battery_text = f"{battery} mV" if battery is not None else "unknown"

    subject = f"Kinesis Alert: Tag offline - {device_id}"
    body = (
        "A BLE tag has gone offline.\n\n"
        f"Device ID: {device_id}\n"
        f"Status: {tag.get('status', 'offline')}\n"
        f"Last seen: {last_seen}\n"
        f"Position reference: {position_ref}\n"
        f"Battery: {battery_text}\n"
        f"Alert time UTC: {datetime.now(timezone.utc).isoformat()}\n"
    )

    return await asyncio.to_thread(send_email, subject, body)

async def process_offline_alerts(tags):
    now = datetime.now(timezone.utc)

    for tag in tags:
        device_id = tag.get('device_id')
        if not device_id:
            continue

        status = tag.get('status', 'offline')
        state = tag_alert_state.setdefault(device_id, {
            'status': status,
            'offline_since': None,
            'alert_sent': False,
            'seen_online': status == 'online',
        })

        if status == 'online':
            state['status'] = status
            state['offline_since'] = None
            state['alert_sent'] = False
            state['seen_online'] = True
            continue

        if not state['seen_online']:
            state['status'] = status
            continue

        if state['status'] == 'online':
            state['offline_since'] = now

        state['status'] = status
        if state['offline_since'] is None:
            continue

        offline_seconds = (now - state['offline_since']).total_seconds()

        if status == 'offline' and not state['alert_sent'] and offline_seconds >= OFFLINE_ALERT_GRACE_SECONDS:
            sent = await send_offline_email_alert(tag)
            state['alert_sent'] = sent

async def offline_alert_monitor():
    while True:
        try:
            tags_data = await fetch_tag_status()
            tags = [build_tag_status(tag_data) for tag_data in tags_data]
            await process_offline_alerts(tags)
        except Exception as e:
            logger.error(f"Offline alert monitor error: {str(e)}")
        await asyncio.sleep(OFFLINE_ALERT_POLL_SECONDS)

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
    battery: Optional[int] = None
    motion_state: Optional[str] = None
    event: Optional[str] = None
    temperature: Optional[float] = None
    temperature_field: Optional[str] = None
    humidity: Optional[float] = None
    humidity_field: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

class TrackingHistory(BaseModel):
    device_id: str
    timestamp: str
    position_ref: str
    x: Optional[float] = None
    y: Optional[float] = None

async def get_kinesis_headers():
    return {'Authorization': f'Bearer {KINESIS_API_KEY}', 'Content-Type': 'application/json'}

async def fetch_tag_status():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = await get_kinesis_headers()
            url = f"{KINESIS_API_BASE}/sites/{KINESIS_SITE_ID}/tagd/status"
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json().get('data', [])
            return []
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return []

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
        logger.error(f"Error: {str(e)}")
        return []

def calculate_tag_position(position_ref: str):
    for anchor in floor_plan_storage['anchors']:
        if anchor['device_id'] == position_ref:
            import random
            return anchor['x'] + random.uniform(-20, 20), anchor['y'] + random.uniform(-20, 20)
    return None, None

def normalize_key(key: str):
    return ''.join(ch for ch in str(key).lower() if ch.isalnum())

def coerce_float(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = (
            value.strip()
            .replace('%', '')
            .replace('degC', '')
            .replace('C', '')
            .strip()
        )
        cleaned = ''.join(ch for ch in cleaned if ch.isdigit() or ch in '.-')
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    if isinstance(value, dict):
        for nested_key in ('value', 'val', 'v', 'reading', 'current'):
            nested_value = coerce_float(value.get(nested_key))
            if nested_value is not None:
                return nested_value
    return None

def iter_telemetry_values(data, prefix=''):
    if isinstance(data, dict):
        for key, value in data.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            yield from iter_telemetry_values(value, path)
    elif isinstance(data, list):
        for index, value in enumerate(data):
            path = f"{prefix}.{index}" if prefix else str(index)
            yield from iter_telemetry_values(value, path)
    else:
        yield prefix, data

def extract_telemetry_value(telemetry, exact_fields, fuzzy_matcher):
    if not isinstance(telemetry, dict):
        return None, None

    exact = {normalize_key(field) for field in exact_fields}
    fuzzy_match = None

    for path, value in iter_telemetry_values(telemetry):
        numeric_value = coerce_float(value)
        if numeric_value is None:
            continue

        leaf_key = path.split('.')[-1]
        normalized_leaf = normalize_key(leaf_key)
        normalized_path = normalize_key(path)

        if normalized_leaf in exact or normalized_path in exact:
            return numeric_value, path

        if fuzzy_match is None and fuzzy_matcher(normalized_leaf, normalized_path):
            fuzzy_match = (numeric_value, path)

    if fuzzy_match:
        return fuzzy_match

    return None, None

def is_temperature_key(normalized_leaf, normalized_path):
    if 'timestamp' in normalized_leaf or 'timestamp' in normalized_path:
        return False
    return (
        'temperature' in normalized_leaf or
        normalized_leaf in {'temp', 'tempc', 'tagtemp', 'ambienttemp', 'objecttemp', 'envtemp'} or
        normalized_leaf.endswith('temp')
    )

def is_humidity_key(normalized_leaf, normalized_path):
    return (
        'humidity' in normalized_leaf or
        'humid' in normalized_leaf or
        normalized_leaf in {'rh', 'relhum', 'relativehumidity', 'humiditypercent'}
    )

def build_tag_status(tag_data):
    latest_trac = tag_data.get('latest_trac', {})
    position_ref = latest_trac.get('pos_ref') if latest_trac else None
    latest_tele = tag_data.get('latest_tele', {}) or {}
    x, y = calculate_tag_position(position_ref) if position_ref else (None, None)

    temperature, temperature_field = extract_telemetry_value(
        latest_tele,
        (
            'temperature',
            'temperature_c',
            'temperatureC',
            'temp',
            'temp_c',
            'tempC',
            'tag_temperature',
            'ambient_temperature',
            'object_temperature',
            'env_temperature',
        ),
        is_temperature_key,
    )
    humidity, humidity_field = extract_telemetry_value(
        latest_tele,
        (
            'humidity',
            'humidity_percent',
            'relative_humidity',
            'relativeHumidity',
            'rh',
            'hum',
            'humid',
            'rel_humidity',
        ),
        is_humidity_key,
    )

    return {
        'device_id': tag_data.get('device_id'),
        'status': tag_data.get('status', 'offline'),
        'last_seen': tag_data.get('last_seen'),
        'position_ref': position_ref,
        'battery': latest_tele.get('batt') if latest_tele else None,
        'motion_state': latest_tele.get('motion_state') if latest_tele else None,
        'event': latest_tele.get('event') if latest_tele else None,
        'temperature': temperature,
        'temperature_field': temperature_field,
        'humidity': humidity,
        'humidity_field': humidity_field,
        'telemetry_fields': list(latest_tele.keys()) if isinstance(latest_tele, dict) else [],
        'x': x,
        'y': y,
    }

@api_router.get("/")
async def root():
    return {"message": "Kinesis RTLS Platform"}

@api_router.get("/tags/status")
async def get_tags_status():
    raw_tags = await fetch_tag_status()
    return [build_tag_status(tag_data) for tag_data in raw_tags]

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
            'x': x,
            'y': y
        })
    return history

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
    alerts = sum(1 for t in tags if t.get('latest_tele', {}).get('event') in ['free_fall', 'long_press'])
    return {'total_assets': total, 'active_assets': active, 'alerts': alerts, 'offline_assets': total - active}

active_connections: List[WebSocket] = []

@app.on_event("startup")
async def startup_event():
    if ALERT_EMAIL_ENABLED:
        asyncio.create_task(offline_alert_monitor())

@app.websocket("/api/ws/rtls")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            tags_data = await fetch_tag_status()
            tags = [build_tag_status(tag_data) for tag_data in tags_data]
            await websocket.send_json({'type': 'tag_update', 'data': tags})
            await asyncio.sleep(3)
    except:
        if websocket in active_connections:
            active_connections.remove(websocket)

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=['*'], allow_methods=["*"], allow_headers=["*"])
