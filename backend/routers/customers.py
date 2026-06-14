from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import get_db
from models import Customer
from schemas import CustomerOut, CustomerDetail

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=dict)
def list_customers(
    search: Optional[str] = None,
    city: Optional[str] = None,
    tag: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Customer)
    if search:
        query = query.filter(
            Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%")
        )
    if city:
        query = query.filter(Customer.city == city)
    if tag:
        query = query.filter(Customer.tags.contains([tag]))

    total = query.count()
    customers = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "customers": [CustomerOut.model_validate(c) for c in customers],
    }


@router.get("/stats")
def customer_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(Customer).count()
    total_revenue = db.query(func.sum(Customer.total_spent)).scalar() or 0
    avg_spent = db.query(func.avg(Customer.total_spent)).scalar() or 0
    cities = db.query(Customer.city, func.count(Customer.id)).group_by(Customer.city).all()
    return {
        "total_customers": total,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": round(avg_spent, 2),
        "cities": [{"city": c[0], "count": c[1]} for c in cities],
    }


@router.get("/{customer_id}", response_model=CustomerDetail)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
