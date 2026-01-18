
import { Scissors, Sparkles, Palette, Brush } from "lucide-react";

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  icon: any;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  avatar: string;
  services: string[]; // Array of Service IDs
}

export const services: Service[] = [
  {
    id: "corte-cabelo",
    name: "Corte de Cabelo",
    description: "Corte moderno e personalizado",
    duration: "45 min",
    price: "R$ 50",
    icon: Scissors,
  },
  {
    id: "manicure",
    name: "Manicure",
    description: "Unhas impecáveis e bem cuidadas",
    duration: "1h",
    price: "R$ 40",
    icon: Sparkles,
  },
  {
    id: "coloracao",
    name: "Coloração",
    description: "Tintura profissional de alta qualidade",
    duration: "2h",
    price: "R$ 120",
    icon: Palette,
  },
  {
    id: "maquiagem",
    name: "Maquiagem",
    description: "Make profissional para qualquer ocasião",
    duration: "1h30",
    price: "R$ 80",
    icon: Brush,
  },
];

export const professionals: Professional[] = [
  {
    id: "ana-silva",
    name: "Ana Silva",
    role: "Especialista em Cabelos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    services: ["corte-cabelo", "coloracao"],
  },
  {
    id: "carlos-oliveira",
    name: "Carlos Oliveira",
    role: "Hair Stylist",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    services: ["corte-cabelo"],
  },
  {
    id: "beatriz-santos",
    name: "Beatriz Santos",
    role: "Manicure & Makeup",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    services: ["manicure", "maquiagem"],
  },
];
