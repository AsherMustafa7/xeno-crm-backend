from fastapi import APIRouter, HTTPException
import os
import re
import json
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from schemas import AIParseRequest, AIMessageRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_api_key():
    key = os.getenv("GEMINI_API_KEY", "")
    if key and key != "your_gemini_api_key_here":
        return key
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    try:
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


SUPPORTED_FIELDS = {
    "total_spent": "total amount spent by the customer in INR (float)",
    "visit_count": "number of purchases/orders made (integer)",
    "days_since_last_purchase": "days since last purchase (integer)",
    "city": "city name (string)",
    "tags": "customer tag, one of: vip, new, churned, loyal, seasonal, high-value (string)",
}

SEGMENT_SYSTEM_PROMPT = f"""You are an AI assistant for a CRM platform. Your job is to convert a marketer's natural language segment description into structured filter rules.

Available fields:
{json.dumps(SUPPORTED_FIELDS, indent=2)}

Available operators:
- For numbers: "gt" (greater than), "lt" (less than), "gte" (>=), "lte" (<=), "eq" (equals)
- For strings: "eq" (exact match), "contains" (partial match)
- For tags: "eq" (tag name)

Output ONLY valid JSON in this exact format, no explanation:
{{
  "conditions": [
    {{"field": "field_name", "op": "operator", "value": value}}
  ],
  "logic": "AND"
}}

Use "OR" for logic only when the user explicitly says "or". Default to "AND".
"""

MESSAGE_SYSTEM_PROMPT = """You are a marketing copywriter for a D2C fashion brand CRM.
Write a short, personalized marketing message for the given audience segment.
The message should:
- Be 2-3 sentences max
- Start with "Hi {{name}},"
- Be warm, relevant, and action-oriented
- Include a clear call to action
- Match the specified channel (email is longer, SMS/WhatsApp is very short)
- Match the specified tone

Output ONLY the message text, nothing else."""


def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    api_key = _get_api_key()
    if not api_key or api_key == "your_gemini_api_key_here":
        return None  # Signal to use fallback

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash", system_instruction=system_prompt)
        response = model.generate_content(user_prompt)
        return response.text.strip()
    except Exception:
        return None  # Fall through to local fallback


# ── Local NLP fallback (no API needed) ──────────────────────────────────────

CITIES = ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "pune",
          "kolkata", "ahmedabad", "jaipur", "surat"]

TAGS = ["vip", "new", "churned", "loyal", "seasonal", "high-value"]

def _local_parse_segment(text: str) -> dict:
    # Normalize smart quotes to straight quotes before processing
    text_l = text.lower().replace('’', "'").replace('‘', "'")
    conditions = []
    logic = "OR" if " or " in text_l else "AND"

    # Spent patterns: "spent more than 2000", "spent over ₹500", "total spend > 1000"
    spent_gt = re.search(r"(?:spent|spend|spending)\s*(?:more than|over|above|>|greater than)\s*[₹rs\.]?\s*(\d+)", text_l)
    spent_lt = re.search(r"(?:spent|spend|spending)\s*(?:less than|under|below|<)\s*[₹rs\.]?\s*(\d+)", text_l)
    if spent_gt:
        conditions.append({"field": "total_spent", "op": "gt", "value": float(spent_gt.group(1))})
    if spent_lt:
        conditions.append({"field": "total_spent", "op": "lt", "value": float(spent_lt.group(1))})

    # Days since purchase: "haven’t bought in 30 days", "inactive for 60 days", "no purchase in 45 days"
    inactive = re.search(r"(?:haven’?t\s+(?:bought|purchased|ordered)(?:\s+in(?:\s+the\s+last)?)?|inactive\s+for|no\s+purchase\s+in(?:\s+the\s+last)?|not\s+(?:bought|purchased)\s+in(?:\s+the\s+last)?)\s*(\d+)\s*days?", text_l)
    if inactive:
        conditions.append({"field": "days_since_last_purchase", "op": "gt", "value": int(inactive.group(1))})

    # Visit count: "bought more than 3 times", "ordered less than 2 times", "at least 5 purchases"
    vc_gt = re.search(r"(?:bought|ordered|purchased|visited)\s*(?:more than|over|at least|>)\s*(\d+)\s*(?:times?|orders?|purchases?)?", text_l)
    vc_lt = re.search(r"(?:bought|ordered|purchased|visited)\s*(?:less than|fewer than|under|<)\s*(\d+)\s*(?:times?|orders?|purchases?)?", text_l)
    if vc_gt:
        conditions.append({"field": "visit_count", "op": "gt", "value": int(vc_gt.group(1))})
    if vc_lt:
        conditions.append({"field": "visit_count", "op": "lt", "value": int(vc_lt.group(1))})

    # City: "from Mumbai", "in Delhi", "customers in Bangalore"
    for city in CITIES:
        if re.search(rf"(?:from|in|at)\s+{city}|{city}\s+(?:customers?|shoppers?|users?)", text_l):
            conditions.append({"field": "city", "op": "eq", "value": city.capitalize()})
            break

    # Tags: "vip customers", "churned users", "loyal shoppers"
    for tag in TAGS:
        if tag in text_l:
            conditions.append({"field": "tags", "op": "eq", "value": tag})

    if not conditions:
        # Generic fallback: find any number and assume it's a spend threshold
        nums = re.findall(r'\d+', text)
        if nums:
            conditions.append({"field": "total_spent", "op": "gt", "value": float(nums[0])})

    return {"conditions": conditions, "logic": logic}


