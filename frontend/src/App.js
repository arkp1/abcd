import React, { useState } from 'react';
import {
  Wind,
  BarChart2,
  GitCompare,
  TrendingUp,
  History,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';
import Overview from './components/Overview';
import ForecastVsActual from './components/ForecastVsActual';
import AccuracyAnalysis from './components/AccuracyAnalysis';
import ForecastEvolution from './components/ForecastEvolution';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-01-31');
  const [showPitchModal, setShowPitchModal] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: BarChart2 },
    { id: 'comparison', label: 'Forecast vs Actual', icon: GitCompare },
    { id: 'accuracy', label: 'Accuracy & Error Analysis', icon: TrendingUp },
    { id: 'evolution', label: 'Forecast Vintage Evolution', icon: History },
  ];

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-badge">
            <Wind size={26} className="logo-icon" />
          </div>
          <div>
            <div className="header-title-row">
              <h1 className="header-title">AEROPOW·UK</h1>
              <span className="header-badge">Elexon BMRS Day-Ahead</span>
            </div>
            <p className="header-tagline">
              Wind Power Forecast Quantification & Day-Ahead Thermal Balancing Support
            </p>
          </div>
        </div>

        <div className="header-right">
          <div className="date-filter-group">
            <Calendar size={16} className="filter-icon" />
            <div className="filter-input-wrap">
              <label>Delivery Window:</label>
              <div className="filter-dates">
                <input
                  type="date"
                  value={dateFrom}
                  min="2026-01-01"
                  max="2026-01-31"
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="date-input-field"
                />
                <span className="date-sep">→</span>
                <input
                  type="date"
                  value={dateTo}
                  min="2026-01-01"
                  max="2026-01-31"
                  onChange={(e) => setDateTo(e.target.value)}
                  className="date-input-field"
                />
              </div>
            </div>
          </div>

          <button
            className="pitch-btn"
            onClick={() => setShowPitchModal(true)}
            title="Trading Team Decision Support Guide"
          >
            <HelpCircle size={16} />
            <span>Trading Guide</span>
          </button>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'nav-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="nav-meta">
          <span className="live-indicator">
            <span className="live-dot"></span>
            January 2026 Outturn & Forecasts
          </span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <Overview dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeTab === 'comparison' && (
          <ForecastVsActual dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeTab === 'accuracy' && (
          <AccuracyAnalysis dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeTab === 'evolution' && (
          <ForecastEvolution dateFrom={dateFrom} />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-col">
            <div className="footer-title">Data Pipeline</div>
            <p className="footer-text">
              Direct ingestion of Elexon BMRS Stream API: <code>FUELHH/stream</code> (Wind Outturn) & <code>WINDFOR/stream</code> (National Wind Forecasts). Half-hourly settlement granularity (48 periods/day).
            </p>
          </div>
          <div className="footer-col">
            <div className="footer-title">Trading Decision Context</div>
            <p className="footer-text">
              UK Day-Ahead Gate Closure operates at 11:00 / 12:00 GMT for next-day physical delivery. Forecast uncertainty directly dictates additional thermal capacity booking and reserve margin requirements.
            </p>
          </div>
          <div className="footer-col">
            <div className="footer-title">Methodology</div>
            <p className="footer-text">
              Metrics calculated against day-ahead latest available forecast vintage: MAE, RMSE, MAPE (adjusted for zero generation), and MBE (directional bias).
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>AEROPOW·UK Wind Forecast Platform &bull; Built with React & FastAPI &bull; Dockerized</span>
        </div>
      </footer>

      {/* Trading Guide Modal */}
      {showPitchModal && (
        <div className="modal-backdrop" onClick={() => setShowPitchModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Day-Ahead Trading Desk Decision Guide</h2>
              <button className="modal-close" onClick={() => setShowPitchModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <h3>Problem We Solve</h3>
              <p>
                As a UK energy utility procurement desk, your objective is to meet downstream customer demand at lowest wholesale cost while minimizing expensive imbalance penalties in the Balancing Mechanism.
              </p>
              <div className="guide-grid">
                <div className="guide-box">
                  <h4>1. The Volatility Risk</h4>
                  <p>Wind is weather-dependent. A 1,500 MW forecast miss means unexpectedly ramping up or down thermal assets or buying on intraday power markets at premium cashout prices.</p>
                </div>
                <div className="guide-box">
                  <h4>2. Quantified Hedging</h4>
                  <p>Using our quantified Mean Absolute Error (MAE) and Mean Bias Error (MBE), your traders apply a statistical buffer (e.g., procurement = Demand - [Wind Forecast - MBE] + P90 Buffer).</p>
                </div>
                <div className="guide-box">
                  <h4>3. Vintage Evolution</h4>
                  <p>See how the 08:30 vs 10:30 day-ahead runs converged before 11:00 EPEX/N2EX auction gate closure to spot shifting weather fronts.</p>
                </div>
                <div className="guide-box">
                  <h4>4. Systematic Diurnal Bias</h4>
                  <p>Identify whether morning peaks or evening ramp hours experience persistent under-forecasting or over-forecasting to optimize CCGT spinning reserves.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowPitchModal(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

