
"""Domain models for FinnVesta property portfolio management system.

Based on standard Finnish building condition assessment methodology.
"""
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


# ============================================================================
# MULTI-TENANT & ORGANIZATION
# ============================================================================

@dataclass
class Organization:
    """Property management organization (multi-tenant)."""
    id: int
    name: str
    subscription_tier: str  # 'basic', 'professional', 'enterprise'
    created_at: datetime
    updated_at: datetime


# ============================================================================
# PROPERTY & BUILDING STRUCTURE
# ============================================================================

@dataclass
class Property:
    """Real estate property that can contain multiple buildings."""
    id: int
    org_id: int
    name: str
    address: str
    postal_code: Optional[str]
    municipality: str
    property_type: Optional[str]  # 'municipal', 'commercial', 'residential'
    status: str  # 'active', 'inactive', 'sold'
    created_at: datetime
    updated_at: datetime


@dataclass
class Building:
    """Individual building with construction details.
    
    This is the core entity for condition tracking and valuation.
    In Finnish methodology, all calculations are done at building level.
    """
    id: int
    org_id: int
    property_id: Optional[int]  # Can be standalone or part of property
    name: str
    address: Optional[str]
    construction_year: int
    area_m2: Decimal
    building_type: Optional[str]  # 'school', 'daycare', 'office', 'healthcare'
    usage_category: Optional[str]  # Ktt code (1-8)
    cost_per_m2: Decimal  # Construction cost for JHA calculation
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


# ============================================================================
# VALUATION CALCULATIONS
# ============================================================================

@dataclass
class BuildingValuation:
    """Standard Finnish methodology valuation calculations.
    
    Formula reference:
    - JHA (replacement_value) = area_m2 × cost_per_m2
    - Annual depreciation = JHA × 1.75%
    - TeknA (technical_value) = JHA - (depreciation × building_age)
    - kla (condition_score) = TeknA / JHA
    
    Repair debt logic:
    - If kla >= 75%: No debt (excellent/good condition)
    - If 60% <= kla < 75%: maintenance_need = (JHA × 0.75) - TeknA
    - If kla < 60%: improvement_need = (JHA × 1.20) - TeknA
    - repair_debt = maintenance_need + improvement_need
    """
    id: int
    building_id: int
    assessment_date: date
    inspection_date: Optional[date]
    
    # Core valuation values
    replacement_value: Decimal  # JHA - Jälleenhankinta-arvo
    annual_depreciation: Decimal  # 1.75% of JHA per year
    technical_value: Decimal  # TeknA = JHA - (depreciation × age)
    condition_score: Decimal  # kla = TeknA / JHA (0.00 to 1.00)
    
    # Repair debt components
    repair_debt: Decimal  # Kvelka (total)
    maintenance_need: Decimal  # Kptarve (60-75% condition)
    improvement_need: Decimal  # Pptarve (<60% condition)
    
    created_at: datetime


# ============================================================================
# COMPONENT ASSESSMENTS (Physical Inspections)
# ============================================================================

@dataclass
class ComponentAssessment:
    """Physical building inspection with 9-component scoring.
    
    Each component is scored 1-5:
    - 5 = Like new (Uutta vastaava)
    - 4 = Good condition (Hyväkuntoinen)
    - 3 = Adequate (Tyydyttäväkuntoinen)
    - 2 = Poor (Välttäkuntoinen)
    - 1 = Critical (Heikkokuntoinen)
    
    Component weights for PKA calculation:
    - Structure/Foundation (Runko): 30%
    - Facade/Roof (Julkisivut/Katot): 15%
    - Windows/Doors (Ikkunat/Ovet): 5%
    - Interior Walls (Väliseinät): 10%
    - Interior Finishes (Sisäpuoleiset pinnat): 13%
    - Heating (Lämmitys): 5%
    - Electrical (Sähkö): 8%
    - Plumbing (Vesi ja viemäri): 8%
    - HVAC (Ilmanvaihto): 8%
    
    PKA (weighted_average) = sum of (component_score × weight)
    """
    id: int
    building_id: int
    assessment_date: date
    inspector_name: Optional[str]
    
    # 9 component scores (1-5 scale)
    structure_score: Optional[int]  # Runko (30%)
    facade_roof_score: Optional[int]  # Julk/Ka (15%)
    windows_doors_score: Optional[int]  # Ik/Ov (5%)
    interior_walls_score: Optional[int]  # Välis (10%)
    interior_finishes_score: Optional[int]  # Spinnat (13%)
    heating_score: Optional[int]  # Läm (5%)
    electrical_score: Optional[int]  # S/Auto (8%)
    plumbing_score: Optional[int]  # VV (8%)
    hvac_score: Optional[int]  # Ilm (8%)
    
    # Calculated weighted average
    weighted_average: Optional[Decimal]  # PKA - Painotettu kunto-arvio
    
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


