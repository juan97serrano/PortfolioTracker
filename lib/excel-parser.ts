import type { Transaction, AssetType, OperationType } from './types';

function parseExcelDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date (days since 1900-01-01)
    const date = new Date((value - 25569) * 86400 * 1000);
    return date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // DD/MM/YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    }
    // DD-MM-YYYY
    const ddmmyyyy2 = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyy2) {
      return new Date(parseInt(ddmmyyyy2[3]), parseInt(ddmmyyyy2[2]) - 1, parseInt(ddmmyyyy2[1]));
    }
    return new Date(trimmed);
  }
  return new Date();
}

function colIdx(headers: string[], names: string[]): number {
  for (const name of names) {
    const i = headers.indexOf(name.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

// ISO 4217 currency codes are 3 uppercase letters. Anything else (numbers,
// blanks, misaligned columns) falls back to EUR so the UI does not crash.
function normalizeCurrency(value: unknown): string {
  const s = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : 'EUR';
}

export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<Transaction[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  // Support both "Transacciones" sheet and first sheet
  const sheetName =
    workbook.SheetNames.find(n => n.toLowerCase().includes('transac')) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => String(h ?? '').trim().toLowerCase());

  const dateCol    = colIdx(headers, ['fecha', 'date']);
  const tickerCol  = colIdx(headers, ['ticker', 'símbolo', 'simbolo', 'symbol', 'codigo', 'código']);
  const nameCol    = colIdx(headers, ['nombre', 'name', 'activo']);
  const typeCol    = colIdx(headers, ['tipo_activo', 'tipo activo', 'tipo', 'type', 'clase']);
  const opCol      = colIdx(headers, ['operacion', 'operación', 'operation', 'op', 'accion', 'acción']);
  const qtyCol     = colIdx(headers, ['cantidad', 'quantity', 'acciones', 'units', 'participaciones']);
  const priceCol   = colIdx(headers, ['precio', 'price', 'precio_unidad']);
  const commCol    = colIdx(headers, ['comision', 'comisión', 'commission', 'fees', 'gastos']);
  const currCol    = colIdx(headers, ['divisa', 'currency', 'moneda']);

  const transactions: Transaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row[tickerCol] == null) continue;

    const ticker = String(row[tickerCol] ?? '').trim().toUpperCase();
    if (!ticker) continue;

    const qty = Number(row[qtyCol]) || 0;
    const price = Number(row[priceCol]) || 0;
    if (qty <= 0 || price <= 0) continue;

    const rawType = String(row[typeCol] ?? 'Acción').trim();
    const rawOp   = String(row[opCol]   ?? 'Compra').trim();

    transactions.push({
      date:       parseExcelDate(row[dateCol]).toISOString(),
      ticker,
      name:       String(row[nameCol] ?? ticker).trim(),
      assetType:  rawType as AssetType,
      operation:  rawOp as OperationType,
      quantity:   qty,
      price,
      commission: Number(row[commCol]) || 0,
      currency:   normalizeCurrency(row[currCol]),
    });
  }

  return transactions;
}

export async function parseCsvText(text: string): Promise<Transaction[]> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''));

  const dateCol    = colIdx(headers, ['fecha', 'date']);
  const tickerCol  = colIdx(headers, ['ticker', 'símbolo', 'simbolo', 'symbol', 'codigo', 'código']);
  const nameCol    = colIdx(headers, ['nombre', 'name', 'activo']);
  const typeCol    = colIdx(headers, ['tipo_activo', 'tipo activo', 'tipo', 'type', 'clase']);
  const opCol      = colIdx(headers, ['operacion', 'operación', 'operation', 'op', 'accion', 'acción']);
  const qtyCol     = colIdx(headers, ['cantidad', 'quantity', 'acciones', 'units', 'participaciones']);
  const priceCol   = colIdx(headers, ['precio', 'price', 'precio_unidad']);
  const commCol    = colIdx(headers, ['comision', 'comisión', 'commission', 'fees', 'gastos']);
  const currCol    = colIdx(headers, ['divisa', 'currency', 'moneda']);

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g, ''));
    const ticker = (cols[tickerCol] ?? '').trim().toUpperCase();
    if (!ticker) continue;

    const qty   = parseFloat((cols[qtyCol]   ?? '0').replace(',', '.')) || 0;
    const price = parseFloat((cols[priceCol] ?? '0').replace(',', '.')) || 0;
    if (qty <= 0 || price <= 0) continue;

    transactions.push({
      date:       parseExcelDate(cols[dateCol]).toISOString(),
      ticker,
      name:       (cols[nameCol] ?? ticker).trim(),
      assetType:  (cols[typeCol] ?? 'Acción').trim() as AssetType,
      operation:  (cols[opCol]   ?? 'Compra').trim() as OperationType,
      quantity:   qty,
      price,
      commission: parseFloat((cols[commCol] ?? '0').replace(',', '.')) || 0,
      currency:   normalizeCurrency(cols[currCol]),
    });
  }

  return transactions;
}
