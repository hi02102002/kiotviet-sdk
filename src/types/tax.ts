export type TaxCalculationMethod = 'Khấu trừ' | 'Trực tiếp';

export interface Tax {
  taxId: number;
  taxName: string;
  value: number | null;
  type: TaxCalculationMethod;
}

export interface TaxListResponse {
  data: Tax[];
  message: string;
  isSuccess: boolean;
}
