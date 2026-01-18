
import { cn } from "@/lib/utils";
import { professionals } from "@/data/data";

interface ProfessionalsSectionProps {
  selectedProfessional: string;
  onSelectProfessional: (professionalId: string) => void;
}

export const ProfessionalsSection = ({
  selectedProfessional,
  onSelectProfessional,
}: ProfessionalsSectionProps) => {
  return (
    <section className="py-12 md:py-16 bg-accent/30" id="professionals">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Nossos Profissionais
          </h2>
          <p className="text-muted-foreground">
            Escolha quem vai cuidar de você
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {professionals.map((professional, index) => {
            const isSelected = selectedProfessional === professional.id;

            return (
              <button
                key={professional.id}
                onClick={() => onSelectProfessional(professional.id)}
                className={cn(
                  "group relative flex flex-col items-center p-6 rounded-xl transition-all duration-300",
                  "border-2 hover:shadow-card bg-card",
                  "animate-scale-in",
                  isSelected
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary animate-scale-in" />
                )}

                <div className="w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {professional.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {professional.role}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
