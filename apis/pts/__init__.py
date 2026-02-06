"""PTS (Pitkän aikavälin suunnitelma) Investment Planning API.

Provides endpoints for 15-year investment planning based on building depreciation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import os
import asyncpg

from app.libs.pts_engine import (
    BuildingInput,
    YearlyInvestment,
    PTSPlan,
    generate_pts_plan,
    calculate_annual_summary,
    forecast_condition_trajectory
)
from app.libs.valuation_engine_new import (
    calculate_replacement_value,
    calculate_annual_depreciation,
    calculate_building_age
)

router = APIRouter(prefix="/api/pts")

# Pydantic Models

class PTSParameters(BaseModel):
    """Parameters for PTS calculation."""
    trigger_threshold: float = Field(
        default=0.50,
        description="Condition threshold triggering renovation (0.0-1.0)",
        ge=0.0,
        le=1.0
    )
    target_percentage: float = Field(
        default=1.00,
        description="Target condition after renovation (e.g., 1.00 = 100%, 1.20 = 120%)",
        ge=0.5,
        le=1.5
    )
    planning_horizon_years: int = Field(
        default=15,
        description="Number of years to plan ahead",
        ge=5,
        le=30
    )


class PTSInvestmentItem(BaseModel):
    """Single investment item in the schedule."""
    year: int
    building_id: int
    building_name: str
    investment_amount: float
    condition_before: Optional[float] = None
    condition_after: Optional[float] = None
    is_split_project: bool
    split_year_index: Optional[int] = None


class AnnualSummary(BaseModel):
    """Annual investment summary."""
    year: int
    total_investment: float
    buildings_count: int
    cumulative_investment: float


class PTSPlanResponse(BaseModel):
    """Complete PTS plan response."""
    start_year: int
    end_year: int
    total_investment: float
    average_annual_investment: float
    buildings_needing_renovation: int
    total_buildings: int
    yearly_schedule: Dict[int, List[PTSInvestmentItem]]
    annual_summary: List[AnnualSummary]
    parameters: PTSParameters


class ConditionForecast(BaseModel):
    """Condition forecast for a single building."""
    building_id: int
    building_name: str
    current_condition: float
    trajectory: List[Dict[str, float]]  # year, age, tekna, condition_score


# API Endpoints

@router.post("/generate-plan", response_model=PTSPlanResponse)
async def generate_portfolio_pts_plan(
    parameters: Optional[PTSParameters] = None
) -> PTSPlanResponse:
    """Generate PTS investment plan for entire portfolio.
    
    Analyzes all buildings and creates a 15-year investment schedule
    based on depreciation forecasts.
    
    Example request:
    ```json
    {
        "trigger_threshold": 0.50,
        "target_percentage": 1.00,
        "planning_horizon_years": 15
    }
    ```
    """
    if parameters is None:
        parameters = PTSParameters()
    
    # Get database connection
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Fetch all buildings
        buildings_data = await conn.fetch(
            """
            SELECT id, name, area_m2, cost_per_m2, construction_year, building_type
            FROM buildings
            WHERE area_m2 > 0 AND cost_per_m2 > 0
            ORDER BY construction_year ASC
            """
        )
        
        if not buildings_data:
            raise HTTPException(status_code=404, detail="No buildings found")
        
        # Convert to BuildingInput objects
        buildings = [
            BuildingInput(
                id=row['id'],
                name=row['name'],
                area_m2=float(row['area_m2']),
                cost_per_m2=float(row['cost_per_m2']),
                construction_year=row['construction_year'],
                building_type=row['building_type']
            )
            for row in buildings_data
        ]
        
        # Generate PTS plan
        plan = generate_pts_plan(
            buildings=buildings,
            trigger_threshold=parameters.trigger_threshold,
            target_percentage=parameters.target_percentage,
            planning_horizon_years=parameters.planning_horizon_years
        )
        
        # Convert yearly schedule to response format
        yearly_schedule_response = {}
        for year, investments in plan.yearly_schedule.items():
            yearly_schedule_response[year] = [
                PTSInvestmentItem(
                    year=inv.year,
                    building_id=inv.building_id,
                    building_name=inv.building_name,
                    investment_amount=inv.investment_amount,
                    condition_before=inv.condition_before,
                    condition_after=inv.condition_after,
                    is_split_project=inv.is_split_project,
                    split_year_index=inv.split_year_index
                )
                for inv in investments
            ]
        
        # Calculate annual summary
        annual_summary = calculate_annual_summary(plan)
        annual_summary_response = [
            AnnualSummary(
                year=item['year'],
                total_investment=item['total_investment'],
                buildings_count=item['buildings_count'],
                cumulative_investment=item['cumulative_investment']
            )
            for item in annual_summary
        ]
        
        return PTSPlanResponse(
            start_year=plan.start_year,
            end_year=plan.end_year,
            total_investment=plan.total_investment,
            average_annual_investment=plan.average_annual_investment,
            buildings_needing_renovation=plan.buildings_needing_renovation,
            total_buildings=plan.total_buildings,
            yearly_schedule=yearly_schedule_response,
            annual_summary=annual_summary_response,
            parameters=parameters
        )
        
    finally:
        await conn.close()


@router.get("/building-forecast/{building_id}", response_model=ConditionForecast)
async def get_building_condition_forecast(
    building_id: int,
    years_ahead: int = 15
) -> ConditionForecast:
    """Get condition forecast for a specific building.
    
    Shows how the building's condition will degrade over time.
    
    Args:
        building_id: Building ID
        years_ahead: Number of years to forecast (default 15)
    """
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Fetch building data
        building = await conn.fetchrow(
            """
            SELECT id, name, area_m2, cost_per_m2, construction_year
            FROM buildings
            WHERE id = $1
            """,
            building_id
        )
        
        if not building:
            raise HTTPException(status_code=404, detail=f"Building {building_id} not found")
        
        # Calculate current valuation
        jha = calculate_replacement_value(
            float(building['area_m2']),
            float(building['cost_per_m2'])
        )
        annual_dep = calculate_annual_depreciation(jha)
        current_age = calculate_building_age(building['construction_year'])
        
        # Generate forecast
        trajectory = forecast_condition_trajectory(
            jha,
            annual_dep,
            current_age,
            years_ahead
        )
        
        return ConditionForecast(
            building_id=building['id'],
            building_name=building['name'],
            current_condition=trajectory[0]['condition_score'],
            trajectory=trajectory
        )
        
    finally:
        await conn.close()
