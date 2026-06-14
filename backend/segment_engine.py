"""Evaluates filter rules against customers in the database."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from models import Customer, Order
from typing import List


def _days_since(dt: datetime) -> int:
    if dt is None:
        return 99999
    return (datetime.utcnow() - dt).days


def _customer_matches(customer: Customer, conditions: list, logic: str) -> bool:
    results = []
    for cond in conditions:
        field = cond["field"]
        op = cond["op"]
        value = cond["value"]

        if field == "total_spent":
            actual = customer.total_spent or 0
        elif field == "visit_count":
            actual = customer.visit_count or 0
        elif field == "days_since_last_purchase":
            actual = _days_since(customer.last_purchase_date)
        elif field == "city":
            result = _compare_str(customer.city or "", op, str(value))
            results.append(result)
            continue
        elif field == "tags":
            result = value in (customer.tags or [])
            results.append(result)
            continue
        else:
            results.append(False)
            continue

        results.append(_compare_num(actual, op, float(value)))

    if not results:
        return True
    if logic == "OR":
        return any(results)
    return all(results)


def _compare_num(actual, op, value) -> bool:
    ops = {
        "gt": actual > value,
        "lt": actual < value,
        "gte": actual >= value,
        "lte": actual <= value,
        "eq": actual == value,
    }
    return ops.get(op, False)


def _compare_str(actual: str, op: str, value: str) -> bool:
    if op in ("eq", "="):
        return actual.lower() == value.lower()
    if op == "contains":
        return value.lower() in actual.lower()
    return False


def get_matching_customers(db: Session, filter_rules: dict) -> List[Customer]:
    conditions = filter_rules.get("conditions", [])
    logic = filter_rules.get("logic", "AND")
    all_customers = db.query(Customer).all()
    return [c for c in all_customers if _customer_matches(c, conditions, logic)]
