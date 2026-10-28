export interface CivicAuthority {
  authorityName: string;
  simulatedEmail: string;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  localities: string;
}

/**
 * 8 Official Municipal Administrative Zones of Bengaluru (BBMP).
 * Kept consistent across address collection and municipal routing.
 */
export const BENGALURU_ZONES: ZoneDefinition[] = [
  {
    id: 'East Zone',
    name: 'East Zone',
    localities: 'Indiranagar, Halasuru, Cox Town, CV Raman Nagar',
  },
  {
    id: 'West Zone',
    name: 'West Zone',
    localities: 'Malleshwaram, Rajajinagar, Gandhinagar',
  },
  {
    id: 'South Zone',
    name: 'South Zone',
    localities: 'Jayanagar, Basavanagudi, Padmanabhanagar, JP Nagar',
  },
  {
    id: 'Bommanahalli Zone',
    name: 'Bommanahalli Zone',
    localities: 'Koramangala, HSR Layout, BTM Layout',
  },
  {
    id: 'Mahadevapura Zone',
    name: 'Mahadevapura Zone',
    localities: 'Whitefield, Bellandur, Marathahalli, KR Puram',
  },
  {
    id: 'RR Nagar Zone',
    name: 'RR Nagar Zone',
    localities: 'Rajarajeshwari Nagar, Kengeri, Nayandahalli',
  },
  {
    id: 'Yelahanka Zone',
    name: 'Yelahanka Zone',
    localities: 'Yelahanka, Hebbal, Vidyaranyapura',
  },
  {
    id: 'Dasarahalli Zone',
    name: 'Dasarahalli Zone',
    localities: 'Peenya, T Dasarahalli, Bagalgunte',
  },
];

/**
 * Hardcoded civic authority mapping for Bengaluru categories.
 * All email addresses are simulated placeholder addresses for demonstration purposes.
 */
export const AUTHORITY_MAPPING: Record<string, CivicAuthority> = {
  Garbage: {
    authorityName: 'BBMP Solid Waste Management, Zone Office',
    simulatedEmail: 'swm-zone@example-bbmp.gov.in',
  },
  Potholes: {
    authorityName: 'BBMP Road Infrastructure & Major Roads Division',
    simulatedEmail: 'roads-infrastructure@example-bbmp.gov.in',
  },
  Streetlights: {
    authorityName: 'BESCOM & BBMP Public Lighting Cell',
    simulatedEmail: 'streetlights-maintenance@example-bescom.gov.in',
  },
  'Water Leakage': {
    authorityName: 'BWSSB Water Supply & Sewerage Board, Local Sub-Division',
    simulatedEmail: 'waterleak-complaints@example-bwssb.gov.in',
  },
};

/**
 * Returns the relevant civic authority for a given category with a safe fallback,
 * optionally customizing with the zonal division if supplied.
 */
export function getAuthorityForCategory(category: string, zone?: string): CivicAuthority {
  const base = AUTHORITY_MAPPING[category] || {
    authorityName: 'Bruhat Bengaluru Mahanagara Palike (BBMP) Grievance Cell',
    simulatedEmail: 'grievances@example-bbmp.gov.in',
  };

  if (!zone) {
    return base;
  }

  return {
    authorityName: `${base.authorityName} (${zone})`,
    simulatedEmail: base.simulatedEmail,
  };
}
