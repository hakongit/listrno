import { getTickerFromDb, saveTickerMapping, initializeTickerMappings, bootstrapTickerMappings } from "./db";
import { searchTicker } from "./prices";

// Map ISIN to Oslo Børs ticker (Yahoo Finance format: TICKER.OL)
// ISINs sourced from Finanstilsynet short positions API
export const isinToTicker: Record<string, string> = {
  // Companies with active short positions (Finanstilsynet ISINs)
  "NO0003067902": "HEX.OL",       // HEXAGON COMPOSITES
  "NO0003055501": "NOD.OL",       // NORDIC SEMICONDUCTOR
  "NO0010081235": "NEL.OL",       // NEL
  "NO0011082075": "HAUTO.OL",     // HOEGH AUTOLINERS ASA
  "NO0010571680": "WAWI.OL",      // WALLENIUS WILHELMSEN
  "NO0003078800": "TGS.OL",       // TGS ASA
  "NO0010791353": "MPCC.OL",      // MPC CONTAINER SHIPS
  "NO0010892094": "SALME.OL",     // SALMON EVOLUTION ASA
  "BMG0670A1099": "AUTO.OL",      // AUTOSTORE HOLDINGS LTD.
  "BMG173841013": "BWLPG.OL",     // BW LPG
  "BMG1466R1732": "BORR.OL",      // BORR DRILLING LIMITED
  "NO0010894231": "LINK.OL",      // LINK MOBILITY GROUP HOLDING
  "NO0013219535": "CADH.OL",      // CAVENDISH HYDROGEN ASA
  "NO0003079709": "KIT.OL",       // KITRON
  "NO0010196140": "NAS.OL",       // NORWEGIAN AIR SHUTTLE
  "NO0010345853": "AKRBP.OL",     // AKER BP
  "BMG067231032": "AGAS.OL",      // AVANCE GAS HOLDING
  "NO0010716582": "AKSO.OL",      // AKER SOLUTIONS
  "NO0010199151": "PGS.OL",       // PGS
  "NO0010715139": "SCATC.OL",     // SCATEC ASA
  "NO0003054108": "MOWI.OL",      // MOWI
  "NO0011202772": "VAR.OL",       // VÅR ENERGI ASA
  "NO0010861115": "NSKOG.OL",     // NORSKE SKOG
  "NO0005052605": "NHY.OL",       // NORSK HYDRO
  "NO0010096985": "EQNR.OL",     // EQUINOR
  "NO0010365521": "GSF.OL",       // GRIEG SEAFOOD
  "NO0010310956": "SALM.OL",      // SALMAR
  "NO0012470089": "TOM.OL",       // TOMRA SYSTEMS
  "NO0010208051": "YAR.OL",       // YARA INTERNATIONAL
  "NO0010904923": "HPUR.OL",      // HEXAGON PURUS ASA
  "NO0010816093": "ELK.OL",       // ELKEM
  "NO0010735343": "EPR.OL",       // EUROPRIS
  "NO0010808892": "CRAYN.OL",     // CRAYON GROUP HOLDING
  "BMG359472021": "FLNG.OL",      // FLEX LNG
  "NO0010816895": "OKEA.OL",      // OKEA
  "LU0075646355": "SUBC.OL",      // SUBSEA 7
  "NO0003921009": "DNO.OL",       // DNO
  "NO0010743545": "KID.OL",       // KID
  "NO0010657505": "BRG.OL",       // BORREGAARD
  "NO0010564701": "PEN.OL",       // PANORO ENERGY
  "FO0000000179": "BAKKA.OL",     // BAKKAFROST
  "NO0010714785": "NYKD.OL",      // NYKODE THERAPEUTICS ASA
  "NO0010112675": "RECSI.OL",     // REC SILICON
  "BMG850801025": "SNI.OL",       // STOLT-NIELSEN
  "NO0010379266": "BNOR.OL",      // BLUENORD ASA
  "DK0061412772": "CADLR.OL",     // CADELER A/S
  "NO0010000045": "PHO.OL",       // PHOTOCURE
  "BMG9156K1018": "2020.OL",      // 2020 BULKERS

  // Non-Finanstilsynet companies (analyst reports / insider trades)
  "NO0003733800": "ORK.OL",       // ORKLA
  "NO0003053605": "STB.OL",       // STOREBRAND
  "NO0010031479": "DNB.OL",       // DNB
  "NO0010234552": "ATEA.OL",      // ATEA
  "NO0010716863": "BELCO.OL",     // BELSHIPS
  "NO0003043309": "KOG.OL",       // KONGSBERG GRUPPEN
  "NO0010063308": "TEL.OL",       // TELENOR
  "NO0010582521": "GJF.OL",       // GJENSIDIGE FORSIKRING
  "NO0050086222": "BWE.OL",       // BW ENERGY
  "BMG3682E1921": "FRO.OL",       // FRONTLINE
  "BMG671801022": "ODL.OL",       // ODFJELL DRILLING
  "NO0010209331": "PROTCT.OL",    // PROTECTOR FORSIKRING
  "NO0003096208": "LSG.OL",       // LERØY SEAFOOD
  "BMG4233B1090": "HAFNI.OL",     // HAFNIA
  "NO0010070063": "DOF.OL",       // DOF
  "BMG7945E1057": "SFL.OL",       // SFL CORP
  "NO0010716418": "ENTRA.OL",     // ENTRA
  "NO0010840507": "PEXIP.OL",     // PEXIP
  "NO0010907090": "SMCRT.OL",     // SMARTCRAFT
  "NO0010028860": "ELMRA.OL",     // ELMERA GROUP
  "BMG396372051": "GOGL.OL",      // GOLDEN OCEAN
  "NO0003033102": "KOA.OL",       // KONGSBERG AUTOMOTIVE
  "NO0003110603": "BON.OL",       // BONHEUR
  "BMG2415R1047": "CLCO.OL",      // COOL COMPANY
  "NO0010014632": "AZT.OL",       // ARCTICZYMES
  "NO0003097503": "AKVA.OL",      // AKVA GROUP
  "NO0003078107": "AFG.OL",       // AF GRUPPEN
  "NO0010833262": "KCC.OL",       // KLAVENESS COMBINATION CARRIERS
  "NO0003080608": "SOFF.OL",      // SOLSTAD MARITIME
  "NO0006000801": "NONG.OL",      // SPAREBANK 1 NORD-NORGE
  "GB00BMXNWH07": "NE",           // NOBLE CORP (NYSE)
  // Swedish companies (Stockholm exchange)
  "SE0015988019": "NIBE-B.ST",    // NIBE
  "SE0000667891": "SAND.ST",      // SANDVIK
  "SE0000695876": "ALFA.ST",      // ALFA LAVAL
  "SE0020050417": "BOL.ST",       // BOLIDEN
  "SE0001662230": "HUSQ-B.ST",    // HUSQVARNA
  "SE0000115446": "VOLV-B.ST",    // VOLVO
  "SE0007075056": "EOLU-B.ST",    // EOLUS
};

