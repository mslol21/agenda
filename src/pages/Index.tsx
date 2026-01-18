import { useState } from "react";
import { BookingForm } from "@/components/BookingForm";
import { BookingSuccess } from "@/components/BookingSuccess";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Index = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");

  const handleBookingSuccess = () => {
    setShowSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewBooking = () => {
    setShowSuccess(false);
    setSelectedService("");
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Admin Link */}
      <div className="absolute top-4 right-4 z-10">
        <Link
          to="/admin"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Shield className="w-4 h-4" />
          Painel Admin
        </Link>
      </div>

      {showSuccess ? (
        <BookingSuccess onNewBooking={handleNewBooking} />
      ) : (
        <>
          <HeroSection />
          <ServicesSection
            selectedService={selectedService}
            onSelectService={setSelectedService}
          />
          <BookingForm
            selectedService={selectedService}
            onSuccess={handleBookingSuccess}
          />
        </>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>© 2025 AgendaFácil. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;
