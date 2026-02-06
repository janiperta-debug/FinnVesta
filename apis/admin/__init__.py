"""Admin Panel API

Handles admin-only operations for FinnVesta SaaS:
- User management (list all users across organizations)
- Billing dashboard (usage metrics per organization)  
- Organization management (view all orgs with stats)

All endpoints protected by checking system_role='admin' in database.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import asyncpg
import os
import httpx
import resend
from app.auth import AuthorizedUser

router = APIRouter(prefix="/admin")


async def get_db_connection():
    """Get asyncpg connection to database"""
    return await asyncpg.connect(os.environ.get("DATABASE_URL"))


async def check_admin(user_id: str) -> bool:
    """
    Check if user has system admin role.
    Raises HTTPException if not admin.
    """
    conn = await get_db_connection()
    try:
        result = await conn.fetchrow(
            "SELECT system_role FROM org_users WHERE user_id = $1",
            user_id
        )
        
        if not result or result['system_role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return True
    finally:
        await conn.close()


# ============================================================
# Response Models
# ============================================================

class UserWithOrg(BaseModel):
    """User with organization info"""
    id: int
    user_id: str
    email: str
    name: Optional[str]
    org_id: int
    org_name: str
    org_role: str
    system_role: str
    joined_at: datetime


class OrganizationSummary(BaseModel):
    """Organization with stats"""
    id: int
    name: str
    subscription_tier: str
    user_count: int
    building_count: int
    small_buildings: int
    medium_buildings: int
    large_buildings: int
    sub_buildings: int


class BillingDashboard(BaseModel):
    """Billing dashboard with organization usage metrics"""
    total_users: int
    total_buildings: int
    total_organizations: int
    organizations: List[dict]
    pricing_configured: bool = False
    monthly_recurring_revenue: Optional[float] = None
    annual_recurring_revenue: Optional[float] = None


# ============================================================
# User Management Endpoints
# ============================================================

@router.get("/users")
async def list_all_users(user: AuthorizedUser) -> List[UserWithOrg]:
    """
    List all users across all organizations.
    Admin only.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        query = """
        SELECT 
            ou.id,
            ou.user_id,
            ou.org_id,
            o.name as org_name,
            ou.org_role,
            ou.system_role,
            ou.joined_at,
            COALESCE(us.email, 'unknown') as email,
            us.name
        FROM org_users ou
        JOIN organizations o ON ou.org_id = o.id
        LEFT JOIN neon_auth.users_sync us ON ou.user_id = us.id
        ORDER BY ou.joined_at DESC
        """
        
        rows = await conn.fetch(query)
        
        return [
            UserWithOrg(
                id=row['id'],
                user_id=row['user_id'],
                email=row['email'],
                name=row['name'],
                org_id=row['org_id'],
                org_name=row['org_name'],
                org_role=row['org_role'],
                system_role=row['system_role'],
                joined_at=row['joined_at']
            )
            for row in rows
        ]
        
    finally:
        await conn.close()


# ============================================================
# Billing Dashboard Endpoints
# ============================================================

