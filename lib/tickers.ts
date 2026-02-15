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
};

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
