
export interface MedicineOrigin {
  name: string;
  country: string;
  countryCode: string;
  city?: string;
  discoveryYear: string;
  discoverer: string;
  briefHistory: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  classification: string;
  funFact: string;
}

export interface MapPosition {
  lat: number;
  lng: number;
  zoom: number;
}
