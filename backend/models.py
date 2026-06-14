from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    city = Column(String)
    total_spent = Column(Float, default=0.0)
    visit_count = Column(Integer, default=0)
    last_purchase_date = Column(DateTime, nullable=True)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    orders = relationship("Order", back_populates="customer")
    communications = relationship("Communication", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    amount = Column(Float)
    product_name = Column(String)
    product_category = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    customer = relationship("Customer", back_populates="orders")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    filter_rules = Column(JSON)
    customer_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    campaigns = relationship("Campaign", back_populates="segment")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    segment_id = Column(Integer, ForeignKey("segments.id"))
    message_template = Column(Text)
    channel = Column(String, default="email")  # email, sms, whatsapp
    status = Column(String, default="draft")   # draft, sending, sent
    total_sent = Column(Integer, default=0)
    delivered = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    opened = Column(Integer, default=0)
    clicked = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    sent_at = Column(DateTime, nullable=True)

    segment = relationship("Segment", back_populates="campaigns")
    communications = relationship("Communication", back_populates="campaign")


class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    message = Column(Text)
    channel = Column(String)
    status = Column(String, default="pending")  # pending, sent, delivered, failed, opened, clicked
    created_at = Column(DateTime, server_default=func.now())
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)

    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")
