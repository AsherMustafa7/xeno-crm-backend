from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


class OrderBase(BaseModel):
    amount: float
    product_name: str
    product_category: str


class OrderOut(OrderBase):
    id: int
    customer_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    tags: Optional[List[str]] = []


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int
    total_spent: float
    visit_count: int
    last_purchase_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerDetail(CustomerOut):
    orders: List[OrderOut] = []

    class Config:
        from_attributes = True


# Filter rule: {"field": "total_spent", "op": "gt", "value": 500}
class FilterCondition(BaseModel):
    field: str
    op: str        # gt, lt, gte, lte, eq, contains
    value: Any


class FilterRules(BaseModel):
    conditions: List[FilterCondition]
    logic: str = "AND"   # AND or OR


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filter_rules: FilterRules


class SegmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    filter_rules: dict
    customer_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignCreate(BaseModel):
    name: str
    segment_id: int
    message_template: str
    channel: str = "email"


class CampaignOut(BaseModel):
    id: int
    name: str
    segment_id: int
    message_template: str
    channel: str
    status: str
    total_sent: int
    delivered: int
    failed: int
    opened: int
    clicked: int
    created_at: datetime
    sent_at: Optional[datetime]

    class Config:
        from_attributes = True


class CommunicationOut(BaseModel):
    id: int
    campaign_id: int
    customer_id: int
    message: str
    channel: str
    status: str
    created_at: datetime
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReceiptCallback(BaseModel):
    communication_id: int
    status: str   # delivered, failed, opened, clicked
    timestamp: Optional[datetime] = None


class AIParseRequest(BaseModel):
    natural_language: str


class AIMessageRequest(BaseModel):
    segment_name: str
    segment_description: Optional[str] = None
    channel: str
    brand_name: Optional[str] = "our brand"
    tone: Optional[str] = "friendly"
