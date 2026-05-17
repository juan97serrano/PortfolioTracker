import { parseExcelBuffer, parseCsvText } from './excel-parser';
import { aggregatePositions, buildPortfolioSummary } from './calculations';
import { getQuote, getExchangeRates, convertToEur } from './financial-data';
import type { Position, PortfolioSummary } from './types';

function getDriveDownloadUrl(raw: string): string {
  // Google Sheets published CSV URL — use as-is
  if (raw.includes('export?') || raw.includes('/pub?')) return raw;

  // Google Sheets edit URL → convert to CSV export
  const sheetsMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`;
  }

  // Google Drive file URL → direct download
  const driveMatch = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  // Already a direct URL
  return raw;
}

async function fetchPortfolioFile(): Promise<{ buffer?: ArrayBuffer; csv?: string }> {
  const raw = process.env.PORTFOLIO_URL ?? '';
  if (!raw) throw new Error('PORTFOLIO_URL no está configurado.');

  const url = getDriveDownloadUrl(raw);
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) throw new Error(`Error al descargar el archivo: ${res.status} ${res.statusText}`);

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/csv') || url.includes('format=csv')) {
    return { csv: await res.text() };
  }
  return { buffer: await res.arrayBuffer() };
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  const file = await fetchPortfolioFile();

  const transactions = file.csv
    ? await parseCsvText(file.csv)
    : await parseExcelBuffer(file.buffer!);

  if (transactions.length === 0) {
    throw new Error('No se encontraron transacciones en el archivo.');
  }

  const rawPositions = aggregatePositions(transactions);
  const rates = await getExchangeRates();

  const positions: Position[] = await Promise.all(
    rawPositions.map(async (raw) => {
      const quote = await getQuote(raw.ticker);
      const currentPrice     = quote?.price ?? 0;
      const priceCurrency    = quote?.currency ?? raw.currency;
      const currentValue     = currentPrice * raw.shares;
      const currentValueEur  = convertToEur(currentValue, priceCurrency, rates);
      const costBasisEur     = convertToEur(raw.costBasis, raw.currency, rates);
      const returnAbsEur     = currentValueEur - costBasisEur;
      const returnPct        = costBasisEur > 0 ? (returnAbsEur / costBasisEur) * 100 : 0;

      return {
        ...raw,
        avgCost:      raw.shares > 0 ? raw.costBasis / raw.shares : 0,
        currentPrice,
        currentValue,
        currentValueEur,
        returnAbs:    currentValue - raw.costBasis,
        returnAbsEur,
        returnPct,
        dayChangePct: quote?.dayChangePct ?? 0,
        weight: 0, // filled in buildPortfolioSummary
      };
    })
  );

  return buildPortfolioSummary(positions);
}
