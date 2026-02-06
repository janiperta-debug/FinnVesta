from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
import os
import asyncpg
from app.libs.valuation_engine_new import calculate_valuation_from_assessment

router = APIRouter(prefix="/assessments")


# ============================================================================
# Request Models
# ============================================================================

class CreateAssessmentRequest(BaseModel):
    """Request model for creating a new component assessment."""
    assessment_date: date
    inspector_name: Optional[str] = None
    
    # Component scores (1-5 scale)
    structure_score: Optional[int] = None
    facade_roof_score: Optional[int] = None
    windows_doors_score: Optional[int] = None
    interior_walls_score: Optional[int] = None
    interior_finishes_score: Optional[int] = None
    heating_score: Optional[int] = None
    electrical_score: Optional[int] = None
    plumbing_score: Optional[int] = None
    hvac_score: Optional[int] = None
    
    # Component notes
    structure_notes: Optional[str] = None
    facade_roof_notes: Optional[str] = None
    windows_doors_notes: Optional[str] = None
    interior_walls_notes: Optional[str] = None
    interior_finishes_notes: Optional[str] = None
    heating_notes: Optional[str] = None
    electrical_notes: Optional[str] = None
    plumbing_notes: Optional[str] = None
    hvac_notes: Optional[str] = None

    notes: Optional[str] = None


class UpdateAssessmentRequest(BaseModel):
    """Request model for updating an assessment."""
    assessment_date: Optional[date] = None
    inspector_name: Optional[str] = None
    
    # Component scores (1-5 scale)
    structure_score: Optional[int] = None
    facade_roof_score: Optional[int] = None
    windows_doors_score: Optional[int] = None
    interior_walls_score: Optional[int] = None
    interior_finishes_score: Optional[int] = None
    heating_score: Optional[int] = None
    electrical_score: Optional[int] = None
    plumbing_score: Optional[int] = None
    hvac_score: Optional[int] = None

    # Component notes
    structure_notes: Optional[str] = None
    facade_roof_notes: Optional[str] = None
    windows_doors_notes: Optional[str] = None
    interior_walls_notes: Optional[str] = None
    interior_finishes_notes: Optional[str] = None
    heating_notes: Optional[str] = None
    electrical_notes: Optional[str] = None
    plumbing_notes: Optional[str] = None
    hvac_notes: Optional[str] = None
    
    notes: Optional[str] = None


# ============================================================================
# Response Models
# ============================================================================

class ComponentScore(BaseModel):
    """Individual component score with metadata."""
    name: str
    finnish_name: str
    score: Optional[int]
    weight: float
    description: str


class AssessmentDetail(BaseModel):
    """Detailed assessment with all component scores."""
    id: int
    building_id: int
    building_name: str
    assessment_date: date
    inspector_name: Optional[str]
    
    # Weighted average (PKA)
    pka_score: Optional[float]
    
    # Individual component scores
    structure_score: Optional[int]
    facade_roof_score: Optional[int]
    windows_doors_score: Optional[int]
    interior_walls_score: Optional[int]
    interior_finishes_score: Optional[int]
    heating_score: Optional[int]
    electrical_score: Optional[int]
    plumbing_score: Optional[int]
    hvac_score: Optional[int]
    
    # Component notes
    structure_notes: Optional[str]
    facade_roof_notes: Optional[str]
    windows_doors_notes: Optional[str]
    interior_walls_notes: Optional[str]
    interior_finishes_notes: Optional[str]
    heating_notes: Optional[str]
    electrical_notes: Optional[str]
    plumbing_notes: Optional[str]
    hvac_notes: Optional[str]

    notes: Optional[str]
    created_at: str
    updated_at: str


class AssessmentSummary(BaseModel):
    """Summary of an assessment for list views."""
    id: int
    assessment_date: date
    inspector_name: Optional[str]
    building_name: Optional[str] = None
    pka_score: Optional[float]
    notes: Optional[str]


class CreateAssessmentResponse(BaseModel):
    """Response after creating an assessment."""
    id: int
    building_id: int
    pka_score: Optional[float]
    message: str


class UpdateAssessmentResponse(BaseModel):
    """Response after updating an assessment."""
    id: int
    pka_score: Optional[float]
    message: str


class ScoreDistribution(BaseModel):
    """Distribution of condition scores (1-5)."""
    score: int
    count: int
    percentage: float


