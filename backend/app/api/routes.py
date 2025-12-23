from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

# Import your services
from app.services.storage_service import generate_presigned_upload_url, minio_client, RAW_BUCKET
from app.services.processing_service import scan_excel_sheets, convert_sheet_to_parquet

# 👇 ADD THIS NEW IMPORT LINE 👇
from app.services.analysis_service import analyze_dataset, get_column_stats
from app.services.aggregation_service import perform_aggregation

router = APIRouter()

# ---------------------------------------------------------
# 1. UPLOAD (PHASE 1)
# ---------------------------------------------------------

@router.post("/datasets/upload-url")
def create_upload_url(filename: str):
    """
    Generates a Presigned URL so the Frontend can upload directly to MinIO.
    """
    try:
        # We save everything in a specific folder structure (optional)
        # e.g., "raw-datasets/filename.csv"
        object_key = filename 
        
        upload_url = generate_presigned_upload_url(object_key)
        return {"upload_url": upload_url, "object_key": object_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------
# 2. DASHBOARD (LIST FILES)
# ---------------------------------------------------------

@router.get("/datasets")
def list_datasets():
    """
    Lists all raw files currently sitting in MinIO.
    """
    try:
        objects = minio_client.list_objects(RAW_BUCKET, recursive=True)
        
        file_list = []
        for obj in objects:
            file_list.append({
                "filename": obj.object_name,
                "size_mb": round(obj.size / (1024 * 1024), 2),
                "last_modified": obj.last_modified
            })
        return {"files": file_list}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------
# 3. EXCEL WORKFLOW (PHASE 2)
# ---------------------------------------------------------

# A. SCAN: "What sheets are inside this file?"
@router.get("/datasets/scan")
def scan_file(object_key: str):
    """
    Reads only the metadata of an Excel file to list sheet names.
    Fast & Low RAM.
    """
    result = scan_excel_sheets(object_key)
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
        
    return result


# B. CONVERT: "Process this specific sheet"
class ConvertRequest(BaseModel):
    object_key: str
    sheet_name: str

@router.post("/datasets/convert")
def convert_dataset(req: ConvertRequest):
    """
    Trigger the heavy conversion job:
    Excel Sheet -> Parquet File (Saved in 'processed-datasets' bucket)
    """
    result = convert_sheet_to_parquet(req.object_key, req.sheet_name)
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result
# 👇 NEW: Get Data for Table (with Paging & Sorting)
class ViewRequest(BaseModel):
    filename: str
    page: int = 1
    page_size: int = 10
    sort_by: Optional[str] = None
    sort_desc: bool = False
    filters: Optional[dict] = None  # 👈 Add this line

@router.post("/analysis/view")
def view_data(req: ViewRequest):
    return analyze_dataset(
        req.filename, 
        req.page, 
        req.page_size, 
        req.sort_by, 
        req.sort_desc,
        req.filters  # 👈 Pass it here
    )
# 👇 NEW: Get Filter Options for a Column
@router.get("/analysis/stats")
def column_stats(filename: str, column: str):
    return get_column_stats(filename, column)

# 👇 NEW DATA MODEL FOR AGGREGATION REQUESTS
class AggregateRequest(BaseModel):
    filename: str
    group_by_col: str
    operation: str  # "sum", "avg", "count", etc.
    target_col: str

# 👇 NEW ROUTE
@router.post("/analysis/aggregate")
def aggregate_data(req: AggregateRequest):
    return perform_aggregation(
        req.filename,
        req.group_by_col,
        req.operation,
        req.target_col
    )

@router.get("/analysis/unique-values")
def get_column_values(filename: str, column: str):
    return get_unique_values(filename, column)