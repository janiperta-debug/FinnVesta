from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import asyncpg

router = APIRouter(prefix="/organization")


# ============================================================================
# Request/Response Models
# ============================================================================

class OrgUser(BaseModel):
    """Organization user details."""
    id: int
    user_id: str  # Stack Auth user ID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role: str  # admin or member
    joined_at: datetime


class ListOrgUsersResponse(BaseModel):
    """Response for listing organization users."""
    users: List[OrgUser]
    total_count: int


class InviteUserRequest(BaseModel):
    """Request to invite a new user to organization."""
    email: str
    role: str = "member"  # admin or member


class InviteUserResponse(BaseModel):
    """Response after inviting a user."""
    message: str
    email: str
    pending: bool = True  # True until user accepts invite


class RemoveUserRequest(BaseModel):
    """Request to remove a user from organization."""
    user_id: str  # Stack Auth user ID


class RemoveUserResponse(BaseModel):
    """Response after removing a user."""
    message: str
    user_id: str


class ArchivedBuilding(BaseModel):
    """Archived building details."""
    id: int
    name: str
    address: Optional[str] = None
    construction_year: int
    area_m2: float
    building_type: Optional[str] = None
    archived_at: datetime  # updated_at when status changed to archived


class ListArchivedBuildingsResponse(BaseModel):
    """Response for listing archived buildings."""
    buildings: List[ArchivedBuilding]
    total_count: int


class RestoreBuildingResponse(BaseModel):
    """Response after restoring an archived building."""
    id: int
    name: str
    message: str


class OrganizationInfo(BaseModel):
    """Organization information."""
    id: int
    name: str
    subscription_tier: str
    total_users: int
    total_buildings: int  # active buildings only
    total_archived_buildings: int
    created_at: datetime


# ============================================================================
# Team Management Endpoints
# ============================================================================

@router.get("/users")
async def list_org_users(
    org_id: int = 1
) -> ListOrgUsersResponse:
    """
    List all users in the organization.
    
    Returns users with their roles and Stack Auth details.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get org users with Stack Auth user details
        users = await conn.fetch("""
            SELECT 
                ou.id,
                ou.user_id,
                ou.role,
                ou.joined_at,
                us.name as user_name,
                us.email as user_email
            FROM org_users ou
            LEFT JOIN neon_auth.users_sync us ON ou.user_id = us.id
            WHERE ou.org_id = $1
            ORDER BY ou.joined_at DESC
        """, org_id)
        
        org_users = [
            OrgUser(
                id=user['id'],
                user_id=user['user_id'],
                user_name=user['user_name'],
                user_email=user['user_email'],
                role=user['role'],
                joined_at=user['joined_at']
            )
            for user in users
        ]
        
        return ListOrgUsersResponse(
            users=org_users,
            total_count=len(org_users)
        )
        
    finally:
        await conn.close()


@router.post("/users/invite")
async def invite_user(
    body: InviteUserRequest,
    org_id: int = 1
) -> InviteUserResponse:
    """
    Invite a new user to the organization.
    
    NOTE: For now, this returns a placeholder response.
    Full Stack Auth invitation flow will be implemented when auth is fully integrated.
    """
    # TODO: Integrate with Stack Auth to send actual email invitation
    # For now, return a pending invite message
    
    return InviteUserResponse(
        message=f"Kutsu lähetetty osoitteeseen {body.email}. Käyttäjä saa sähköpostikutsun.",
        email=body.email,
        pending=True
    )


@router.delete("/users/{user_id}")
async def remove_user(
    user_id: str,
    org_id: int = 1
) -> RemoveUserResponse:
    """
    Remove a user from the organization.
    
    This removes the user from org_users table but does NOT delete
    the user from Stack Auth (they can still exist in other orgs).
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Check if user exists in org
        user = await conn.fetchrow("""
            SELECT id, user_id FROM org_users
            WHERE org_id = $1 AND user_id = $2
        """, org_id, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="Käyttäjää ei löydy organisaatiosta")
        
        # Remove user from org
        await conn.execute("""
            DELETE FROM org_users
            WHERE org_id = $1 AND user_id = $2
        """, org_id, user_id)
        
        return RemoveUserResponse(
            message="Käyttäjä poistettu organisaatiosta onnistuneesti",
            user_id=user_id
        )
        
    finally:
        await conn.close()


