import { CheckCircle, Clock, ArrowLeft, Calendar, Printer, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingDetails } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

interface BookingSuccessProps {
  onNewBooking: () => void;
  bookingDetails: BookingDetails;
}

export const BookingSuccess = ({ onNewBooking, bookingDetails }: BookingSuccessProps) => {
  const [copied, setCopied] = useState(false);

  // Generate booking number from ID (first 8 chars)
  const bookingNumber = `#${bookingDetails.bookingId.substring(0, 8).toUpperCase()}`;

  // Format WhatsApp message
  const whatsappMessage = `
🎉 *Novo Agendamento - ${bookingDetails.clientName}*

📅 Data: ${format(bookingDetails.date, "dd/MM/yyyy", { locale: ptBR })}
🕐 Horário: ${bookingDetails.time}
✂️ Serviço: ${bookingDetails.serviceName.toUpperCase()}
👤 Profissional: ${bookingDetails.professionalName.toUpperCase()}
💰 Valor: ${bookingDetails.price}
⏱️ Duração: ${bookingDetails.duration}

📱 Telefone: ${bookingDetails.phone}
${bookingDetails.email ? `📧 E-mail: ${bookingDetails.email}` : ''}

---
Status: ⏳ Aguardando Confirmação

Número do pedido: ${bookingNumber}
  `.trim();

  // Generate .ics file for calendar
  const generateICS = () => {
    const [hours, minutes] = bookingDetails.time.split(':');
    const startDate = new Date(bookingDetails.date);
    startDate.setHours(parseInt(hours), parseInt(minutes), 0);
    
    // Calculate end time (add duration)
    const durationMatch = bookingDetails.duration.match(/(\d+)/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AgendaFácil//PT
BEGIN:VEVENT
UID:${bookingDetails.bookingId}@agendafacil.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${bookingDetails.serviceName} - ${bookingDetails.professionalName}
DESCRIPTION:Agendamento ${bookingNumber}\\nServiço: ${bookingDetails.serviceName}\\nProfissional: ${bookingDetails.professionalName}\\nValor: ${bookingDetails.price}
LOCATION:Estabelecimento
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agendamento-${bookingNumber}.ics`;
    link.click();
    toast.success("Arquivo de calendário baixado!");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
    toast.success("Abrindo impressão...");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full animate-scale-in">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-2">
          ✅ Agendamento Solicitado!
        </h1>

        {/* Booking Number */}
        <p className="text-center text-muted-foreground mb-6">
          Nº do Pedido: <span className="font-mono font-bold text-foreground">{bookingNumber}</span>
        </p>

        {/* Main Card */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-6 md:p-8 shadow-lg mb-6">
          {/* Date and Time */}
          <div className="text-center mb-6 pb-6 border-b border-border">
            <p className="text-sm text-muted-foreground mb-2">📅 Data e Horário</p>
            <p className="text-2xl font-bold text-foreground">
              {format(bookingDetails.date, "dd/MM/yyyy", { locale: ptBR })} às {bookingDetails.time}
            </p>
          </div>

          {/* Service Details */}
          <div className="space-y-4 mb-6 pb-6 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">✂️ Serviço</p>
                <p className="text-xl font-bold uppercase">{bookingDetails.serviceName}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{bookingDetails.price}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-muted-foreground mb-1">👤 Profissional</p>
                <p className="font-semibold uppercase">{bookingDetails.professionalName}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground mb-1">⏱️ Duração</p>
                <p className="font-semibold">{bookingDetails.duration}</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-6 pb-6 border-b border-border">
            <p className="text-sm text-muted-foreground mb-3">📱 Enviaremos a confirmação para:</p>
            <p className="font-semibold">{bookingDetails.phone}</p>
            {bookingDetails.email && (
              <p className="text-sm text-muted-foreground">{bookingDetails.email}</p>
            )}
          </div>

          {/* Status */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="font-semibold text-warning">Status: Aguardando análise</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Você receberá um WhatsApp em até <strong>30 minutos</strong> com a confirmação
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Button
            onClick={generateICS}
            variant="outline"
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Adicionar ao Calendário
          </Button>

          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar Detalhes"}
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>

        {/* New Booking Button */}
        <div className="text-center">
          <Button
            onClick={onNewBooking}
            variant="default"
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Fazer Novo Agendamento
          </Button>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .max-w-2xl, .max-w-2xl * {
              visibility: visible;
            }
            .max-w-2xl {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            button {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
