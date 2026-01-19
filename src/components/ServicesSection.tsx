import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Service, Professional } from "@/types";
import { Scissors, Sparkles, Palette, Brush } from "lucide-react";

interface ServicesSectionProps {
  selectedService: string;
  selectedProfessional: string;
  onSelectService: (serviceId: string) => void;
}

// Map service names/types to icons if possible, or just use a default
const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('corte')) return Scissors;
    if (lower.includes('manicure') || lower.includes('unha')) return Sparkles;
    if (lower.includes('color') || lower.includes('tintura')) return Palette;
    return Brush;
};

export const ServicesSection = ({
  selectedService,
  selectedProfessional,
  onSelectService,
}: ServicesSectionProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesSnap, professionalsSnap] = await Promise.all([
             getDocs(collection(db, "servicos")),
             getDocs(collection(db, "profissionais"))
        ]);
        
        setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
        setProfessionals(professionalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter services based on selected professional
  const professional = professionals.find((p) => p.id === selectedProfessional);
  
  // Logic: Professional 'services' array might contain IDs or Names depending on how we saved it.
  // In Admin.tsx we saved { ...newProfessional, services: [] }. The data.ts logic had explicit mapping.
  // Ideally, professional.services should contain Service IDs. 
  // If the array is empty (newly created pro), maybe show all services? 
  // Or purely rely on the mapping.
  
  // For now, let's assume if professional has no explicit service list restricted, show all.
  // But wait, the previous code filtered. Let's try to filter if services array exists and is not empty.
  
  const displayedServices = professional 
    ? (professional.services && professional.services.length > 0 
        ? services.filter((s) => professional.services.includes(s.id!) || professional.services.includes(s.name)) 
        : services) 
    : []; 

  if (!selectedProfessional) {
    return (
      <section className="py-12 md:py-16 opacity-50 pointer-events-none filter grayscale transition-all duration-500" id="services">
        <div className="container mx-auto px-4">
           <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 uppercase">
              NOSSOS SERVIÇOS
            </h2>
            <p className="text-muted-foreground uppercase">
              SELECIONE UM PROFISSIONAL PRIMEIRO PARA VER OS SERVIÇOS DISPONÍVEIS
            </p>
          </div>
        </div>
      </section>
    );
  }
  
  if(loading) return <div className="py-12 text-center uppercase">CARREGANDO SERVIÇOS...</div>;

  return (
    <section className="py-12 md:py-16" id="services">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 uppercase">
            SERVIÇOS DE {professional?.name.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground uppercase">
            SELECIONE O SERVIÇO QUE DESEJA AGENDAR
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {displayedServices.map((service, index) => {
            const Icon = getIcon(service.name);
            const isSelected = selectedService === service.id;

            return (
              <button
                key={service.id}
                onClick={() => onSelectService(service.id!)}
                className={cn(
                  "group relative p-6 rounded-xl text-left transition-all duration-300",
                  "border-2 hover:shadow-card",
                  "animate-slide-up",
                  isSelected
                    ? "border-primary bg-accent shadow-card"
                    : "border-border bg-card hover:border-primary/50"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary animate-scale-in" />
                )}

                <div
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="font-semibold text-foreground mb-1 uppercase">
                  {service.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 uppercase">
                  {service.description || "AGENDE AGORA"}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground uppercase">
                      {service.duration.includes('min') || service.duration.includes('h') ? service.duration : `${service.duration} MIN`}
                  </span>
                  <span className="font-semibold text-primary">
                      {service.price.startsWith('R$') ? service.price : `R$ ${service.price}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