// Reverse lookup: company name to ticker
export const companyNameToTicker: Record<string, string> = {
  "HEXAGON COMPOSITES": "HEX.OL",
  "NORDIC SEMICONDUCTOR": "NOD.OL",
  "NEL": "NEL.OL",
  "HOEGH AUTOLINERS ASA": "HAUTO.OL",
  "HØEGH AUTOLINERS ASA": "HAUTO.OL",
  "WALLENIUS WILHELMSEN": "WAWI.OL",
  "TGS ASA": "TGS.OL",
  "TGS-NOPEC GEOPHYSICAL COMPANY ASA": "TGS.OL",
  "MPC CONTAINER SHIPS": "MPCC.OL",
  "SALMON EVOLUTION ASA": "SALME.OL",
  "AUTOSTORE HOLDINGS LTD.": "AUTO.OL",
  "AUTOSTORE HOLDINGS LTD": "AUTO.OL",
  "BW LPG": "BWLPG.OL",
  "BORR DRILLING LIMITED": "BORR.OL",
  "LINK MOBILITY GROUP HOLDING": "LINK.OL",
  "LINK MOBILITY GROUP HOLDING ASA": "LINK.OL",
  "CAVENDISH HYDROGEN ASA": "CADH.OL",
  "KITRON": "KIT.OL",
  "KITRON ASA": "KIT.OL",
  "NORWEGIAN AIR SHUTTLE": "NAS.OL",
  "AKER BP": "AKRBP.OL",
  "AKER BP ASA": "AKRBP.OL",
  "AVANCE GAS HOLDING": "AGAS.OL",
  "AVANCE GAS HOLDING LTD": "AGAS.OL",
  "AKER SOLUTIONS": "AKSO.OL",
  "AKER SOLUTIONS ASA": "AKSO.OL",
  "PGS": "PGS.OL",
  "PGS ASA": "PGS.OL",
  "SCATEC ASA": "SCATC.OL",
  "SCATEC": "SCATC.OL",
  "MOWI": "MOWI.OL",
  "MOWI ASA": "MOWI.OL",
  "VÅR ENERGI": "VAR.OL",
  "VÅR ENERGI ASA": "VAR.OL",
  "VAR ENERGI ASA": "VAR.OL",
  "NORSKE SKOG": "NSKOG.OL",
  "NORSK HYDRO": "NHY.OL",
  "NORSK HYDRO ASA": "NHY.OL",
  "EQUINOR": "EQNR.OL",
  "EQUINOR ASA": "EQNR.OL",
  "GRIEG SEAFOOD": "GSF.OL",
  "SALMAR": "SALM.OL",
  "TOMRA SYSTEMS": "TOM.OL",
  "YARA INTERNATIONAL": "YAR.OL",
  "HEXAGON PURUS ASA": "HPUR.OL",
  "ELKEM": "ELK.OL",
  "EUROPRIS": "EPR.OL",
  "CRAYON GROUP HOLDING": "CRAYN.OL",
  "FLEX LNG": "FLNG.OL",
  "OKEA": "OKEA.OL",
  "SUBSEA 7": "SUBC.OL",
  "DNO": "DNO.OL",
  "KID": "KID.OL",
  "BORREGAARD": "BRG.OL",
  "PANORO ENERGY": "PEN.OL",
  "BAKKAFROST": "BAKKA.OL",
  "NYKODE THERAPEUTICS ASA": "NYKD.OL",
  "REC SILICON": "RECSI.OL",
  "STOLT-NIELSEN": "SNI.OL",
  "BLUENORD ASA": "BNOR.OL",
  "CADELER A/S": "CADLR.OL",
  "PHOTOCURE": "PHO.OL",
  // Non-Finanstilsynet companies (used by analyst reports / insider trades)
  "ORKLA": "ORK.OL",
  "ORKLA ASA": "ORK.OL",
  "STOREBRAND": "STB.OL",
  "STOREBRAND ASA": "STB.OL",
  "DNB BANK ASA": "DNB.OL",
  "DNB": "DNB.OL",
  "ATEA": "ATEA.OL",
  "ATEA ASA": "ATEA.OL",
  "BELSHIPS": "BELCO.OL",
  "BELSHIPS ASA": "BELCO.OL",
  "2020 BULKERS": "2020.OL",
  "2020 BULKERS LTD": "2020.OL",
  "KONGSBERG GRUPPEN": "KOG.OL",
  "KONGSBERG GRUPPEN ASA": "KOG.OL",
  "TELENOR": "TEL.OL",
  "TELENOR ASA": "TEL.OL",
  "GJENSIDIGE FORSIKRING": "GJF.OL",
  "GJENSIDIGE FORSIKRING ASA": "GJF.OL",
  "GJENSIDIGE": "GJF.OL",
  "BW ENERGY": "BWE.OL",
  "FRONTLINE": "FRO.OL",
  "FRONTLINE LTD": "FRO.OL",
  "ODFJELL DRILLING": "ODL.OL",
  "PROTECTOR FORSIKRING": "PROTCT.OL",
  "PROTECTOR FORSIKRING ASA": "PROTCT.OL",
  "LERØY SEAFOOD": "LSG.OL",
  "LERØY SEAFOOD GROUP": "LSG.OL",
  "LEROY SEAFOOD": "LSG.OL",
  "HAFNIA": "HAFNI.OL",
  "DOF": "DOF.OL",
  "DOF ASA": "DOF.OL",
  "SFL": "SFL.OL",
  "SFL CORP": "SFL.OL",
  "ENTRA": "ENTRA.OL",
  "ENTRA ASA": "ENTRA.OL",
  "PEXIP": "PEXIP.OL",
  "PEXIP HOLDING": "PEXIP.OL",
  "SMARTCRAFT": "SMCRT.OL",
  "SMARTCRAFT ASA": "SMCRT.OL",
  "ELMERA GROUP": "ELMRA.OL",
  "ELMERA": "ELMRA.OL",
  "GOLDEN OCEAN": "GOGL.OL",
  "GOLDEN OCEAN GROUP": "GOGL.OL",
  "KONGSBERG AUTOMOTIVE": "KOA.OL",
  "KONGSBERG AUTOMOTIVE ASA": "KOA.OL",
  "BONHEUR": "BON.OL",
  "BONHEUR ASA": "BON.OL",
  "COOL COMPANY": "CLCO.OL",
  "ARCTICZYMES": "AZT.OL",
  "ARCTICZYMES TECHNOLOGIES": "AZT.OL",
  "AKVA GROUP": "AKVA.OL",
  "AKVA GROUP ASA": "AKVA.OL",
  "AF GRUPPEN": "AFG.OL",
  "AF GRUPPEN ASA": "AFG.OL",
  "KLAVENESS COMBINATION CARRIERS": "KCC.OL",
  "SOLSTAD MARITIME": "SOFF.OL",
  "SOLSTAD OFFSHORE": "SOFF.OL",
  "SPAREBANK 1 NORD-NORGE": "NONG.OL",
  "NOBLE CORP": "NE",
  "NOBLE CORPORATION": "NE",
};

