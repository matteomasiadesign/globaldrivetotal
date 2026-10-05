export type FuelType = "Benzina" | "Diesel" | "Ibrida" | "Elettrica";
export type TransmissionType = "Automatico" | "Manuale";
export type CategoryType =
  | "Utilitaria"
  | "Berlina"
  | "SUV"
  | "Station Wagon"
  | "Monovolume"
  | "Coupé"
  | "Cabrio"
  | "Sportiva";
export type CarStatus = "Disponibile" | "In Trattativa" | "Venduta";

export interface Car {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  mileage: number; // in km
  price: number;
  fuel: FuelType;
  transmission: TransmissionType;
  power: number; // in CV
  category: CategoryType;
  images: string[];
  featured: boolean;
  hidden?: boolean;
  status: CarStatus;
  description: string;
  features: string[];
  location: string;
  createdAt: string;
}

export interface FilterState {
  search: string;
  brand: string;
  category: string;
  fuel: string;
  maxPrice: number;
  status: string;
}
