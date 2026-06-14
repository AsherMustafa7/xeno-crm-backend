from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import get_db
from models import Communication, Campaign
from schemas import ReceiptCallback

router = APIRouter(prefix="/api/receipts", tags=["receipts"])


@router.post("")
def receive_receipt(body: ReceiptCallback, db: Session = Depends(get_db)):
    comm = db.query(Communication).filter(Communication.id == body.communication_id).first()
    if not comm:
        return {"ok": False, "reason": "communication not found"}

    now = body.timestamp or datetime.utcnow()
    prev_status = comm.status

    status_order = ["sent", "delivered", "opened", "clicked", "failed"]
    # Only advance status (or allow failed at any point)
    if body.status == "failed":
        comm.status = "failed"
    elif body.status in status_order:
        curr_idx = status_order.index(prev_status) if prev_status in status_order else 0
        new_idx = status_order.index(body.status)
        if new_idx > curr_idx:
            comm.status = body.status

    if body.status == "delivered" and not comm.delivered_at:
        comm.delivered_at = now
    elif body.status == "opened" and not comm.opened_at:
        comm.opened_at = now
        if not comm.delivered_at:
            comm.delivered_at = now
    elif body.status == "clicked" and not comm.clicked_at:
        comm.clicked_at = now
        if not comm.opened_at:
            comm.opened_at = now
        if not comm.delivered_at:
            comm.delivered_at = now

    db.commit()

    # Update campaign aggregate counters
    _update_campaign_stats(comm.campaign_id, db)
    return {"ok": True}


def _update_campaign_stats(campaign_id: int, db: Session):
    from sqlalchemy import func
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return

    comms = db.query(Communication).filter(Communication.campaign_id == campaign_id).all()
    campaign.delivered = sum(1 for c in comms if c.status in ("delivered", "opened", "clicked"))
    campaign.failed = sum(1 for c in comms if c.status == "failed")
    campaign.opened = sum(1 for c in comms if c.status in ("opened", "clicked"))
    campaign.clicked = sum(1 for c in comms if c.status == "clicked")
    db.commit()
