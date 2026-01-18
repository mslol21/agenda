import { useState } from "react";
import { BookingForm } from "@/components/BookingForm";
import { BookingSuccess } from "@/components/BookingSuccess";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { ProfessionalsSection } from "@/components/ProfessionalsSection";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");

  const handleBookingSuccess = () => {
    setShowSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewBooking = () => {
    setShowSuccess(false);
    setSelectedService("");
    setSelectedProfessional("");
  };

  const handleSelectProfessional = (id: string) => {
    setSelectedProfessional(id);
    setSelectedService(""); // Reset service when professional changes
    
    // Scroll to services
    setTimeout(() => {
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSelectService = (id: string) => {
    setSelectedService(id);
    // Scroll to booking
    setTimeout(() => {
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Admin Link */}
      <div className="absolute top-4 right-4 z-10">
        <Link
          to="/admin"
        >
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Shield className="w-4 h-4" />
            Painel Admin
          </Button>
        </Link>
      </div>

      {showSuccess ? (
        <BookingSuccess onNewBooking={handleNewBooking} />
      ) : (
        <>
          <HeroSection />
          
          <ProfessionalsSection 
            selectedProfessional={selectedProfessional}
            onSelectProfessional={handleSelectProfessional}
          />

          <ServicesSection
            selectedProfessional={selectedProfessional}
            selectedService={selectedService}
            onSelectService={handleSelectService}
          />
          
          <BookingForm
            selectedService={selectedService}
            selectedProfessional={selectedProfessional}
            onSuccess={handleBookingSuccess}
          />
        </>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border mt-auto">
        <p>© 2025 AgendaFácil. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;
