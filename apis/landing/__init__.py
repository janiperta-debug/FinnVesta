"""
Landing Page API

Public endpoints for the FinnVesta landing page.
No authentication required.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import asyncpg
import os

router = APIRouter(prefix="/landing")

# ============================================================
# Database Connection
# ============================================================

async def get_db_connection():
    """Get asyncpg connection to database"""
    return await asyncpg.connect(os.environ.get("DATABASE_URL"))


# ============================================================
# Request/Response Models
# ============================================================

class ContactRequest(BaseModel):
    """Contact form submission from landing page"""
    name: str
    email: str
    municipality: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    preferred_date: Optional[datetime] = None


class ContactResponse(BaseModel):
    """Response after submitting contact form"""
    success: bool
    message: str
    request_id: Optional[int] = None


# ============================================================
# Public Endpoints
# ============================================================

@router.post("/contact")
async def submit_contact_request(request: ContactRequest) -> ContactResponse:
    """
    Submit a contact/demo request from the landing page.
    
    No authentication required - this is a public endpoint.
    Stores the request in the database for admin review.
    """
    conn = await get_db_connection()
    try:
        # Insert contact request
        query = """
        INSERT INTO contact_requests 
            (name, email, municipality, phone, message, preferred_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'new')
        RETURNING id
        """
        
        row = await conn.fetchrow(
            query,
            request.name,
            request.email,
            request.municipality,
            request.phone,
            request.message,
            request.preferred_date
        )
        
        return ContactResponse(
            success=True,
            message="Kiitos yhteydenotostasi! Olemme sinuun yhteydessä pian.",
            request_id=row['id']
        )
        
    except Exception as e:
        print(f"Error submitting contact request: {e}")
        raise HTTPException(
            status_code=500,
            detail="Virhe lomakkeen lähetyksessä. Yritä uudelleen."
        )
        
    finally:
        await conn.close()
