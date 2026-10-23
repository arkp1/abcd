# Wind Power Forecast Dashboard

A web application for UK energy utility traders to visualize and evaluate wind power generation forecasts from the Elexon BMRS (Balancing Mechanism Reporting Service). The dashboard helps day-ahead market trading teams understand forecast accuracy and make informed power procurement decisions.

## 🎯 Purpose

UK energy utilities need to procure electricity from the wholesale market to serve consumers. The key challenge is determining how much power needs to be additionally purchased (e.g., from thermal plants) beyond what renewable sources like wind will generate. Since day-ahead market decisions are made one day before delivery, traders rely on wind generation forecasts.

This dashboard enables traders to:
1. **View latest wind generation forecasts** alongside actual generation data
2. **Quantify forecast accuracy** using standard statistical metrics (MAE, RMSE, MAPE, MBE)
3. **Analyze forecast patterns** by time of day, day of week, and forecast vintage
4. **Track forecast evolution** to understand how forecasts improve as delivery time approaches

## 📊 Data Sources

All data comes from the [Elexon BMRS Insights API](https://bmrs.elexon.co.uk/api-documentation):

| Dataset | Endpoint | Description |
|---------|----------|-------------|
| **FUELHH** | `/datasets/FUELHH/stream` | Half-hourly actual generation by fuel type (filtered for WIND) |
| **WINDFOR** | `/datasets/WINDFOR/stream` | Wind generation forecasts published up to 8 times daily |

**Time Period**: January 2026

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   React SPA     │────▶│  FastAPI Server │────▶│  Elexon BMRS    │
│   (Frontend)    │     │  (Backend)      │     │  API            │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Port 3000               Port 8000          External Service
```

- **Frontend**: React 18 with Recharts for data visualization
- **Backend**: Python FastAPI with async HTTP client (httpx)
- **Data Processing**: Pandas for time series analysis and metric calculation
- **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose (recommended)
- OR Node.js 18+ and Python 3.11+

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd wind-forecast-dashboard

# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/health
```

### Option 2: Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

## 📱 Features

### 1. Overview Dashboard
- Key accuracy metric cards (MAE, RMSE, MAPE, MBE)
- Time series overlay of actual vs. forecasted wind generation
- Summary statistics

### 2. Forecast vs. Actual Comparison
- Detailed time series with error band visualization
- Error time series chart (over/under-forecasting patterns)
- Paginated data table with all records
- Weekly/monthly view toggle

### 3. Accuracy Analysis
- Daily accuracy metrics breakdown
- Hourly error profile (reveals systematic time-of-day biases)
- Error distribution histogram
- Day-hour heatmap of error magnitudes

### 4. Forecast Evolution
- How forecasts for a specific delivery day evolve over time
- Multiple forecast vintages overlaid with actual generation
- Insight into forecast convergence as delivery approaches

## 📈 Accuracy Metrics

| Metric | Description | Formula |
|--------|-------------|---------|
| **MAE** | Mean Absolute Error | Avg(\|Forecast - Actual\|) |
| **RMSE** | Root Mean Square Error | √(Avg((Forecast - Actual)²)) |
| **MAPE** | Mean Absolute Percentage Error | Avg(\|Forecast - Actual\| / Actual) × 100 |
| **MBE** | Mean Bias Error | Avg(Forecast - Actual) |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/actuals` | Wind generation actuals |
| GET | `/api/forecasts` | Wind generation forecasts |
| GET | `/api/forecast-vs-actual` | Merged actuals & forecasts with metrics |
| GET | `/api/forecast-accuracy` | Comprehensive accuracy analysis |
| GET | `/api/forecast-evolution` | Forecast evolution for a target date |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Recharts, Axios, date-fns, Lucide Icons |
| Backend | Python 3.11, FastAPI, httpx, Pandas, NumPy |
| Infrastructure | Docker, Docker Compose, Nginx |

## 🤖 AI Tools Disclosure

This application was built with the assistance of AI coding tools (Google Antigravity / Claude) for:
- Code generation and scaffolding
- Architecture design recommendations
- Documentation drafting

All AI-generated code was reviewed, tested, and refined by the developer.

## 📁 Project Structure

```
wind-forecast-dashboard/
├── docker-compose.yml
├── README.md
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py           # FastAPI application entry
│       ├── config.py          # Configuration constants
│       ├── elexon_client.py   # Elexon BMRS API client
│       ├── data_processing.py # Data processing & metrics
│       ├── routes.py          # API route handlers
│       └── schemas.py         # Pydantic response models
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js
        ├── App.css
        ├── api.js
        └── components/
            ├── Overview.js
            ├── ForecastVsActual.js
            ├── AccuracyAnalysis.js
            ├── ForecastEvolution.js
            ├── MetricCard.js
            ├── DataTable.js
            ├── LoadingSpinner.js
            └── ErrorMessage.js
```

## 📜 License

MIT License

