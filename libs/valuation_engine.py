"""Valuation calculation engine implementing standard Finnish building assessment methodology.

This module contains core valuation formulas for Finnish building condition assessment.
All formulas follow standard Finnish property valuation practices.
"""

from datetime import datetime
from typing import Dict, Optional


def calculate_replacement_value(area_m2: float, cost_per_m2: float) -> float:
    """Calculate Replacement Value (JHA - Jälleenhankinta-arvo).
    
    JHA represents the cost to rebuild the property from scratch.
    
    Args:
        area_m2: Building area in square meters
        cost_per_m2: Construction cost per square meter (€/m²)
        
    Returns:
        Replacement value in euros
    """
    return area_m2 * cost_per_m2


def calculate_annual_depreciation(replacement_value: float) -> float:
    """Calculate annual depreciation (1.75% of JHA).
    
    Finnish standard depreciation rate for buildings.
    
    Args:
        replacement_value: JHA value in euros
        
    Returns:
        Annual depreciation in euros
    """
    return replacement_value * 0.0175


def calculate_building_age(construction_year: int, reference_year: Optional[int] = None) -> int:
    """Calculate building age.
    
    Args:
        construction_year: Year the building was constructed
        reference_year: Reference year (defaults to current year)
        
    Returns:
        Building age in years
    """
    if reference_year is None:
        reference_year = datetime.now().year
    return max(0, reference_year - construction_year)


def calculate_technical_value(
    replacement_value: float,
    annual_depreciation: float,
    building_age: int
) -> float:
    """Calculate Technical Value (TeknA - Tekninen arvo).
    
    TeknA = JHA - (annual_depreciation × age)
    
    Note: TeknA cannot exceed JHA and cannot be negative.
    
    Args:
        replacement_value: JHA value in euros
        annual_depreciation: Annual depreciation in euros
        building_age: Age of building in years
        
    Returns:
        Technical value in euros
    """
    tekna = float(replacement_value) - (float(annual_depreciation) * building_age)
    return max(0, min(tekna, float(replacement_value)))


def calculate_condition_score(technical_value: float, replacement_value: float) -> float:
    """Calculate Condition Score (kla).
    
    kla = TeknA / JHA
    
    Returns value between 0 and 1, representing percentage of original value.
    
    Args:
        technical_value: TeknA value in euros
        replacement_value: JHA value in euros
        
    Returns:
        Condition score as decimal (0.0 to 1.0)
    """
    if float(replacement_value) == 0:
        return 0.0
    return float(technical_value) / float(replacement_value)


def calculate_repair_debt(
    condition_score: float,
    replacement_value: float,
    technical_value: float
) -> Dict[str, float]:
    """Calculate Repair Debt (Korjausvelka) with components.
    
    Logic:
    - kla >= 75%: No repair debt (excellent condition)
    - 60% <= kla < 75%: Maintenance need (kptarve) to bring to 75%
    - kla < 60%: Improvement need (pptarve) to upgrade to 120% of JHA
    
    Args:
        condition_score: kla value (0.0 to 1.0)
        replacement_value: JHA value in euros
        technical_value: TeknA value in euros
        
    Returns:
        Dictionary with:
        - kptarve: Maintenance need (€)
        - pptarve: Improvement need (€)
        - total: Total repair debt (€)
    """
    kptarve = 0.0
    pptarve = 0.0
    
    if condition_score >= 0.75:
        # Excellent condition - no repair debt
        kptarve = 0.0
        pptarve = 0.0
    elif condition_score >= 0.60:
        # Moderate condition - maintenance needed to bring to 75%
        target_value = replacement_value * 0.75
        kptarve = max(0, target_value - technical_value)
        pptarve = 0.0
    else:
        # Poor condition - improvement needed to upgrade to 120%
        target_value = replacement_value * 1.20
        kptarve = 0.0
        pptarve = max(0, target_value - technical_value)
    
    return {
        'kptarve': kptarve,
        'pptarve': pptarve,
        'total': kptarve + pptarve
    }


def calculate_full_valuation(
    area_m2: float,
    cost_per_m2: float,
    construction_year: int,
    reference_year: Optional[int] = None
) -> Dict[str, float]:
    """Calculate complete building valuation.
    
    Runs all valuation formulas in sequence and returns comprehensive results.
    
    Args:
        area_m2: Building area in square meters
        cost_per_m2: Construction cost per square meter (€/m²)
        construction_year: Year the building was constructed
        reference_year: Reference year (defaults to current year)
        
    Returns:
        Dictionary containing all valuation metrics:
        - replacement_value (JHA)
        - annual_depreciation
        - building_age
        - technical_value (TeknA)
        - condition_score (kla)
        - kptarve (maintenance need)
        - pptarve (improvement need)
        - repair_debt (total)
    """
    # Calculate base values
    jha = calculate_replacement_value(area_m2, cost_per_m2)
    annual_dep = calculate_annual_depreciation(jha)
    age = calculate_building_age(construction_year, reference_year)
    
    # Calculate technical value and condition
    tekna = calculate_technical_value(jha, annual_dep, age)
    kla = calculate_condition_score(tekna, jha)
    
    # Calculate repair debt
    repair_debt = calculate_repair_debt(kla, jha, tekna)
    
    return {
        'replacement_value': jha,
        'annual_depreciation': annual_dep,
        'building_age': age,
        'technical_value': tekna,
        'condition_score': kla,
        'kptarve': repair_debt['kptarve'],
        'pptarve': repair_debt['pptarve'],
        'repair_debt': repair_debt['total']
    }
