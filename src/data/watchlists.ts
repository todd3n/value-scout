export type WatchItem = {
  symbol: string
  name: string
  market: 'USA' | 'UK' | 'Sverige'
}

const usa: WatchItem[] = [
  ['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'NVIDIA'], ['AMZN', 'Amazon'],
  ['GOOGL', 'Alphabet'], ['META', 'Meta'], ['BRK-B', 'Berkshire'], ['LLY', 'Eli Lilly'],
  ['AVGO', 'Broadcom'], ['JPM', 'JPMorgan'], ['TSLA', 'Tesla'], ['V', 'Visa'],
  ['MA', 'Mastercard'], ['XOM', 'Exxon'], ['UNH', 'UnitedHealth'], ['JNJ', 'J&J'],
  ['WMT', 'Walmart'], ['PG', 'P&G'], ['HD', 'Home Depot'], ['COST', 'Costco'],
  ['ABBV', 'AbbVie'], ['CVX', 'Chevron'], ['MRK', 'Merck'], ['KO', 'Coca-Cola'],
  ['PEP', 'PepsiCo'], ['BAC', 'Bank of America'], ['CRM', 'Salesforce'], ['AMD', 'AMD'],
  ['NFLX', 'Netflix'], ['ADBE', 'Adobe'], ['TMO', 'Thermo Fisher'], ['CSCO', 'Cisco'],
  ['ACN', 'Accenture'], ['MCD', "McDonald's"], ['ABT', 'Abbott'], ['WFC', 'Wells Fargo'],
  ['LIN', 'Linde'], ['DHR', 'Danaher'], ['TXN', 'Texas Instruments'], ['PM', 'Philip Morris'],
  ['IBM', 'IBM'], ['GE', 'GE Aerospace'], ['CAT', 'Caterpillar'], ['INTU', 'Intuit'],
  ['AMAT', 'Applied Materials'], ['QCOM', 'Qualcomm'], ['ISRG', 'Intuitive Surgical'], ['VZ', 'Verizon'],
  ['T', 'AT&T'], ['DIS', 'Disney'], ['PFE', 'Pfizer'], ['CMCSA', 'Comcast'],
  ['INTC', 'Intel'], ['BA', 'Boeing'], ['NKE', 'Nike'], ['UNP', 'Union Pacific'],
  ['RTX', 'RTX'], ['SPGI', 'S&P Global'], ['BKNG', 'Booking'], ['GS', 'Goldman Sachs'],
  ['MS', 'Morgan Stanley'], ['BLK', 'BlackRock'], ['AXP', 'American Express'], ['LOW', "Lowe's"],
  ['SBUX', 'Starbucks'], ['MDT', 'Medtronic'], ['GILD', 'Gilead'], ['AMGN', 'Amgen'],
  ['PLD', 'Prologis'], ['TJX', 'TJX'], ['C', 'Citigroup'], ['SCHW', 'Charles Schwab'],
  ['DE', 'Deere'], ['BMY', 'Bristol Myers'], ['CVS', 'CVS'], ['MO', 'Altria'],
  ['MMM', '3M'], ['GM', 'GM'], ['F', 'Ford'], ['UPS', 'UPS'],
  ['HON', 'Honeywell'], ['COP', 'ConocoPhillips'], ['ADI', 'Analog Devices'], ['LMT', 'Lockheed'],
  ['SYK', 'Stryker'], ['ADP', 'ADP'], ['CMCSA', 'Comcast'], ['PANW', 'Palo Alto'],
  ['NOW', 'ServiceNow'], ['UBER', 'Uber'], ['BK', 'BNY Mellon'], ['TGT', 'Target'],
  ['MU', 'Micron'], ['LRCX', 'Lam Research'], ['BX', 'Blackstone'], ['KLAC', 'KLA'],
  ['FI', 'Fiserv'], ['CB', 'Chubb'], ['SO', 'Southern'], ['DUK', 'Duke Energy'],
  ['CI', 'Cigna'], ['EQIX', 'Equinix'], ['SHW', 'Sherwin-Williams'], ['BSX', 'Boston Scientific'],
  ['ORCL', 'Oracle'], ['NEE', 'NextEra'],
].map(([symbol, name]) => ({ symbol, name, market: 'USA' as const }))

const uk: WatchItem[] = [
  ['AZN.L', 'AstraZeneca'], ['HSBA.L', 'HSBC'], ['SHEL.L', 'Shell'], ['ULVR.L', 'Unilever'],
  ['RIO.L', 'Rio Tinto'], ['RR.L', 'Rolls-Royce'], ['BATS.L', 'BAT'], ['GSK.L', 'GSK'],
  ['BP.L', 'BP'], ['BARC.L', 'Barclays'], ['LLOY.L', 'Lloyds'], ['NG.L', 'National Grid'],
  ['REL.L', 'RELX'], ['NWG.L', 'NatWest'], ['BA.L', 'BAE Systems'], ['GLEN.L', 'Glencore'],
  ['LSEG.L', 'LSEG'], ['CPG.L', 'Compass'], ['STAN.L', 'Standard Chartered'], ['RKT.L', 'Reckitt'],
  ['DGE.L', 'Diageo'], ['HLN.L', 'Haleon'], ['III.L', '3i'], ['ANTO.L', 'Antofagasta'],
  ['AAL.L', 'Anglo American'], ['EXPN.L', 'Experian'], ['CCEP.L', 'CCEP'], ['PRU.L', 'Prudential'],
  ['TSCO.L', 'Tesco'], ['SSE.L', 'SSE'], ['IMB.L', 'Imperial Brands'], ['FRES.L', 'Fresnillo'],
  ['VOD.L', 'Vodafone'], ['AHT.L', 'Ashtead'], ['AV.L', 'Aviva'], ['IAG.L', 'IAG'],
  ['BT-A.L', 'BT'], ['IHG.L', 'IHG'], ['NXT.L', 'Next'], ['ABF.L', 'AB Foods'],
  ['LGEN.L', 'Legal & General'], ['CCH.L', 'Coca-Cola HBC'], ['HLMA.L', 'Halma'], ['SMT.L', 'Scottish Mortgage'],
  ['AAF.L', 'Airtel Africa'], ['INF.L', 'Informa'], ['RTO.L', 'Rentokil'], ['SN.L', 'Smith & Nephew'],
  ['SGE.L', 'Sage'], ['EDV.L', 'Endeavour'], ['ADM.L', 'Admiral'], ['SGRO.L', 'SEGRO'],
  ['SVT.L', 'Severn Trent'], ['UU.L', 'United Utilities'], ['CNA.L', 'Centrica'], ['SMIN.L', 'Smiths'],
  ['WEIR.L', 'Weir'], ['MRO.L', 'Melrose'], ['PHNX.L', 'Phoenix'], ['DPLM.L', 'Diploma'],
  ['STJ.L', "St James's Place"], ['SBRY.L', 'Sainsbury'], ['ITRK.L', 'Intertek'], ['MNG.L', 'M&G'],
  ['BNZL.L', 'Bunzl'], ['PSON.L', 'Pearson'], ['MKS.L', 'Marks & Spencer'], ['GAW.L', 'Games Workshop'],
  ['BAB.L', 'Babcock'], ['SDR.L', 'Schroders'], ['IMI.L', 'IMI'], ['ICG.L', 'ICG'],
  ['KGF.L', 'Kingfisher'], ['BTRW.L', 'Barratt Redrow'], ['AUTO.L', 'Auto Trader'], ['SPX.L', 'Spirax'],
  ['BEZ.L', 'Beazley'], ['ENT.L', 'Entain'], ['CTEC.L', 'Convatec'], ['HSX.L', 'Hiscox'],
  ['BRBY.L', 'Burberry'], ['DCC.L', 'DCC'], ['LAND.L', 'Land Securities'], ['HWDN.L', 'Howden'],
  ['LMP.L', 'LondonMetric'], ['WTB.L', 'Whitbread'], ['PSN.L', 'Persimmon'], ['JD.L', 'JD Sports'],
  ['RMV.L', 'Rightmove'], ['MNDI.L', 'Mondi'], ['CRDA.L', 'Croda'], ['EZJ.L', 'easyJet'],
  ['BKG.L', 'Berkeley'], ['WPP.L', 'WPP'], ['HIK.L', 'Hikma'], ['TW.L', 'Taylor Wimpey'],
  ['PSH.L', 'Pershing Square'], ['FCIT.L', 'F&C Trust'], ['PCT.L', 'Polar Capital'], ['ALW.L', 'Alliance Witan'],
  ['OCDO.L', 'Ocado'],
].map(([symbol, name]) => ({ symbol, name, market: 'UK' as const }))

/** Stockholm large/mid liquid names (~100). */
const sweden: WatchItem[] = [
  ['ABB.ST', 'ABB'], ['ADDT-B.ST', 'Addtech'], ['ALFA.ST', 'Alfa Laval'], ['ASSA-B.ST', 'Assa Abloy'],
  ['AZN.ST', 'AstraZeneca'], ['ATCO-A.ST', 'Atlas Copco A'], ['ATCO-B.ST', 'Atlas Copco B'], ['BOL.ST', 'Boliden'],
  ['EPI-A.ST', 'Epiroc A'], ['EPI-B.ST', 'Epiroc B'], ['EQT.ST', 'EQT'], ['ERIC-B.ST', 'Ericsson'],
  ['ESSITY-B.ST', 'Essity'], ['EVO.ST', 'Evolution'], ['SHB-A.ST', 'Handelsbanken'], ['HM-B.ST', 'H&M'],
  ['HEXA-B.ST', 'Hexagon'], ['INDU-C.ST', 'Industrivärden'], ['INVE-B.ST', 'Investor'], ['LIFCO-B.ST', 'Lifco'],
  ['NIBE-B.ST', 'Nibe'], ['NDA-SE.ST', 'Nordea'], ['SAAB-B.ST', 'Saab'], ['SAND.ST', 'Sandvik'],
  ['SCA-B.ST', 'SCA'], ['SEB-A.ST', 'SEB'], ['SKA-B.ST', 'Skanska'], ['SKF-B.ST', 'SKF'],
  ['SWED-A.ST', 'Swedbank'], ['TEL2-B.ST', 'Tele2'], ['TELIA.ST', 'Telia'], ['VOLV-B.ST', 'Volvo'],
  ['CAST.ST', 'Castellum'], ['EMBRAC-B.ST', 'Embracer'], ['SINCH.ST', 'Sinch'], ['SBB-B.ST', 'SBB'],
  ['BALCO.ST', 'Balco'], ['KINV-B.ST', 'Kinnevik'], ['LATO-B.ST', 'Latour'], ['LUMI.ST', 'Lundin Mining'],
  ['LUND-B.ST', 'Lundbergföretagen'], ['INDT.ST', 'Indutrade'], ['TREL-B.ST', 'Trelleborg'], ['GETI-B.ST', 'Getinge'],
  ['EKTA-B.ST', 'Elekta'], ['HUSQ-B.ST', 'Husqvarna'], ['HOLM-B.ST', 'Holmen'], ['SSAB-B.ST', 'SSAB'],
  ['SSAB-A.ST', 'SSAB A'], ['ALIV-SDB.ST', 'Autoliv'], ['THULE.ST', 'Thule'], ['DOM.ST', 'Dometic'],
  ['BILL.ST', 'Billerud'], ['STORY-B.ST', 'Storytel'], ['PARG.ST', 'Pandox'], ['FABG.ST', 'Fabege'],
  ['WIHL.ST', 'Wihlborgs'], ['BALD-B.ST', 'Balder'], ['WALL-B.ST', 'Wallenstam'], ['HUFV-A.ST', 'Hufvudstaden'],
  ['INTRUM.ST', 'Intrum'], ['SECU-B.ST', 'Securitas'], ['LOOMIS.ST', 'Loomis'], ['BEIJ-B.ST', 'Beijer Ref'],
  ['SAVE.ST', 'Nordic Leisure'], ['MIPS.ST', 'MIPS'], ['TRUE-B.ST', 'Truecaller'], ['KARO.ST', 'Karolinska'],
  ['BIOA-B.ST', 'BioArctic'], ['SOBI.ST', 'Sobi'], ['SECARE.ST', 'Sectra'], ['CAMX.ST', 'Camurus'],
  ['VIT-B.ST', 'Vitrolife'], ['AAA.ST', 'AAK'], ['AXFO.ST', 'Axfood'], ['ICA.ST', 'ICA'],
  ['CLAS-B.ST', 'Clas Ohlson'], ['JM.ST', 'JM'], ['NCC-B.ST', 'NCC'], ['PEAB-B.ST', 'Peab'],
  ['BONEX.ST', 'BoneSupport'], ['SHOT.ST', 'Scandi Standard'], ['BICO.ST', 'BICO'], ['CINT.ST', 'Cint'],
  ['FNOX.ST', 'Fortnox'], ['LIME.ST', 'Lime'], ['PDX.ST', 'Paradox'], ['SF.ST', 'Stillfront'],
  ['BHG.ST', 'BHG'], ['BOOZT.ST', 'Boozt'], ['CDON.ST', 'CDON'], ['NELLY.ST', 'Nelly'],
  ['SAS.ST', 'SAS'], ['SWMA.ST', 'Swedish Match'], ['TROAX.ST', 'Troax'], ['VBG-B.ST', 'VBG'],
  ['BUFAB.ST', 'Bufab'], ['OEM-B.ST', 'OEM'], ['SYSR.ST', 'Systemair'], ['NOTE.ST', 'NOTE'],
  ['XVIVO.ST', 'Xvivo'], ['MEDICA.ST', 'Medicover'], ['BIOG-B.ST', 'BioGaia'], ['KAR.ST', 'Karnov'],
].map(([symbol, name]) => ({ symbol, name, market: 'Sverige' as const }))

function dedupe(list: WatchItem[]): WatchItem[] {
  const seen = new Set<string>()
  return list.filter((i) => {
    if (seen.has(i.symbol)) return false
    seen.add(i.symbol)
    return true
  })
}

export const WATCHLISTS = {
  usa: dedupe(usa).slice(0, 100),
  uk: dedupe(uk).slice(0, 100),
  sweden: dedupe(sweden).slice(0, 100),
} as const

export type ListKey = keyof typeof WATCHLISTS | 'all'

export function resolveWatchlist(key: ListKey): WatchItem[] {
  if (key === 'all') {
    return dedupe([...WATCHLISTS.usa, ...WATCHLISTS.uk, ...WATCHLISTS.sweden])
  }
  return WATCHLISTS[key]
}
