# AssetFlow Ecosystem

**AI-Powered Financial Wellness & AssetFlow Intelligence Platform**

A production-grade fintech ecosystem consisting of two independent but deeply integrated systems:

| System | Purpose |
|--------|---------|
| **Bank Simulator** | Simulates a full financial institution — accounts, transactions, loans, FDs, stocks, MFs, gold |
| **AssetFlow Management** | Account Aggregator + Financial Intelligence Engine + AI Advisor |

Both systems communicate via **Redis Pub/Sub** in real time.

---

## Architecture

```
React (Bank Simulator UI)          React (AssetFlow UI)
         |                                  |
FastAPI (Bank Simulator Backend)   FastAPI (API Gateway)
         |                                  |
    Redis Pub/Sub ──────────────────► Consumer Service
         |                                  |
      MongoDB                         MongoDB
                                           |
                              ┌────────────┼────────────┐
                           ETL Service  ML Service   AI Service
                                           |
                                      Tax Service
                                      Notification Service
```

---

## Quick Start

### Option 1: Full Docker Stack

```bash
# Clone and enter project
cd AssetFlow-Ecosystem

# Copy environment files
cp .env.example .env

# Start everything (first run pulls Ollama phi3 ~2.3GB)
docker compose up --build

# Pull Ollama model (run once)
docker exec -it assetflow-ollama ollama pull phi3
```

**URLs:**
- Bank Simulator UI: http://localhost:3001
- AssetFlow UI: http://localhost:3002
- Bank Simulator API: http://localhost:8001/docs
- AssetFlow API Gateway: http://localhost:8000/docs
- AssetFlow Core API: http://localhost:8002/docs

### Option 2: Local Development (venv)

**Prerequisites:** Python 3.11, Node 18+, Docker (for MongoDB + Redis + Ollama)

```bash
# Terminal 1 — Infrastructure only
docker compose -f docker-compose.dev.yml up -d

# Terminal 2 — Bank Simulator Backend
cd bank-simulator/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Terminal 3 — AssetFlow Backend
cd assetflow-system/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002

# Terminal 4 — AssetFlow Consumer
cd assetflow-system/consumer-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003

# Terminal 5 — Bank Simulator Frontend
cd bank-simulator/frontend
npm install
npm run dev   # runs on http://localhost:3001

# Terminal 6 — AssetFlow Frontend
cd assetflow-system/frontend
npm install
npm run dev   # runs on http://localhost:3002
```

---

## Project Structure

```
AssetFlow-Ecosystem/
├── bank-simulator/
│   ├── backend/          FastAPI + Python 3.11
│   └── frontend/         React 18 + TypeScript + MUI
├── assetflow-system/
│   ├── backend/          Core aggregation API
│   ├── frontend/         React 18 + Recharts + MUI
│   ├── consumer-service/ Redis subscriber
│   ├── etl-service/      PySpark + Pandas ETL
│   ├── ml-service/       Prophet + Scikit-learn
│   ├── ai-service/       Ollama (phi3)
│   ├── tax-service/      Indian Tax Engine
│   ├── notification-service/ WebSocket alerts
│   └── api-gateway/      JWT proxy
├── shared/               Shared schemas and utilities
└── deployment/
    ├── docker/
    └── kubernetes/
```

---

## Demo Flow

1. Login to **Bank Simulator** → create account
2. Perform transactions (salary, UPI, EMI, investments)
3. Events published to **Redis**
4. **AssetFlow Consumer** ingests events → MongoDB
5. **ETL Service** transforms raw data
6. **ML Service** runs predictions
7. **AssetFlow Dashboard** shows updated analytics
8. **AI Advisor** generates personalized recommendations
9. **Tax Dashboard** calculates Old vs New regime

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.11 |
| Frontend | React 18, TypeScript, Material UI v5 |
| Database | MongoDB |
| Event Stream | Redis Pub/Sub |
| ML | Scikit-learn, Prophet, Pandas, PySpark |
| AI | Ollama (phi3) |
| Charts | Recharts |
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes |

---

## Indian Tax Engine

Supports FY 2024-25 with:
- Old Regime: 80C, 80D, NPS, HRA, Home Loan deductions
- New Regime: revised slabs
- Regime comparison and recommendation
- Downloadable PDF report
