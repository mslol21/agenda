
export interface Service {
  id?: string;
  name: string;
  description?: string;
  duration: string;
  price: string;
}

export interface Professional {
  id?: string;
  name: string;
  role: string;
  services: string[]; // Service names or IDs
  color?: string; // Hex color for customization
}

export interface Settings {
  openTime: string;
  closeTime: string;
  workDays: number[]; // 0=Sunday, 1=Monday...
}

export interface Appointment {
  id?: string;
  nome_cliente: string;
  email: string;
  whatsapp: string;
  servico: string;
  profissional: string;
  data_hora: string;
  status: 'pendente' | 'confirmado' | 'recusado';
  created_at: any;
}