class CriticalComponent(BaseModel):
    """Component with critical condition score."""
    building_id: int
    building_name: str
    component_name: str
    finnish_name: str
    score: int
    notes: Optional[str] = None
    assessment_date: date


class BuildingAssessmentStatus(BaseModel):
    """Building assessment status."""
    building_id: int
    building_name: str
    last_assessment_date: Optional[date]
    days_since_assessment: Optional[int]
    status: str  # 'ok', 'warning', 'expired', 'missing'


class AssessmentsDashboardData(BaseModel):
    """Data for the assessments dashboard."""
    score_distribution: list[ScoreDistribution]
    critical_components: list[CriticalComponent]
    recent_assessments: list[AssessmentSummary]
    assessment_coverage: list[BuildingAssessmentStatus]
    average_portfolio_condition: Optional[float]


# ============================================================================
# Helper Functions
# ============================================================================

def calculate_pka(
    structure: Optional[int],
    facade_roof: Optional[int],
    windows_doors: Optional[int],
    interior_walls: Optional[int],
    interior_finishes: Optional[int],
    heating: Optional[int],
    electrical: Optional[int],
    plumbing: Optional[int],
    hvac: Optional[int]
) -> Optional[float]:
    """Calculate weighted average (PKA) based on Finnish building assessment methodology.
    
    Weights:
    - Structure/Foundation: 30%
    - Facade/Roof: 15%
    - Windows/Doors: 5%
    - Interior Walls: 10%
    - Interior Finishes: 13%
    - Heating: 5%
    - Electrical: 8%
    - Plumbing: 8%
    - HVAC: 8%
    
    Total: 102% (normalized to 100%)
    
    Returns None if not all scores are provided.
    """
    scores = [
        structure, facade_roof, windows_doors, interior_walls,
        interior_finishes, heating, electrical, plumbing, hvac
    ]
    
    # Return None if any score is missing
    if any(score is None for score in scores):
        return None
    
    # Component weights from standard Finnish methodology
    weights = {
        'structure': 0.30,
        'facade_roof': 0.15,
        'windows_doors': 0.05,
        'interior_walls': 0.10,
        'interior_finishes': 0.13,
        'heating': 0.05,
        'electrical': 0.08,
        'plumbing': 0.08,
        'hvac': 0.08
    }
    
    pka = (
        structure * weights['structure'] +
        facade_roof * weights['facade_roof'] +
        windows_doors * weights['windows_doors'] +
        interior_walls * weights['interior_walls'] +
        interior_finishes * weights['interior_finishes'] +
        heating * weights['heating'] +
        electrical * weights['electrical'] +
        plumbing * weights['plumbing'] +
        hvac * weights['hvac']
    )
    
    # Round to 2 decimal places
    return round(pka, 2)


