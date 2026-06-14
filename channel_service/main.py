"""
Stubbed Channel Service — simulates WhatsApp/SMS/Email delivery lifecycle.
Receives a send request, waits a random delay, then calls back the CRM
with a simulated delivery status (and optionally open/click events).
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import httpx
import asyncio
import random
from datetime import datetime

app = FastAPI(title="Xeno Channel Service (Stub)", version="1.0.0")


class SendRequest(BaseModel):
    communication_id: int
    customer_id: int
    customer_name: str
    message: str
    channel: str  # email, sms, whatsapp
    callback_url: str


# Delivery simulation probabilities per channel
CHANNEL_PROFILES = {
    "email":    {"deliver": 0.92, "open": 0.38, "click": 0.12, "fail": 0.08},
    "sms":      {"deliver": 0.97, "open": 0.82, "click": 0.05, "fail": 0.03},
    "whatsapp": {"deliver": 0.95, "open": 0.75, "click": 0.20, "fail": 0.05},
}

DEFAULT_PROFILE = {"deliver": 0.90, "open": 0.40, "click": 0.10, "fail": 0.10}


async def simulate_delivery(req: SendRequest):
    profile = CHANNEL_PROFILES.get(req.channel, DEFAULT_PROFILE)

    # Step 1: Delivery (1–4 sec delay)
    await asyncio.sleep(random.uniform(1, 4))

    if random.random() < profile["fail"]:
        await _callback(req.callback_url, req.communication_id, "failed")
        return

    await _callback(req.callback_url, req.communication_id, "delivered")

    # Step 2: Open (30–90 sec delay, probabilistic)
    if random.random() < profile["open"]:
        await asyncio.sleep(random.uniform(5, 30))
        await _callback(req.callback_url, req.communication_id, "opened")

        # Step 3: Click (only if opened)
        if random.random() < profile["click"]:
            await asyncio.sleep(random.uniform(2, 10))
            await _callback(req.callback_url, req.communication_id, "clicked")


async def _callback(url: str, comm_id: int, status: str):
    payload = {
        "communication_id": comm_id,
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
    except Exception as e:
        print(f"[Channel Service] Callback failed for comm {comm_id} -> {status}: {e}")


@app.post("/send")
async def send_message(req: SendRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(simulate_delivery, req)
    return {"accepted": True, "communication_id": req.communication_id}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"service": "Xeno Channel Service (Stub)", "status": "ok"}
