from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
import os
import asyncpg

router = APIRouter(prefix="/portfolio")


# ============================================================================
# Request Models
# ============================================================================

class CreateBuildingRequest(BaseModel):
    """Request model for creating a building."""
    name: str
    address: Optional[str] = None
    municipality: Optional[str] = None
    construction_year: Optional[int] = None
    area_m2: float
    building_type: Optional[str] = None
    construction_cost_per_m2: Optional[float] = 2500.0  # Default value
    notes: Optional[str] = None
    is_sub_building: Optional[bool] = False


class UpdateBuildingRequest(BaseModel):
    """Request model for updating a building."""
    name: Optional[str] = None
    address: Optional[str] = None
    municipality: Optional[str] = None
    construction_year: Optional[int] = None
    area_m2: Optional[float] = None
    building_type: Optional[str] = None
    construction_cost_per_m2: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    is_sub_building: Optional[bool] = None


class CreateBuildingResponse(BaseModel):
    """Response after creating a building."""
    id: int
    name: str
    construction_year: int
    area_m2: float
    building_type: str
    replacement_value: float  # JHA calculated
    message: str


class UpdateBuildingResponse(BaseModel):
    """Response after updating a building."""
    id: int
    name: str
    message: str


class DeleteBuildingResponse(BaseModel):
    """Response after deleting/archiving a building."""
    id: int
    name: str
    message: str


# ============================================================================
# Response Models
# ============================================================================

class BuildingSummary(BaseModel):
    """Individual building summary for dashboard list."""
    id: int
    name: str
    municipality: Optional[str]
    construction_year: int
    building_age: int
    area_m2: float
    building_type: Optional[str]
    
    # Latest condition data
    condition_score: Optional[float]  # kla as percentage (0-100)
    pka_score: Optional[float]  # Weighted component average (1-5)
    
    # Financial data
    replacement_value: Optional[float]  # JHA
    technical_value: Optional[float]  # TeknA
    repair_debt: Optional[float]  # Kvelka
    
    # Latest assessment info
    last_assessment_date: Optional[date]
    assessment_age_days: Optional[int]


class PortfolioOverview(BaseModel):
    """High-level portfolio metrics."""
    total_buildings: int
    total_area_m2: float
    average_building_age: float
    
    # Condition metrics
    average_condition_pct: Optional[float]
    buildings_critical: int  # < 50%
    buildings_poor: int  # 50-60%
    buildings_adequate: int  # 60-75%
    buildings_good: int  # >= 75%
    
    # Financial metrics
    total_replacement_value: Optional[float]  # JHA
    total_technical_value: Optional[float]  # TeknA
    total_repair_debt: Optional[float]
    
    # Assessment coverage
    buildings_with_assessment: int
    buildings_needing_assessment: int


class PortfolioDashboard(BaseModel):
    """Complete portfolio dashboard data."""
    overview: PortfolioOverview
    buildings: list[BuildingSummary]