def get_component_metadata() -> list[dict]:
    """Get component names, weights, and descriptions."""
    return [
        {
            "name": "structure",
            "finnish_name": "Runko/Perustus",
            "weight": 0.30,
            "description": "Rakennuksen kantavat rakenteet ja perustukset"
        },
        {
            "name": "facade_roof",
            "finnish_name": "Julkisivu/Katto",
            "weight": 0.15,
            "description": "Ulkoseinät, julkisivut ja vesikatto"
        },
        {
            "name": "windows_doors",
            "finnish_name": "Ikkunat/Ovet",
            "weight": 0.05,
            "description": "Ikkunat ja ulko-ovet"
        },
        {
            "name": "interior_walls",
            "finnish_name": "Väliseinät",
            "weight": 0.10,
            "description": "Sisäiset väliseinät ja rakenteet"
        },
        {
            "name": "interior_finishes",
            "finnish_name": "Sisäpuoliset pinnat",
            "weight": 0.13,
            "description": "Lattiat, seinäpinnat, katot"
        },
        {
            "name": "heating",
            "finnish_name": "Lämmitys",
            "weight": 0.05,
            "description": "Lämmitysjärjestelmät"
        },
        {
            "name": "electrical",
            "finnish_name": "Sähkö",
            "weight": 0.08,
            "description": "Sähköjärjestelmät ja -verkot"
        },
        {
            "name": "plumbing",
            "finnish_name": "Vesi ja viemäri",
            "weight": 0.08,
            "description": "Vesi- ja viemäriverkostot"
        },
        {
            "name": "hvac",
            "finnish_name": "Ilmanvaihto",
            "weight": 0.08,
            "description": "Ilmanvaihtojärjestelmät"
        }
    ]


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/building/{building_id}")
async def create_assessment(
    building_id: int,
    body: CreateAssessmentRequest,
    org_id: int = 1
) -> CreateAssessmentResponse:
    """Create a new component assessment for a building.
    
    Automatically calculates PKA (weighted average) if all component scores are provided.
    Triggers a new valuation calculation based on the assessment result.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Verify building exists and fetch details needed for valuation
        building = await conn.fetchrow("""
            SELECT id, name, area_m2, construction_year, cost_per_m2 
            FROM buildings 
            WHERE id = $1 AND org_id = $2 AND status = 'active'
        """, building_id, org_id)
        
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Calculate PKA
        pka = calculate_pka(
            body.structure_score,
            body.facade_roof_score,
            body.windows_doors_score,
            body.interior_walls_score,
            body.interior_finishes_score,
            body.heating_score,
            body.electrical_score,
            body.plumbing_score,
            body.hvac_score
        )
        
        # Insert assessment
        assessment_id = await conn.fetchval("""
            INSERT INTO component_assessments (
                building_id, assessment_date, inspector_name,
                structure_score, facade_roof_score, windows_doors_score,
                interior_walls_score, interior_finishes_score,
                heating_score, electrical_score, plumbing_score, hvac_score,
                structure_notes, facade_roof_notes, windows_doors_notes,
                interior_walls_notes, interior_finishes_notes,
                heating_notes, electrical_notes, plumbing_notes, hvac_notes,
                weighted_average, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING id
        """,
            building_id,
            body.assessment_date,
            body.inspector_name,
            body.structure_score,
            body.facade_roof_score,
            body.windows_doors_score,
            body.interior_walls_score,
            body.interior_finishes_score,
            body.heating_score,
            body.electrical_score,
            body.plumbing_score,
            body.hvac_score,
            body.structure_notes,
            body.facade_roof_notes,
            body.windows_doors_notes,
            body.interior_walls_notes,
            body.interior_finishes_notes,
            body.heating_notes,
            body.electrical_notes,
            body.plumbing_notes,
            body.hvac_notes,
            pka,
            body.notes
        )
        
        # Trigger valuation update if PKA is available
        if pka is not None:
            valuation = calculate_valuation_from_assessment(
                area_m2=float(building['area_m2']),
                cost_per_m2=float(building['cost_per_m2']),
                construction_year=building['construction_year'],
                pka_score=pka
            )
            
            await conn.execute("""
                INSERT INTO building_valuations (
                    building_id, assessment_date, replacement_value, 
                    technical_value, condition_score, repair_debt,
                    maintenance_need, improvement_need, annual_depreciation
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
                building_id,
                body.assessment_date,
                valuation['replacement_value'],
                valuation['technical_value'],
                valuation['condition_score'],
                valuation['repair_debt'],
                valuation['kptarve'],
                valuation['pptarve'],
                valuation['annual_depreciation']
            )
        
        return CreateAssessmentResponse(
            id=assessment_id,
            building_id=building_id,
            pka_score=pka,
            message=f"Kuntoarvio luotu onnistuneesti (PKA: {pka if pka else 'ei laskettu'})"
        )
        
    finally:
        await conn.close()


@router.get("/building/{building_id}")
async def get_building_assessments(
    building_id: int,
    org_id: int = 1
) -> list[AssessmentSummary]:
    """Get all assessments for a building, ordered by date (newest first)."""
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Verify building exists and belongs to org
        building = await conn.fetchrow("""
            SELECT id, name FROM buildings WHERE id = $1 AND org_id = $2
        """, building_id, org_id)
        
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Get assessments
        assessments = await conn.fetch("""
            SELECT 
                id, assessment_date, inspector_name,
                weighted_average as pka_score, notes
            FROM component_assessments
            WHERE building_id = $1
            ORDER BY assessment_date DESC, created_at DESC
        """, building_id)
        
        return [
            AssessmentSummary(
                id=row['id'],
                assessment_date=row['assessment_date'],
                inspector_name=row['inspector_name'],
                building_name=building['name'],
                pka_score=float(row['pka_score']) if row['pka_score'] else None,
                notes=row['notes']
            )
            for row in assessments
        ]
        
    finally:
        await conn.close()


@router.get("/{assessment_id}")
async def get_assessment_detail(
    assessment_id: int,
    org_id: int = 1
) -> AssessmentDetail:
    """Get detailed information for a specific assessment."""
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get assessment with building info
        assessment = await conn.fetchrow("""
            SELECT 
                ca.*,
                b.name as building_name
            FROM component_assessments ca
            JOIN buildings b ON ca.building_id = b.id
            WHERE ca.id = $1 AND b.org_id = $2
        """, assessment_id, org_id)
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        return AssessmentDetail(
            id=assessment['id'],
            building_id=assessment['building_id'],
            building_name=assessment['building_name'],
            assessment_date=assessment['assessment_date'],
            inspector_name=assessment['inspector_name'],
            pka_score=float(assessment['weighted_average']) if assessment['weighted_average'] else None,
            structure_score=assessment['structure_score'],
            facade_roof_score=assessment['facade_roof_score'],
            windows_doors_score=assessment['windows_doors_score'],
            interior_walls_score=assessment['interior_walls_score'],
            interior_finishes_score=assessment['interior_finishes_score'],
            heating_score=assessment['heating_score'],
            electrical_score=assessment['electrical_score'],
            plumbing_score=assessment['plumbing_score'],
            hvac_score=assessment['hvac_score'],
            structure_notes=assessment['structure_notes'],
            facade_roof_notes=assessment['facade_roof_notes'],
            windows_doors_notes=assessment['windows_doors_notes'],
            interior_walls_notes=assessment['interior_walls_notes'],
            interior_finishes_notes=assessment['interior_finishes_notes'],
            heating_notes=assessment['heating_notes'],
            electrical_notes=assessment['electrical_notes'],
            plumbing_notes=assessment['plumbing_notes'],
            hvac_notes=assessment['hvac_notes'],
            notes=assessment['notes'],
            created_at=assessment['created_at'].isoformat(),
            updated_at=assessment['updated_at'].isoformat()
        )
        
    finally:
        await conn.close()


@router.put("/{assessment_id}")
async def update_assessment(
    assessment_id: int,
    body: UpdateAssessmentRequest,
    org_id: int = 1
) -> UpdateAssessmentResponse:
    """Update an existing assessment.
    
    Recalculates PKA if component scores are updated.
    Triggers a new valuation calculation if PKA changes.
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Verify assessment exists and fetch building info
        existing = await conn.fetchrow("""
            SELECT ca.*, b.org_id, b.area_m2, b.construction_year, b.cost_per_m2
            FROM component_assessments ca
            JOIN buildings b ON ca.building_id = b.id
            WHERE ca.id = $1
        """, assessment_id)
        
        if not existing or existing['org_id'] != org_id:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Build UPDATE query dynamically
        updates = []
        values = []
        param_count = 1
        
        if body.assessment_date is not None:
            updates.append(f"assessment_date = ${param_count}")
            values.append(body.assessment_date)
            param_count += 1
        
        if body.inspector_name is not None:
            updates.append(f"inspector_name = ${param_count}")
            values.append(body.inspector_name)
            param_count += 1
        
        # Track if any component scores are updated for PKA recalculation
        component_scores = {
            'structure_score': body.structure_score if body.structure_score is not None else existing['structure_score'],
            'facade_roof_score': body.facade_roof_score if body.facade_roof_score is not None else existing['facade_roof_score'],
            'windows_doors_score': body.windows_doors_score if body.windows_doors_score is not None else existing['windows_doors_score'],
            'interior_walls_score': body.interior_walls_score if body.interior_walls_score is not None else existing['interior_walls_score'],
            'interior_finishes_score': body.interior_finishes_score if body.interior_finishes_score is not None else existing['interior_finishes_score'],
            'heating_score': body.heating_score if body.heating_score is not None else existing['heating_score'],
            'electrical_score': body.electrical_score if body.electrical_score is not None else existing['electrical_score'],
            'plumbing_score': body.plumbing_score if body.plumbing_score is not None else existing['plumbing_score'],
            'hvac_score': body.hvac_score if body.hvac_score is not None else existing['hvac_score']
        }
        
        # Add component score updates
        for field, value in component_scores.items():
            if getattr(body, field) is not None:
                updates.append(f"{field} = ${param_count}")
                values.append(value)
                param_count += 1
        
        # Add component note updates
        component_notes = [
            'structure_notes', 'facade_roof_notes', 'windows_doors_notes',
            'interior_walls_notes', 'interior_finishes_notes', 'heating_notes',
            'electrical_notes', 'plumbing_notes', 'hvac_notes'
        ]

        for field in component_notes:
            val = getattr(body, field)
            if val is not None:
                updates.append(f"{field} = ${param_count}")
                values.append(val)
                param_count += 1

        # Recalculate PKA with current scores
        pka = calculate_pka(
            component_scores['structure_score'],
            component_scores['facade_roof_score'],
            component_scores['windows_doors_score'],
            component_scores['interior_walls_score'],
            component_scores['interior_finishes_score'],
            component_scores['heating_score'],
            component_scores['electrical_score'],
            component_scores['plumbing_score'],
            component_scores['hvac_score']
        )
        
        updates.append(f"weighted_average = ${param_count}")
        values.append(pka)
        param_count += 1
        
        if body.notes is not None:
            updates.append(f"notes = ${param_count}")
            values.append(body.notes)
            param_count += 1
        
        # Always update updated_at
        updates.append(f"updated_at = NOW()")
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add WHERE clause parameter
        values.append(assessment_id)
        
        # Execute update
        query = f"""
            UPDATE component_assessments 
            SET {', '.join(updates)}
            WHERE id = ${param_count}
        """
        
        await conn.execute(query, *values)
        
        # Update valuation if PKA is available
        if pka is not None:
            valuation = calculate_valuation_from_assessment(
                area_m2=float(existing['area_m2']),
                cost_per_m2=float(existing['cost_per_m2']),
                construction_year=existing['construction_year'],
                pka_score=pka
            )
            
            # Check if a valuation already exists for this date, update or insert
            assessment_date = body.assessment_date or existing['assessment_date']
            
            existing_valuation = await conn.fetchval("""
                SELECT id FROM building_valuations 
                WHERE building_id = $1 AND assessment_date = $2
            """, existing['building_id'], assessment_date)
            
            if existing_valuation:
                await conn.execute("""
                    UPDATE building_valuations
                    SET replacement_value = $1, technical_value = $2,
                        condition_score = $3, repair_debt = $4,
                        maintenance_need = $5, improvement_need = $6,
                        annual_depreciation = $7
                    WHERE id = $8
                """,
                    valuation['replacement_value'],
                    valuation['technical_value'],
                    valuation['condition_score'],
                    valuation['repair_debt'],
                    valuation['kptarve'],
                    valuation['pptarve'],
                    valuation['annual_depreciation'],
                    existing_valuation
                )
            else:
                await conn.execute("""
                    INSERT INTO building_valuations (
                        building_id, assessment_date, replacement_value, 
                        technical_value, condition_score, repair_debt,
                        maintenance_need, improvement_need, annual_depreciation
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                    existing['building_id'],
                    assessment_date,
                    valuation['replacement_value'],
                    valuation['technical_value'],
                    valuation['condition_score'],
                    valuation['repair_debt'],
                    valuation['kptarve'],
                    valuation['pptarve'],
                    valuation['annual_depreciation']
                )

        return UpdateAssessmentResponse(
            id=assessment_id,
            pka_score=pka,
            message=f"Kuntoarvio päivitetty onnistuneesti (PKA: {pka if pka else 'ei laskettu'})"
        )
        
    finally:
        await conn.close()


@router.get("/metadata/components")
async def get_component_metadata_endpoint() -> list[dict]:
    """Get component names, weights, and descriptions for UI."""
    return get_component_metadata()


@router.get("/dashboard/overview")
async def get_assessments_dashboard(org_id: int = 1) -> AssessmentsDashboardData:
    """Get aggregated data for the assessments dashboard."""
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # 1. Get latest assessment for each building
        # We need this to avoid counting old assessments
        latest_assessments_query = """
            WITH LatestAssessments AS (
                SELECT DISTINCT ON (building_id) 
                    id, building_id, assessment_date,
                    structure_score, facade_roof_score, windows_doors_score,
                    interior_walls_score, interior_finishes_score,
                    heating_score, electrical_score, plumbing_score, hvac_score,
                    structure_notes, facade_roof_notes, windows_doors_notes,
                    interior_walls_notes, interior_finishes_notes,
                    heating_notes, electrical_notes, plumbing_notes, hvac_notes,
                    weighted_average
                FROM component_assessments
                ORDER BY building_id, assessment_date DESC, created_at DESC
            )
            SELECT 
                la.*,
                b.name as building_name
            FROM LatestAssessments la
            JOIN buildings b ON la.building_id = b.id
            WHERE b.org_id = $1 AND b.status = 'active'
        """
        
        latest_assessments = await conn.fetch(latest_assessments_query, org_id)
        
        # 2. Calculate Score Distribution and Critical Components
        score_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        total_scores = 0
        critical_components = []
        portfolio_pka_sum = 0
        portfolio_pka_count = 0
        
        component_map = {
            'structure': 'Runko/Perustus',
            'facade_roof': 'Julkisivu/Katto',
            'windows_doors': 'Ikkunat/Ovet',
            'interior_walls': 'Väliseinät',
            'interior_finishes': 'Sisäpuoliset pinnat',
            'heating': 'Lämmitys',
            'electrical': 'Sähkö',
            'plumbing': 'Vesi ja viemäri',
            'hvac': 'Ilmanvaihto'
        }

        for row in latest_assessments:
            if row['weighted_average']:
                portfolio_pka_sum += float(row['weighted_average'])
                portfolio_pka_count += 1
                
            for comp_key, comp_name in component_map.items():
                score = row[f"{comp_key}_score"]
                notes = row[f"{comp_key}_notes"]
                
                if score is not None:
                    # Update distribution
                    if 1 <= score <= 5:
                        score_counts[score] += 1
                        total_scores += 1
                    
                    # Check for critical
                    if score <= 2:
                        critical_components.append(CriticalComponent(
                            building_id=row['building_id'],
                            building_name=row['building_name'],
                            component_name=comp_key,
                            finnish_name=comp_name,
                            score=score,
                            notes=notes,
                            assessment_date=row['assessment_date']
                        ))
        
        # Format score distribution
        distribution = []
        for score in range(1, 6):
            count = score_counts[score]
            percentage = (count / total_scores * 100) if total_scores > 0 else 0
            distribution.append(ScoreDistribution(
                score=score,
                count=count,
                percentage=round(percentage, 1)
            ))
            
        # 3. Assessment Coverage
        # Get all active buildings and their last assessment date
        coverage_query = """
            SELECT 
                b.id, b.name,
                MAX(ca.assessment_date) as last_assessment_date
            FROM buildings b
            LEFT JOIN component_assessments ca ON b.id = ca.building_id
            WHERE b.org_id = $1 AND b.status = 'active'
            GROUP BY b.id, b.name
            ORDER BY last_assessment_date ASC NULLS FIRST
        """
        
        coverage_rows = await conn.fetch(coverage_query, org_id)
        coverage_list = []
        today = date.today()
        
        for row in coverage_rows:
            last_date = row['last_assessment_date']
            days_since = (today - last_date).days if last_date else None
            
            status = 'missing'
            if last_date:
                if days_since < 365 * 5: # 5 years
                    status = 'ok'
                elif days_since < 365 * 10: # 10 years
                    status = 'warning'
                else:
                    status = 'expired'
            
            coverage_list.append(BuildingAssessmentStatus(
                building_id=row['id'],
                building_name=row['name'],
                last_assessment_date=last_date,
                days_since_assessment=days_since,
                status=status
            ))

        # 4. Recent Assessments
        recent_query = """
            SELECT 
                ca.id, ca.assessment_date, ca.inspector_name, 
                ca.weighted_average as pka_score, ca.notes,
                b.name as building_name
            FROM component_assessments ca
            JOIN buildings b ON ca.building_id = b.id
            WHERE b.org_id = $1
            ORDER BY ca.assessment_date DESC
            LIMIT 10
        """
        recent_rows = await conn.fetch(recent_query, org_id)
        recent_list = [
            AssessmentSummary(
                id=row['id'],
                assessment_date=row['assessment_date'],
                inspector_name=row['inspector_name'],
                building_name=row['building_name'],
                pka_score=float(row['pka_score']) if row['pka_score'] else None,
                notes=row['notes']
            )
            for row in recent_rows
        ]
        
        avg_condition = round(portfolio_pka_sum / portfolio_pka_count, 1) if portfolio_pka_count > 0 else None

        return AssessmentsDashboardData(
            score_distribution=distribution,
            critical_components=sorted(critical_components, key=lambda x: x.score),
            recent_assessments=recent_list,
            assessment_coverage=coverage_list,
            average_portfolio_condition=avg_condition
        )

    finally:
        await conn.close()
