from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import get_db
from models import Segment
from schemas import SegmentCreate, SegmentOut
from segment_engine import get_matching_customers

router = APIRouter(prefix="/api/segments", tags=["segments"])


@router.get("", response_model=list[SegmentOut])
def list_segments(db: Session = Depends(get_db)):
    return db.query(Segment).order_by(Segment.created_at.desc()).all()


@router.post("/preview")
def preview_segment(body: SegmentCreate, db: Session = Depends(get_db)):
    rules = body.filter_rules.model_dump()
    matching = get_matching_customers(db, rules)
    return {"count": len(matching), "sample": [{"id": c.id, "name": c.name, "email": c.email} for c in matching[:5]]}


@router.post("", response_model=SegmentOut)
def create_segment(body: SegmentCreate, db: Session = Depends(get_db)):
    rules = body.filter_rules.model_dump()
    matching = get_matching_customers(db, rules)
    segment = Segment(
        name=body.name,
        description=body.description,
        filter_rules=rules,
        customer_count=len(matching),
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


@router.get("/{segment_id}", response_model=SegmentOut)
def get_segment(segment_id: int, db: Session = Depends(get_db)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return seg


@router.get("/{segment_id}/customers")
def get_segment_customers(segment_id: int, db: Session = Depends(get_db)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    matching = get_matching_customers(db, seg.filter_rules)
    return [{"id": c.id, "name": c.name, "email": c.email, "city": c.city, "total_spent": c.total_spent} for c in matching]
