import os
import polars as pl
import math

def csv_to_parquet_stream(csv_path: str, output_dir: str, batch_size: int = 200_000):
    """
    Streams CSV -> multiple Parquet files using Polars.
    
    Why streaming?
    - Prevents RAM explosion
    - Suitable for 100MB–5GB datasets

    Returns:
    - list of parquet file paths
    - summary dict
    """

    # -----------------------------
    # 1. First pass — infer schema
    # -----------------------------
    sample_df = pl.read_csv(
        csv_path,
        n_rows=5000,
        ignore_errors=True,
        try_parse_dates=True
    )

    schema = sample_df.schema
    cols = list(schema.keys())

    # Summary metadata
    summary = {
        "columns": [{"name": c, "dtype": str(schema[c])} for c in cols],
        "row_count": 0,
        "sample": sample_df.head(20).to_dicts(),
    }

    parquet_files = []
    file_index = 0

    # -----------------------------------
    # 2. Streaming read CSV in batches
    # -----------------------------------
    reader = pl.read_csv(
        csv_path,
        ignore_errors=True,
        infer_schema_length=5000,
        try_parse_dates=True,
        low_memory=True,
        truncate_ragged_lines=True
    )

    total_rows = reader.height
    num_batches = math.ceil(total_rows / batch_size)

    start = 0

    for batch_i in range(num_batches):
        end = start + batch_size

        batch = reader.slice(start, batch_size)

        if batch.height == 0:
            break

        # Write parquet
        parquet_path = os.path.join(output_dir, f"part-{file_index:04d}.parquet")
        batch.write_parquet(parquet_path)

        parquet_files.append(parquet_path)
        summary["row_count"] += batch.height

        file_index += 1
        start = end

    return parquet_files, summary
