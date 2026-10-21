export interface AddisLocation {
  id: string;
  name: string;
  subcity: string;
  detail: string;
  lat: number;
  lng: number;
}

export const ADDIS_LOCATIONS: AddisLocation[] = [
  { id: 'merkato', name: 'Merkato Wholesale District', subcity: 'Addis Ketema', detail: 'Bulk goods, retail shops, machinery', lat: 9.0347, lng: 38.7352 },
  { id: 'bole-medhanialem', name: 'Bole Medhanialem', subcity: 'Bole', detail: 'Commercial hotels, apartments, airport', lat: 8.9806, lng: 38.7903 },
  { id: 'bole-atlas', name: 'Atlas & Edna Mall', subcity: 'Bole', detail: 'Offices, residential, entertainment', lat: 9.0002, lng: 38.7848 },
  { id: 'piassa', name: 'Piassa & Churchill Ave', subcity: 'Arada', detail: 'Central market, historic trading', lat: 9.0350, lng: 38.7578 },
  { id: 'mexico-square', name: 'Mexico Square & Kera', subcity: 'Kirkos', detail: 'Headquarters, transit hubs, business', lat: 9.0109, lng: 38.7468 },
  { id: 'kazanchis', name: 'Kazanchis & UNECA', subcity: 'Kirkos', detail: 'Hotels, ministries, diplomatic area', lat: 9.0182, lng: 38.7670 },
  { id: 'megenagna', name: 'Megenagna Hub', subcity: 'Yeka', detail: 'Transit terminal, shopping centers', lat: 9.0247, lng: 38.8025 },
  { id: 'cmc', name: 'CMC Residential', subcity: 'Yeka', detail: 'Gated compounds, residential moving', lat: 9.0188, lng: 38.8401 },
  { id: 'ayat', name: 'Ayat Condominiums', subcity: 'Bole', detail: 'East-side homes, new developments', lat: 9.0165, lng: 38.8842 },
  { id: 'goro', name: 'Goro & Airport East', subcity: 'Bole', detail: 'Industrial parks, freight depots', lat: 8.9644, lng: 38.8211 },
  { id: 'saris', name: 'Saris Industrial Zone', subcity: 'Akaky Kaliti', detail: 'Factories, raw materials, storage', lat: 8.9408, lng: 38.7689 },
  { id: 'kality', name: 'Kality Port & Warehouses', subcity: 'Akaky Kaliti', detail: 'Main logistics hub, customs depots', lat: 8.8945, lng: 38.7824 },
  { id: 'lafto', name: 'Lafto & Lebu', subcity: 'Nifas Silk-Lafto', detail: 'Apartment complexes, residential moves', lat: 8.9671, lng: 38.7205 },
  { id: 'jemo', name: 'Jemo Condominiums', subcity: 'Nifas Silk-Lafto', detail: 'Large residential zones, furniture moves', lat: 8.9417, lng: 38.6867 },
  { id: 'kolfe', name: 'Kolfe & 18 Mazoria', subcity: 'Kolfe Keranio', detail: 'West commercial corridors, wholesale', lat: 9.0288, lng: 38.6907 }
];
