from fastapi import APIRouter, HTTPException
import os
import json
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from schemas import AIParseRequest, AIMessageRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

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
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        system_instruction=system_prompt
    )
    response = model.generate_content(user_prompt)
    return response.text.strip()


@router.post("/parse-segment")
def parse_segment(body: AIParseRequest):
    try:
        raw = _call_gemini(SEGMENT_SYSTEM_PROMPT, body.natural_language)
        # Strip markdown code blocks if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        return {"filter_rules": parsed, "ok": True}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="AI returned invalid JSON. Try rephrasing.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/draft-message")
def draft_message(body: AIMessageRequest):
    user_prompt = f"""Segment: {body.segment_name}
Description: {body.segment_description or "N/A"}
Channel: {body.channel}
Brand: {body.brand_name}
Tone: {body.tone}

Write the marketing message:"""

    try:
        message = _call_gemini(MESSAGE_SYSTEM_PROMPT, user_prompt)
        return {"message": message, "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
