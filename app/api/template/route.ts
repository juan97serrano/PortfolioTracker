// Returns the Excel template as a downloadable file generated with xlsx
export async function GET() {
  const XLSX = await import('xlsx');

  const headers = [
    'Fecha', 'Ticker', 'Nombre', 'Tipo_Activo', 'Operacion',
    'Cantidad', 'Precio', 'Comision', 'Divisa',
  ];

  const examples = [
    // === Posiciones cerradas en años anteriores (sirven para calcular el rendimiento anual) ===
    ['10/03/2022', 'NFLX',    'Netflix Inc.',              'Acción', 'Compra', 8,    350.00, 5.00,  'USD'],
    ['15/11/2022', 'NFLX',    'Netflix Inc.',              'Acción', 'Venta',  8,    295.00, 5.00,  'USD'],
    ['05/04/2022', 'TSLA',    'Tesla Inc.',                'Acción', 'Compra', 5,    280.00, 5.00,  'USD'],
    ['20/12/2022', 'TSLA',    'Tesla Inc.',                'Acción', 'Venta',  5,    340.00, 5.00,  'USD'],
    ['12/01/2023', 'META',    'Meta Platforms',            'Acción', 'Compra', 10,   140.00, 5.00,  'USD'],
    ['18/10/2023', 'META',    'Meta Platforms',            'Acción', 'Venta',  10,   320.00, 5.00,  'USD'],
    ['25/02/2023', 'GOOGL',   'Alphabet Inc.',             'Acción', 'Compra', 12,    95.00, 5.00,  'USD'],
    ['10/12/2023', 'GOOGL',   'Alphabet Inc.',             'Acción', 'Venta',  12,   135.00, 5.00,  'USD'],

    // === Posiciones abiertas (rendimiento actual con precios de mercado) ===
    ['15/01/2024', 'AAPL',    'Apple Inc.',                'Acción', 'Compra', 10,   185.50, 5.00,  'USD'],
    ['20/02/2024', 'MSFT',    'Microsoft Corp.',           'Acción', 'Compra', 5,    380.00, 5.00,  'USD'],
    ['01/03/2024', 'VWRA.L',  'Vanguard FTSE All-World',  'ETF',    'Compra', 50,    95.20, 3.00,  'GBP'],
    ['10/03/2024', 'IWDA.AS', 'iShares Core MSCI World',  'ETF',    'Compra', 30,    90.10, 3.00,  'EUR'],
    ['15/04/2024', 'BTC-USD', 'Bitcoin',                  'Cripto', 'Compra',  0.5, 62000,  10.00, 'USD'],
    ['20/04/2024', 'ETH-USD', 'Ethereum',                 'Cripto', 'Compra',  2,   3100,    5.00, 'USD'],
    ['01/05/2024', 'IBE.MC',  'Iberdrola S.A.',           'Acción', 'Compra', 100,   11.50,  2.00, 'EUR'],

    // === Posición parcialmente vendida (lo no vendido sigue como posición abierta) ===
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
    [''],
    ['RENDIMIENTO ANUAL:'],
    ['',                       'Cada venta cierra una posición y genera rentabilidad realizada.'],
    ['',                       'El año de la venta determina en qué año se contabiliza.'],
    ['',                       'Las compras se emparejan con las ventas usando FIFO (primero entra, primero sale).'],
    ['',                       'Para registrar una operación pasada: añade la compra con su fecha original'],
    ['',                       'y la venta con la fecha en que cerraste la posición — la app calcula el rendimiento'],
    ['',                       'realizado de ese año y la rentabilidad media de toda tu historia inversora.'],
    [''],
    ['POSICIONES ABIERTAS vs CERRADAS:'],
    ['Abiertas',               'Activos que sigues teniendo. La rentabilidad usa el precio actual del mercado.'],
    ['Cerradas',               'Compras + ventas emparejadas. La rentabilidad es definitiva (realizada).'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as
    | Uint8Array
    | ArrayBuffer;

  // xlsx may return an ArrayBuffer directly or a Uint8Array depending on version
  const body =
    out instanceof Uint8Array
      ? out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
      : out;

  return new Response(body as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="portfolio-template.xlsx"',
    },
  });
}
