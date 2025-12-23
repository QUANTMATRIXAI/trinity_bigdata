import polars as pl
import io
import fastexcel
import openpyxl
from xlsx2csv import Xlsx2csv
from app.services.storage_service import minio_client, RAW_BUCKET, PROCESSED_BUCKET

def get_file_stream(object_key: str):
    """Helper: Downloads the file stream from MinIO"""
    print(f"📥 Downloading stream for: {object_key}")
    response = minio_client.get_object(RAW_BUCKET, object_key)
    return io.BytesIO(response.read())

# ---------------------------------------------------------
# 1. THE SCANNER (Restored!)
# ---------------------------------------------------------
def scan_excel_sheets(object_key: str):
    print(f"🔍 Scanning sheets for: {object_key}")
    try:
        if not object_key.endswith(('.xlsx', '.xls')):
            return {"status": "error", "message": "Not an Excel file"}

        stream = get_file_stream(object_key)
        file_bytes = stream.read() 
        
        # Try Fast Engine first
        try:
            reader = fastexcel.read_excel(file_bytes) 
            return {"status": "success", "sheets": reader.sheet_names, "engine": "fastexcel"}
        except Exception:
            print(f"⚠️ fastexcel failed scan. Switching to openpyxl...")

        # Fallback to slower reliable engine
        try:
            workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
            return {"status": "success", "sheets": workbook.sheetnames, "engine": "openpyxl"}
        except Exception as slow_error:
            return {"status": "error", "message": f"Corrupt file: {str(slow_error)}"}

    except Exception as e:
        return {"status": "error", "message": str(e)}

# ---------------------------------------------------------
# 2. THE CONVERTER (With Smart Header Detection)
# ---------------------------------------------------------
def convert_sheet_to_parquet(object_key: str, sheet_name: str):
    print(f"⚙️ Converting '{sheet_name}' from {object_key}...")
    try:
        stream = get_file_stream(object_key)
        
        # 1. Convert XLSX to CSV in memory (Fastest method)
        stream.seek(0)
        csv_buffer = io.StringIO()
        converter = Xlsx2csv(stream, outputencoding="utf-8", delimiter="\t", skip_empty_lines=True)
        try:
            converter.convert(csv_buffer, sheetname=sheet_name)
        except:
            print("⚠️ Sheet name match failed, trying index 0...")
            converter.convert(csv_buffer, sheetid=1)

        csv_buffer.seek(0)
        
        # 2. Smart Header Detection
        # Read without headers to find the "Real" start of data
        full_df = pl.read_csv(
            io.StringIO(csv_buffer.getvalue()), 
            separator="\t", 
            has_header=False, 
            infer_schema_length=0,
            truncate_ragged_lines=True,
            ignore_errors=True
        )

        header_row_idx = 0
        
        # Scan first 1000 rows to find a row with data
        # We look for a row where >50% of columns are not empty
        for i in range(min(1000, full_df.height)):
            row = full_df.row(i)
            # Count valid cells (not null, not empty string)
            non_empty_count = sum(1 for val in row if val and str(val).strip() != "" and str(val).strip() != "null")
            
            # Logic: If row has > 5 columns of data, or > 50% filled, it's likely the header
            if non_empty_count > 5 or (len(row) > 0 and non_empty_count > (len(row) * 0.5)):
                header_row_idx = i
                print(f"✅ Auto-Detected Header at Row: {i+1}")
                break
        
        # 3. Reload CSV starting from the detected header
        csv_buffer.seek(0)
        df = pl.read_csv(
            io.StringIO(csv_buffer.getvalue()), 
            separator="\t", 
            has_header=True, 
            skip_rows=header_row_idx, # 👈 Skips the blank/junk rows
            infer_schema_length=0, 
            ignore_errors=True,
            truncate_ragged_lines=True
        )

        # 4. Final Cleanup
        df = df.filter(~pl.all_horizontal(pl.all().is_null() | (pl.all() == "")))
        df.columns = [str(col).strip() for col in df.columns]

        # Save Parquet
        clean_filename = object_key.replace(".xlsx", "").replace("/", "_")
        parquet_filename = f"{clean_filename}_{sheet_name}.parquet"
        
        output_buffer = io.BytesIO()
        df.write_parquet(output_buffer)
        output_buffer.seek(0)
        
        minio_client.put_object(
            PROCESSED_BUCKET,
            parquet_filename,
            output_buffer,
            length=output_buffer.getbuffer().nbytes,
            content_type="application/octet-stream"
        )
        
        return {
            "status": "success",
            "original_sheet": sheet_name,
            "processed_file": parquet_filename,
            "rows": df.height,
            "columns": df.columns
        }
        
    except Exception as e:
        print(f"❌ Conversion Failed: {e}")
        return {"status": "error", "message": str(e)}