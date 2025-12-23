import polars as pl
from app.services.storage_service import minio_client, PROCESSED_BUCKET
import io

def get_parquet_stream(filename):
    try:
        # Check if file exists
        minio_client.stat_object(PROCESSED_BUCKET, filename)
        # Download
        response = minio_client.get_object(PROCESSED_BUCKET, filename)
        data = response.read()
        response.close()
        response.release_conn()
        return io.BytesIO(data)
    except Exception as e:
        print(f"❌ MinIO Download Error: {e}")
        raise e

def perform_aggregation(filename: str, group_by_col: str, operation: str, target_col: str):
    print(f"🔢 Aggregating {filename}: GroupBy '{group_by_col}', {operation} on '{target_col}'")
    try:
        stream = get_parquet_stream(filename)
        df = pl.read_parquet(stream)

        # 1. Validation
        if group_by_col not in df.columns:
            return {"status": "error", "message": f"Column '{group_by_col}' not found"}
        
        # 2. Prepare Data for Math
        # If operation is SUM or AVG, target must be numeric.
        if operation in ["sum", "avg"]:
            try:
                # Force clean numeric conversion
                df = df.with_columns(pl.col(target_col).cast(pl.Float64, strict=False))
                df = df.drop_nulls(subset=[target_col])
            except:
                return {"status": "error", "message": f"Column '{target_col}' contains non-numbers."}

        # 3. Define Logic
        # We use dynamic naming so the frontend knows what the key is (e.g., "sum_Bill_Amount")
        result_col = f"{operation}_{target_col}"
        
        agg_expr = None
        if operation == "sum":
            agg_expr = pl.col(target_col).sum()
        elif operation == "avg":
            agg_expr = pl.col(target_col).mean()
        elif operation == "count":
            agg_expr = pl.col(target_col).count() # Count works on anything
        elif operation == "min":
            agg_expr = pl.col(target_col).min()
        elif operation == "max":
            agg_expr = pl.col(target_col).max()
        else:
            return {"status": "error", "message": "Invalid operation"}

        # 4. EXECUTE GROUP BY (The Heavy Lifting)
        result_df = df.group_by(group_by_col).agg(agg_expr.alias(result_col))

        # 5. Optimization for Charts
        # Sort descending so the biggest bars are first
        result_df = result_df.sort(result_col, descending=True)
        
        # LIMIT to Top 200 groups. 
        # (This prevents plotting 50,000 distinct bars if user groups by 'ID')
        result_df = result_df.head(200)

        # 6. Safety: Convert all to String/Float for JSON
        # Round floats to 2 decimal places for cleaner charts
        if operation in ["sum", "avg"]:
             result_df = result_df.with_columns(pl.col(result_col).round(2))

        print(f"✅ Aggregation Result: {result_df.height} rows")

        return {
            "status": "success",
            "data": result_df.to_dicts(),
            "x_key": group_by_col,
            "y_key": result_col,
            "columns": result_df.columns
        }

    except Exception as e:
        print(f"❌ Aggregation Failed: {e}")
        return {"status": "error", "message": str(e)}