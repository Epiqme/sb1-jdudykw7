"""Voyager Connect — reconstructed backend.

This FastAPI service reimplements the API contract the Voyager Connect app
expects (every route, request, and response shape is taken directly from the
recovered frontend `src/api.ts`). It is seeded with the real data harvested
from the public API: cruises, deals, community profiles, and booking links.

What this is NOT: the original Emergent source. That code never left their
servers. This is a faithful, self-owned reimplementation that lets the app run
end-to-end on infrastructure you control. Payment/IAP verification are
implemented as clearly-marked stubs — wire in Stripe and Apple's App Store
Server API before taking real money.

Run:  uvicorn server:app --reload --port 8001
The app calls everything under the `/api` prefix.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import store

ADMIN_PIN = os.environ.get("ADMIN_PIN", "0000")
ELITE_PRICE_USD = float(os.environ.get("ELITE_PRICE_USD", "59"))

# Stripe (web payments). When STRIPE_SECRET_KEY is set we take real payments;
# without it, the checkout endpoints fall back to a dev stub that auto-approves
# so the app can be exercised locally.
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
try:
    import stripe  # type: ignore
    if STRIPE_SECRET_KEY:
        stripe.api_key = STRIPE_SECRET_KEY
except Exception:  # pragma: no cover - stripe optional at import time
    stripe = None  # type: ignore

STRIPE_ENABLED = bool(STRIPE_SECRET_KEY) and stripe is not None

# Apple in-app purchase (App Store path). Set APPLE_SHARED_SECRET to verify
# receipts against Apple; without it, the endpoint falls back to a dev stub.
APPLE_SHARED_SECRET = os.environ.get("APPLE_SHARED_SECRET", "")

app = FastAPI(title="Voyager Connect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    store.load_db()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# --------------------------------------------------------------------------- #
# Models (mirror the TypeScript types in the frontend's src/api.ts)
# --------------------------------------------------------------------------- #
class ProfileIn(BaseModel):
    name: str
    age: Optional[int] = None
    home_town: Optional[str] = ""
    cruise_id: Optional[str] = ""
    is_single: bool = False
    bio: Optional[str] = ""
    photo: Optional[str] = ""
    cover_image: Optional[str] = ""
    vibe: Optional[str] = ""


class MessageIn(BaseModel):
    profile_id: str
    name: str
    text: str
    image: Optional[str] = None


class DMSendIn(BaseModel):
    from_id: str
    to_id: str
    text: Optional[str] = None
    image: Optional[str] = None


class DealScanIn(BaseModel):
    quoted_price: float


class CheckoutIn(BaseModel):
    profile_id: str
    cruise_id: str
    origin: str
    confirmation_number: Optional[str] = None


class VerifyCheckoutIn(BaseModel):
    session_id: str


class AppleVerifyIn(BaseModel):
    profile_id: str
    cruise_id: str
    purchase_token: str
    confirmation_number: Optional[str] = None


class AppleRestoreIn(BaseModel):
    profile_id: str
    purchase_tokens: list[str]


class EliteConfirmIn(BaseModel):
    profile_id: str
    confirmation_number: str


class ResolveConfirmationIn(BaseModel):
    confirmation_number: str


class AdminVerifyIn(BaseModel):
    pin: str


class ConfirmationIn(BaseModel):
    confirmation_number: str
    cruise_id: str


class BulkConfirmationIn(BaseModel):
    numbers: str
    cruise_id: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def require_admin(pin: Optional[str]) -> None:
    if not pin or pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid admin pin.")


def profile_public(p: dict) -> dict:
    return {
        "id": p.get("id"),
        "name": p.get("name", ""),
        "age": p.get("age"),
        "home_town": p.get("home_town", ""),
        "cruise_id": p.get("cruise_id", ""),
        "is_single": bool(p.get("is_single", False)),
        "bio": p.get("bio", ""),
        "photo": p.get("photo", ""),
        "cover_image": p.get("cover_image", ""),
        "vibe": p.get("vibe", ""),
        "waves_received": int(p.get("waves_received", 0)),
    }


def is_unlocked_for(profile_id: str, cruise_id: str) -> Optional[dict]:
    """Return the unlock record granting this profile access to a cruise."""
    for u in store.find("elite_unlocks", profile_id=profile_id):
        if u.get("cruise_id") in (cruise_id, "all", "general"):
            return u
    return None


def refresh_member_count(cruise_id: str) -> None:
    n = len(store.find("profiles", cruise_id=cruise_id))
    store.update_one("cruises", {"id": cruise_id}, {"member_count": n})


def conversation_id(a: str, b: str) -> str:
    return "_".join(sorted([a, b]))


# --------------------------------------------------------------------------- #
# Health / root
# --------------------------------------------------------------------------- #
@app.get("/api/")
def api_root() -> dict:
    return {"service": "voyager-connect", "status": "ok", "version": "1.0.0"}


# --------------------------------------------------------------------------- #
# Cruises
# --------------------------------------------------------------------------- #
@app.get("/api/cruises")
def list_cruises(region: Optional[str] = None) -> list:
    cruises = store.find("cruises")
    if region and region != "All":
        cruises = [c for c in cruises if c.get("region") == region]
    return cruises


@app.get("/api/cruises/{cruise_id}")
def get_cruise(cruise_id: str) -> dict:
    c = store.find_one("cruises", id=cruise_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cruise not found.")
    return c


# --------------------------------------------------------------------------- #
# Profiles
# --------------------------------------------------------------------------- #
@app.post("/api/profiles")
def create_profile(body: ProfileIn) -> dict:
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "waves_received": 0,
        "created_at": now_iso(),
    })
    store.insert("profiles", doc)
    if doc.get("cruise_id"):
        refresh_member_count(doc["cruise_id"])
    return profile_public(doc)


@app.get("/api/profiles/{profile_id}")
def get_profile(profile_id: str) -> dict:
    p = store.find_one("profiles", id=profile_id)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile_public(p)


@app.put("/api/profiles/{profile_id}")
def update_profile(profile_id: str, body: ProfileIn) -> dict:
    old = store.find_one("profiles", id=profile_id)
    if not old:
        raise HTTPException(status_code=404, detail="Profile not found.")
    prev_cruise = old.get("cruise_id")
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = store.update_one("profiles", {"id": profile_id}, changes)
    if updated and updated.get("cruise_id") != prev_cruise:
        if prev_cruise:
            refresh_member_count(prev_cruise)
        if updated.get("cruise_id"):
            refresh_member_count(updated["cruise_id"])
    return profile_public(updated)


@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: str) -> dict:
    """Full account deletion — also required by Apple App Store guideline 5.1.1(v)."""
    p = store.find_one("profiles", id=profile_id)
    cruise_id = p.get("cruise_id") if p else None
    store.delete("profiles", id=profile_id)
    store.delete("elite_unlocks", profile_id=profile_id)
    # Remove the user's messages and DMs.
    store.delete("messages", profile_id=profile_id)
    for dm in list(store.find("dms")):
        if dm.get("from_id") == profile_id or dm.get("to_id") == profile_id:
            store.delete("dms", id=dm["id"])
    if cruise_id:
        refresh_member_count(cruise_id)
    return {"deleted": True}


@app.post("/api/profiles/{profile_id}/wave")
def wave(profile_id: str) -> dict:
    p = store.find_one("profiles", id=profile_id)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found.")
    updated = store.update_one(
        "profiles", {"id": profile_id},
        {"waves_received": int(p.get("waves_received", 0)) + 1},
    )
    return profile_public(updated)


# --------------------------------------------------------------------------- #
# Members / community
# --------------------------------------------------------------------------- #
@app.get("/api/community/members")
def community_members(singles_only: bool = False) -> list:
    members = [p for p in store.find("profiles") if p.get("name")]
    if singles_only:
        members = [m for m in members if m.get("is_single")]
    return [profile_public(m) for m in members]


@app.get("/api/cruises/{cruise_id}/members")
def cruise_members(cruise_id: str, singles_only: bool = False, profile_id: Optional[str] = None) -> list:
    if not profile_id or not is_unlocked_for(profile_id, cruise_id):
        raise HTTPException(
            status_code=403,
            detail="Unlock Icebreaker Elite for this sailing to view its members.",
        )
    members = store.find("profiles", cruise_id=cruise_id)
    if singles_only:
        members = [m for m in members if m.get("is_single")]
    return [profile_public(m) for m in members if m.get("id") != profile_id]


# --------------------------------------------------------------------------- #
# Cruise chat
# --------------------------------------------------------------------------- #
@app.get("/api/cruises/{cruise_id}/messages")
def get_messages(cruise_id: str, profile_id: Optional[str] = None) -> list:
    if cruise_id != "general":
        if not profile_id or not is_unlocked_for(profile_id, cruise_id):
            raise HTTPException(
                status_code=403,
                detail="Unlock Icebreaker Elite for this sailing to view its chat.",
            )
    msgs = store.find("messages", cruise_id=cruise_id)
    return sorted(msgs, key=lambda m: m.get("created_at", ""))


@app.post("/api/cruises/{cruise_id}/messages")
def send_message(cruise_id: str, body: MessageIn) -> dict:
    doc = {
        "id": new_id(),
        "cruise_id": cruise_id,
        "profile_id": body.profile_id,
        "name": body.name,
        "text": body.text,
        "image": body.image,
        "created_at": now_iso(),
    }
    store.insert("messages", doc)
    return doc


# --------------------------------------------------------------------------- #
# Direct messages
# --------------------------------------------------------------------------- #
@app.get("/api/dm/conversations")
def dm_conversations(me: str) -> list:
    threads: dict[str, list] = {}
    for dm in store.find("dms"):
        if dm.get("from_id") != me and dm.get("to_id") != me:
            continue
        other = dm["to_id"] if dm["from_id"] == me else dm["from_id"]
        threads.setdefault(other, []).append(dm)
    out = []
    for other, msgs in threads.items():
        msgs.sort(key=lambda m: m.get("created_at", ""))
        last = msgs[-1]
        partner = store.find_one("profiles", id=other) or {}
        out.append({
            "partner_id": other,
            "partner_name": partner.get("name", "Sailor"),
            "partner_photo": partner.get("photo", ""),
            "last_text": last.get("text", ""),
            "last_at": last.get("created_at", ""),
            "unread": sum(1 for m in msgs if m.get("to_id") == me and not m.get("read")),
        })
    out.sort(key=lambda c: c.get("last_at", ""), reverse=True)
    return out


@app.get("/api/dm/thread")
def dm_thread(me: str, other: str) -> list:
    cid = conversation_id(me, other)
    msgs = [m for m in store.find("dms", conversation_id=cid)]
    msgs.sort(key=lambda m: m.get("created_at", ""))
    # Mark inbound as read.
    for m in msgs:
        if m.get("to_id") == me and not m.get("read"):
            store.update_one("dms", {"id": m["id"]}, {"read": True})
            m["read"] = True
    return msgs


@app.post("/api/dm/send")
def dm_send(body: DMSendIn) -> dict:
    sender = store.find_one("profiles", id=body.from_id) or {}
    doc = {
        "id": new_id(),
        "conversation_id": conversation_id(body.from_id, body.to_id),
        "from_id": body.from_id,
        "to_id": body.to_id,
        "from_name": sender.get("name", "Sailor"),
        "text": body.text or "",
        "image": body.image,
        "created_at": now_iso(),
        "read": False,
    }
    store.insert("dms", doc)
    return doc


# --------------------------------------------------------------------------- #
# Deals
# --------------------------------------------------------------------------- #
@app.get("/api/deals")
def list_deals() -> list:
    return store.find("deals")


@app.post("/api/deal-scan")
def deal_scan(body: DealScanIn) -> dict:
    """Estimate savings on a quoted price vs booking through the agent.

    The original used the agent's booking margin; here we apply a transparent
    estimate. Tune SAVINGS_RATE to your real numbers.
    """
    rate = float(os.environ.get("SAVINGS_RATE", "0.12"))
    quoted = max(0.0, body.quoted_price)
    savings = round(quoted * rate, 2)
    our_price = round(quoted - savings, 2)
    links = store.get_config("booking_links", {})
    return {
        "quoted_price": quoted,
        "our_price": our_price,
        "estimated_savings": savings,
        "perks": ["Sailor Loot", "Free WiFi", "Bar Tab credit"],
        "message": f"Booking through me you'd pay about ${our_price:,.0f} — an estimated ${savings:,.0f} in savings plus perks.",
        "book_url": links.get("fora_url", ""),
    }


@app.get("/api/booking-links")
def booking_links() -> dict:
    return store.get_config("booking_links", {
        "fora_url": "",
        "firstmates_url": "",
        "agent_name": "",
        "tagline": "",
    })


# --------------------------------------------------------------------------- #
# Elite unlock: confirmation numbers, checkout, Apple IAP
# --------------------------------------------------------------------------- #
def _grant_unlock(profile_id: str, cruise_id: str, method: str) -> dict:
    existing = store.find_one("elite_unlocks", profile_id=profile_id, cruise_id=cruise_id)
    if existing:
        store.update_one(
            "elite_unlocks",
            {"profile_id": profile_id, "cruise_id": cruise_id},
            {"method": method},
        )
        return existing
    doc = {
        "id": new_id(),
        "profile_id": profile_id,
        "cruise_id": cruise_id,
        "method": method,
        "created_at": now_iso(),
    }
    return store.insert("elite_unlocks", doc)


@app.post("/api/confirmations/resolve")
def resolve_confirmation(body: ResolveConfirmationIn) -> dict:
    rec = store.find_one("confirmations", confirmation_number=body.confirmation_number.strip())
    if not rec:
        return {"valid": False, "reason": "Confirmation number not recognized."}
    cruise = store.find_one("cruises", id=rec["cruise_id"])
    if not cruise:
        return {"valid": False, "reason": "Sailing for this confirmation no longer exists."}
    return {"valid": True, "cruise": cruise}


@app.post("/api/elite/confirm")
def elite_confirm(body: EliteConfirmIn) -> dict:
    rec = store.find_one("confirmations", confirmation_number=body.confirmation_number.strip())
    if not rec:
        raise HTTPException(status_code=400, detail="Confirmation number not recognized.")
    _grant_unlock(body.profile_id, rec["cruise_id"], method="booking")
    return {"unlocked": True, "cruise_id": rec["cruise_id"]}


@app.get("/api/elite/status/{profile_id}")
def elite_status(profile_id: str) -> dict:
    unlocks = store.find("elite_unlocks", profile_id=profile_id)
    if not unlocks:
        return {"unlocked": False}
    u = unlocks[0]
    return {"unlocked": True, "method": u.get("method"), "cruise_id": u.get("cruise_id")}


@app.post("/api/checkout/create-session")
def create_checkout(body: CheckoutIn) -> dict:
    """Create a Stripe Checkout session for the Elite unlock (web path).

    With STRIPE_SECRET_KEY set, this creates a real Stripe Checkout session and
    returns Stripe's hosted payment URL. Without it, it falls back to a local
    pending session the app can 'verify' to simulate a purchase in development.
    """
    if STRIPE_ENABLED:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Icebreaker Elite"},
                    "unit_amount": int(round(ELITE_PRICE_USD * 100)),
                },
                "quantity": 1,
            }],
            success_url=f"{body.origin}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{body.origin}?canceled=1",
            metadata={"profile_id": body.profile_id, "cruise_id": body.cruise_id},
        )
        store.insert("elite_unlocks", {
            "id": new_id(),
            "profile_id": body.profile_id,
            "cruise_id": body.cruise_id,
            "method": "pending",
            "session_id": session.id,
            "created_at": now_iso(),
        })
        return {"id": session.id, "url": session.url}

    # Dev fallback (no Stripe key configured).
    session_id = new_id()
    store.insert("elite_unlocks", {
        "id": new_id(),
        "profile_id": body.profile_id,
        "cruise_id": body.cruise_id,
        "method": "pending",
        "session_id": session_id,
        "created_at": now_iso(),
    })
    return {"id": session_id, "url": f"{body.origin}?session_id={session_id}"}


@app.post("/api/checkout/verify")
def verify_checkout(body: VerifyCheckoutIn) -> dict:
    pending = store.find_one("elite_unlocks", session_id=body.session_id)
    if not pending:
        return {"unlocked": False, "payment_status": "not_found"}

    if STRIPE_ENABLED:
        session = stripe.checkout.Session.retrieve(body.session_id)
        if session.payment_status == "paid":
            store.update_one("elite_unlocks", {"session_id": body.session_id}, {"method": "paid"})
            return {"unlocked": True, "payment_status": "paid"}
        return {"unlocked": False, "payment_status": session.payment_status}

    # Dev fallback: assume paid.
    store.update_one("elite_unlocks", {"session_id": body.session_id}, {"method": "paid"})
    return {"unlocked": True, "payment_status": "paid"}


def _verify_apple_receipt(receipt: str) -> bool:
    """Validate an App Store receipt via Apple's verifyReceipt endpoint.

    Tries production first, then falls back to sandbox on status 21007 (the
    documented flow). Returns True only when Apple reports status 0.
    """
    import json as _json
    import urllib.request

    def call(url: str) -> dict:
        payload = _json.dumps({
            "receipt-data": receipt,
            "password": APPLE_SHARED_SECRET,
            "exclude-old-transactions": True,
        }).encode()
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return _json.loads(resp.read().decode())

    try:
        result = call("https://buy.itunes.apple.com/verifyReceipt")
        if result.get("status") == 21007:
            result = call("https://sandbox.itunes.apple.com/verifyReceipt")
        return result.get("status") == 0
    except Exception:
        return False


@app.post("/api/iap/apple/verify")
def apple_verify(body: AppleVerifyIn) -> dict:
    """Verify an Apple in-app purchase (App Store path).

    With APPLE_SHARED_SECRET set, the receipt in `purchase_token` is validated
    against Apple before unlocking. Without it, falls back to a dev stub.
    """
    if APPLE_SHARED_SECRET:
        if not _verify_apple_receipt(body.purchase_token):
            raise HTTPException(status_code=400, detail="Could not verify App Store purchase.")
    _grant_unlock(body.profile_id, body.cruise_id, method="paid")
    return {"unlocked": True, "cruise_id": body.cruise_id, "transaction_id": new_id()}


@app.post("/api/iap/apple/restore")
def apple_restore(body: AppleRestoreIn) -> dict:
    unlocks = store.find("elite_unlocks", profile_id=body.profile_id)
    paid = next((u for u in unlocks if u.get("method") == "paid"), None)
    if paid:
        return {"unlocked": True, "cruise_id": paid.get("cruise_id"), "transaction_id": new_id()}
    return {"unlocked": False}


# --------------------------------------------------------------------------- #
# Admin (guarded by X-Admin-Pin header, or pin in body for /admin/verify)
# --------------------------------------------------------------------------- #
@app.post("/api/admin/verify")
def admin_verify(body: AdminVerifyIn) -> dict:
    require_admin(body.pin)
    return {"ok": True}


@app.get("/api/admin/confirmations")
def admin_list_confirmations(x_admin_pin: Optional[str] = Header(default=None)) -> list:
    require_admin(x_admin_pin)
    return store.find("confirmations")


@app.post("/api/admin/confirmations")
def admin_create_confirmation(body: ConfirmationIn, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    num = body.confirmation_number.strip()
    if store.find_one("confirmations", confirmation_number=num):
        raise HTTPException(status_code=409, detail="Confirmation already exists.")
    doc = {"confirmation_number": num, "cruise_id": body.cruise_id, "created_at": now_iso()}
    store.insert("confirmations", doc)
    return doc


@app.post("/api/admin/confirmations/bulk")
def admin_bulk_confirmations(body: BulkConfirmationIn, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    raw = [n.strip() for n in body.numbers.replace(",", "\n").splitlines()]
    nums = [n for n in raw if n]
    added = skipped = 0
    for n in nums:
        if store.find_one("confirmations", confirmation_number=n):
            skipped += 1
            continue
        store.insert("confirmations", {"confirmation_number": n, "cruise_id": body.cruise_id, "created_at": now_iso()})
        added += 1
    return {"added": added, "skipped": skipped, "total": len(nums)}


@app.delete("/api/admin/confirmations/{number}")
def admin_delete_confirmation(number: str, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    removed = store.delete("confirmations", confirmation_number=number)
    return {"deleted": removed > 0}


@app.post("/api/admin/cruises")
def admin_create_cruise(request: Request, body: dict, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    doc = dict(body)
    doc.setdefault("id", new_id())
    doc.setdefault("member_count", 0)
    doc.setdefault("itinerary", [])
    store.insert("cruises", doc)
    return doc


@app.put("/api/admin/cruises/{cruise_id}")
def admin_update_cruise(cruise_id: str, body: dict, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    updated = store.update_one("cruises", {"id": cruise_id}, dict(body))
    if not updated:
        raise HTTPException(status_code=404, detail="Cruise not found.")
    return updated


@app.delete("/api/admin/cruises/{cruise_id}")
def admin_delete_cruise(cruise_id: str, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    removed = store.delete("cruises", id=cruise_id)
    return {"deleted": removed > 0}


@app.post("/api/admin/deals")
def admin_create_deal(body: dict, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    doc = dict(body)
    doc.setdefault("id", new_id())
    doc.setdefault("perks", [])
    store.insert("deals", doc)
    return doc


@app.put("/api/admin/deals/{deal_id}")
def admin_update_deal(deal_id: str, body: dict, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    updated = store.update_one("deals", {"id": deal_id}, dict(body))
    if not updated:
        raise HTTPException(status_code=404, detail="Deal not found.")
    return updated


@app.delete("/api/admin/deals/{deal_id}")
def admin_delete_deal(deal_id: str, x_admin_pin: Optional[str] = Header(default=None)) -> dict:
    require_admin(x_admin_pin)
    removed = store.delete("deals", id=deal_id)
    return {"deleted": removed > 0}
