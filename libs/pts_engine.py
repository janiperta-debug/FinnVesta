
"""PTS (Pitkän aikavälin suunnitelma) calculation engine.

Implements 15-year investment planning based on building depreciation forecasts.
Follows Finnish property management methodology for long-term maintenance planning.
"""

from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass

from app.libs.valuation_engine_new import (
    calculate_replacement_value,
    calculate_annual_depreciation,
    calculate_technical_value,
    calculate_condition_score,
    calculate_building_age
)


@dataclass
class BuildingInput:
    """Input data for a single building."""
    id: int
    name: str
    area_m2: float
    cost_per_m2: float
    construction_year: int
    building_type: Optional[str] = None


@dataclass
class YearlyInvestment:
    """Investment scheduled for a specific year."""
    year: int
    building_id: int
    building_name: str
    investment_amount: float
    condition_before: float
    condition_after: float
    is_split_project: bool  # True if large building split over multiple years
    split_year_index: Optional[int] = None  # 1, 2, or 3 for split projects


@dataclass
class PTSPlan:
    """Complete PTS investment plan."""
    start_year: int
    end_year: int
    total_investment: float
    average_annual_investment: float
    yearly_schedule: Dict[int, List[YearlyInvestment]]  # year -> list of investments
    buildings_needing_renovation: int
    total_buildings: int


def forecast_condition_trajectory(
    replacement_value: float,
    annual_depreciation: float,
    current_age: int,
    years_ahead: int = 15
) -> List[Dict[str, float]]:
    """Forecast building condition over the next N years.
    
    Args:
        replacement_value: JHA value
        annual_depreciation: Annual depreciation amount
        current_age: Current building age
        years_ahead: Number of years to forecast
        
    Returns:
        List of dicts with year, age, tekna, and condition_score
    """
    current_year = datetime.now().year
    trajectory = []
    
    for year_offset in range(years_ahead + 1):
        future_age = current_age + year_offset
        future_year = current_year + year_offset
        
        tekna = calculate_technical_value(
            replacement_value,
            annual_depreciation,
            future_age
        )
        
        condition_score = calculate_condition_score(tekna, replacement_value)
        
        trajectory.append({
            'year': future_year,
            'age': future_age,
            'tekna': tekna,
            'condition_score': condition_score
        })
    
    return trajectory


def find_renovation_year(
    replacement_value: float,
    annual_depreciation: float,
    current_age: int,
    trigger_threshold: float = 0.50,  # Default 50%
    max_years_ahead: int = 15
) -> Optional[int]:
    """Find the year when building drops below trigger threshold.
    
    Args:
        replacement_value: JHA value
        annual_depreciation: Annual depreciation amount
        current_age: Current building age
        trigger_threshold: Condition threshold that triggers renovation (0.0-1.0)
        max_years_ahead: Maximum years to look ahead
        
    Returns:
        Year when renovation is needed, or None if not needed within timeframe
    """
    trajectory = forecast_condition_trajectory(
        replacement_value,
        annual_depreciation,
        current_age,
        max_years_ahead
    )
    
    # Check if already below threshold
    if trajectory[0]['condition_score'] < trigger_threshold:
        return datetime.now().year
    
    # Find first year when it drops below threshold
    for point in trajectory:
        if point['condition_score'] < trigger_threshold:
            return point['year']
    
    return None


def calculate_investment_need(
    replacement_value: float,
    current_tekna: float,
    target_percentage: float = 1.00  # Default 100% (restoration)
) -> float:
    """Calculate investment needed to reach target condition.
    
    Formula: (JHA × target%) - current_TeknA
    
    Args:
        replacement_value: JHA value
        current_tekna: Current TeknA value
        target_percentage: Target condition (e.g., 1.00 = 100%, 1.20 = 120%)
        
    Returns:
        Investment amount needed in euros
    """
    target_value = replacement_value * target_percentage
    investment = max(0, target_value - current_tekna)
    return investment


def split_large_building_investment(
    building_id: int,
    building_name: str,
    area_m2: float,
    total_investment: float,
    renovation_year: int,
    condition_before: float,
    condition_after: float
) -> List[YearlyInvestment]:
    """Split investment for large buildings over multiple years.
    
    Logic:
    - Buildings > 4000m²: split over 2 years
    - Buildings > 8000m²: split over 3 years
    - Equal investment amounts each year
    
    Args:
        building_id: Building identifier
        building_name: Building name
        area_m2: Building area
        total_investment: Total investment amount
        renovation_year: Year renovation starts
        condition_before: Condition score before renovation
        condition_after: Condition score after complete renovation
        
    Returns:
        List of YearlyInvestment objects
    """
    if area_m2 > 8000:
        # Split over 3 years
        num_years = 3
    elif area_m2 > 4000:
        # Split over 2 years
        num_years = 2
    else:
        # Single year
        return [YearlyInvestment(
            year=renovation_year,
            building_id=building_id,
            building_name=building_name,
            investment_amount=total_investment,
            condition_before=condition_before,
            condition_after=condition_after,
            is_split_project=False
        )]
    
    # Split investment equally over years
    annual_investment = total_investment / num_years
    investments = []
    
    for i in range(num_years):
        investments.append(YearlyInvestment(
            year=renovation_year + i,
            building_id=building_id,
            building_name=building_name,
            investment_amount=annual_investment,
            condition_before=condition_before if i == 0 else None,
            condition_after=condition_after if i == num_years - 1 else None,
            is_split_project=True,
            split_year_index=i + 1
        ))
    
    return investments