# ============================================================================
# Archive Management Endpoints
# ============================================================================

@router.get("/archive/buildings")
async def list_archived_buildings(
    org_id: int = 1
) -> ListArchivedBuildingsResponse:
    """
    List all archived buildings for the organization.
    
    Shows buildings with status='archived' including when they were archived.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        buildings = await conn.fetch("""
            SELECT 
                id,
                name,
                address,
                construction_year,
                area_m2,
                building_type,
                updated_at as archived_at
            FROM buildings
            WHERE org_id = $1 AND status = 'archived'
            ORDER BY updated_at DESC
        """, org_id)
        
        archived_buildings = [
            ArchivedBuilding(
                id=b['id'],
                name=b['name'],
                address=b['address'],
                construction_year=b['construction_year'],
                area_m2=float(b['area_m2']),
                building_type=b['building_type'],
                archived_at=b['archived_at']
            )
            for b in buildings
        ]
        
        return ListArchivedBuildingsResponse(
            buildings=archived_buildings,
            total_count=len(archived_buildings)
        )
        
    finally:
        await conn.close()


@router.post("/archive/buildings/{building_id}/restore")
async def restore_archived_building(
    building_id: int,
    org_id: int = 1
) -> RestoreBuildingResponse:
    """
    Restore an archived building back to active status.
    
    Changes status from 'archived' to 'active'.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Verify building exists and is archived
        building = await conn.fetchrow("""
            SELECT id, name, status FROM buildings
            WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        if not building:
            raise HTTPException(status_code=404, detail="Rakennusta ei löydy")
        
        if building['status'] != 'archived':
            raise HTTPException(
                status_code=400, 
                detail=f"Rakennus ei ole arkistoitu (status: {building['status']})"
            )
        
        # Restore building to active
        await conn.execute("""
            UPDATE buildings 
            SET status = 'active', updated_at = NOW()
            WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        return RestoreBuildingResponse(
            id=building_id,
            name=building['name'],
            message=f"Rakennus '{building['name']}' palautettu aktiiviseksi"
        )
        
    finally:
        await conn.close()


# ============================================================================
# Organization Info Endpoint
# ============================================================================

@router.get("/info")
async def get_organization_info(
    org_id: int = 1
) -> OrganizationInfo:
    """
    Get organization information including user and building counts.
    
    Returns overview data for the organization settings page.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get org details
        org = await conn.fetchrow("""
            SELECT id, name, subscription_tier, created_at
            FROM organizations
            WHERE id = $1
        """, org_id)
        
        if not org:
            raise HTTPException(status_code=404, detail="Organisaatiota ei löydy")
        
        # Count users
        user_count = await conn.fetchval("""
            SELECT COUNT(*) FROM org_users WHERE org_id = $1
        """, org_id)
        
        # Count active buildings
        active_buildings = await conn.fetchval("""
            SELECT COUNT(*) FROM buildings 
            WHERE org_id = $1 AND status = 'active'
        """, org_id)
        
        # Count archived buildings
        archived_buildings = await conn.fetchval("""
            SELECT COUNT(*) FROM buildings 
            WHERE org_id = $1 AND status = 'archived'
        """, org_id)
        
        return OrganizationInfo(
            id=org['id'],
            name=org['name'],
            subscription_tier=org['subscription_tier'],
            total_users=user_count or 0,
            total_buildings=active_buildings or 0,
            total_archived_buildings=archived_buildings or 0,
            created_at=org['created_at']
        )
        
    finally:
        await conn.close()
