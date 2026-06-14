from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import get_db
from models import Campaign, Communication, Customer, Segment

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_customers = db.query(Customer).count()
    total_campaigns = db.query(Campaign).count()
    total_segments = db.query(Segment).count()
    total_revenue = db.query(func.sum(Customer.total_spent)).scalar() or 0

    total_sent = db.query(func.sum(Campaign.total_sent)).scalar() or 0
    total_delivered = db.query(func.sum(Campaign.delivered)).scalar() or 0
    total_opened = db.query(func.sum(Campaign.opened)).scalar() or 0
    total_clicked = db.query(func.sum(Campaign.clicked)).scalar() or 0

    recent_campaigns = (
        db.query(Campaign).order_by(Campaign.created_at.desc()).limit(5).all()
    )

    return {
        "total_customers": total_customers,
        "total_campaigns": total_campaigns,
        "total_segments": total_segments,
        "total_revenue": round(total_revenue, 2),
        "campaign_stats": {
            "total_sent": total_sent,
            "total_delivered": total_delivered,
            "total_opened": total_opened,
            "total_clicked": total_clicked,
            "delivery_rate": round((total_delivered / total_sent * 100) if total_sent else 0, 1),
            "open_rate": round((total_opened / total_delivered * 100) if total_delivered else 0, 1),
            "click_rate": round((total_clicked / total_opened * 100) if total_opened else 0, 1),
        },
        "recent_campaigns": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "total_sent": c.total_sent,
                "delivered": c.delivered,
                "opened": c.opened,
                "clicked": c.clicked,
                "channel": c.channel,
                "sent_at": c.sent_at,
            }
            for c in recent_campaigns
        ],
    }
