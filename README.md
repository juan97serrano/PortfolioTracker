# Portfolio Tracker

Minimal Next.js app to track a portfolio from a Google Sheet (published as CSV).

Setup

1. Install dependencies

```bash
npm install
```

2. Create a Google Sheet and `File > Publish to web` the `Positions` sheet as CSV. Copy the CSV URL.

3. Create environment variable `SHEET_CSV_URL` with the published CSV URL. Locally you can create a `.env.local` with:

```
SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<<ID>>/gviz/tq?tqx=out:csv&sheet=Positions"
```

4. Run dev server

```bash
npm run dev
```

Structure

- `pages/api/sheet.js` — serverless API that fetches and parses the CSV
- `pages/index.js` — dashboard summary + list of positions
- `pages/positions/[ticker].js` — detail view for a position
- `utils/metrics.js` — calculations for returns and portfolio metrics

Deployment

Deploy to Vercel: set `SHEET_CSV_URL` in the Vercel dashboard as an environment variable.

Notes

- The app expects the `Positions` sheet to have headers like: `Ticker,Name,Quantity,AvgCost,CurrentPrice` (CurrentPrice optional).
- For live prices / ratios integrate an external market data API (Finnhub, AlphaVantage, etc.) and extend the API route to enrich rows.
 - To enable automatic price and ratio enrichment using Finnhub set the environment variable `FINNHUB_API_KEY` in your local `.env.local` or Vercel project.

Example `.env.local`:

```
SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<<ID>>/gviz/tq?tqx=out:csv&sheet=Positions"
FINNHUB_API_KEY="your_finnhub_key_here"
```

When `FINNHUB_API_KEY` is present the API route `pages/api/sheet.js` will call Finnhub's `/quote` and `/stock/metric` endpoints and attach fields such as `CurrentPrice`, `PE`, `PB`, and `DividendYield` to each row when available.
# PortfolioTracker