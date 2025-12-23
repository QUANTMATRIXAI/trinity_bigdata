# 🚀 DataFast: High-Performance Data Ingestion Engine

**DataFast** is a modernized data pipeline designed to ingest, process, and analyze massive datasets (up to 1GB+) with high efficiency. It replaces legacy upload methods with a streaming architecture, reducing processing time by **80%** and RAM usage by **90%**.

---

## 🏗️ 1. Architecture Flow
The system bypasses traditional bottlenecks by streaming data directly to object storage.

### **Step 1: The Direct Upload (Frontend)**
* **Action:** The user selects a large Excel file in the React UI.
* **Logic:** The Frontend requests a "Presigned URL" from the backend.
* **Result:** The file is uploaded **directly to MinIO** (Storage), completely bypassing the Backend server.
* **Benefit:** Uploads take seconds, not minutes. The server never freezes.

### **Step 2: The Streaming Conversion (Backend)**
* **Action:** Once the upload is complete, the Backend starts processing.
* **Logic:** It uses a **Streaming Reader (`xlsx2csv`)** to read the Excel file row-by-row. It does *not* load the full file into RAM.
* **Result:** The file is converted to a compressed **Parquet** format.
* **Benefit:** RAM usage stays flat at **~160MB**, even for 1GB files.

### **Step 3: The Instant Analysis (Dashboard)**
* **Action:** The user filters or sorts data on the dashboard.
* **Logic:** The system uses **Polars (Lazy Evaluation)** to scan the Parquet file.
* **Result:** Data is retrieved in milliseconds without loading the full dataset.

---

## 📂 2. Project Structure & Key Files
Here is a breakdown of the codebase to help navigating the repository.

### **backend/** (The Brain)
* `app/services/processing_service.py`: **The Core Engine.** Contains the logic to stream Excel files and convert them to Parquet without crashing memory.
* `app/services/analysis_service.py`: **The Query Engine.** Handles requests from the dashboard (filtering, sorting) using Polars for high speed.
* `app/services/storage_service.py`: Manages secure connections to MinIO storage.
* `app/api/routes.py`: Defines the API endpoints (e.g., `/upload-url`, `/analyze`) that connect the Frontend to the Backend.
* `config.py`: **Security Center.** Manages sensitive keys (MinIO credentials, Database passwords) securely via environment variables.

### **dataset-ui/** (The Interface)
* `src/App.js`: **Upload Logic.** Handles the "Direct-to-MinIO" upload mechanism using Axios for progress tracking.
* `src/AnalysisDashboard.js`: **Visualization.** The main dashboard component that renders the grid, charts, and handles the dropdown filters.

### **Infrastructure**
* `docker-compose.yml`: **Orchestrator.** Spins up the entire stack (Frontend, Backend, Database, MinIO) in isolated containers to ensure it runs identical to production.

---

## 📊 3. Performance Benchmarks
Comparison based on a **300MB Excel Dataset**:

| Metric | Legacy Architecture | **DataFast Architecture** |
| :--- | :--- | :--- |
| **Upload Speed** | 5 Minutes | **< 5 Seconds** |
| **Conversion Speed** | 10 Minutes | **2 - 3 Minutes** |
| **RAM Usage** | 2 GB+ (Unstable) | **~160 MB (Stable)** |
| **Stability** | Frequent Crashes | **Zero Crashes** |

---

## 🚀 4. How to Run
1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/QUANTMATRIXAI/trinity_bigdata.git](https://github.com/QUANTMATRIXAI/trinity_bigdata.git)
    ```
2.  **Start the System:**
    ```bash
    docker-compose up --build
    ```
3.  **Access the Application:**
    * **Frontend:** `http://localhost:3000`
    * **Backend Documentation:** `http://localhost:8100/docs`