// Synchronous lookup (hardcoded maps only, no DB or network)
export function getTicker(isin: string, companyName: string): string | null {
  // Try ISIN first
  if (isinToTicker[isin]) {
    return isinToTicker[isin];
  }

  // Try company name (uppercase)
  const upperName = companyName.toUpperCase();
  if (companyNameToTicker[upperName]) {
    return companyNameToTicker[upperName];
  }

  // Try partial match
  for (const [name, ticker] of Object.entries(companyNameToTicker)) {
    if (upperName.includes(name) || name.includes(upperName)) {
      return ticker;
    }
  }

  return null;
}

// Bootstrap: ensure ticker_mappings table exists and seed with hardcoded entries
let _bootstrapped = false;
async function ensureBootstrapped(): Promise<void> {
  if (_bootstrapped) return;
  _bootstrapped = true;
  try {
    await initializeTickerMappings();
    const mappings = Object.entries(isinToTicker).map(([isin, ticker]) => ({
      isin,
      ticker,
      companyName: Object.entries(companyNameToTicker).find(([, t]) => t === ticker)?.[0] ?? undefined,
    }));
    await bootstrapTickerMappings(mappings);
  } catch {
    // DB not available (e.g. during build without credentials), skip
    _bootstrapped = false;
  }
}

// Async ticker resolution: DB → hardcoded → Yahoo Finance search → cache in DB
export async function resolveTicker(isin: string, companyName: string): Promise<string | null> {
  // 1. Fast synchronous check (hardcoded maps)
  const hardcoded = getTicker(isin, companyName);
  if (hardcoded) return hardcoded;

  // 2. DB lookup
  try {
    await ensureBootstrapped();
    if (isin) {
      const dbTicker = await getTickerFromDb(isin);
      if (dbTicker) return dbTicker;
    }
  } catch {
    // DB not available, continue to Yahoo search
  }

  // 3. Yahoo Finance search (try ISIN first, then company name)
  let resolved: string | null = null;
  if (isin) {
    resolved = await searchTicker(isin);
  }
  if (!resolved && companyName) {
    resolved = await searchTicker(companyName);
  }

  // 4. Cache successful result in DB
  if (resolved && isin) {
    try {
      await saveTickerMapping(isin, resolved, companyName || null, "yahoo-search");
    } catch {
      // DB save failed, ticker still usable this request
    }
  }

  return resolved;
}
