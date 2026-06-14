"""Seed the database with realistic fake data."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from faker import Faker
import random
from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, Customer, Order

fake = Faker("en_IN")

CATEGORIES = ["Footwear", "Apparel", "Accessories", "Bags", "Sportswear", "Ethnic Wear", "Western Wear"]
PRODUCTS = {
    "Footwear": ["Running Shoes", "Casual Sneakers", "Loafers", "Heels", "Sandals", "Boots"],
    "Apparel": ["Slim Fit Jeans", "Graphic Tee", "Polo Shirt", "Kurti", "Palazzo", "Blazer"],
    "Accessories": ["Sunglasses", "Watch", "Belt", "Cap", "Scarf"],
    "Bags": ["Tote Bag", "Backpack", "Clutch", "Sling Bag", "Laptop Bag"],
    "Sportswear": ["Track Pants", "Sports Tee", "Compression Shorts", "Sports Bra", "Gym Gloves"],
    "Ethnic Wear": ["Saree", "Kurta Set", "Lehenga", "Anarkali", "Sherwani"],
    "Western Wear": ["Dress", "Jumpsuit", "Co-ord Set", "Crop Top", "Skirt"],
}
CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat"]
TAGS = ["vip", "new", "churned", "loyal", "seasonal", "high-value"]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Customer).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    print("Seeding customers and orders...")
    now = datetime.utcnow()

    customers = []
    for _ in range(150):
        days_old = random.randint(30, 730)
        joined = now - timedelta(days=days_old)
        customer = Customer(
            name=fake.name(),
            email=fake.unique.email(),
            phone=fake.phone_number()[:15],
            city=random.choice(CITIES),
            total_spent=0.0,
            visit_count=0,
            last_purchase_date=None,
            tags=random.sample(TAGS, k=random.randint(0, 2)),
            created_at=joined,
        )
        customers.append(customer)
        db.add(customer)

    db.commit()
    for c in customers:
        db.refresh(c)

    for customer in customers:
        num_orders = random.choices(
            [0, 1, 2, 3, 4, 5, 8, 12],
            weights=[5, 15, 25, 25, 15, 8, 5, 2],
            k=1
        )[0]
        total = 0.0
        last_date = None
        for i in range(num_orders):
            days_ago = random.randint(1, min(365, (datetime.utcnow() - customer.created_at).days or 1))
            order_date = now - timedelta(days=days_ago)
            cat = random.choice(CATEGORIES)
            product = random.choice(PRODUCTS[cat])
            amount = round(random.uniform(299, 4999), 2)
            order = Order(
                customer_id=customer.id,
                amount=amount,
                product_name=product,
                product_category=cat,
                created_at=order_date,
            )
            db.add(order)
            total += amount
            if last_date is None or order_date > last_date:
                last_date = order_date

        customer.total_spent = round(total, 2)
        customer.visit_count = num_orders
        customer.last_purchase_date = last_date

    db.commit()
    print(f"Seeded {len(customers)} customers with orders.")
    db.close()


if __name__ == "__main__":
    seed()
