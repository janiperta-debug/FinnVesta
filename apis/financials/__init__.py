"""Financial data management API.

Provides endpoints for managing building financial data including:
- Operating costs breakdown
- Rental income and vacancy
- Insurance details
- Capital tracking (debt, equity, CapEx)
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import os
import asyncpg

router = APIRouter(prefix="/api/financials")

# Pydantic Models

class FinancialRecordCreate(BaseModel):
    """Request to create/update financial record."""
    building_id: int = Field(description="Building ID")
    financial_year: int = Field(description="Financial year", ge=2000, le=2100)
    
    # Capital
    market_value: Optional[float] = Field(None, description="Estimated market value")
    purchase_price: Optional[float] = Field(None, description="Purchase price")
    purchase_date: Optional[date] = Field(None, description="Purchase date")
    debt_amount: Optional[float] = Field(None, description="Debt/mortgage amount")
    equity_amount: Optional[float] = Field(None, description="Equity (market_value - debt)")
    
    # Operating costs breakdown
    utilities_cost: Optional[float] = Field(None, description="Utilities costs")
    maintenance_cost: Optional[float] = Field(None, description="Maintenance and repairs")
    management_fees: Optional[float] = Field(None, description="Property management fees")
    insurance_cost: Optional[float] = Field(None, description="Insurance premiums")
    property_taxes: Optional[float] = Field(None, description="Property taxes")
    other_costs: Optional[float] = Field(None, description="Other operating costs")
    
    # Operating - total will be calculated
    operating_costs: Optional[float] = Field(None, description="Total operating costs (calculated if not provided)")
    
    # Rental income
    rental_income: Optional[float] = Field(None, description="Annual rental income")
    vacancy_rate: Optional[float] = Field(None, description="Vacancy rate %", ge=0, le=100)
    net_operating_income: Optional[float] = Field(None, description="NOI (calculated if not provided)")
    
    # Insurance details
    insurance_value: Optional[float] = Field(None, description="Insurance value")
    insurance_provider: Optional[str] = Field(None, description="Insurance provider")
    insurance_policy_number: Optional[str] = Field(None, description="Policy number")
    insurance_renewal_date: Optional[date] = Field(None, description="Insurance renewal date")
    
    # Investment
    capex_amount: Optional[float] = Field(None, description="Capital expenditures")
    
    # Notes
    notes: Optional[str] = Field(None, description="Additional notes")


class FinancialRecordResponse(BaseModel):
    """Financial record response."""
    id: int
    building_id: int
    financial_year: int
    
    # Capital
    market_value: Optional[float]
    purchase_price: Optional[float]
    purchase_date: Optional[date]
    debt_amount: Optional[float]
    equity_amount: Optional[float]
    
    # Operating costs
    utilities_cost: Optional[float]
    maintenance_cost: Optional[float]
    management_fees: Optional[float]
    insurance_cost: Optional[float]
    property_taxes: Optional[float]
    other_costs: Optional[float]
    operating_costs: Optional[float]
    
    # Rental
    rental_income: Optional[float]
    vacancy_rate: Optional[float]
    net_operating_income: Optional[float]
    
    # Insurance
    insurance_value: Optional[float]
    insurance_provider: Optional[str]
    insurance_policy_number: Optional[str]
    insurance_renewal_date: Optional[date]
    
    # Investment
    capex_amount: Optional[float]
    
    # Meta
    notes: Optional[str]
    created_at: str
    updated_at: str
    
    # Calculated metrics
    debt_to_value_ratio: Optional[float] = Field(None, description="Debt-to-value ratio")
    operating_cost_per_m2: Optional[float] = Field(None, description="Operating cost per m²")


class BuildingFinancialSummary(BaseModel):
    """Summary of financial data for a building across years."""
    building_id: int
    building_name: str
    area_m2: float
    records: list[FinancialRecordResponse]
    # Repair debt metrics (from latest valuation)
    latest_repair_debt: Optional[float] = Field(None, description="Latest repair debt from valuation")
    repair_debt_to_market_value: Optional[float] = Field(None, description="Repair debt as % of market value")
    

class PortfolioFinancialOverview(BaseModel):
    """Aggregate financial overview across all buildings."""
    total_buildings: int
    total_area_m2: float
    
    # Capital metrics
    total_market_value: float
    total_debt: float
    total_equity: float
    debt_to_value_ratio: Optional[float]  # %
    
    # Operating metrics (annual)
    total_operating_costs: float
    total_rental_income: float
    net_operating_income: float
    
    # Per-m2 metrics
    operating_cost_per_m2: Optional[float]
    
    # By building size tier
    small_buildings_count: int  # < 1000 m2
    medium_buildings_count: int  # 1000-5000 m2
    large_buildings_count: int  # > 5000 m2
    
    # Repair debt vs financial health
    total_repair_debt: Optional[float] = Field(None, description="Total repair debt from valuations")
    repair_debt_to_market_value: Optional[float] = Field(None, description="Portfolio repair debt as % of market value")


# Endpoints

@router.post("/", response_model=FinancialRecordResponse)
async def create_or_update_financial_record(data: FinancialRecordCreate) -> FinancialRecordResponse:
    """Create or update financial record for a building and year.
    
    If a record exists for the building and year, it will be updated.
    Otherwise a new record is created.
    
    Automatically calculates:
    - Total operating costs (sum of breakdown)
    - Net operating income (rental_income - operating_costs)
    - Equity (market_value - debt)
    """
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Calculate derived values
        operating_costs_total = data.operating_costs
        if operating_costs_total is None:
            # Calculate from breakdown
            operating_costs_total = sum(filter(None, [
                data.utilities_cost,
                data.maintenance_cost,
                data.management_fees,
                data.insurance_cost,
                data.property_taxes,
                data.other_costs
            ]))
        
        noi = data.net_operating_income
        if noi is None and data.rental_income is not None:
            noi = data.rental_income - (operating_costs_total or 0)
        
        equity = data.equity_amount
        if equity is None and data.market_value is not None and data.debt_amount is not None:
            equity = data.market_value - data.debt_amount
        
        # Check if record exists
        existing = await conn.fetchrow(
            "SELECT id FROM financials WHERE building_id = $1 AND financial_year = $2",
            data.building_id, data.financial_year
        )
        
        if existing:
            # Update existing
            result = await conn.fetchrow("""
                UPDATE financials
                SET market_value = $3,
                    purchase_price = $4,
                    purchase_date = $5,
                    debt_amount = $6,
                    equity_amount = $7,
                    utilities_cost = $8,
                    maintenance_cost = $9,
                    management_fees = $10,
                    insurance_cost = $11,
                    property_taxes = $12,
                    other_costs = $13,
                    operating_costs = $14,
                    rental_income = $15,
                    vacancy_rate = $16,
                    net_operating_income = $17,
                    insurance_value = $18,
                    insurance_provider = $19,
                    insurance_policy_number = $20,
                    insurance_renewal_date = $21,
                    capex_amount = $22,
                    notes = $23,
                    updated_at = NOW()
                WHERE id = $24
                RETURNING *
            """, 
                data.market_value, data.purchase_price, data.purchase_date,
                data.debt_amount, equity,
                data.utilities_cost, data.maintenance_cost, data.management_fees,
                data.insurance_cost, data.property_taxes, data.other_costs,
                operating_costs_total,
                data.rental_income, data.vacancy_rate, noi,
                data.insurance_value, data.insurance_provider,
                data.insurance_policy_number, data.insurance_renewal_date,
                data.capex_amount, data.notes,
                existing['id']
            )
        else:
            # Insert new
            result = await conn.fetchrow("""
                INSERT INTO financials (
                    building_id, financial_year,
                    market_value, purchase_price, purchase_date,
                    debt_amount, equity_amount,
                    utilities_cost, maintenance_cost, management_fees,
                    insurance_cost, property_taxes, other_costs,
                    operating_costs,
                    rental_income, vacancy_rate, net_operating_income,
                    insurance_value, insurance_provider, insurance_policy_number, insurance_renewal_date,
                    capex_amount, notes
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
                )
                RETURNING *
            """,
                data.building_id, data.financial_year,
                data.market_value, data.purchase_price, data.purchase_date,
                data.debt_amount, equity,
                data.utilities_cost, data.maintenance_cost, data.management_fees,
                data.insurance_cost, data.property_taxes, data.other_costs,
                operating_costs_total,
                data.rental_income, data.vacancy_rate, noi,
                data.insurance_value, data.insurance_provider,
                data.insurance_policy_number, data.insurance_renewal_date,
                data.capex_amount, data.notes
            )
        
        # Get building area for per-m2 calculations
        building = await conn.fetchrow(
            "SELECT area_m2 FROM buildings WHERE id = $1",
            data.building_id
        )
        
        # Calculate derived metrics
        debt_to_value = None
        if result['market_value'] and result['debt_amount']:
            debt_to_value = float(result['debt_amount']) / float(result['market_value'])
        
        cost_per_m2 = None
        if result['operating_costs'] and building:
            cost_per_m2 = float(result['operating_costs']) / float(building['area_m2'])
        
        return FinancialRecordResponse(
            id=result['id'],
            building_id=result['building_id'],
            financial_year=result['financial_year'],
            market_value=float(result['market_value']) if result['market_value'] else None,
            purchase_price=float(result['purchase_price']) if result['purchase_price'] else None,
            purchase_date=result['purchase_date'],
            debt_amount=float(result['debt_amount']) if result['debt_amount'] else None,
            equity_amount=float(result['equity_amount']) if result['equity_amount'] else None,
            utilities_cost=float(result['utilities_cost']) if result['utilities_cost'] else None,
            maintenance_cost=float(result['maintenance_cost']) if result['maintenance_cost'] else None,
            management_fees=float(result['management_fees']) if result['management_fees'] else None,
            insurance_cost=float(result['insurance_cost']) if result['insurance_cost'] else None,
            property_taxes=float(result['property_taxes']) if result['property_taxes'] else None,
            other_costs=float(result['other_costs']) if result['other_costs'] else None,
            operating_costs=float(result['operating_costs']) if result['operating_costs'] else None,
            rental_income=float(result['rental_income']) if result['rental_income'] else None,
            vacancy_rate=float(result['vacancy_rate']) if result['vacancy_rate'] else None,
            net_operating_income=float(result['net_operating_income']) if result['net_operating_income'] else None,
            insurance_value=float(result['insurance_value']) if result['insurance_value'] else None,
            insurance_provider=result['insurance_provider'],
            insurance_policy_number=result['insurance_policy_number'],
            insurance_renewal_date=result['insurance_renewal_date'],
            capex_amount=float(result['capex_amount']) if result['capex_amount'] else None,
            notes=result['notes'],
            created_at=result['created_at'].isoformat(),
            updated_at=result['updated_at'].isoformat(),
            debt_to_value_ratio=debt_to_value,
            operating_cost_per_m2=cost_per_m2
        )
        
    finally:
        await conn.close()


@router.get("/building/{building_id}", response_model=BuildingFinancialSummary)
async def get_building_financials(building_id: int) -> BuildingFinancialSummary:
    """Get all financial records for a building across all years."""
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get building info
        building = await conn.fetchrow(
            "SELECT name, area_m2 FROM buildings WHERE id = $1",
            building_id
        )
        
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Get latest repair debt from valuations
        latest_valuation = await conn.fetchrow("""
            SELECT repair_debt, assessment_date
            FROM building_valuations
            WHERE building_id = $1
            ORDER BY assessment_date DESC
            LIMIT 1
        """, building_id)
        
        # Get all financial records
        records = await conn.fetch("""
            SELECT * FROM financials
            WHERE building_id = $1
            ORDER BY financial_year DESC
        """, building_id)
        
        financial_records = []
        for r in records:
            # Calculate metrics
            debt_to_value = None
            if r['market_value'] and r['debt_amount']:
                debt_to_value = float(r['debt_amount']) / float(r['market_value'])
            
            cost_per_m2 = None
            if r['operating_costs']:
                cost_per_m2 = float(r['operating_costs']) / float(building['area_m2'])
            
            financial_records.append(FinancialRecordResponse(
                id=r['id'],
                building_id=r['building_id'],
                financial_year=r['financial_year'],
                market_value=float(r['market_value']) if r['market_value'] else None,
                purchase_price=float(r['purchase_price']) if r['purchase_price'] else None,
                purchase_date=r['purchase_date'],
                debt_amount=float(r['debt_amount']) if r['debt_amount'] else None,
                equity_amount=float(r['equity_amount']) if r['equity_amount'] else None,
                utilities_cost=float(r['utilities_cost']) if r['utilities_cost'] else None,
                maintenance_cost=float(r['maintenance_cost']) if r['maintenance_cost'] else None,
                management_fees=float(r['management_fees']) if r['management_fees'] else None,
                insurance_cost=float(r['insurance_cost']) if r['insurance_cost'] else None,
                property_taxes=float(r['property_taxes']) if r['property_taxes'] else None,
                other_costs=float(r['other_costs']) if r['other_costs'] else None,
                operating_costs=float(r['operating_costs']) if r['operating_costs'] else None,
                rental_income=float(r['rental_income']) if r['rental_income'] else None,
                vacancy_rate=float(r['vacancy_rate']) if r['vacancy_rate'] else None,
                net_operating_income=float(r['net_operating_income']) if r['net_operating_income'] else None,
                insurance_value=float(r['insurance_value']) if r['insurance_value'] else None,
                insurance_provider=r['insurance_provider'],
                insurance_policy_number=r['insurance_policy_number'],
                insurance_renewal_date=r['insurance_renewal_date'],
                capex_amount=float(r['capex_amount']) if r['capex_amount'] else None,
                notes=r['notes'],
                created_at=r['created_at'].isoformat(),
                updated_at=r['updated_at'].isoformat(),
                debt_to_value_ratio=debt_to_value,
                operating_cost_per_m2=cost_per_m2
            ))
        
        # Calculate repair debt metrics
        latest_repair_debt = None
        repair_debt_to_market_value = None
        
        if latest_valuation and latest_valuation['repair_debt']:
            latest_repair_debt = float(latest_valuation['repair_debt'])
            
            # Use latest year's market value if available
            if financial_records and financial_records[0].market_value:
                repair_debt_to_market_value = (latest_repair_debt / financial_records[0].market_value) * 100
        
        return BuildingFinancialSummary(
            building_id=building_id,
            building_name=building['name'],
            area_m2=float(building['area_m2']),
            records=financial_records,
            latest_repair_debt=latest_repair_debt,
            repair_debt_to_market_value=repair_debt_to_market_value
        )
        
    finally:
        await conn.close()


@router.get("/portfolio-overview", response_model=PortfolioFinancialOverview)
async def get_portfolio_financial_overview() -> PortfolioFinancialOverview:
    """Get aggregated financial metrics across all buildings in portfolio."""
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        # Get latest financial year with data
        latest_year_row = await conn.fetchrow(
            "SELECT MAX(financial_year) as latest_year FROM financials"
        )
        latest_year = latest_year_row['latest_year'] if latest_year_row else None
        
        if not latest_year:
            # No financial data yet, return empty overview
            buildings = await conn.fetch("SELECT id, area_m2 FROM buildings WHERE status = 'active'")
            total_area = sum(float(b['area_m2']) for b in buildings)
            
            return PortfolioFinancialOverview(
                total_buildings=len(buildings),
                total_area_m2=total_area,
                total_market_value=0.0,
                total_debt=0.0,
                total_equity=0.0,
                debt_to_value_ratio=None,
                total_operating_costs=0.0,
                total_rental_income=0.0,
                net_operating_income=0.0,
                operating_cost_per_m2=None,
                small_buildings_count=len([b for b in buildings if float(b['area_m2']) < 1000]),
                medium_buildings_count=len([b for b in buildings if 1000 <= float(b['area_m2']) <= 5000]),
                large_buildings_count=len([b for b in buildings if float(b['area_m2']) > 5000])
            )
        
        # Get aggregate metrics from latest year
        result = await conn.fetchrow("""
            SELECT 
                COUNT(DISTINCT b.id) as total_buildings,
                COALESCE(SUM(b.area_m2), 0) as total_area_m2,
                COALESCE(SUM(f.market_value), 0) as total_market_value,
                COALESCE(SUM(f.debt_amount), 0) as total_debt,
                COALESCE(SUM(f.equity_amount), 0) as total_equity,
                COALESCE(SUM(f.operating_costs), 0) as total_operating_costs,
                COALESCE(SUM(f.rental_income), 0) as total_rental_income,
                COALESCE(SUM(f.net_operating_income), 0) as total_noi,
                COUNT(CASE WHEN b.area_m2 < 1000 THEN 1 END) as small_buildings,
                COUNT(CASE WHEN b.area_m2 >= 1000 AND b.area_m2 <= 5000 THEN 1 END) as medium_buildings,
                COUNT(CASE WHEN b.area_m2 > 5000 THEN 1 END) as large_buildings
            FROM buildings b
            LEFT JOIN financials f ON b.id = f.building_id AND f.financial_year = $1
            WHERE b.status = 'active'
        """, latest_year)
        
        # Calculate derived metrics
        debt_to_value_ratio = None
        if result['total_market_value'] and result['total_market_value'] > 0:
            debt_to_value_ratio = (float(result['total_debt']) / float(result['total_market_value'])) * 100
        
        operating_cost_per_m2 = None
        if result['total_operating_costs'] and result['total_area_m2'] and result['total_area_m2'] > 0:
            operating_cost_per_m2 = float(result['total_operating_costs']) / float(result['total_area_m2'])
        
        return PortfolioFinancialOverview(
            total_buildings=result['total_buildings'],
            total_area_m2=float(result['total_area_m2']),
            total_market_value=float(result['total_market_value']),
            total_debt=float(result['total_debt']),
            total_equity=float(result['total_equity']),
            debt_to_value_ratio=debt_to_value_ratio,
            total_operating_costs=float(result['total_operating_costs']),
            total_rental_income=float(result['total_rental_income']),
            net_operating_income=float(result['total_noi']),
            operating_cost_per_m2=operating_cost_per_m2,
            small_buildings_count=result['small_buildings'],
            medium_buildings_count=result['medium_buildings'],
            large_buildings_count=result['large_buildings']
        )
    
    finally:
        await conn.close()


@router.delete("/{financial_id}")
async def delete_financial_record(financial_id: int):
    """Delete a financial record."""
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL"))
    
    try:
        result = await conn.execute(
            "DELETE FROM financials WHERE id = $1",
            financial_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Financial record not found")
        
        return {"message": "Financial record deleted successfully"}
        
    finally:
        await conn.close()