# Component weights used in PKA calculation
COMPONENT_WEIGHTS = {
    'structure': 0.30,
    'facade_roof': 0.15,
    'windows_doors': 0.05,
    'interior_walls': 0.10,
    'interior_finishes': 0.13,
    'heating': 0.05,
    'electrical': 0.08,
    'plumbing': 0.08,
    'hvac': 0.08,
}


# ============================================================================
# MAINTENANCE & REPAIR TRACKING
# ============================================================================

@dataclass
class MaintenanceRecord:
    """Maintenance and repair work tracking."""
    id: int
    org_id: int
    building_id: int
    assessment_id: Optional[int]  # Link to component assessment if applicable
    
    title: str
    description: Optional[str]
    category: str  # 'routine', 'repair', 'renovation', 'emergency'
    component: Optional[str]  # Which building component (structure, HVAC, etc.)
    priority: str  # 'low', 'medium', 'high', 'urgent', 'critical'
    status: str  # 'planned', 'in_progress', 'completed', 'cancelled'
    
    # Financial tracking
    estimated_cost: Optional[Decimal]
    actual_cost: Optional[Decimal]
    funding_source: Optional[str]  # 'operating', 'capital', 'grant'
    
    # Scheduling
    scheduled_start: Optional[date]
    scheduled_completion: Optional[date]
    actual_start: Optional[date]
    actual_completion: Optional[date]
    
    created_at: datetime
    updated_at: datetime


# ============================================================================
# INVESTMENT PLANNING (PTS)
# ============================================================================

@dataclass
class InvestmentPlan:
    """Long-term investment planning (PTS - Pitkän aikavälin suunnitelma).
    
    Finnish methodology forecasts when buildings will need major renovation based on:
    - 1.75% annual depreciation
    - Renovation triggered when condition drops below 50%
    - Investment needed = (JHA × 1.20) - current_TeknA
    - Large buildings split over 2-3 years
    """
    id: int
    building_id: int
    plan_year: int  # 2025-2050
    planned_investment: Decimal
    investment_type: Optional[str]  # 'renovation', 'modernization', 'expansion'
    priority: str  # 'low', 'medium', 'high'
    status: str  # 'planned', 'approved', 'in_progress', 'completed'
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


# ============================================================================
# FINANCIAL DATA
# ============================================================================

@dataclass
class Financials:
    """Financial data per building per year."""
    id: int
    building_id: int
    financial_year: int
    
    # Capital
    market_value: Optional[Decimal]
    purchase_price: Optional[Decimal]
    purchase_date: Optional[date]
    debt_amount: Optional[Decimal]
    
    # Operating
    operating_costs: Optional[Decimal]
    rental_income: Optional[Decimal]
    
    # Insurance
    insurance_value: Optional[Decimal]
    
    created_at: datetime
    updated_at: datetime


# ============================================================================
# CONSTANTS & ENUMS
# ============================================================================

# Depreciation rate (1.75% per year)
ANNUAL_DEPRECIATION_RATE = Decimal('0.0175')

# Condition thresholds
CONDITION_EXCELLENT = Decimal('0.90')  # >= 90%
CONDITION_GOOD = Decimal('0.75')  # >= 75%
CONDITION_ADEQUATE = Decimal('0.60')  # >= 60%
CONDITION_POOR = Decimal('0.50')  # >= 50%
# < 50% = Critical

# Repair debt targets
MAINTENANCE_TARGET = Decimal('0.75')  # Bring to 75% for adequate buildings
IMPROVEMENT_TARGET = Decimal('1.20')  # Upgrade to 120% for poor buildings

# Component scoring scale
COMPONENT_MIN_SCORE = 1
COMPONENT_MAX_SCORE = 5
