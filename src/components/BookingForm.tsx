import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { Service, Professional, Settings, BookingDetails } from "@/types";

const bookingSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: "E-mail inválido" }
  ),
  whatsapp: z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(20)
    .regex(/^[\d\s\(\)\-\+]+$/, "Formato de telefone inválido"),
  receberLembretes: z.boolean().optional(),
  primeiraVez: z.boolean().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  selectedService: string;
  selectedProfessional: string;
  onSuccess: (bookingDetails: BookingDetails) => void;
}

export const BookingForm = ({ selectedService, selectedProfessional, onSuccess }: BookingFormProps) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesSnap, professionalsSnap, settingsSnap] = await Promise.all([
             getDocs(collection(db, "servicos")),
             getDocs(collection(db, "profissionais")),
             getDoc(doc(db, "settings", "general"))
        ]);
        
        setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
        setProfessionals(professionalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
        
        if (settingsSnap.exists()) {
            setSettings(settingsSnap.data() as Settings);
        } else {
            // Default settings fallback
            setSettings({
                days: {
                    "0": { isOpen: false, startTime: "09:00", endTime: "18:00" },
                    "1": { isOpen: true, startTime: "09:00", endTime: "18:00" },
                    "2": { isOpen: true, startTime: "09:00", endTime: "18:00" },
                    "3": { isOpen: true, startTime: "09:00", endTime: "18:00" },
                    "4": { isOpen: true, startTime: "09:00", endTime: "18:00" },
                    "5": { isOpen: true, startTime: "09:00", endTime: "18:00" },
                    "6": { isOpen: true, startTime: "09:00", endTime: "18:00" },
                },
                appointmentInterval: 60
            });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const selectedServiceData = services.find((s) => s.id === selectedService);
  const selectedProfessionalData = professionals.find((p) => p.id === selectedProfessional);

  const onSubmit = async (data: BookingFormData) => {
    console.log("Form submitted with data:", data);
    
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

      const bookingData = {
        nome_cliente: data.nome,
        email: data.email || "",
        whatsapp: data.whatsapp,
        servico: selectedServiceData?.name || selectedService,
        profissional: selectedProfessionalData?.name || selectedProfessional,
        data_hora: dateTime.toISOString(),
        status: "pendente",
        receber_lembretes: data.receberLembretes || false,
        primeira_vez: data.primeiraVez || false,
        created_at: new Date().toISOString()
      };

      console.log("Saving booking to Firestore:", bookingData);
      
      const docRef = await addDoc(collection(db, "agendamentos"), bookingData);

      console.log("Booking saved successfully with ID:", docRef.id);
      
      // Create booking details for success page
      const bookingDetails: BookingDetails = {
        bookingId: docRef.id,
        clientName: data.nome,
        phone: data.whatsapp,
        email: data.email,
        serviceName: selectedServiceData?.name || selectedService,
        professionalName: selectedProfessionalData?.name || selectedProfessional,
        date: date,
        time: time,
        price: selectedServiceData?.price || "",
        duration: selectedServiceData?.duration || "",
        receberLembretes: data.receberLembretes || false,
        primeiraVez: data.primeiraVez || false,
      };
      
      toast.success("Agendamento solicitado com sucesso!");
      onSuccess(bookingDetails);
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
            <div className="mb-6 p-5 rounded-lg bg-accent border border-primary/20 animate-scale-in">
              <div className="space-y-3">
                {/* Service and Price */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-xl uppercase tracking-tight">
                      {selectedServiceData.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-2xl">{selectedServiceData.price}</p>
                  </div>
                </div>
                
                {/* Professional and Duration */}
                <div className="flex items-center justify-between text-sm border-t border-border/50 pt-3">
                  <p className="text-muted-foreground">
                    Profissional: <span className="font-semibold text-foreground uppercase">{selectedProfessionalData.name}</span>
                  </p>
                  <p className="text-muted-foreground font-medium">{selectedServiceData.duration}</p>
                </div>

                {/* Date and Time Selection */}
                {date && time && (
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">→ Data e Horário:</p>
                        <p className="font-semibold text-foreground">
                          {format(date, "dd/MM/yyyy", { locale: ptBR })} às {time}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDate(undefined);
                          setTime("");
                          setCalendarOpen(true); // Reopen calendar
                        }}
                        className="text-xs"
                      >
                        ALTERAR
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Info Section */}
            <div className="space-y-4 p-4 rounded-lg border border-border bg-background/50">
              <p className="text-sm font-medium text-muted-foreground">→ Cliente:</p>
              
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  placeholder="Digite seu nome"
                  {...register("nome")}
                  className={cn(errors.nome && "border-destructive")}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Telefone/WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  {...register("whatsapp")}
                  className={cn(errors.whatsapp && "border-destructive")}
                />
                {errors.whatsapp && (
                  <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  {...register("email")}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Controller
                    name="receberLembretes"
                    control={control}
                    defaultValue={false}
                    render={({ field }) => (
                      <Checkbox
                        id="receberLembretes"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="receberLembretes" className="text-sm font-normal cursor-pointer">
                    Quero receber lembretes por WhatsApp
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    name="primeiraVez"
                    control={control}
                    defaultValue={false}
                    render={({ field }) => (
                      <Checkbox
                        id="primeiraVez"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="primeiraVez" className="text-sm font-normal cursor-pointer">
                    Primeira vez neste estabelecimento
                  </Label>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                      setCalendarOpen(false); // Close calendar after selection
                    }}
                    disabled={(date) => {
                      if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                      if (!settings) return false;
                      const day = date.getDay().toString();
                      return !settings.days[day]?.isOpen; // Disable if day is closed
                    }}
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
                  settings={settings}
                  professionalName={selectedProfessionalData?.name}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold uppercase"
              disabled={isSubmitting || !selectedService || !date || !time}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar Agendamento"
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
