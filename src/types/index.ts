
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

export interface DayConfig {
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export interface Settings {
  days: {
    [key: string]: DayConfig; // "0" for Sunday, "1" for Monday, etc.
  };
  appointmentInterval: number; // minutes
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
  receber_lembretes?: boolean;
  primeira_vez?: boolean;
  observacoes?: string;
  created_at: any;
}

export interface BookingDetails {
  bookingId: string;
  clientName: string;
  phone: string;
  email?: string;
  serviceName: string;
  professionalName: string;
  date: Date;
  time: string;
  price: string;
  duration: string;
  receberLembretes: boolean;
  primeiraVez: boolean;
}
