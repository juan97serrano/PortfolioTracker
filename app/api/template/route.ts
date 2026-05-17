// Returns the Excel template as a downloadable file generated with xlsx
export async function GET() {
  const XLSX = await import('xlsx');

  const headers = [
    'Fecha', 'Ticker', 'Nombre', 'Tipo_Activo', 'Operacion',
    'Cantidad', 'Precio', 'Comision', 'Divisa',
  ];

  const examples = [
    ['15/01/2024', 'AAPL',    'Apple Inc.',                'Acción', 'Compra', 10,   185.50, 5.00,  'USD'],
    ['20/02/2024', 'MSFT',    'Microsoft Corp.',           'Acción', 'Compra', 5,    380.00, 5.00,  'USD'],
    ['01/03/2024', 'VWRA.L',  'Vanguard FTSE All-World',  'ETF',    'Compra', 50,    95.20, 3.00,  'GBP'],
    ['10/03/2024', 'IWDA.AS', 'iShares Core MSCI World',  'ETF',    'Compra', 30,    90.10, 3.00,  'EUR'],
    ['15/04/2024', 'BTC-USD', 'Bitcoin',                  'Cripto', 'Compra',  0.5, 62000,  10.00, 'USD'],
    ['20/04/2024', 'ETH-USD', 'Ethereum',                 'Cripto', 'Compra',  2,   3100,    5.00, 'USD'],
    ['01/05/2024', 'IBE.MC',  'Iberdrola S.A.',           'Acción', 'Compra', 100,   11.50,  2.00, 'EUR'],
    ['10/05/2024', 'AAPL',    'Apple Inc.',                'Acción', 'Venta',  5,   195.00,  5.00, 'USD'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

  // Info sheet
  const infoData = [
    ['PORTFOLIO TRACKER - Plantilla de Transacciones'],
    [''],
    ['COLUMNAS REQUERIDAS:'],
    ['Fecha',       'Fecha de la operación (DD/MM/AAAA)'],
    ['Ticker',      'Símbolo del activo en Yahoo Finance (ej: AAPL, BTC-USD, VWRA.L)'],
    ['Nombre',      'Nombre descriptivo del activo'],
    ['Tipo_Activo', 'Tipo: Acción | ETF | Cripto | Bono | REIT | Otro'],
    ['Operacion',   'Tipo de operación: Compra | Venta'],
    ['Cantidad',    'Número de acciones/unidades'],
    ['Precio',      'Precio por unidad (sin incluir comisión)'],
    ['Comision',    'Comisión total pagada al broker'],
    ['Divisa',      'Moneda de la operación (EUR, USD, GBP, etc.)'],
    [''],
    ['TICKERS EN YAHOO FINANCE:'],
    ['Bolsa US (NYSE/NASDAQ)', 'AAPL, MSFT, TSLA, AMZN'],
    ['Bolsa española (BME)',   'IBE.MC, TEF.MC, SAN.MC, ITX.MC'],
    ['Bolsa alemana (XETRA)',  'SAP.DE, ASML.AS'],
    ['ETFs (London)',          'VWRA.L, IWDA.L, CSPX.L'],
    ['ETFs (Amsterdam)',       'IWDA.AS, VWCE.DE, CSPX.AS'],
    ['Criptomonedas',          'BTC-USD, ETH-USD, SOL-USD'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  return new Response(arrayBuffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="portfolio-template.xlsx"',
    },
  });
}
