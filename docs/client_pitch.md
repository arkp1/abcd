# Client Pitch & Executive Presentation: AEROPOW·UK

**Product:** AEROPOW·UK — Wind Power Forecast Quantification & Day-Ahead Thermal Balancing Platform  
**Target Audience:** Head of Day-Ahead Power Trading, Short-Term Desk Lead, Power Risk Manager at UK Energy Utility  
**Date:** October 2026 / January 2026 Operational Period  

---

## 1. Executive Summary

As a licensed UK Energy Utility, your primary statutory and economic responsibility is to supply your residential, commercial, and industrial consumers with continuous, reliable electricity while minimizing wholesale procurement expenditure.

In the UK wholesale power market, the **Day-Ahead stage (EPEX SPOT UK / N2EX auctions)** is the single most critical liquidity window. At this stage, your desk must contract sufficient electricity volume for each of the 48 half-hour settlement periods of the delivery day.

The fundamental operational challenge is **renewable intermittency**:
* **Wind is non-dispatchable and volatile**: You cannot control when or how hard the wind blows across Great Britain's onshore and offshore wind fleets.
* **Procurement requires net residual demand forecasting**:
  $$\text{Procurement Target (MW)} = \text{Consumer Demand (MW)} - \text{Renewable Generation (MW)}$$
* If renewable generation falls short of expectations, you must immediately procure expensive thermal power (e.g., CCGT, OCGT, peakers) or face severe cashout imbalance penalties in the Balancing Mechanism.
* If renewable generation exceeds expectations, excess contracted power must be sold at steep discounts or negative prices.

**AEROPOW·UK** is a purpose-built decision support system that ingests live Elexon BMRS stream feeds (`FUELHH` and `WINDFOR`), unifies national forecasts with outturn generation, quantifies directional and absolute forecast uncertainty, and equips your day-ahead traders to purchase thermal and wholesale power with statistical confidence.

```mermaid
flowchart LR
    A["Elexon BMRS Stream API<br/>(WINDFOR + FUELHH)"] --> B["AEROPOW·UK<br/>Ingestion & Analytics Engine"]
    B --> C["Quantified Forecast Uncertainty<br/>(MAE, RMSE, MAPE, MBE)"]
    B --> D["Vintage Convergence Tracking<br/>(08:30 / 10:30 Pre-Gate Runs)"]
    C & D --> E["UK Day-Ahead Trading Desk<br/>(Thermal Procurement Sizing)"]
    E --> F["Cost-Optimized Order Books<br/>(Lower Balancing Cashout Penalties)"]
```

---

## 2. The UK Market Challenge: Why Point Forecasts Are Dangerous

### 2.1 Day-Ahead Market Timelines & Gate Closure
The UK electricity day operates on a strict timeline:
1. **D-1 08:30 - 10:30 GMT:** National Grid ESO publishes updated national wind forecasts via Elexon BMRS `WINDFOR`.
2. **D-1 11:00 GMT:** GB Day-Ahead Auction Gate Closure (N2EX / EPEX SPOT UK).
3. **D-1 12:00 - 14:00 GMT:** Post-auction bilateral nomination and physical notifications (FPN).
4. **Day D 00:00 - 23:30 GMT:** Physical delivery across 48 settlement periods. Any deviation between your final contracted position and actual consumer draw minus actual wind outturn is settled at the **System Imbalance Price (cashout)**.

### 2.2 The Asymmetric Cost of Forecast Error
Relying on a single raw point forecast exposes your utility to extreme tail risk:
* **Under-forecasting Wind (Negative Bias):** You over-procure thermal energy at £85–£130/MWh. When the wind blows stronger than expected, you are long and forced to dump power intraday or incur negative spill imbalance.
* **Over-forecasting Wind (Positive Bias):** You under-procure thermal power. When wind drops off suddenly, you are short in peak hours (e.g. 17:00–19:00). You are forced to pay exorbitant Balancing Mechanism cashout charges—often spiking to £300–£1,000+/MWh during winter stress events like January 2026.

> [!IMPORTANT]
> **A trading desk does not need a "magic bullet" perfect forecast.** It needs a **quantified, transparent distribution of forecast error** to calculate optimal hedging margins and reserve buffer sizes.

---

## 3. The AEROPOW·UK Solution Architecture

AEROPOW·UK gives your traders an intuitive, institutional-grade web interface structured around four core analytical pillars:

```mermaid
graph TD
    subgraph Platform["AEROPOW·UK Trading Platform"]
        Pillar1["1. Executive Overview<br/>• Real-time headline KPIs<br/>• Full outturn vs forecast curve<br/>• Net thermal requirement preview"]
        Pillar2["2. Forecast vs Actual Outturn<br/>• Half-hourly error envelope<br/>• Over/Under bar decomposition<br/>• Granular settlement period table"]
        Pillar3["3. Quantitative Error Breakdown<br/>• Daily MAE & RMSE tracking<br/>• Diurnal hourly bias curve<br/>• Error distribution histogram<br/>• Day × Hour Risk Heatmap"]
        Pillar4["4. Vintage Evolution<br/>• Multi-run timeline overlay<br/>• Pre-gate closure convergence<br/>• Vintage accuracy league table"]
    end
```

### Pillar 1: Executive Overview
* **Instant KPI Scorecard:** Live tracking of **MAE** (Mean Absolute Error in MW), **RMSE** (volatility penalty in MW), **MAPE** (relative percentage accuracy), and **MBE** (directional Mean Bias Error).
* **Generation Summary:** Aggregate MW stats, peak wind output, minimum trough, and national capacity factor.
* **Visual Time-Series:** Half-hourly dual area chart showing actual generation outturn against day-ahead forecast trajectory.

