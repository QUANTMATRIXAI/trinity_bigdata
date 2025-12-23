import polars as pl
from app.services.storage_service import minio_client, PROCESSED_BUCKET
import io

def get_parquet_path(filename):
    """Helper to download parquet file to memory buffer."""
    try:
        minio_client.stat_object(PROCESSED_BUCKET, filename)
        response = minio_client.get_object(PROCESSED_BUCKET, filename)
        data = response.read()
        response.close()
        response.release_conn()
        return io.BytesIO(data)
    except Exception as e:
        print(f"❌ MinIO Download Error: {e}")
        raise e

def analyze_dataset(filename: str, page: int = 1, page_size: int = 10, sort_by: str = None, sort_desc: bool = False, filters: dict = None):
    print(f"📊 Analyzing: {filename} | Filters: {filters}")
    try:
        file_buffer = get_parquet_path(filename)
        df = pl.read_parquet(file_buffer)

        # 1. APPLY FILTERS
        if filters:
            for col, val in filters.items():
                if val and col in df.columns:
                    # Case-insensitive substring search
                    df = df.filter(pl.col(col).cast(pl.Utf8).str.to_lowercase().str.contains(val.lower()))

        total_rows = df.height
        
        if total_rows == 0:
            return {
                "status": "success", "data": [], "total_rows": 0, 
                "total_pages": 0, "current_page": 1, "columns": df.columns
            }

        # 2. SMART SORTING (Numeric priority)
        if sort_by and sort_by in df.columns:
            try:
                # Try creating a temporary float column to sort numerically
                df = df.with_columns(
                    pl.col(sort_by).cast(pl.Float64, strict=False).alias("_sort_temp")
                )
                df = df.sort("_sort_temp", descending=sort_desc).drop("_sort_temp")
            except Exception:
                # Fallback to standard text sorting
                df = df.sort(sort_by, descending=sort_desc)

        # 3. Handle Large Ints (Convert to String for JS safety)
        for col in df.columns:
            if df[col].dtype in [pl.Int64, pl.UInt64]:
                df = df.with_columns(pl.col(col).cast(pl.Utf8))

        # 4. Pagination
        total_pages = (total_rows // page_size) + 1
        if page < 1: page = 1
        offset = (page - 1) * page_size
        paged_df = df.slice(offset, page_size)

        # 5. Clean "N/A" -> Make them empty strings ""
        paged_df = paged_df.fill_null("").fill_nan("")

        return {
            "status": "success",
            "data": paged_df.to_dicts(),
            "total_rows": total_rows,
            "total_pages": total_pages,
            "current_page": page,
            "columns": df.columns,
            "dtypes": {col: str(df[col].dtype) for col in df.columns}
        }

    except Exception as e:
        print(f"❌ Analysis Crash: {e}")
        return {"status": "error", "message": str(e)}

# 👇 NEW FUNCTION ADDED HERE (For Dropdown Filters)
def get_unique_values(filename: str, column: str):
    print(f"🔍 Fetching unique values for '{column}' in {filename}")
    try:
        file_buffer = get_parquet_path(filename)
        
        # Optimize: Read ONLY the specific column needed
        df = pl.read_parquet(file_buffer, columns=[column])
        
        # Get unique values
        # 1. Cast to String
        # 2. Drop Nulls
        # 3. Get Unique
        # 4. Sort
        # 5. Limit to top 100
        uniques = df.select(
            pl.col(column).cast(pl.Utf8).drop_nulls().unique().sort().head(100)
        ).to_series().to_list()
        
        # Clean list (remove empty strings)
        clean_values = [v for v in uniques if v.strip() != ""]
        
        return {"status": "success", "values": clean_values}
        
    except Exception as e:
        print(f"❌ Error fetching unique values: {e}")
        return {"status": "error", "message": str(e)}

# Keeping your old function just in case, but 'get_unique_values' is better used now
def get_column_stats(filename: str, column: str):
    return get_unique_values(filename, column)