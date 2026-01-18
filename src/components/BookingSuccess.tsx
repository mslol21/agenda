import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingSuccessProps {
  onNewBooking: () => void;
}

export const BookingSuccess = ({ onNewBooking }: BookingSuccessProps) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-scale-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Solicitação Enviada!
        </h1>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning mb-6">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Aguardando Confirmação</span>
        </div>

        <p className="text-muted-foreground mb-8">
          Recebemos sua solicitação de agendamento. O prestador irá analisar e
          confirmar em breve. Você receberá uma notificação assim que for
          confirmado.
        </p>

        <Button
          onClick={onNewBooking}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Fazer novo agendamento
        </Button>
      </div>
    </div>
  );
};
