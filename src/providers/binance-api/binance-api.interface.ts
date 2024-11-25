export interface IBinanceApiAvailability {
  availability: boolean;
  detail: string;
  delivery_type: number;
  delivery_type_text: string;
}

export interface IBinanceApiToken {
  access: string;
  expire: number;
}