class BuildingDetail(BaseModel):
    """Detailed building information with all related data."""
    # Basic info
    id: int
    name: str
    address: Optional[str]
    municipality: Optional[str]
    construction_year: int
    building_age: int
    area_m2: float
    building_type: Optional[str]
    usage_category: Optional[str]
    cost_per_m2: float
    notes: Optional[str]
    
    # Latest metrics
    replacement_value: Optional[float]
    technical_value: Optional[float]
    condition_score: Optional[float]  # Percentage (0-100)
    repair_debt: Optional[float]
    last_assessment_date: Optional[date]
    last_valuation_date: Optional[date]
    
    # Historical data
    valuation_history: list[dict]  # Timeline of valuations
    assessment_history: list[dict]  # Timeline of assessments
    financial_data: Optional[dict]  # Latest financial info


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/buildings")
async def create_building(
    body: CreateBuildingRequest,
    org_id: int = 1
) -> CreateBuildingResponse:
    """Create a new building in the portfolio.
    
    Auto-calculates replacement value (JHA) based on area and construction cost.
    Uses default construction cost of 2500 EUR/m² if not provided.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    try:
        # Calculate JHA
        cost_per_m2 = body.construction_cost_per_m2 or 2500.0
        jha_value = body.area_m2 * cost_per_m2
        
        row = await conn.fetchrow(
            """
            INSERT INTO buildings (
                org_id, name, address, municipality, construction_year, 
                area_m2, building_type, cost_per_m2, status, notes, is_sub_building
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, name, area_m2, construction_year
            """,
            org_id, 
            body.name, 
            body.address, 
            body.municipality,
            body.construction_year, 
            body.area_m2, 
            body.building_type,
            cost_per_m2, 
            'active',
            body.notes,
            body.is_sub_building
        )
        
        # Create initial financial record with calculated JHA
        if row:
            building_id = row['id']
            return CreateBuildingResponse(
                id=building_id,
                name=row['name'],
                construction_year=row['construction_year'],
                area_m2=row['area_m2'],
                building_type=body.building_type,
                replacement_value=jha_value,
                message=f"Rakennus '{row['name']}' lisätty onnistuneesti"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create building")
    finally:
        await conn.close()


@router.get("/buildings/{building_id}")
async def get_building_detail(
    building_id: int,
    org_id: int = 1
) -> BuildingDetail:
    """Get detailed information for a specific building.
    
    Includes basic info, latest metrics, and historical data for assessments and valuations.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get basic building info
        building = await conn.fetchrow("""
            SELECT 
                id, name, address, municipality, construction_year, area_m2,
                building_type, usage_category, cost_per_m2, notes,
                EXTRACT(YEAR FROM CURRENT_DATE)::int - construction_year as building_age
            FROM buildings
            WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Get latest valuation
        latest_valuation = await conn.fetchrow("""
            SELECT 
                replacement_value, technical_value, condition_score, 
                repair_debt, assessment_date
            FROM building_valuations
            WHERE building_id = $1
            ORDER BY assessment_date DESC
            LIMIT 1
        """, building_id)
        
        # Get valuation history
        valuation_history = await conn.fetch("""
            SELECT 
                assessment_date, replacement_value, technical_value,
                condition_score, repair_debt, maintenance_need, improvement_need
            FROM building_valuations
            WHERE building_id = $1
            ORDER BY assessment_date DESC
        """, building_id)
        
        # Get assessment history
        assessment_history = await conn.fetch("""
            SELECT 
                assessment_date, inspector_name, weighted_average as pka_score,
                structure_score, facade_roof_score, windows_doors_score,
                interior_walls_score, interior_finishes_score,
                heating_score, electrical_score, plumbing_score, hvac_score,
                notes
            FROM component_assessments
            WHERE building_id = $1
            ORDER BY assessment_date DESC
        """, building_id)
        
        # Get latest financial data
        financial = await conn.fetchrow("""
            SELECT 
                financial_year, market_value, purchase_price, purchase_date,
                debt_amount, operating_costs, rental_income, insurance_value
            FROM financials
            WHERE building_id = $1
            ORDER BY financial_year DESC
            LIMIT 1
        """, building_id)
        
        return BuildingDetail(
            id=building['id'],
            name=building['name'],
            address=building['address'],
            municipality=building['municipality'],
            construction_year=building['construction_year'],
            building_age=building['building_age'],
            area_m2=float(building['area_m2']),
            building_type=building['building_type'],
            usage_category=building['usage_category'],
            cost_per_m2=float(building['cost_per_m2']),
            notes=building['notes'],
            
            # Latest metrics from valuation
            replacement_value=float(latest_valuation['replacement_value']) if latest_valuation else None,
            technical_value=float(latest_valuation['technical_value']) if latest_valuation else None,
            condition_score=float(latest_valuation['condition_score'] * 100) if latest_valuation and latest_valuation['condition_score'] else None,
            repair_debt=float(latest_valuation['repair_debt']) if latest_valuation else None,
            last_assessment_date=latest_valuation['assessment_date'] if latest_valuation else None,
            last_valuation_date=latest_valuation['assessment_date'] if latest_valuation else None,
            
            # Historical data
            valuation_history=[dict(row) for row in valuation_history],
            assessment_history=[dict(row) for row in assessment_history],
            financial_data=dict(financial) if financial else None
        )
        
    finally:
        await conn.close()


@router.put("/buildings/{building_id}")
async def update_building(
    building_id: int,
    body: UpdateBuildingRequest,
    org_id: int = 1
) -> UpdateBuildingResponse:
    """Update an existing building's information.
    
    Only provided fields will be updated. Recalculates JHA if area or cost changes.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # First verify building exists and belongs to org
        existing = await conn.fetchrow("""
            SELECT id, name FROM buildings WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        if not existing:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Build UPDATE query dynamically based on provided fields
        updates = []
        values = []
        param_count = 1
        
        if body.name is not None:
            updates.append(f"name = ${param_count}")
            values.append(body.name)
            param_count += 1
            
        if body.address is not None:
            updates.append(f"address = ${param_count}")
            values.append(body.address)
            param_count += 1

        if body.municipality is not None:
            updates.append(f"municipality = ${param_count}")
            values.append(body.municipality)
            param_count += 1
            
        if body.construction_year is not None:
            updates.append(f"construction_year = ${param_count}")
            values.append(body.construction_year)
            param_count += 1
            
        if body.area_m2 is not None:
            updates.append(f"area_m2 = ${param_count}")
            values.append(body.area_m2)
            param_count += 1
            
        if body.building_type is not None:
            updates.append(f"building_type = ${param_count}")
            values.append(body.building_type)
            param_count += 1
            
        if body.usage_category is not None:
            updates.append(f"usage_category = ${param_count}")
            values.append(body.usage_category)
            param_count += 1
            
        if body.construction_cost_per_m2 is not None:
            updates.append(f"cost_per_m2 = ${param_count}")
            values.append(body.construction_cost_per_m2)
            param_count += 1
            
        if body.notes is not None:
            updates.append(f"notes = ${param_count}")
            values.append(body.notes)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add WHERE clause parameters
        values.extend([building_id, org_id])
        
        # Execute update
        query = f"""
            UPDATE buildings 
            SET {', '.join(updates)}
            WHERE id = ${param_count} AND org_id = ${param_count + 1}
            RETURNING name
        """
        
        updated_name = await conn.fetchval(query, *values)
        
        return UpdateBuildingResponse(
            id=building_id,
            name=updated_name,
            message=f"Rakennus '{updated_name}' päivitetty onnistuneesti"
        )
        
    finally:
        await conn.close()


@router.delete("/buildings/{building_id}")
async def delete_building(
    building_id: int,
    org_id: int = 1
) -> DeleteBuildingResponse:
    """Archive a building (soft delete).
    
    Sets building status to 'archived' instead of hard deleting.
    This preserves all historical data and assessments.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Verify building exists and get name
        building = await conn.fetchrow("""
            SELECT id, name, status FROM buildings 
            WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        if building['status'] == 'archived':
            raise HTTPException(status_code=400, detail="Building is already archived")
        
        # Soft delete by setting status to archived
        await conn.execute("""
            UPDATE buildings 
            SET status = 'archived', updated_at = NOW()
            WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        return DeleteBuildingResponse(
            id=building_id,
            name=building['name'],
            message=f"Rakennus '{building['name']}' arkistoitu onnistuneesti"
        )
        
    finally:
        await conn.close()


@router.get("/dashboard")
async def get_portfolio_dashboard(
    org_id: int = 1
) -> PortfolioDashboard:
    """Get complete portfolio dashboard data.
    
    Returns overview metrics and building list with condition scores.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get all buildings with latest valuations and assessments
        buildings_data = await conn.fetch("""
            SELECT 
                b.id,
                b.name,
                b.municipality,
                b.construction_year,
                EXTRACT(YEAR FROM CURRENT_DATE)::int - b.construction_year as building_age,
                b.area_m2,
                b.building_type,
                
                -- Latest valuation data
                bv.replacement_value,
                bv.technical_value,
                bv.condition_score,
                bv.repair_debt,
                bv.assessment_date as valuation_date,
                
                -- Latest assessment data
                ca.weighted_average as pka_score,
                ca.assessment_date,
                CURRENT_DATE - ca.assessment_date as assessment_age_days
                
            FROM buildings b
            LEFT JOIN LATERAL (
                SELECT * FROM building_valuations
                WHERE building_id = b.id
                ORDER BY assessment_date DESC
                LIMIT 1
            ) bv ON true
            LEFT JOIN LATERAL (
                SELECT * FROM component_assessments
                WHERE building_id = b.id
                ORDER BY assessment_date DESC
                LIMIT 1
            ) ca ON true
            
            WHERE b.org_id = $1
            AND b.status = 'active'
            ORDER by b.name
        """, org_id)
        
        # Convert to BuildingSummary objects
        buildings = [
            BuildingSummary(
                id=row['id'],
                name=row['name'],
                municipality=row['municipality'],
                construction_year=row['construction_year'],
                building_age=row['building_age'],
                area_m2=float(row['area_m2']) if row['area_m2'] else 0,
                building_type=row['building_type'],
                condition_score=float(row['condition_score'] * 100) if row['condition_score'] else None,
                pka_score=float(row['pka_score']) if row['pka_score'] else None,
                replacement_value=float(row['replacement_value']) if row['replacement_value'] else None,
                technical_value=float(row['technical_value']) if row['technical_value'] else None,
                repair_debt=float(row['repair_debt']) if row['repair_debt'] else None,
                last_assessment_date=row['assessment_date'],
                assessment_age_days=row['assessment_age_days']
            )
            for row in buildings_data
        ]
        
        # Calculate overview metrics
        total_buildings = len(buildings)
        total_area = sum(b.area_m2 for b in buildings)
        avg_age = sum(b.building_age for b in buildings) / total_buildings if total_buildings > 0 else 0
        
        # Condition distribution
        assessed_buildings = [b for b in buildings if b.condition_score is not None]
        buildings_critical = sum(1 for b in assessed_buildings if b.condition_score < 50)
        buildings_poor = sum(1 for b in assessed_buildings if 50 <= b.condition_score < 60)
        buildings_adequate = sum(1 for b in assessed_buildings if 60 <= b.condition_score < 75)
        buildings_good = sum(1 for b in assessed_buildings if b.condition_score >= 75)
        
        avg_condition = (
            sum(b.condition_score for b in assessed_buildings) / len(assessed_buildings)
            if assessed_buildings else None
        )
        
        # Financial totals
        total_jha = sum(b.replacement_value for b in buildings if b.replacement_value)
        total_tekna = sum(b.technical_value for b in buildings if b.technical_value)
        total_debt = sum(b.repair_debt for b in buildings if b.repair_debt)
        
        overview = PortfolioOverview(
            total_buildings=total_buildings,
            total_area_m2=total_area,
            average_building_age=avg_age,
            average_condition_pct=avg_condition,
            buildings_critical=buildings_critical,
            buildings_poor=buildings_poor,
            buildings_adequate=buildings_adequate,
            buildings_good=buildings_good,
            total_replacement_value=total_jha,
            total_technical_value=total_tekna,
            total_repair_debt=total_debt,
            buildings_with_assessment=len(assessed_buildings),
            buildings_needing_assessment=total_buildings - len(assessed_buildings)
        )
        
        return PortfolioDashboard(
            overview=overview,
            buildings=buildings
        )
        
    finally:
        await conn.close()