MESSAGE_TEMPLATES = {
    "whatsapp": "Hi {{name}}, we've got something special for you! {offer} Shop now at fashionbrand.com and get rewarded for your loyalty. Reply STOP to opt out.",
    "sms": "Hi {{name}}, {offer} Visit fashionbrand.com now. Reply STOP to opt out.",
    "email": "Hi {{name}},\n\nWe noticed it's been a while and we miss you! {offer}\n\nAs one of our valued customers, you deserve the best. Click here to explore our latest collection at fashionbrand.com.\n\nSee you soon!\nFashion Brand Team",
}

def _local_draft_message(segment_name: str, channel: str, tone: str) -> str:
    name_l = segment_name.lower()
    if any(w in name_l for w in ["lapsed", "inactive", "churned", "re-engage", "haven't"]):
        offer = "We miss you! Come back and enjoy 20% off your next order with code COMEBACK20."
    elif any(w in name_l for w in ["vip", "high value", "loyal", "top"]):
        offer = "As one of our top customers, enjoy an exclusive early access to our new collection + free shipping!"
    elif any(w in name_l for w in ["new", "first"]):
        offer = "Welcome to the family! Here's 15% off your next purchase with code WELCOME15."
    else:
        offer = "Explore our latest collection and enjoy 10% off with code SPECIAL10."

    template = MESSAGE_TEMPLATES.get(channel, MESSAGE_TEMPLATES["email"])
    return template.format(offer=offer)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/parse-segment")
def parse_segment(body: AIParseRequest):
    # Try Gemini first
    raw = _call_gemini(SEGMENT_SYSTEM_PROMPT, body.natural_language)
    if raw is not None:
        try:
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw)
            return {"filter_rules": parsed, "ok": True, "source": "gemini"}
        except (json.JSONDecodeError, Exception):
            pass

    # Local fallback
    parsed = _local_parse_segment(body.natural_language)
    return {"filter_rules": parsed, "ok": True, "source": "local"}


@router.post("/draft-message")
def draft_message(body: AIMessageRequest):
    user_prompt = f"""Segment: {body.segment_name}
Description: {body.segment_description or "N/A"}
Channel: {body.channel}
Brand: {body.brand_name}
Tone: {body.tone}

Write the marketing message:"""

    # Try Gemini first
    message = _call_gemini(MESSAGE_SYSTEM_PROMPT, user_prompt)
    if message:
        return {"message": message, "ok": True, "source": "gemini"}

    # Local fallback
    message = _local_draft_message(body.segment_name, body.channel, body.tone)
    return {"message": message, "ok": True, "source": "local"}
