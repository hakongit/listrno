// Map ISIN to Oslo Børs ticker (Yahoo Finance format: TICKER.OL)
export const isinToTicker: Record<string, string> = {
  "NO0003067902": "NAS.OL",      // NORDIC SEMICONDUCTOR
  "NO0010081235": "NEL.OL",      // NEL
  "NO0003079709": "HEX.OL",      // HEXAGON COMPOSITES
  "NO0010571680": "HAUTO.OL",    // HØEGH AUTOLINERS
  "BMG8788W1079": "TGS.OL",      // TGS ASA
  "CY0101162119": "MPCC.OL",     // MPC CONTAINER SHIPS
  "NO0010892094": "SALME.OL",    // SALMON EVOLUTION
  "BMG0670A1099": "AUTO.OL",     // AUTOSTORE
  "BMG1466R1732": "BWLPG.OL",    // BW LPG
  "NO0010823131": "LINK.OL",     // LINK MOBILITY
  "NO0012929155": "CADH.OL",     // CAVENDISH HYDROGEN
  "NO0010360266": "KIT.OL",      // KITRON
  "NO0010196140": "ORK.OL",      // ORKLA
  "NO0003399909": "AKRBP.OL",    // AKER BP
  "NO0010844038": "AGAS.OL",     // AVANCE GAS
  "NO0010715139": "AKSO.OL",     // AKER SOLUTIONS
  "NO0003078800": "PGS.OL",      // PGS
  "NO0010716863": "BELCO.OL",    // BELSHIPS
  "NO0010208051": "MOWI.OL",     // MOWI
  "NO0012470089": "VAR.OL",      // VÅR ENERGI
  "NO0010861115": "HADEAN.OL",   // HADEAN VENTURES
  "NO0003054108": "STB.OL",      // STOREBRAND
  "NO0010031479": "DNB.OL",      // DNB
  "NO0003733800": "NHY.OL",      // NORSK HYDRO
  "NO0010096985": "EQN.OL",      // EQUINOR
  "NO0010365521": "ATEA.OL",     // ATEA
  "NO0010310956": "SCATC.OL",    // SCATEC
};

// Reverse lookup: company name to ticker
export const companyNameToTicker: Record<string, string> = {
  "NORDIC SEMICONDUCTOR": "NAS.OL",
  "NEL": "NEL.OL",
  "HEXAGON COMPOSITES": "HEX.OL",
  "HOEGH AUTOLINERS ASA": "HAUTO.OL",
  "HØEGH AUTOLINERS ASA": "HAUTO.OL",
  "TGS ASA": "TGS.OL",
  "TGS-NOPEC GEOPHYSICAL COMPANY ASA": "TGS.OL",
  "MPC CONTAINER SHIPS": "MPCC.OL",
  "SALMON EVOLUTION ASA": "SALME.OL",
  "AUTOSTORE HOLDINGS LTD.": "AUTO.OL",
  "AUTOSTORE HOLDINGS LTD": "AUTO.OL",
  "BW LPG": "BWLPG.OL",
  "LINK MOBILITY GROUP HOLDING": "LINK.OL",
  "LINK MOBILITY GROUP HOLDING ASA": "LINK.OL",
  "CAVENDISH HYDROGEN ASA": "CADH.OL",
  "KITRON": "KIT.OL",
  "KITRON ASA": "KIT.OL",
  "ORKLA": "ORK.OL",
  "ORKLA ASA": "ORK.OL",
  "AKER BP": "AKRBP.OL",
  "AKER BP ASA": "AKRBP.OL",
  "AVANCE GAS HOLDING LTD": "AGAS.OL",
  "AKER SOLUTIONS": "AKSO.OL",
  "AKER SOLUTIONS ASA": "AKSO.OL",
  "PGS": "PGS.OL",
  "PGS ASA": "PGS.OL",
  "BELSHIPS": "BELCO.OL",
  "BELSHIPS ASA": "BELCO.OL",
  "MOWI": "MOWI.OL",
  "MOWI ASA": "MOWI.OL",
  "VÅR ENERGI": "VAR.OL",
  "VAR ENERGI ASA": "VAR.OL",
  "STOREBRAND": "STB.OL",
  "STOREBRAND ASA": "STB.OL",
  "DNB BANK ASA": "DNB.OL",
  "NORSK HYDRO": "NHY.OL",
  "NORSK HYDRO ASA": "NHY.OL",
  "EQUINOR": "EQN.OL",
  "EQUINOR ASA": "EQN.OL",
  "ATEA": "ATEA.OL",
  "ATEA ASA": "ATEA.OL",
  "SCATEC": "SCATC.OL",
  "SCATEC ASA": "SCATC.OL",
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
