// Tutto ciò che il sito pubblico mostra e che non è un'auto: si modifica da
// /admin/sito. I valori di partenza stanno in config/site.ts.

export interface SiteStat {
  value: string;
  label: string;
}

export interface SiteReview {
  author: string;
  city: string;
  car: string;
  quote: string;
}

export interface SiteService {
  title: string;
  tagline: string;
  badge: string;
  description: string;
  highlights: string[];
}

export interface SiteSettings {
  // Azienda
  companyName: string;
  tagline: string;
  vatNumber: string;
  legalAddress: string;
  footerText: string;

  // Contatti
  phone: string;
  email: string;
  location: string;
  hours: string;
  hoursNote: string;
  instagramUrl: string;
  instagramHandle: string;
  facebookUrl: string;
  facebookLabel: string;

  // Home
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;

  // Servizi (sempre tre, nell'ordine della pagina)
  services: SiteService[];

  // Chi siamo
  aboutTitle: string;
  aboutText: string;
  aboutBullets: string[];
  aboutCaptionTitle: string;
  aboutCaptionText: string;
  mapsUrl: string;
  showStats: boolean;
  stats: SiteStat[];
  showReviews: boolean;
  reviews: SiteReview[];
}
