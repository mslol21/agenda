import { cn } from "@/lib/utils";
import { Scissors, Sparkles, Palette, Brush } from "lucide-react";

const services = [
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

interface ServicesSectionProps {
  selectedService: string;
  onSelectService: (serviceId: string) => void;
}

export const ServicesSection = ({
  selectedService,
  onSelectService,
}: ServicesSectionProps) => {
  return (
    <section className="py-12 md:py-16" id="services">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Nossos Serviços
          </h2>
          <p className="text-muted-foreground">
            Selecione o serviço que deseja agendar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            const isSelected = selectedService === service.id;

            return (
              <button
                key={service.id}
                onClick={() => onSelectService(service.id)}
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

                <h3 className="font-semibold text-foreground mb-1">
                  {service.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {service.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{service.duration}</span>
                  <span className="font-semibold text-primary">{service.price}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { services };