@router.get("/billing")
async def get_billing_dashboard(user: AuthorizedUser) -> BillingDashboard:
    """
    Get billing dashboard with user counts and building counts by size tier.
    
    Building size tiers:
    - Small: < 1,000 m²
    - Medium: 1,000 - 5,000 m²
    - Large: > 5,000 m²
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        # Get pricing configuration
        pricing = await conn.fetchrow(
            "SELECT * FROM pricing_config WHERE id = 1"
        )
        
        # Check if pricing is configured
        pricing_configured = (
            pricing and 
            pricing['primary_user_annual_fee'] is not None and
            pricing['additional_user_annual_fee'] is not None and
            pricing['small_building_monthly_fee'] is not None and
            pricing['medium_building_monthly_fee'] is not None and
            pricing['large_building_monthly_fee'] is not None
        )
        
        query = """
        SELECT 
            o.id as org_id,
            o.name as org_name,
            COUNT(DISTINCT ou.user_id) as active_users,
            COUNT(DISTINCT b.id) as total_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.area_m2 < 1000 AND (b.is_sub_building IS FALSE OR b.is_sub_building IS NULL)) as small_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.area_m2 >= 1000 AND b.area_m2 <= 5000 AND (b.is_sub_building IS FALSE OR b.is_sub_building IS NULL)) as medium_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.area_m2 > 5000 AND (b.is_sub_building IS FALSE OR b.is_sub_building IS NULL)) as large_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.is_sub_building IS TRUE) as sub_buildings
        FROM organizations o
        LEFT JOIN org_users ou ON o.id = ou.org_id
        LEFT JOIN buildings b ON o.id = b.org_id AND b.status = 'active'
        GROUP BY o.id, o.name
        ORDER BY o.name
        """
        
        rows = await conn.fetch(query)
        
        organizations = []
        total_users = 0
        total_buildings = 0
        total_mrr = 0.0
        
        for row in rows:
            org_data = {
                'org_id': row['org_id'],
                'org_name': row['org_name'],
                'active_users': row['active_users'],
                'total_buildings': row['total_buildings'],
                'small_buildings': row['small_buildings'],
                'medium_buildings': row['medium_buildings'],
                'large_buildings': row['large_buildings'],
                'sub_buildings': row['sub_buildings']
            }
            
            # Calculate costs if pricing is configured
            if pricing_configured:
                # User costs (annual fees divided by 12 for monthly)
                user_monthly_cost = 0.0
                if row['active_users'] > 0:
                    # First user at primary rate, rest at additional rate
                    user_monthly_cost = float(pricing['primary_user_annual_fee']) / 12
                    if row['active_users'] > 1:
                        user_monthly_cost += (row['active_users'] - 1) * float(pricing['additional_user_annual_fee']) / 12
                
                # Building costs (monthly)
                sub_percent = float(pricing.get('sub_building_percent', 20.0)) / 100.0
                small_fee = float(pricing['small_building_monthly_fee'])
                
                building_monthly_cost = (
                    row['small_buildings'] * small_fee +
                    row['medium_buildings'] * float(pricing['medium_building_monthly_fee']) +
                    row['large_buildings'] * float(pricing['large_building_monthly_fee']) +
                    row['sub_buildings'] * small_fee * sub_percent 
                )
                
                monthly_total = user_monthly_cost + building_monthly_cost
                total_mrr += monthly_total
                
                org_data['monthly_cost'] = round(monthly_total, 2)
                org_data['annual_cost'] = round(monthly_total * 12, 2)
            
            organizations.append(org_data)
            total_users += row['active_users']
            total_buildings += row['total_buildings']
        
        return BillingDashboard(
            total_users=total_users,
            total_buildings=total_buildings,
            total_organizations=len(organizations),
            organizations=organizations,
            pricing_configured=pricing_configured,
            monthly_recurring_revenue=round(total_mrr, 2) if pricing_configured else None,
            annual_recurring_revenue=round(total_mrr * 12, 2) if pricing_configured else None
        )
        
    finally:
        await conn.close()


# ============================================================
# Organization Management Endpoints
# ============================================================

@router.get("/organizations")
async def list_organizations(user: AuthorizedUser) -> List[OrganizationSummary]:
    """
    List all organizations with stats.
    Admin only.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        query = """
        SELECT 
            o.id,
            o.name,
            o.subscription_tier,
            COUNT(DISTINCT ou.user_id) as user_count,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active') as building_count,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active' AND b.area_m2 < 1000 AND (b.is_sub_building IS FALSE OR b.is_sub_building IS NULL)) as small_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active' AND b.area_m2 >= 1000 AND b.area_m2 <= 5000 AND (b.is_sub_building IS FALSE OR b.is_sub_building IS NULL)) as medium_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active' AND b.area_m2 > 5000 AND (b.is_sub_building IS FALSE OR b.is_sub_building IS NULL)) as large_buildings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active' AND b.is_sub_building IS TRUE) as sub_buildings
        FROM organizations o
        LEFT JOIN org_users ou ON o.id = ou.org_id
        LEFT JOIN buildings b ON o.id = b.org_id
        GROUP BY o.id, o.name, o.subscription_tier
        ORDER BY o.name
        """
        
        rows = await conn.fetch(query)
        
        return [
            OrganizationSummary(
                id=row['id'],
                name=row['name'],
                subscription_tier=row['subscription_tier'],
                user_count=row['user_count'],
                building_count=row['building_count'],
                small_buildings=row['small_buildings'],
                medium_buildings=row['medium_buildings'],
                large_buildings=row['large_buildings'],
                sub_buildings=row['sub_buildings']
            )
            for row in rows
        ]
        
    finally:
        await conn.close()


