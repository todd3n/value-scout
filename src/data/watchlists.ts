export type WatchItem = {
  symbol: string
  name: string
  market: 'USA' | 'UK' | 'Sverige'
}

/** Large-cap universes — Yahoo tickers for USA, UK (.L) and Sweden (.ST). */
export const WATCHLISTS = {
  sweden: [
    { symbol: 'ABB.ST', name: 'ABB', market: 'Sverige' },
    { symbol: 'ADDT-B.ST', name: 'Addtech B', market: 'Sverige' },
    { symbol: 'ALFA.ST', name: 'Alfa Laval', market: 'Sverige' },
    { symbol: 'ASSA-B.ST', name: 'Assa Abloy B', market: 'Sverige' },
    { symbol: 'AZN.ST', name: 'AstraZeneca', market: 'Sverige' },
    { symbol: 'ATCO-A.ST', name: 'Atlas Copco A', market: 'Sverige' },
    { symbol: 'BOL.ST', name: 'Boliden', market: 'Sverige' },
    { symbol: 'EPI-A.ST', name: 'Epiroc A', market: 'Sverige' },
    { symbol: 'EQT.ST', name: 'EQT', market: 'Sverige' },
    { symbol: 'ERIC-B.ST', name: 'Ericsson B', market: 'Sverige' },
    { symbol: 'ESSITY-B.ST', name: 'Essity B', market: 'Sverige' },
    { symbol: 'EVO.ST', name: 'Evolution', market: 'Sverige' },
    { symbol: 'SHB-A.ST', name: 'Handelsbanken A', market: 'Sverige' },
    { symbol: 'HM-B.ST', name: 'H&M B', market: 'Sverige' },
    { symbol: 'HEXA-B.ST', name: 'Hexagon B', market: 'Sverige' },
    { symbol: 'INDU-C.ST', name: 'Industrivärden C', market: 'Sverige' },
    { symbol: 'INVE-B.ST', name: 'Investor B', market: 'Sverige' },
    { symbol: 'LIFCO-B.ST', name: 'Lifco B', market: 'Sverige' },
    { symbol: 'NIBE-B.ST', name: 'Nibe B', market: 'Sverige' },
    { symbol: 'NDA-SE.ST', name: 'Nordea', market: 'Sverige' },
    { symbol: 'SAAB-B.ST', name: 'Saab B', market: 'Sverige' },
    { symbol: 'SAND.ST', name: 'Sandvik', market: 'Sverige' },
    { symbol: 'SCA-B.ST', name: 'SCA B', market: 'Sverige' },
    { symbol: 'SEB-A.ST', name: 'SEB A', market: 'Sverige' },
    { symbol: 'SKA-B.ST', name: 'Skanska B', market: 'Sverige' },
    { symbol: 'SKF-B.ST', name: 'SKF B', market: 'Sverige' },
    { symbol: 'SWED-A.ST', name: 'Swedbank A', market: 'Sverige' },
    { symbol: 'TEL2-B.ST', name: 'Tele2 B', market: 'Sverige' },
    { symbol: 'TELIA.ST', name: 'Telia', market: 'Sverige' },
    { symbol: 'VOLV-B.ST', name: 'Volvo B', market: 'Sverige' },
  ] as WatchItem[],

  uk: [
    { symbol: 'HSBA.L', name: 'HSBC', market: 'UK' },
    { symbol: 'AZN.L', name: 'AstraZeneca', market: 'UK' },
    { symbol: 'SHEL.L', name: 'Shell', market: 'UK' },
    { symbol: 'ULVR.L', name: 'Unilever', market: 'UK' },
    { symbol: 'RIO.L', name: 'Rio Tinto', market: 'UK' },
    { symbol: 'BATS.L', name: 'British American Tobacco', market: 'UK' },
    { symbol: 'BP.L', name: 'BP', market: 'UK' },
    { symbol: 'GSK.L', name: 'GSK', market: 'UK' },
    { symbol: 'DGE.L', name: 'Diageo', market: 'UK' },
    { symbol: 'REL.L', name: 'RELX', market: 'UK' },
    { symbol: 'LLOY.L', name: 'Lloyds', market: 'UK' },
    { symbol: 'NG.L', name: 'National Grid', market: 'UK' },
    { symbol: 'GLEN.L', name: 'Glencore', market: 'UK' },
    { symbol: 'BA.L', name: 'BAE Systems', market: 'UK' },
    { symbol: 'NWG.L', name: 'NatWest', market: 'UK' },
    { symbol: 'CPG.L', name: 'Compass Group', market: 'UK' },
    { symbol: 'BARC.L', name: 'Barclays', market: 'UK' },
    { symbol: 'AAL.L', name: 'Anglo American', market: 'UK' },
    { symbol: 'RR.L', name: 'Rolls-Royce', market: 'UK' },
    { symbol: 'EXPN.L', name: 'Experian', market: 'UK' },
    { symbol: 'LSEG.L', name: 'London Stock Exchange', market: 'UK' },
    { symbol: 'RKT.L', name: 'Reckitt', market: 'UK' },
    { symbol: 'PRU.L', name: 'Prudential', market: 'UK' },
    { symbol: 'VOD.L', name: 'Vodafone', market: 'UK' },
    { symbol: 'TSCO.L', name: 'Tesco', market: 'UK' },
    { symbol: 'SSE.L', name: 'SSE', market: 'UK' },
    { symbol: 'III.L', name: '3i Group', market: 'UK' },
    { symbol: 'STAN.L', name: 'Standard Chartered', market: 'UK' },
    { symbol: 'IMB.L', name: 'Imperial Brands', market: 'UK' },
    { symbol: 'AHT.L', name: 'Ashtead', market: 'UK' },
    { symbol: 'ANTO.L', name: 'Antofagasta', market: 'UK' },
    { symbol: 'BT-A.L', name: 'BT Group', market: 'UK' },
    { symbol: 'SGE.L', name: 'Sage', market: 'UK' },
    { symbol: 'WPP.L', name: 'WPP', market: 'UK' },
    { symbol: 'LAND.L', name: 'Land Securities', market: 'UK' },
    { symbol: 'SBRY.L', name: 'Sainsbury', market: 'UK' },
    { symbol: 'MNDI.L', name: 'Mondi', market: 'UK' },
    { symbol: 'INF.L', name: 'Informa', market: 'UK' },
    { symbol: 'HLN.L', name: 'Haleon', market: 'UK' },
    { symbol: 'CNA.L', name: 'Centrica', market: 'UK' },
  ] as WatchItem[],

  usa: [
    { symbol: 'AAPL', name: 'Apple', market: 'USA' },
    { symbol: 'MSFT', name: 'Microsoft', market: 'USA' },
    { symbol: 'NVDA', name: 'NVIDIA', market: 'USA' },
    { symbol: 'AMZN', name: 'Amazon', market: 'USA' },
    { symbol: 'GOOGL', name: 'Alphabet', market: 'USA' },
    { symbol: 'META', name: 'Meta', market: 'USA' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway', market: 'USA' },
    { symbol: 'LLY', name: 'Eli Lilly', market: 'USA' },
    { symbol: 'AVGO', name: 'Broadcom', market: 'USA' },
    { symbol: 'JPM', name: 'JPMorgan Chase', market: 'USA' },
    { symbol: 'TSLA', name: 'Tesla', market: 'USA' },
    { symbol: 'V', name: 'Visa', market: 'USA' },
    { symbol: 'MA', name: 'Mastercard', market: 'USA' },
    { symbol: 'XOM', name: 'Exxon Mobil', market: 'USA' },
    { symbol: 'UNH', name: 'UnitedHealth', market: 'USA' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', market: 'USA' },
    { symbol: 'WMT', name: 'Walmart', market: 'USA' },
    { symbol: 'PG', name: 'Procter & Gamble', market: 'USA' },
    { symbol: 'HD', name: 'Home Depot', market: 'USA' },
    { symbol: 'COST', name: 'Costco', market: 'USA' },
    { symbol: 'ABBV', name: 'AbbVie', market: 'USA' },
    { symbol: 'CVX', name: 'Chevron', market: 'USA' },
    { symbol: 'MRK', name: 'Merck', market: 'USA' },
    { symbol: 'KO', name: 'Coca-Cola', market: 'USA' },
    { symbol: 'PEP', name: 'PepsiCo', market: 'USA' },
    { symbol: 'BAC', name: 'Bank of America', market: 'USA' },
    { symbol: 'CRM', name: 'Salesforce', market: 'USA' },
    { symbol: 'AMD', name: 'AMD', market: 'USA' },
    { symbol: 'NFLX', name: 'Netflix', market: 'USA' },
    { symbol: 'ADBE', name: 'Adobe', market: 'USA' },
    { symbol: 'TMO', name: 'Thermo Fisher', market: 'USA' },
    { symbol: 'CSCO', name: 'Cisco', market: 'USA' },
    { symbol: 'ACN', name: 'Accenture', market: 'USA' },
    { symbol: 'MCD', name: 'McDonald\'s', market: 'USA' },
    { symbol: 'ABT', name: 'Abbott', market: 'USA' },
    { symbol: 'WFC', name: 'Wells Fargo', market: 'USA' },
    { symbol: 'LIN', name: 'Linde', market: 'USA' },
    { symbol: 'DHR', name: 'Danaher', market: 'USA' },
    { symbol: 'TXN', name: 'Texas Instruments', market: 'USA' },
    { symbol: 'PM', name: 'Philip Morris', market: 'USA' },
    { symbol: 'IBM', name: 'IBM', market: 'USA' },
    { symbol: 'GE', name: 'GE Aerospace', market: 'USA' },
    { symbol: 'CAT', name: 'Caterpillar', market: 'USA' },
    { symbol: 'INTU', name: 'Intuit', market: 'USA' },
    { symbol: 'AMAT', name: 'Applied Materials', market: 'USA' },
    { symbol: 'QCOM', name: 'Qualcomm', market: 'USA' },
    { symbol: 'ISRG', name: 'Intuitive Surgical', market: 'USA' },
    { symbol: 'VZ', name: 'Verizon', market: 'USA' },
    { symbol: 'T', name: 'AT&T', market: 'USA' },
    { symbol: 'DIS', name: 'Disney', market: 'USA' },
    { symbol: 'PFE', name: 'Pfizer', market: 'USA' },
    { symbol: 'CMCSA', name: 'Comcast', market: 'USA' },
    { symbol: 'INTC', name: 'Intel', market: 'USA' },
    { symbol: 'BA', name: 'Boeing', market: 'USA' },
    { symbol: 'NKE', name: 'Nike', market: 'USA' },
    { symbol: 'UNP', name: 'Union Pacific', market: 'USA' },
    { symbol: 'RTX', name: 'RTX', market: 'USA' },
    { symbol: 'SPGI', name: 'S&P Global', market: 'USA' },
    { symbol: 'BKNG', name: 'Booking', market: 'USA' },
    { symbol: 'GS', name: 'Goldman Sachs', market: 'USA' },
    { symbol: 'MS', name: 'Morgan Stanley', market: 'USA' },
    { symbol: 'BLK', name: 'BlackRock', market: 'USA' },
    { symbol: 'AXP', name: 'American Express', market: 'USA' },
    { symbol: 'LOW', name: 'Lowe\'s', market: 'USA' },
    { symbol: 'SBUX', name: 'Starbucks', market: 'USA' },
    { symbol: 'MDT', name: 'Medtronic', market: 'USA' },
    { symbol: 'GILD', name: 'Gilead', market: 'USA' },
    { symbol: 'AMGN', name: 'Amgen', market: 'USA' },
    { symbol: 'PLD', name: 'Prologis', market: 'USA' },
    { symbol: 'TJX', name: 'TJX', market: 'USA' },
    { symbol: 'C', name: 'Citigroup', market: 'USA' },
    { symbol: 'SCHW', name: 'Charles Schwab', market: 'USA' },
    { symbol: 'DE', name: 'Deere', market: 'USA' },
    { symbol: 'BMY', name: 'Bristol Myers', market: 'USA' },
    { symbol: 'CVS', name: 'CVS Health', market: 'USA' },
    { symbol: 'MO', name: 'Altria', market: 'USA' },
    { symbol: 'MMM', name: '3M', market: 'USA' },
    { symbol: 'GM', name: 'General Motors', market: 'USA' },
    { symbol: 'F', name: 'Ford', market: 'USA' },
  ] as WatchItem[],
} as const

export type ListKey = keyof typeof WATCHLISTS | 'all'

export function resolveWatchlist(key: ListKey): WatchItem[] {
  if (key === 'all') {
    const seen = new Set<string>()
    const out: WatchItem[] = []
    for (const list of Object.values(WATCHLISTS)) {
      for (const item of list) {
        if (seen.has(item.symbol)) continue
        seen.add(item.symbol)
        out.push(item)
      }
    }
    return out
  }
  const list = WATCHLISTS[key]
  const seen = new Set<string>()
  return list.filter((i) => {
    if (seen.has(i.symbol)) return false
    seen.add(i.symbol)
    return true
  })
}