def generate_pts_plan(
    buildings: List[BuildingInput],
    trigger_threshold: float = 0.50,
    target_percentage: float = 1.00,
    planning_horizon_years: int = 15,
    reference_year: Optional[int] = None
) -> PTSPlan:
    """Generate comprehensive PTS investment plan for portfolio.
    
    Args:
        buildings: List of buildings to plan for
        trigger_threshold: Condition threshold triggering renovation (default 50%)
        target_percentage: Target condition after renovation (default 100%)
        planning_horizon_years: Number of years to plan ahead (default 15)
        reference_year: Reference year for calculations (defaults to current year)
        
    Returns:
        PTSPlan with complete investment schedule
    """
    if reference_year is None:
        reference_year = datetime.now().year
    
    start_year = reference_year
    end_year = reference_year + planning_horizon_years
    
    # Initialize yearly schedule
    yearly_schedule: Dict[int, List[YearlyInvestment]] = {
        year: [] for year in range(start_year, end_year + 1)
    }
    
    total_investment = 0.0
    buildings_needing_renovation = 0
    
    for building in buildings:
        # Calculate current valuation
        jha = calculate_replacement_value(building.area_m2, building.cost_per_m2)
        annual_dep = calculate_annual_depreciation(jha)
        current_age = calculate_building_age(building.construction_year, reference_year)
        current_tekna = calculate_technical_value(jha, annual_dep, current_age)
        current_condition = calculate_condition_score(current_tekna, jha)
        
        # Find renovation year
        renovation_year = find_renovation_year(
            jha,
            annual_dep,
            current_age,
            trigger_threshold,
            planning_horizon_years
        )
        
        if renovation_year is None:
            # No renovation needed within planning horizon
            continue
        
        # Calculate investment need
        # Get TeknA at renovation year
        years_until_renovation = renovation_year - reference_year
        renovation_age = current_age + years_until_renovation
        tekna_at_renovation = calculate_technical_value(jha, annual_dep, renovation_age)
        
        investment_needed = calculate_investment_need(
            jha,
            tekna_at_renovation,
            target_percentage
        )
        
        total_investment += investment_needed
        buildings_needing_renovation += 1
        
        # Calculate condition after renovation
        condition_before = calculate_condition_score(tekna_at_renovation, jha)
        condition_after = target_percentage  # Target percentage as condition score
        
        # Split large buildings if necessary
        yearly_investments = split_large_building_investment(
            building.id,
            building.name,
            building.area_m2,
            investment_needed,
            renovation_year,
            condition_before,
            condition_after
        )
        
        # Add to schedule
        for investment in yearly_investments:
            if investment.year in yearly_schedule:
                yearly_schedule[investment.year].append(investment)
    
    # Calculate average annual investment
    average_annual = total_investment / planning_horizon_years if planning_horizon_years > 0 else 0
    
    return PTSPlan(
        start_year=start_year,
        end_year=end_year,
        total_investment=total_investment,
        average_annual_investment=average_annual,
        yearly_schedule=yearly_schedule,
        buildings_needing_renovation=buildings_needing_renovation,
        total_buildings=len(buildings)
    )


def calculate_annual_summary(
    pts_plan: PTSPlan
) -> List[Dict[str, any]]:
    """Generate annual investment summary from PTS plan.
    
    Args:
        pts_plan: PTS plan to summarize
        
    Returns:
        List of dicts with year, total_investment, buildings_count, cumulative_investment
    """
    summary = []
    cumulative = 0.0
    
    for year in range(pts_plan.start_year, pts_plan.end_year + 1):
        investments = pts_plan.yearly_schedule.get(year, [])
        annual_total = sum(inv.investment_amount for inv in investments)
        cumulative += annual_total
        
        # Count unique buildings (not split year entries)
        unique_buildings = len(set(inv.building_id for inv in investments))
        
        summary.append({
            'year': year,
            'total_investment': annual_total,
            'buildings_count': unique_buildings,
            'cumulative_investment': cumulative
        })
    
    return summary
