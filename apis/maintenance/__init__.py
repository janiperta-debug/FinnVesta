from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
import os
import asyncpg

router = APIRouter(prefix="/maintenance")

# Database connection
async def get_db_connection():
    return await asyncpg.connect(os.environ.get("DATABASE_URL"))


# Pydantic Models
class CreateMaintenanceTaskRequest(BaseModel):
    """Request model for creating a maintenance task"""
    building_id: int = Field(..., description="ID of the building")
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Detailed description")
    category: str = Field(..., description="Task category: routine_maintenance, repair, renovation, emergency")
    priority: str = Field(..., description="Priority: low, medium, high, urgent, critical")
    component_type: Optional[str] = Field(None, description="Component affected")
    estimated_cost: Optional[float] = Field(None, description="Estimated cost in EUR")
    scheduled_date: Optional[date] = Field(None, description="When work is scheduled")
    contractor_vendor: Optional[str] = Field(None, description="Contractor or vendor name")
    improves_condition: bool = Field(False, description="Will this improve condition scores?")
    condition_impact_notes: Optional[str] = Field(None, description="Notes on condition impact")


class UpdateMaintenanceTaskRequest(BaseModel):
    """Request model for updating a maintenance task"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    component_type: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    scheduled_date: Optional[date] = None
    started_date: Optional[date] = None
    completed_date: Optional[date] = None
    status: Optional[str] = None
    contractor_vendor: Optional[str] = None
    improves_condition: Optional[bool] = None
    condition_impact_notes: Optional[str] = None


class MaintenanceTaskResponse(BaseModel):
    """Response model for a maintenance task"""
    id: int
    org_id: int
    building_id: int
    building_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: str
    priority: str
    component_type: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    scheduled_date: Optional[date] = None
    started_date: Optional[date] = None
    completed_date: Optional[date] = None
    status: str
    improves_condition: bool
    condition_impact_notes: Optional[str] = None
    contractor_vendor: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MaintenanceListResponse(BaseModel):
    """Response model for list of maintenance tasks"""
    tasks: list[MaintenanceTaskResponse]
    total_count: int
    stats: dict = Field(default_factory=dict, description="Summary statistics")


class MaintenanceStatsResponse(BaseModel):
    """Response model for maintenance statistics"""
    total_tasks: int
    by_status: dict
    by_priority: dict
    by_category: dict
    total_estimated_cost: float
    total_actual_cost: float
    upcoming_tasks: int
    overdue_tasks: int


# Endpoints
@router.post("/tasks")
async def create_maintenance_task(
    org_id: int,
    body: CreateMaintenanceTaskRequest
) -> MaintenanceTaskResponse:
    """
    Create a new maintenance task.
    
    Links a maintenance/repair task to a building with scheduling,
    cost tracking, and priority management.
    """
    conn = await get_db_connection()
    try:
        # Verify building exists and belongs to org
        building = await conn.fetchrow(
            "SELECT id FROM buildings WHERE id = $1 AND org_id = $2",
            body.building_id, org_id
        )
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Insert maintenance task
        task = await conn.fetchrow(
            """
            INSERT INTO maintenance_tasks (
                org_id, building_id, title, description, category, priority,
                component_type, estimated_cost, scheduled_date, contractor_vendor,
                improves_condition, condition_impact_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            """,
            org_id, body.building_id, body.title, body.description,
            body.category, body.priority, body.component_type,
            body.estimated_cost, body.scheduled_date, body.contractor_vendor,
            body.improves_condition, body.condition_impact_notes
        )
        
        # Get building name
        building_name = await conn.fetchval(
            "SELECT name FROM buildings WHERE id = $1",
            body.building_id
        )
        
        return MaintenanceTaskResponse(
            **dict(task),
            building_name=building_name
        )
    
    finally:
        await conn.close()


@router.get("/tasks")
async def list_maintenance_tasks(
    org_id: int,
    building_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    component_type: Optional[str] = None
) -> MaintenanceListResponse:
    """
    List maintenance tasks with optional filters.
    
    Filters:
    - building_id: Show tasks for specific building
    - status: planned, in_progress, completed, cancelled
    - priority: low, medium, high, urgent, critical
    - category: routine_maintenance, repair, renovation, emergency
    - component_type: foundation, structure, roof, etc.
    """
    conn = await get_db_connection()
    try:
        # Build query with filters
        conditions = ["mt.org_id = $1"]
        params = [org_id]
        param_count = 1
        
        if building_id:
            param_count += 1
            conditions.append(f"mt.building_id = ${param_count}")
            params.append(building_id)
        
        if status:
            param_count += 1
            conditions.append(f"mt.status = ${param_count}")
            params.append(status)
        
        if priority:
            param_count += 1
            conditions.append(f"mt.priority = ${param_count}")
            params.append(priority)
        
        if category:
            param_count += 1
            conditions.append(f"mt.category = ${param_count}")
            params.append(category)
        
        if component_type:
            param_count += 1
            conditions.append(f"mt.component_type = ${param_count}")
            params.append(component_type)
        
        where_clause = " AND ".join(conditions)
        
        # Fetch tasks with building names
        tasks = await conn.fetch(
            f"""
            SELECT 
                mt.*,
                b.name as building_name
            FROM maintenance_tasks mt
            LEFT JOIN buildings b ON mt.building_id = b.id
            WHERE {where_clause}
            ORDER BY 
                CASE mt.priority
                    WHEN 'critical' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'high' THEN 3
                    WHEN 'medium' THEN 4
                    WHEN 'low' THEN 5
                END,
                mt.scheduled_date NULLS LAST,
                mt.created_at DESC
            """,
            *params
        )
        
        # Calculate statistics
        stats = await conn.fetchrow(
            f"""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                COALESCE(SUM(estimated_cost), 0) as total_estimated,
                COALESCE(SUM(actual_cost), 0) as total_actual,
                SUM(CASE WHEN scheduled_date < CURRENT_DATE AND status IN ('planned', 'in_progress') THEN 1 ELSE 0 END) as overdue
            FROM maintenance_tasks mt
            WHERE {where_clause}
            """,
            *params
        )
        
        return MaintenanceListResponse(
            tasks=[MaintenanceTaskResponse(**dict(task)) for task in tasks],
            total_count=len(tasks),
            stats={
                "by_status": {
                    "planned": stats["planned"],
                    "in_progress": stats["in_progress"],
                    "completed": stats["completed"],
                    "cancelled": stats["cancelled"]
                },
                "total_estimated_cost": float(stats["total_estimated"]),
                "total_actual_cost": float(stats["total_actual"]),
                "overdue_count": stats["overdue"]
            }
        )
    
    finally:
        await conn.close()


@router.get("/tasks/{task_id}")
async def get_maintenance_task(
    task_id: int,
    org_id: int
) -> MaintenanceTaskResponse:
    """
    Get a specific maintenance task by ID.
    """
    conn = await get_db_connection()
    try:
        task = await conn.fetchrow(
            """
            SELECT 
                mt.*,
                b.name as building_name
            FROM maintenance_tasks mt
            LEFT JOIN buildings b ON mt.building_id = b.id
            WHERE mt.id = $1 AND mt.org_id = $2
            """,
            task_id, org_id
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Maintenance task not found")
        
        return MaintenanceTaskResponse(**dict(task))
    
    finally:
        await conn.close()


@router.put("/tasks/{task_id}")
async def update_maintenance_task(
    task_id: int,
    org_id: int,
    body: UpdateMaintenanceTaskRequest
) -> MaintenanceTaskResponse:
    """
    Update a maintenance task.
    
    Can update any field. Status transitions:
    - planned → in_progress (sets started_date)
    - in_progress → completed (sets completed_date)
    - any → cancelled
    """
    conn = await get_db_connection()
    try:
        # Verify task exists
        existing = await conn.fetchrow(
            "SELECT * FROM maintenance_tasks WHERE id = $1 AND org_id = $2",
            task_id, org_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Maintenance task not found")
        
        # Build update query dynamically
        updates = []
        params = []
        param_count = 0
        
        update_data = body.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            param_count += 1
            updates.append(f"{field} = ${param_count}")
            params.append(value)
        
        if not updates:
            # No changes, return existing
            building_name = await conn.fetchval(
                "SELECT name FROM buildings WHERE id = $1",
                existing["building_id"]
            )
            return MaintenanceTaskResponse(**dict(existing), building_name=building_name)
        
        # Add task_id and org_id to params
        param_count += 1
        params.append(task_id)
        param_count += 1
        params.append(org_id)
        
        # Execute update
        task = await conn.fetchrow(
            f"""
            UPDATE maintenance_tasks
            SET {', '.join(updates)}
            WHERE id = ${param_count - 1} AND org_id = ${param_count}
            RETURNING *
            """,
            *params
        )
        
        # Get building name
        building_name = await conn.fetchval(
            "SELECT name FROM buildings WHERE id = $1",
            task["building_id"]
        )
        
        return MaintenanceTaskResponse(**dict(task), building_name=building_name)
    
    finally:
        await conn.close()


@router.delete("/tasks/{task_id}")
async def delete_maintenance_task(
    task_id: int,
    org_id: int
) -> dict:
    """
    Delete a maintenance task.
    
    This is a hard delete. Consider using status='cancelled' instead
    for record keeping.
    """
    conn = await get_db_connection()
    try:
        result = await conn.execute(
            "DELETE FROM maintenance_tasks WHERE id = $1 AND org_id = $2",
            task_id, org_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Maintenance task not found")
        
        return {"message": "Maintenance task deleted successfully"}
    
    finally:
        await conn.close()


@router.get("/stats")
async def get_maintenance_stats(
    org_id: int,
    building_id: Optional[int] = None
) -> MaintenanceStatsResponse:
    """
    Get maintenance statistics for the organization or specific building.
    
    Returns counts by status, priority, category and cost totals.
    """
    conn = await get_db_connection()
    try:
        conditions = "org_id = $1"
        params = [org_id]
        
        if building_id:
            conditions += " AND building_id = $2"
            params.append(building_id)
        
        stats = await conn.fetchrow(
            f"""
            SELECT
                COUNT(*) as total_tasks,
                
                -- By status
                SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as status_planned,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as status_in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as status_completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as status_cancelled,
                
                -- By priority
                SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as priority_critical,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as priority_urgent,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as priority_high,
                SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as priority_medium,
                SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as priority_low,
                
                -- By category
                SUM(CASE WHEN category = 'routine_maintenance' THEN 1 ELSE 0 END) as cat_routine,
                SUM(CASE WHEN category = 'repair' THEN 1 ELSE 0 END) as cat_repair,
                SUM(CASE WHEN category = 'renovation' THEN 1 ELSE 0 END) as cat_renovation,
                SUM(CASE WHEN category = 'emergency' THEN 1 ELSE 0 END) as cat_emergency,
                
                -- Costs
                COALESCE(SUM(estimated_cost), 0) as total_estimated_cost,
                COALESCE(SUM(actual_cost), 0) as total_actual_cost,
                
                -- Time-based
                SUM(CASE WHEN scheduled_date >= CURRENT_DATE AND status IN ('planned', 'in_progress') THEN 1 ELSE 0 END) as upcoming,
                SUM(CASE WHEN scheduled_date < CURRENT_DATE AND status IN ('planned', 'in_progress') THEN 1 ELSE 0 END) as overdue
                
            FROM maintenance_tasks
            WHERE {conditions}
            """,
            *params
        )
        
        return MaintenanceStatsResponse(
            total_tasks=stats["total_tasks"],
            by_status={
                "planned": stats["status_planned"],
                "in_progress": stats["status_in_progress"],
                "completed": stats["status_completed"],
                "cancelled": stats["status_cancelled"]
            },
            by_priority={
                "critical": stats["priority_critical"],
                "urgent": stats["priority_urgent"],
                "high": stats["priority_high"],
                "medium": stats["priority_medium"],
                "low": stats["priority_low"]
            },
            by_category={
                "routine_maintenance": stats["cat_routine"],
                "repair": stats["cat_repair"],
                "renovation": stats["cat_renovation"],
                "emergency": stats["cat_emergency"]
            },
            total_estimated_cost=float(stats["total_estimated_cost"]),
            total_actual_cost=float(stats["total_actual_cost"]),
            upcoming_tasks=stats["upcoming"],
            overdue_tasks=stats["overdue"]
        )
    
    finally:
        await conn.close()
