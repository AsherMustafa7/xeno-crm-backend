from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime
import httpx
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import get_db
from models import Campaign, Communication, Segment
from schemas import CampaignCreate, CampaignOut
from segment_engine import get_matching_customers

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

CHANNEL_SERVICE_URL = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")
CRM_BASE_URL = os.getenv("CRM_BASE_URL", "http://localhost:8000")


@router.get("", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.post("", response_model=CampaignOut)
def create_campaign(body: CampaignCreate, db: Session = Depends(get_db)):
    seg = db.query(Segment).filter(Segment.id == body.segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    campaign = Campaign(
        name=body.name,
        segment_id=body.segment_id,
        message_template=body.message_template,
        channel=body.channel,
        status="draft",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return c


@router.get("/{campaign_id}/communications")
def get_campaign_comms(campaign_id: int, db: Session = Depends(get_db)):
    comms = db.query(Communication).filter(Communication.campaign_id == campaign_id).limit(100).all()
    return [
        {
            "id": c.id,
            "customer_id": c.customer_id,
            "status": c.status,
            "channel": c.channel,
            "created_at": c.created_at,
        }
        for c in comms
    ]


@router.post("/{campaign_id}/send")
def send_campaign(campaign_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign already sent")

    seg = db.query(Segment).filter(Segment.id == campaign.segment_id).first()
    matching = get_matching_customers(db, seg.filter_rules)

    comms = []
    for customer in matching:
        msg = campaign.message_template.replace("{{name}}", customer.name)
        comm = Communication(
            campaign_id=campaign_id,
            customer_id=customer.id,
            message=msg,
            channel=campaign.channel,
            status="sent",
        )
        db.add(comm)
        comms.append((comm, customer))

    campaign.status = "sending"
    campaign.sent_at = datetime.utcnow()
    campaign.total_sent = len(matching)
    db.commit()

    for comm, _ in comms:
        db.refresh(comm)

    background_tasks.add_task(_dispatch_to_channel_service, campaign_id, comms, db)

    return {"message": f"Campaign sending to {len(matching)} customers", "total": len(matching)}


async def _dispatch_to_channel_service(campaign_id: int, comms, db: Session):
    callback_url = f"{CRM_BASE_URL}/api/receipts"
    async with httpx.AsyncClient(timeout=30) as client:
        for comm, customer in comms:
            try:
                await client.post(f"{CHANNEL_SERVICE_URL}/send", json={
                    "communication_id": comm.id,
                    "customer_id": customer.id,
                    "customer_name": customer.name,
                    "message": comm.message,
                    "channel": comm.channel,
                    "callback_url": callback_url,
                })
            except Exception:
                pass

    # Mark campaign as sent after dispatch
    from database import SessionLocal
    s = SessionLocal()
    try:
        c = s.query(Campaign).filter(Campaign.id == campaign_id).first()
        if c:
            c.status = "sent"
            s.commit()
    finally:
        s.close()
