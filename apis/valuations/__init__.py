

"""Valuation API endpoints.

Provides endpoints for calculating building valuations using standard Finnish methodology.
All calculations handle Decimal types from database properly.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import asyncpg

from app.libs.valuation_engine_new import calculate_full_valuation

router = APIRouter(prefix="/api/valuations")

# Pydantic Models

class ValuationRequest(BaseModel):
    """Request to calculate valuation for a building."""
    building_id: int = Field(description="Building ID")
    area_m2: float = Field(description="Building area in square meters")
    cost_per_m2: float = Field(description="Construction cost per square meter")
    construction_year: int = Field(description="Year the building was constructed")
    reference_year: Optional[int] = Field(None, description="Reference year for calculation (defaults to current year)")


class BatchValuationRequest(BaseModel):
    """Request to calculate valuations for multiple buildings."""
    buildings: List[ValuationRequest] = Field(description="List of buildings to calculate")


class ValuationResponse(BaseModel):
    """Valuation calculation response."""
    building_id: int = Field(description="Building ID")
    replacement_value: float = Field(description="Replacement value (JHA) in euros")
    annual_depreciation: float = Field(description="Annual depreciation in euros")
    building_age: int = Field(description="Building age in years")
    technical_value: float = Field(description="Technical value (TeknA) in euros")
    condition_score: float = Field(description="Condition score (kla) as decimal 0.0-1.0")
    kptarve: float = Field(description="Maintenance need in euros")
    pptarve: float = Field(description="Improvement need in euros")
    repair_debt: float = Field(description="Total repair debt in euros")
    calculated_at: str = Field(description="Timestamp of calculation")


class BatchValuationResponse(BaseModel):
    """Batch valuation response."""
    valuations: List[ValuationResponse] = Field(description="List of calculated valuations")
    total_buildings: int = Field(description="Total number of buildings calculated")


class SaveValuationRequest(BaseModel):
    """Request to save a valuation to the database."""
    building_id: int = Field(description="Building ID")
    assessment_id: Optional[int] = Field(None, description="Related assessment ID if applicable")
    replacement_value: float
    technical_value: float
    condition_score: float
    repair_debt: float
    kptarve: float
    pptarve: float


class SaveValuationResponse(BaseModel):
    """Response after saving valuation."""
    message: str
    valuation_id: int


# API Endpoints

@router.post("/calculate", response_model=ValuationResponse)
async def calculate_valuation(request: ValuationRequest) -> ValuationResponse:
    """Calculate valuation for a single building.
    
    Applies standard Finnish methodology to calculate:
    - Replacement value (JHA)
    - Technical value (TeknA)
    - Condition score (kla)
    - Repair debt (korjausvelka)
    
    Example request:
    ```json
    {
        "building_id": 1,
        "area_m2": 1500,
        "cost_per_m2": 2000,
        "construction_year": 1994,
        "reference_year": 2024
    }
    ```
    """
    # Calculate valuation
    valuation = calculate_full_valuation(
        area_m2=request.area_m2,
        cost_per_m2=request.cost_per_m2,
        construction_year=request.construction_year,
        reference_year=request.reference_year
    )
    
    return ValuationResponse(
        building_id=request.building_id,
        replacement_value=valuation['replacement_value'],
        annual_depreciation=valuation['annual_depreciation'],
        building_age=valuation['building_age'],
        technical_value=valuation['technical_value'],
        condition_score=valuation['condition_score'],
        kptarve=valuation['kptarve'],
        pptarve=valuation['pptarve'],
        repair_debt=valuation['repair_debt'],
        calculated_at=datetime.now().isoformat()
    )


@router.post("/batch-calculate", response_model=BatchValuationResponse)
async def batch_calculate_valuations(request: BatchValuationRequest) -> BatchValuationResponse:
    """Calculate valuations for multiple buildings in one request.
    
    Useful for portfolio-wide calculations.
    
    Example request:
    ```json
    {
        "buildings": [
            {"building_id": 1, "area_m2": 1500, "cost_per_m2": 2000, "construction_year": 1994},
            {"building_id": 2, "area_m2": 800, "cost_per_m2": 2200, "construction_year": 2010}
        ]
    }
    ```
    """
    valuations = []
    
    for building_req in request.buildings:
        valuation = calculate_full_valuation(
            area_m2=building_req.area_m2,
            cost_per_m2=building_req.cost_per_m2,
            construction_year=building_req.construction_year,
            reference_year=building_req.reference_year
        )
        
        valuations.append(ValuationResponse(
            building_id=building_req.building_id,
            replacement_value=valuation['replacement_value'],
            annual_depreciation=valuation['annual_depreciation'],
            building_age=valuation['building_age'],
            technical_value=valuation['technical_value'],
            condition_score=valuation['condition_score'],
            kptarve=valuation['kptarve'],
            pptarve=valuation['pptarve'],
            repair_debt=valuation['repair_debt'],
            calculated_at=datetime.now().isoformat()
        ))
    
    return BatchValuationResponse(
        valuations=valuations,
        total_buildings=len(valuations)
    )


@router.get("/building/{building_id}", response_model=ValuationResponse)
async def get_building_valuation(building_id: int) -> ValuationResponse:
    """Get latest calculated valuation for a building.
    
    Fetches building data from database and calculates current valuation.
    """
    # Get database connection
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Fetch building data
        building = await conn.fetchrow(
            """
            SELECT id, area_m2, cost_per_m2, construction_year
            FROM buildings
            WHERE id = $1
            """,
            building_id
        )
        
        if not building:
            raise HTTPException(status_code=404, detail=f"Building {building_id} not found")
        
        # Calculate valuation
        valuation = calculate_full_valuation(
            area_m2=building['area_m2'],
            cost_per_m2=building['cost_per_m2'],
            construction_year=building['construction_year']
        )
        
        return ValuationResponse(
            building_id=building_id,
            replacement_value=valuation['replacement_value'],
            annual_depreciation=valuation['annual_depreciation'],
            building_age=valuation['building_age'],
            technical_value=valuation['technical_value'],
            condition_score=valuation['condition_score'],
            kptarve=valuation['kptarve'],
            pptarve=valuation['pptarve'],
            repair_debt=valuation['repair_debt'],
            calculated_at=datetime.now().isoformat()
        )
        
    finally:
        await conn.close()


@router.post("/save", response_model=SaveValuationResponse)
async def save_valuation(request: SaveValuationRequest) -> SaveValuationResponse:
    """Save a calculated valuation to the database.
    
    Stores valuation in building_valuations for tracking over time.
    """
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Insert valuation record
        valuation_id = await conn.fetchval(
            """
            INSERT INTO building_valuations (
                building_id,
                assessment_date,
                inspection_date,
                replacement_value,
                annual_depreciation,
                technical_value,
                condition_score,
                repair_debt,
                maintenance_need,
                improvement_need
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
            """,
            request.building_id,
            datetime.now().date(),
            None,  # inspection_date - optional
            request.replacement_value,
            0,  # annual_depreciation - can be added to request if needed
            request.technical_value,
            request.condition_score,
            request.repair_debt,
            request.kptarve,
            request.pptarve
        )
        
        return SaveValuationResponse(
            message="Valuation saved successfully",
            valuation_id=valuation_id
        )
        
    finally:
        await conn.close()