class CreateOrganizationRequest(BaseModel):
    """Request to create a new organization"""
    name: str
    subscription_tier: str = "basic"


class CreateOrganizationResponse(BaseModel):
    """Response after creating organization"""
    id: int
    name: str
    subscription_tier: str
    created_at: datetime


@router.post("/organizations")
async def create_organization(user: AuthorizedUser, body: CreateOrganizationRequest) -> CreateOrganizationResponse:
    """
    Create a new organization.
    Admin only.
    
    This is used when a new client signs a contract and needs access to the system.
    After creating the org, use admin_invite_user to invite the pääkäyttäjä.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        # Create the organization
        result = await conn.fetchrow(
            """
            INSERT INTO organizations (name, subscription_tier, created_at)
            VALUES ($1, $2, NOW())
            RETURNING id, name, subscription_tier, created_at
            """,
            body.name,
            body.subscription_tier
        )
        
        return CreateOrganizationResponse(
            id=result['id'],
            name=result['name'],
            subscription_tier=result['subscription_tier'],
            created_at=result['created_at']
        )
        
    finally:
        await conn.close()


class AdminInviteUserRequest(BaseModel):
    """Request to invite a user to an organization from admin panel"""
    email: str
    name: Optional[str] = None
    org_role: str = "admin"  # Default to admin for pääkäyttäjä


class AdminInviteUserResponse(BaseModel):
    """Response after inviting user"""
    success: bool
    message: str
    email: str
    org_id: int


@router.post("/organizations/{org_id}/invite")
async def admin_invite_user(
    org_id: int,
    user: AuthorizedUser,
    body: AdminInviteUserRequest
) -> AdminInviteUserResponse:
    """
    Invite a user to a specific organization.
    Admin only.
    
    This creates the user in Stack Auth (if they don't exist), links them to the organization,
    and sends an invitation email via Resend.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        # Verify organization exists
        org = await conn.fetchrow(
            "SELECT id, name FROM organizations WHERE id = $1",
            org_id
        )
        
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Stack Auth API credentials
        stack_project_id = os.environ.get("STACK_PROJECT_ID")
        stack_secret_key = os.environ.get("STACK_SECRET_SERVER_KEY")
        
        # Resend API Key
        resend_api_key = os.environ.get("RESEND_API_KEY")
        
        if not stack_project_id or not stack_secret_key:
            raise HTTPException(status_code=500, detail="Stack Auth credentials not configured")
            
        stack_user_id = None
        
        # 1. Create/Get User in Stack Auth
        async with httpx.AsyncClient() as client:
            # Check if user exists first (by listing or trying to create)
            # We'll try to create and handle 409 (Conflict) if that's what it returns, 
            # or just rely on the fact that we need the ID.
            # Actually, there isn't a simple "get user by email" documented, 
            # but we can try to create and see.
            
            headers = {
                "X-Stack-Access-Type": "server",
                "X-Stack-Project-Id": stack_project_id,
                "Authorization": f"Bearer {stack_secret_key}",
                "Content-Type": "application/json"
            }
            
            # Create User
            create_resp = await client.post(
                "https://api.stack-auth.com/api/v1/users", 
                json={
                    "email": body.email,
                    "name": body.name
                },
                headers=headers
            )
            
            if create_resp.status_code == 201 or create_resp.status_code == 200:
                user_data = create_resp.json()
                stack_user_id = user_data.get("id")
            elif create_resp.status_code == 409:
                # User likely exists, we need to find their ID.
                # Search for user by email
                list_resp = await client.get(
                    "https://api.stack-auth.com/api/v1/users",
                    headers=headers
                )
                
                if list_resp.status_code == 200:
                    users_list = list_resp.json()
                    # Iterate to find the user
                    for u in users_list.get("data", []): 
                        if isinstance(users_list, list):
                             if u.get("email") == body.email:
                                stack_user_id = u.get("id")
                                break
                        elif u.get("email") == body.email:
                                stack_user_id = u.get("id")
                                break
                    
                    if not stack_user_id and "data" in users_list:
                         for u in users_list["data"]:
                            if u.get("email") == body.email:
                                stack_user_id = u.get("id")
                                break
            else:
                # Log error and fail
                print(f"Stack Auth Create Error: {create_resp.status_code} {create_resp.text}")
                raise HTTPException(status_code=500, detail=f"Failed to create user in authentication system: {create_resp.text}")

        if not stack_user_id:
             raise HTTPException(status_code=404, detail="Could not find or create user ID")

        # 2. Add to org_users
        # Check if already in org
        existing_link = await conn.fetchrow(
            "SELECT id FROM org_users WHERE user_id = $1 AND org_id = $2",
            stack_user_id, org_id
        )
        
        if not existing_link:
            await conn.execute(
                """
                INSERT INTO org_users (user_id, org_id, org_role, joined_at)
                VALUES ($1, $2, $3, NOW())
                """,
                stack_user_id,
                org_id,
                body.org_role
            )
        
        # 3. Send Invitation Email via Resend
        email_sent = False
        if resend_api_key:
            try:
                resend.api_key = resend_api_key
                
                # Finnish Email Content
                app_url = "https://finnvesta.fi" # Or dynamic base URL if needed, but prod is usually static
                # Use a dev email if in dev mode, but for now we trust the user has verified domain or we use generic
                from_email = "FinnVesta <onboarding@resend.dev>" # Default test sender
                # If the user has a verified domain, they should update this.
                
                html_content = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Tervetuloa FinnVesta-palveluun!</h2>
                    <p>Hei {body.name or 'käyttäjä'},</p>
                    <p>Käyttäjätilisi organisaatioon <strong>{org['name']}</strong> on luotu.</p>
                    <p>Voit kirjautua sisään palveluun alla olevasta linkistä:</p>
                    <p>
                        <a href="{app_url}" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                            Siirry FinnVesta-palveluun
                        </a>
                    </p>
                    <p>Käytä kirjautumiseen sähköpostiosoitettasi: <strong>{body.email}</strong></p>
                    <p><strong>Ensimmäinen kirjautuminen:</strong></p>
                    <ul>
                        <li>Siirry kirjautumissivulle.</li>
                        <li>Syötä sähköpostiosoitteesi.</li>
                        <li>Valitse <strong>"Lähetä taikalinkki"</strong> (Sign in with Magic Link) tai <strong>"Unohtuiko salasana"</strong>.</li>
                        <li>Seuraa sähköpostiisi saapuvia ohjeita salasanan asettamiseksi.</li>
                    </ul>
                    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
                    <p style="color: #666; font-size: 14px;">Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</p>
                </div>
                """
                
                r = resend.Emails.send({
                    "from": from_email,
                    "to": body.email,
                    "subject": f"Kutsu FinnVesta-palveluun: {org['name']}",
                    "html": html_content
                })
                print(f"Resend email sent: {r}")
                email_sent = True
                
            except Exception as e:
                print(f"Failed to send email via Resend: {e}")
                # We don't fail the request, but we note it in the response
        
        message = f"User {body.email} linked to {org['name']}."
        if email_sent:
            message += " Invitation email sent."
        else:
            message += " Email sending failed (check server logs)."
        
        return AdminInviteUserResponse(
            success=True,
            message=message,
            email=body.email,
            org_id=org_id
        )
        
    finally:
        await conn.close()

@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    user: AuthorizedUser
):
    """
    Delete an organization and all its associated data.
    Admin only.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        # Check if org exists
        org = await conn.fetchrow("SELECT name FROM organizations WHERE id = $1", org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Begin transaction
        async with conn.transaction():
            # 1. Get all building IDs for this org
            buildings = await conn.fetch("SELECT id FROM buildings WHERE org_id = $1", org_id)
            building_ids = [b['id'] for b in buildings]
            
            if building_ids:
                # 2. Delete data linked to buildings
                # Note: Adjust table names if necessary based on schema
                # detailed_financials, financials, valuations, maintenance_tasks, assessments, pts_entries
                
                # Delete related records (assuming standard tables, adjust as needed)
                await conn.execute("DELETE FROM detailed_financials WHERE building_id = ANY($1)", building_ids)
                await conn.execute("DELETE FROM financials WHERE building_id = ANY($1)", building_ids)
                await conn.execute("DELETE FROM valuations WHERE building_id = ANY($1)", building_ids)
                await conn.execute("DELETE FROM pts_entries WHERE building_id = ANY($1)", building_ids)
                
                # Delete maintenance tasks (might be linked to org or building)
                await conn.execute("DELETE FROM maintenance_tasks WHERE building_id = ANY($1)", building_ids)
                
                # Delete assessments and their components
                # First delete components linked to assessments
                assessments = await conn.fetch("SELECT id FROM assessments WHERE building_id = ANY($1)", building_ids)
                assessment_ids = [a['id'] for a in assessments]
                if assessment_ids:
                    await conn.execute("DELETE FROM assessment_components WHERE assessment_id = ANY($1)", assessment_ids)
                    await conn.execute("DELETE FROM assessments WHERE building_id = ANY($1)", building_ids)

            # 3. Delete buildings
            await conn.execute("DELETE FROM buildings WHERE org_id = $1", org_id)
            
            # 4. Delete org_users links
            await conn.execute("DELETE FROM org_users WHERE org_id = $1", org_id)
            
            # 5. Delete organization
            await conn.execute("DELETE FROM organizations WHERE id = $1", org_id)
            
        return {"success": True, "message": f"Organization {org['name']} and all its data have been deleted."}
        
    finally:
        await conn.close()

@router.delete("/organizations/{org_id}/users/{user_id}")
async def remove_user_from_org(
    org_id: int,
    user_id: str,
    user: AuthorizedUser
):
    """
    Remove a user from an organization.
    Admin only.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        # Check if link exists
        link = await conn.fetchrow(
            """
            SELECT ou.user_id 
            FROM org_users ou
            WHERE ou.org_id = $1 AND ou.user_id = $2
            """,
            org_id, user_id
        )
        
        if not link:
            # Check if org exists at least
            org_exists = await conn.fetchval("SELECT 1 FROM organizations WHERE id = $1", org_id)
            if not org_exists:
                raise HTTPException(status_code=404, detail="Organization not found")
            raise HTTPException(status_code=404, detail="User is not a member of this organization")

        # Remove from org_users
        await conn.execute(
            "DELETE FROM org_users WHERE org_id = $1 AND user_id = $2",
            org_id, user_id
        )
        
        return {"success": True, "message": "User removed from organization."}
        
    finally:
        await conn.close()


# ============================================================
# Pricing Configuration
# ============================================================

class PricingConfig(BaseModel):
    """Pricing configuration for billing calculations"""
    primary_user_annual_fee: Optional[float] = None
    additional_user_annual_fee: Optional[float] = None
    small_building_monthly_fee: Optional[float] = None
    medium_building_monthly_fee: Optional[float] = None
    large_building_monthly_fee: Optional[float] = None
    sub_building_percent: Optional[float] = 20.0
    updated_at: Optional[datetime] = None


class UpdatePricingRequest(BaseModel):
    """Request to update pricing configuration"""
    primary_user_annual_fee: Optional[float] = None
    additional_user_annual_fee: Optional[float] = None
    small_building_monthly_fee: Optional[float] = None
    medium_building_monthly_fee: Optional[float] = None
    large_building_monthly_fee: Optional[float] = None
    sub_building_percent: Optional[float] = None


@router.get("/pricing")
async def get_pricing_config(user: AuthorizedUser) -> PricingConfig:
    """
    Get current pricing configuration.
    Admin only.
    """
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        result = await conn.fetchrow(
            "SELECT * FROM pricing_config WHERE id = 1"
        )
        
        if not result:
            # Return blank config if not set
            return PricingConfig()
        
        return PricingConfig(
            primary_user_annual_fee=result['primary_user_annual_fee'],
            additional_user_annual_fee=result['additional_user_annual_fee'],
            small_building_monthly_fee=result['small_building_monthly_fee'],
            medium_building_monthly_fee=result['medium_building_monthly_fee'],
            large_building_monthly_fee=result['large_building_monthly_fee'],
            updated_at=result['updated_at']
        )
        
    finally:
        await conn.close()


@router.post("/pricing")
async def update_pricing_config(
    user: AuthorizedUser,
    request: UpdatePricingRequest
) -> PricingConfig:
    """Update pricing configuration"""
    await check_admin(user.sub)
    
    conn = await get_db_connection()
    try:
        # Check if config exists
        exists = await conn.fetchval("SELECT 1 FROM pricing_config WHERE id = 1")
        
        if not exists:
            # Create default
            await conn.execute("""
                INSERT INTO pricing_config (
                    id, primary_user_annual_fee, additional_user_annual_fee,
                    small_building_monthly_fee, medium_building_monthly_fee, 
                    large_building_monthly_fee, sub_building_percent, updated_at
                ) VALUES (1, $1, $2, $3, $4, $5, $6, NOW())
            """,
                request.primary_user_annual_fee,
                request.additional_user_annual_fee,
                request.small_building_monthly_fee,
                request.medium_building_monthly_fee,
                request.large_building_monthly_fee,
                request.sub_building_percent or 20.0
            )
        else:
            # Update existing - only update provided fields
            fields = []
            values = []
            idx = 1
            
            if request.primary_user_annual_fee is not None:
                fields.append(f"primary_user_annual_fee = ${idx}")
                values.append(request.primary_user_annual_fee)
                idx += 1
            
            if request.additional_user_annual_fee is not None:
                fields.append(f"additional_user_annual_fee = ${idx}")
                values.append(request.additional_user_annual_fee)
                idx += 1
                
            if request.small_building_monthly_fee is not None:
                fields.append(f"small_building_monthly_fee = ${idx}")
                values.append(request.small_building_monthly_fee)
                idx += 1
                
            if request.medium_building_monthly_fee is not None:
                fields.append(f"medium_building_monthly_fee = ${idx}")
                values.append(request.medium_building_monthly_fee)
                idx += 1
                
            if request.large_building_monthly_fee is not None:
                fields.append(f"large_building_monthly_fee = ${idx}")
                values.append(request.large_building_monthly_fee)
                idx += 1
            
            if request.sub_building_percent is not None:
                fields.append(f"sub_building_percent = ${idx}")
                values.append(request.sub_building_percent)
                idx += 1

            if fields:
                fields.append("updated_at = NOW()")
                query = f"UPDATE pricing_config SET {', '.join(fields)} WHERE id = 1"
                await conn.execute(query, *values)
        
        # Return updated config
        row = await conn.fetchrow("SELECT * FROM pricing_config WHERE id = 1")
        return PricingConfig(**row)
        
    finally:
        await conn.close()