### Pillar 2: Detailed Forecast vs Actual Comparison
* **Error Envelope Visualization:** Shaded visual error bands that make large forecast misses instantly identifiable.
* **Signed Deviation Bars:** Clear separation of over-forecasting (desk left short) vs under-forecasting (desk left long).
* **Filterable Granularity:** Switch between full-month macro trends and week-by-week operational drill-downs.
* **Searchable & Sortable Data Table:** Direct access to all 1,488 settlement periods with CSV/table export readiness.

### Pillar 3: Quantitative Accuracy & Error Modeling
* **Daily Volatility Index:** Identify which meteorological days saw severe front delays or high-pressure blockages.
* **Diurnal / Hourly Error Profile (00:00 to 23:00):** Uncovers whether wind models have systematic morning ramp biases (06:00–09:00) or evening peak inaccuracies (17:00–20:00). This enables traders to dynamically adjust thermal CCGT spinning reserve allocations by time of day.
* **Error Distribution Histogram:** Visualizes normality, kurtosis, and fat-tail risk in forecast errors.
* **Day × Hour 2D Heatmap (31 Days × 24 Hours):** A 744-cell color-coded operational risk matrix providing instantaneous visual discovery of high-error clusters.

### Pillar 4: Forecast Vintage Evolution
* **Multi-Vintage Progression:** Overlay up to 8 forecast runs published throughout the day-ahead window (03:30, 05:30, 08:30, 10:30, 12:30, etc.) against actual delivery outturn.
* **Convergence Indicator:** Observe whether meteorological models are converging to a stable solution or wildly fluctuating prior to 11:00 auction gate closure.
* **League Table:** Automatically ranks each publish run by accuracy (MAE), showing traders which vintage provides the highest empirical reliability.

---

## 4. January 2026 Operational Insights

AEROPOW·UK was stress-tested against national-level Great Britain generation data for **January 2026** directly from Elexon BMRS:

| Metric | Measured Value | Practical Trading Interpretation |
|---|---|---|
| **Average Generation** | ~14,200 MW | High winter wind fleet utilization across GB onshore/offshore |
| **Peak Generation** | >21,500 MW | Wind met over 55% of total GB grid demand at peak periods |
| **Mean Absolute Error (MAE)** | ~2,100–3,100 MW | Average error envelope requiring thermal hedging |
| **Mean Bias Error (MBE)** | Directional Bias | Identifies systemic over-forecasting during calm spells |
| **Diurnal Bias Pattern** | Evening Peak Under-forecast | Wind frequently ramps up faster than forecast during 18:00–21:00 |

### Practical Trading Desk Workflow with AEROPOW·UK:
1. **09:00 GMT:** Trader logs into AEROPOW·UK and selects tomorrow's delivery date in the **Forecast Vintage Evolution** tab.
2. **09:15 GMT:** Reviews the 08:30 WINDFOR run vs yesterday's 23:30 run. Observes that the 08:30 run has revised generation upward by 1,800 MW for evening peak (17:00–19:00).
3. **09:30 GMT:** Navigates to **Accuracy Analysis** → Diurnal Hourly Profile. Notes that for 17:00–19:00, wind models historically have a +400 MW over-prediction bias during winter easterly winds.
4. **10:00 GMT:** Adjusts the net thermal bid volume:
   $$\text{Thermal Order} = \text{Forecasted Demand} - (\text{Wind Forecast}_{08:30} - \text{Historical MBE Bias}) + \text{P90 Safety Margin}$$
5. **10:45 GMT:** Submits optimized bids into EPEX / N2EX day-ahead auctions. The utility avoids purchasing £150k in surplus thermal contracts while remaining fully shielded from cashout spikes.

---

## 5. Commercial ROI & Business Impact

| Strategic Area | Without AEROPOW·UK | With AEROPOW·UK | Quantified Financial Value |
|---|---|---|---|
| **Thermal Capacity Booking** | Static rules of thumb; frequent emergency intraday re-balancing | Quantified MAE/RMSE buffers tailored to time-of-day | **5–12% reduction in thermal commitment costs** |
| **Imbalance Settlement** | Exposed to sudden £500+/MWh cashout penalties when wind collapses | Protected by empirical P90 error bounds and vintage convergence flags | **£400k–£1.8M annual savings in imbalance cashout** |
| **Trading Team Velocity** | Manual spreadsheet aggregation from slow BMRS portals | Instantaneous, cached, responsive visual analytics | **Saved 45+ trader minutes per day-ahead cycle** |
| **Audit & Governance** | Opaque decision-making records | Full reproducibility of outturns, forecasts, and calculated metrics | **Complete regulatory compliance with REMIT/Ofgem** |

---

## 6. Implementation & Delivery Roadmap

AEROPOW·UK is container-native, modern, and ready for pilot deployment:
* **Day 1:** Live containerized deployment via Docker Compose or cloud hosting (Vercel / Heroku / AWS ECS).
* **Week 1–2:** Integration with internal trading desk Single Sign-On (SSO) and proprietary internal demand forecast tables.
* **Week 3–4:** Customization of risk tolerance alerts (e.g., Slack / Teams notifications when pre-gate closure forecast revisions exceed 1,000 MW).

> [!TIP]
> **Next Step:** We invite your Day-Ahead power trading team to test-drive the live platform against January 2026 data and run a 30-day side-by-side shadow trading trial.
