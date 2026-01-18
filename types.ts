
export interface DebtDetail {
  type: 'IPVA' | 'Licenciamento' | 'Multa' | 'Taxa' | 'Seguro';
  description: string;
  value: number;
  dueDate: string; // Formato DD/MM/AAAA
}

export interface VehicleData {
  plate: string;
  model: string;
  color: string;
  municipality: string; // Novo campo: Município de emplacamento
  licensingYear: number;
  restrictions: string;
  hasRestrictions: boolean;
  totalDebts: number;
  lastUpdate: string; // Formato DD/MM/AAAA HH:MM
  debtDetails: DebtDetail[];
  foundInDetranSC: boolean;
}

export interface ConsultationHistory {
  id: string;
  plate: string;
}
