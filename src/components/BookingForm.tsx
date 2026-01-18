import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { services, professionals } from "@/data/data";
import { TimeSlotPicker } from "./TimeSlotPicker";

const bookingSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("E-mail inválido").max(255),
  whatsapp: z
    .string()
    .min(10, "WhatsApp deve ter pelo menos 10 dígitos")
    .max(15)
    .regex(/^[0-9]+$/, "Apenas números"),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  selectedService: string;
  selectedProfessional: string;
  onSuccess: () => void;
}

export const BookingForm = ({ selectedService, selectedProfessional, onSuccess }: BookingFormProps) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const selectedServiceData = services.find((s) => s.id === selectedService);
  const selectedProfessionalData = professionals.find((p) => p.id === selectedProfessional);

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedService) {
      toast.error("Por favor, selecione um serviço");
      return;
    }

    if (!selectedProfessional) {
      toast.error("Por favor, selecione um profissional");
      return;
    }

    if (!date) {
      toast.error("Por favor, selecione uma data");
      return;
    }

    if (!time) {
      toast.error("Por favor, selecione um horário");
      return;
    }

    setIsSubmitting(true);


    try {
      const [hours, minutes] = time.split(":").map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes, 0, 0);

      await addDoc(collection(db, "agendamentos"), {
        nome_cliente: data.nome,
        email: data.email,
        whatsapp: data.whatsapp,
        servico: selectedServiceData?.name || selectedService,
        profissional: selectedProfessionalData?.name || selectedProfessional,
        data_hora: dateTime.toISOString(),
        status: "pendente",
        created_at: new Date().toISOString()
      });

      toast.success("Agendamento solicitado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Erro ao criar agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedService) {
    return (
      <section className="py-12 md:py-16 bg-card border-t border-border opacity-50 pointer-events-none filter grayscale transition-all duration-500" id="booking">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
             <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Complete seu Agendamento
            </h2>
            <p className="text-muted-foreground">
              Selecione um profissional e um serviço para continuar
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-card border-t border-border animate-fade-in" id="booking">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Complete seu Agendamento
            </h2>
            <p className="text-muted-foreground">
              Preencha os dados abaixo para solicitar seu horário com <strong>{selectedProfessionalData?.name}</strong>
            </p>
          </div>

          {(selectedServiceData && selectedProfessionalData) && (
            <div className="mb-6 p-4 rounded-lg bg-accent border border-primary/20 animate-scale-in">
              <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm text-muted-foreground mb-1">Resumo do pedido:</p>
                   <p className="font-semibold text-foreground text-lg">
                    {selectedServiceData.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Profissional: {selectedProfessionalData.name}
                  </p>
                </div>
                <div className="text-right">
                   <p className="font-bold text-primary text-xl">{selectedServiceData.price}</p>
                   <p className="text-xs text-muted-foreground">{selectedServiceData.duration}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                placeholder="Seu nome"
                {...register("nome")}
                className={cn(errors.nome && "border-destructive")}
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                className={cn(errors.email && "border-destructive")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="11999999999"
                {...register("whatsapp")}
                className={cn(errors.whatsapp && "border-destructive")}
              />
              {errors.whatsapp && (
                <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
              )}
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setTime(""); // Reset time when date changes
                    }}
                    disabled={(date) =>
                      date < new Date() || date.getDay() === 0
                    }
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Horário</Label>
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <TimeSlotPicker
                  selectedDate={date}
                  selectedTime={time}
                  onSelectTime={setTime}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isSubmitting || !selectedService}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Solicitar Agendamento"
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
