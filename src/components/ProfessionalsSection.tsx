import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Professional } from "@/types";

interface ProfessionalsSectionProps {
  selectedProfessional: string;
  onSelectProfessional: (professionalId: string) => void;
}

export const ProfessionalsSection = ({
  selectedProfessional,
  onSelectProfessional,
}: ProfessionalsSectionProps) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "profissionais"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));
        setProfessionals(data);
      } catch (error) {
        console.error("Error fetching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, []);

  if (loading) return null;

  return (
    <section className="py-12 md:py-16 bg-accent/30" id="professionals">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 uppercase">
            NOSSOS PROFISSIONAIS
          </h2>
          <p className="text-muted-foreground uppercase">
            ESCOLHA QUEM VAI CUIDAR DE VOCÊ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {professionals.map((professional, index) => {
            const isSelected = selectedProfessional === professional.id;
            const hasColor = !!professional.color;

            return (
              <button
                key={professional.id}
                onClick={() => onSelectProfessional(professional.id!)}
                className={cn(
                  "group relative flex flex-col items-center p-6 rounded-xl transition-all duration-300",
                  "border-2 hover:shadow-card bg-card",
                  "animate-scale-in",
                  isSelected
                    ? "ring-1"
                    : "border-border hover:border-primary/50"
                )}
                style={{ 
                    animationDelay: `${index * 100}ms`,
                    ...(isSelected ? (hasColor ? { borderColor: professional.color, boxShadow: `0 0 0 1px ${professional.color}` } : { borderColor: 'var(--primary)' }) : {})
                }}
              >
                {isSelected && (
                  <div 
                    className="absolute top-3 right-3 w-3 h-3 rounded-full animate-scale-in" 
                    style={{ backgroundColor: professional.color || 'var(--primary)' }}
                  />
                )}

                <div 
                    className={cn(
                        "w-24 h-24 mb-4 rounded-full overflow-hidden border-2 transition-colors flex items-center justify-center",
                        !hasColor && "bg-muted border-border group-hover:border-primary"
                    )}
                    style={hasColor ? { backgroundColor: professional.color, borderColor: professional.color } : {}}
                >
                   {/* Placeholder avatar logic */}
                   <span 
                        className={cn("text-2xl font-bold", hasColor ? "text-white" : "text-muted-foreground")}
                   >
                       {professional.name.charAt(0).toUpperCase()}
                   </span>
                </div>

                <h3 className="font-semibold text-lg mb-1 uppercase text-foreground">
                  {professional.name}
                </h3>
                <p className="text-sm text-muted-foreground uppercase">
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
