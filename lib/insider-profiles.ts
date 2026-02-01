export interface InsiderProfile {
  twitterHandle?: string;
  bio?: string;
}

// Manual profile configuration for known insiders
// Add profiles as needed - key is the insider slug (lowercase, hyphenated)
export const insiderProfiles: Record<string, InsiderProfile> = {
  "svend-egil-larsen": {
    twitterHandle: "selaco",
    bio: "Svend Egil Larsen er en norsk investor og grunder av Nordic Financials AS. Han er kjent for sin aktive tilstedeværelse i det norske aksjemarkedet og deler ofte innsikt om investeringer og markedsanalyse.",
  },
};

export function getInsiderProfile(slug: string): InsiderProfile | null {
  return insiderProfiles[slug] || null;
}

export function getTwitterAvatarUrl(handle: string): string {
  return `https://unavatar.io/twitter/${handle}`;
}
