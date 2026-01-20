import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Loader2,
  Lock,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
  Settings as SettingsIcon,
  Search as SearchIcon,
  MessageCircle,
  AlertCircle,
  Star,
  Briefcase,
  Scissors
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  addDoc,
  setDoc,
  getDocs,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Appointment, Service, Professional } from "@/types";
import { services as initialServices, professionals as initialProfessionals } from "@/data/data";

import { AdminSettings } from "@/components/AdminSettings";

const Admin = () => {
  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New Item States
  const [newService, setNewService] = useState<Partial<Service>>({ name: "", price: "", duration: "" });
  const [newProfessional, setNewProfessional] = useState<Partial<Professional>>({ name: "", role: "" });
  const [pendingCount, setPendingCount] = useState(0);

  // Notification Refs
  const prevAppointmentsRef = useRef<string[]>([]);
  const notifiedAppointmentsRef = useRef<Set<string>>(new Set());
  const soundLoadedRef = useRef<HTMLAudioElement | null>(null);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'confirmado' | 'recusado'>('todos');
  const [professionalFilter, setProfessionalFilter] = useState<string>('todos');
  const [dateFilterType, setDateFilterType] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'all' | 'custom' | 'range'>('today');
  const [viewMode, setViewMode] = useState<'lista' | 'data' | 'profissional'>('profissional');

  // Manual Booking States
  const [openManual, setOpenManual] = useState(false);
  const [manualBooking, setManualBooking] = useState({
      nome: "",
      servico: "",
      profissional: "",
      date: "",
      time: ""
  });

  // Helper to get service details
  const getServiceDetails = (serviceName: string) => {
    // Case insensitive matching
    const service = services.find(s => s.name.toLowerCase() === serviceName?.toLowerCase());
    return service;
  };

  // Helper to calculate end time
  const getEndTime = (startStr: string, durationStr?: string) => {
    if (!durationStr) return "";
    const startDate = new Date(startStr);
    const minutes = parseInt(durationStr.replace(/\D/g, '')) || 60;
    const endDate = new Date(startDate.getTime() + minutes * 60000);
    return format(endDate, "HH:mm");
  };

  // Filter Logic
  const filteredAppointments = appointments.filter(apt => {
      // 1. Search Filter (Name)
      if (searchTerm && !apt.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'todos' && apt.status !== statusFilter) {
          return false;
      }

      // 3. Professional Filter
      if (professionalFilter !== 'todos' && apt.profissional !== professionalFilter) {
          return false;
      }

      // 4. Date Filter
      if (dateFilterType === 'all') return true;
      
      const aptDate = new Date(apt.data_hora);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (dateFilterType === 'today') {
          return aptDate.getDate() === today.getDate() && 
                 aptDate.getMonth() === today.getMonth() && 
                 aptDate.getFullYear() === today.getFullYear();
      }
      
      if (dateFilterType === 'tomorrow') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return aptDate.getDate() === tomorrow.getDate() && 
                 aptDate.getMonth() === tomorrow.getMonth() && 
                 aptDate.getFullYear() === tomorrow.getFullYear();
      }

      if (dateFilterType === 'week') {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          return aptDate >= today && aptDate <= nextWeek;
      }

      if (dateFilterType === 'month') {
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        return aptDate >= today && aptDate <= nextMonth;
      }

      if (dateFilterType === 'custom' && selectedDate) {
          return (
              aptDate.getDate() === selectedDate.getDate() &&
              aptDate.getMonth() === selectedDate.getMonth() &&
              aptDate.getFullYear() === selectedDate.getFullYear()
          );
      }

      if (dateFilterType === 'range' && startDate && endDate) {
        const endOfRange = new Date(endDate);
        endOfRange.setHours(23, 59, 59, 999);
        const startOfRange = new Date(startDate);
        startOfRange.setHours(0, 0, 0, 0);
        return aptDate >= startOfRange && aptDate <= endOfRange;
      }

      return true;
  });
  
  // Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const dateTime = new Date(`${manualBooking.date}T${manualBooking.time}`);
          await addDoc(collection(db, "agendamentos"), {
              nome_cliente: manualBooking.nome,
              email: "manual@admin.com", // Placeholder
              whatsapp: "",
              servico: manualBooking.servico,
              profissional: manualBooking.profissional,
              data_hora: dateTime.toISOString(),
              status: "confirmado", // Manual bookings are auto-confirmed usually? Pending for now to match flow
              created_at: new Date().toISOString()
          });
          toast.success("Agendamento criado!");
          setOpenManual(false);
          setManualBooking({ nome: "", servico: "", profissional: "", date: "", time: "" });
      } catch (e) {
          toast.error("Erro ao criar agendamento");
      }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_logged_in") === "true";
    setIsAuthenticated(isAuth);
    setAuthLoading(false);

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Load notification sound
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.load();
    soundLoadedRef.current = audio;
  }, []);

  // Monitor for alerts (upcoming/delayed)
  useEffect(() => {
    if (!isAuthenticated || appointments.length === 0) return;

    const checkAlerts = () => {
      const now = new Date();
      
      appointments.forEach(apt => {
        if (apt.status !== 'confirmado') return;
        
        const aptDate = new Date(apt.data_hora);
        const timeDiff = aptDate.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / 60000);

        // Upcoming (exactly 30 min)
        if (minutesDiff === 30 && !notifiedAppointmentsRef.current.has(`${apt.id}-upcoming`)) {
          toast.info(`Aviso: Agendamento de ${apt.nome_cliente} em 30 minutos!`, {
            duration: 10000,
            icon: <Clock className="w-4 h-4" />
          });
          notifiedAppointmentsRef.current.add(`${apt.id}-upcoming`);
        }

        // Delayed
        if (minutesDiff < 0 && minutesDiff > -60 && apt.status === 'confirmado' && !notifiedAppointmentsRef.current.has(`${apt.id}-delayed`)) {
          // You might want to check if it's already "started" or "finished" if you had those statuses
          // For now, if it's confirmed but time passed, it's "ongoing" or "delayed starting"
          // Let's only alert if it just passed (e.g. within 1 minute of passing)
          if (minutesDiff === -1) {
            toast.error(`Atenção: Agendamento de ${apt.nome_cliente} está atrasado!`, {
              duration: 15000,
              icon: <AlertCircle className="w-4 h-4" />
            });
            notifiedAppointmentsRef.current.add(`${apt.id}-delayed`);
          }
        }
      });
    };

    const interval = setInterval(checkAlerts, 60000); // Check every minute
    checkAlerts(); // Initial check

    return () => clearInterval(interval);
  }, [isAuthenticated, appointments]);

  // Monitor for new appointments
  useEffect(() => {
    if (!isAuthenticated || loadingData) return;

    const currentPendings = appointments.filter(a => a.status === 'pendente');
    setPendingCount(currentPendings.length);

    if (prevAppointmentsRef.current.length > 0) {
      const newItems = appointments.filter(apt => 
        !prevAppointmentsRef.current.includes(apt.id!) && apt.status === 'pendente'
      );

      if (newItems.length > 0) {
        // Play sound
        if (soundLoadedRef.current) {
          soundLoadedRef.current.play().catch(e => console.log("Sound play error:", e));
        }

        // Browser notification
        newItems.forEach(item => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Novo Agendamento!", {
              body: `${item.nome_cliente} solicitou ${item.servico}`,
              icon: "/favicon.ico"
            });
          }
          toast("🔔 Novo agendamento recebido!", {
            description: `${item.nome_cliente} - ${item.servico}`,
            action: {
              label: "Ver",
              onClick: () => {
                setStatusFilter('pendente');
                setDateFilterType('all');
              }
            }
          });
        });
      }
    }

    prevAppointmentsRef.current = appointments.map(a => a.id!);
  }, [appointments, isAuthenticated, loadingData]);

  // ------------------------------------------------------------------
  // Auth Handlers
  // ------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setAuthLoading(true);
    try {
      // Query 'admins' collection
      const q = query(
        collection(db, "admins"), 
        where("email", "==", email), 
        where("senha", "==", password)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        sessionStorage.setItem("admin_logged_in", "true");
        setIsAuthenticated(true);
        toast.success("Login realizado com sucesso!");
      } else {
        setLoginError("Credenciais inválidas.");
      }
    } catch (error: any) {
      console.error(error);
      setLoginError("Erro ao conectar ao banco de dados.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_logged_in");
    setIsAuthenticated(false);
  };

  const handleCreateDefaultAdmin = async () => {
    try {
      // Check if any admin exists to avoid overwriting/security isues in a real app
      // But for this dev request, we just Create.
      const q = query(collection(db, "admins"), where("email", "==", "admin@admin.com"));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await addDoc(collection(db, "admins"), {
          email: "admin@admin.com",
          senha: "123"
        });
        toast.success("Admin padrão criado: admin@admin.com / 123");
        setEmail("admin@admin.com");
        setPassword("123");
      } else {
        toast.info("Admin padrão já existe.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro: ${e.message || "Erro desconhecido ao criar admin."}`);
    }
  };

  // ------------------------------------------------------------------
  // Real-time Data Listeners
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingData(true);

    // Appointments Listener
    const qAppointments = query(collection(db, "agendamentos"), orderBy("data_hora", "desc"));
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data);
    });

    // Services Listener
    const unsubServices = onSnapshot(collection(db, "servicos"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(data);
    });

    // Professionals Listener
    const unsubProfessionals = onSnapshot(collection(db, "profissionais"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));
      setProfessionals(data);
    });

    setLoadingData(false);

    return () => {
      unsubAppointments();
      unsubServices();
      unsubProfessionals();
    };
  }, [isAuthenticated]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  
  // Seed Data
  const handleSeedData = async () => {
    if (!confirm("Isso irá adicionar os dados iniciais ao Firestore. Continuar?")) return;
    try {
      // Seed Services
      for (const svc of initialServices) {
        const { icon, ...svcData } = svc; 
        await setDoc(doc(db, "servicos", svc.id), svcData);
      }
      // Seed Professionals
      for (const prof of initialProfessionals) {
        await setDoc(doc(db, "profissionais", prof.id), prof);
      }
      toast.success("Dados iniciais importados com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar dados");
    }
  };

  // Appointments
  const updateStatus = async (id: string, status: 'confirmado' | 'recusado') => {
    try {
      const docRef = doc(db, "agendamentos", id);
      await updateDoc(docRef, { status });
      toast.success(`Agendamento ${status}`);

      // Auto-send WhatsApp if confirmed
      if (status === 'confirmado') {
        const appointment = appointments.find(a => a.id === id);
        if (appointment && appointment.whatsapp) {
            const phone = appointment.whatsapp.replace(/\D/g, '');
            const date = new Date(appointment.data_hora);
            const formattedDate = format(date, "dd 'de' MMMM", { locale: ptBR });
            const formattedTime = format(date, "HH:mm");
            
            const message = `Olá, ${appointment.nome_cliente}! Seu agendamento de *${appointment.servico}* com *${appointment.profissional}* para dia *${formattedDate} às ${formattedTime}* foi CONFIRMADO! Estamos te esperando.`;
            
            // Use web.whatsapp.com to force Web interface
            window.open(`https://web.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
        }
      }

    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      toast.success("Agendamento excluído");
    } catch (e) {
      toast.error("Erro ao excluir");
    }
  };

  // Services
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.price) return;
    try {
      await addDoc(collection(db, "servicos"), newService);
      setNewService({ name: "", price: "", duration: "" });
      toast.success("Serviço adicionado");
    } catch (e) {
      toast.error("Erro ao adicionar serviço");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Excluir serviço?")) return;
    await deleteDoc(doc(db, "servicos", id));
  };

  // Professionals
  const handleAddProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfessional.name) return;

    if (!newProfessional.services || newProfessional.services.length === 0) {
      toast.error("Selecione os serviços deste profissional");
      return;
    }

    try {
      await addDoc(collection(db, "profissionais"), { 
          ...newProfessional, 
          services: newProfessional.services 
      });
      setNewProfessional({ name: "", role: "", services: [] });
      toast.success("Profissional adicionado com sucesso!");
    } catch (e) {
      toast.error("Erro ao adicionar profissional");
    }
  };

  const handleDeleteProfessional = async (id: string) => {
      if (!confirm("Excluir profissional?")) return;
      await deleteDoc(doc(db, "profissionais", id));
  };


  // ------------------------------------------------------------------
  // Renders helpers
  // ------------------------------------------------------------------
  const renderAppointmentCard = (apt: Appointment) => {
    const serviceDetails = getServiceDetails(apt.servico);
    const startTime = format(new Date(apt.data_hora), "HH:mm");
    const endTime = getEndTime(apt.data_hora, serviceDetails?.duration);
    const isFirstTime = (apt as any).primeira_vez;
    const wantsReminder = (apt as any).receber_lembretes;

    return (
      <div key={apt.id} className="bg-white border p-4 rounded-lg flex flex-col lg:flex-row justify-between items-start gap-4 hover:shadow-md transition-all relative group">
          {/* Left Side: Status & Time */}
          <div className="flex flex-col gap-2 min-w-[140px] border-r pr-4">
             <div className="flex items-center gap-2">
               <Clock className="w-4 h-4 text-muted-foreground"/>
               <span className="font-bold text-lg">{startTime} {endTime && `- ${endTime}`}</span>
             </div>
             
             {/* Status Badges */}
             {apt.status === 'confirmado' && (
               <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 justify-center w-full">
                 <Check className="w-3 h-3 mr-1"/> Confirmado
               </Badge>
             )}
             {apt.status === 'pendente' && (
               <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 justify-center w-full">
                  <AlertCircle className="w-3 h-3 mr-1"/> Pendente
               </Badge>
             )}
             {apt.status === 'recusado' && (
               <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 justify-center w-full">
                 <X className="w-3 h-3 mr-1"/> Recusado
               </Badge>
             )}

             {/* Date if showing all/search/range */}
             {(dateFilterType === 'all' || dateFilterType === 'week' || dateFilterType === 'month' || dateFilterType === 'range' || searchTerm) && (
                <span className="text-xs text-muted-foreground text-center">
                  {format(new Date(apt.data_hora), "dd/MM/yyyy")}
                </span>
             )}
          </div>

          {/* Middle: Client & Service Info */}
          <div className="flex-1 space-y-2">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg uppercase text-slate-900 flex items-center gap-2">
                        {apt.nome_cliente}
                      </h3>
                      {isFirstTime && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] gap-1">
                          <Star className="w-3 h-3 fill-current"/> Primeira Vez
                        </Badge>
                      )}
                  </div>
               </div>

               <div className="flex items-center gap-3 text-sm">
                   {apt.whatsapp && (
                      <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border">
                          <Phone className="w-3 h-3"/>
                          <span>{apt.whatsapp}</span>
                          <a 
                              href={`https://wa.me/55${apt.whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="ml-1 text-green-600 hover:text-green-700"
                              title="Chamar no WhatsApp"
                          >
                              <MessageCircle className="w-4 h-4"/>
                          </a>
                      </div>
                   )}
                   {apt.email && (
                      <span className="text-muted-foreground hidden sm:inline-block">• {apt.email}</span>
                   )}
               </div>

               <div className="bg-slate-50 p-3 rounded-md border mt-2">
                   <div className="flex justify-between items-center mb-1">
                      <div className="flex flex-col">
                        <span className="font-medium uppercase text-slate-700">{apt.servico}</span>
                        <span className="text-[10px] text-muted-foreground">Prof: {apt.profissional}</span>
                      </div>
                      <span className="font-bold text-primary">{serviceDetails?.price || "R$ --"}</span>
                   </div>
                   <div className="flex items-center gap-4 text-xs text-muted-foreground">
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Duração: {serviceDetails?.duration || "--"}</span>
                       {wantsReminder && <span className="flex items-center gap-1 text-green-600">🔔 Receber lembretes</span>}
                   </div>
               </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-32 border-t lg:border-t-0 pt-4 lg:pt-0 mt-2 lg:mt-0 lg:border-l lg:pl-4">
              {apt.status === 'pendente' && (
                  <>
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(apt.id!, 'confirmado')}>
                          Aceitar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" 
                        onClick={() => {
                          if(confirm("Deseja realmente recusar este agendamento? O cliente será notificado.")) {
                            updateStatus(apt.id!, 'recusado');
                          }
                        }}
                      >
                        Recusar
                      </Button>
                  </>
              )}
              {apt.status !== 'pendente' && (
                 <div className="text-center w-full py-2 text-xs text-muted-foreground">
                    {apt.status === 'confirmado' ? 'Agendamento Confirmado' : 'Agendamento Recusado'}
                 </div>
              )}
              <Button size="sm" variant="ghost" className="w-full text-muted-foreground hover:text-destructive gap-2 h-8" onClick={() => deleteAppointment(apt.id!)}>
                  <Trash2 className="w-3 h-3"/> Excluir
              </Button>
          </div>
      </div>
    );
  };

  if (authLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Acesso Administrativo</h1>
            <p className="text-sm text-muted-foreground mt-2">Login via Banco de Dados</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@admin.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="123" />
            </div>
            {loginError && <p className="text-destructive text-sm">{loginError}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
            
            <div className="pt-4 border-t text-center">
               <button type="button" onClick={handleCreateDefaultAdmin} className="text-xs text-muted-foreground hover:text-primary underline">
                  Criar Admin Padrão (Seed)
               </button>
            </div>

            <Link to="/" className="block text-center text-sm text-muted-foreground mt-2 hover:text-primary">Voltar ao site</Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
             <h1 className="text-xl font-bold">Painel Admin</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>Sair</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="agenda">
          <TabsList className="mb-8 grid w-full grid-cols-4 lg:w-[600px] gap-2 bg-slate-100 p-1 border">
            <TabsTrigger 
              value="agenda" 
              className="data-[state=active]:bg-blue-700 data-[state=active]:text-white hover:bg-white/60 transition-colors relative"
            >
              Agenda
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="services"
              className="data-[state=active]:bg-purple-700 data-[state=active]:text-white hover:bg-white/60 transition-colors"
            >
              Serviços
            </TabsTrigger>
            <TabsTrigger 
              value="professionals"
              className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white hover:bg-white/60 transition-colors"
            >
              Profissionais
            </TabsTrigger>
            <TabsTrigger 
              value="config"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white hover:bg-white/60 transition-colors"
            >
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* TAB: AGENDA */}
          <TabsContent value="agenda" className="space-y-4">
            <div className="space-y-4 mb-6">
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                     <h2 className="text-2xl font-semibold">Agendamentos</h2>
                     <Badge variant="secondary" className="whitespace-nowrap">
                        {filteredAppointments.length} de {appointments.length}
                     </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                      <div className="relative w-full sm:w-64">
                          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Buscar cliente..." 
                            className="pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                      
                      <select 
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                      >
                        <option value="todos">Todos Status</option>
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="recusado">Recusado</option>
                      </select>

                      <select 
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={professionalFilter}
                        onChange={(e) => setProfessionalFilter(e.target.value)}
                      >
                        <option value="todos">Todos Profissionais</option>
                        {professionals.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                   <div className="flex items-center gap-1 bg-white border rounded-md p-1 mr-2">
                     <Button 
                        variant={viewMode === "lista" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setViewMode("lista")}
                        className="text-xs h-7"
                      >
                        Lista
                      </Button>
                      <Button 
                        variant={viewMode === "data" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setViewMode("data")}
                        className="text-xs h-7"
                      >
                        Por Data
                      </Button>
                      <Button 
                        variant={viewMode === "profissional" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setViewMode("profissional")}
                        className="text-xs h-7"
                      >
                        Por Profissional
                      </Button>
                   </div>

                   <div className="h-4 w-[1px] bg-border mx-1" />

                   <Button 
                     variant={dateFilterType === "today" ? "default" : "ghost"} 
                     size="sm" 
                     onClick={() => setDateFilterType("today")}
                     className="text-xs"
                   >
                      Hoje
                   </Button>
                   <Button 
                     variant={dateFilterType === "tomorrow" ? "default" : "ghost"} 
                     size="sm" 
                     onClick={() => setDateFilterType("tomorrow")}
                     className="text-xs"
                   >
                      Amanhã
                   </Button>
                   <Button 
                     variant={dateFilterType === "week" ? "default" : "ghost"} 
                     size="sm" 
                     onClick={() => setDateFilterType("week")}
                     className="text-xs"
                   >
                      Semana
                   </Button>
                   <Button 
                     variant={dateFilterType === "month" ? "default" : "ghost"} 
                     size="sm" 
                     onClick={() => setDateFilterType("month")}
                     className="text-xs"
                   >
                      Mês
                   </Button>
                   
                   <div className="h-4 w-[1px] bg-border mx-1" />
                   
                   <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                            variant={dateFilterType === "custom" || dateFilterType === "range" ? "secondary" : "ghost"} 
                            size="sm" 
                            className={cn("text-xs font-normal")}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateFilterType === 'custom' && selectedDate ? format(selectedDate, "dd/MM") : 
                           dateFilterType === 'range' && startDate && endDate ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")}` :
                           "Período"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="space-y-4">
                          <div className="space-y-2">
                             <p className="text-xs font-medium">Data Única</p>
                             <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                  setSelectedDate(date);
                                  setDateFilterType("custom");
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </div>
                          <div className="border-t pt-4 space-y-2">
                             <p className="text-xs font-medium">Intervalo de Datas</p>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Início</label>
                                  <Input type="date" value={startDate ? format(startDate, "yyyy-MM-dd") : ""} onChange={(e) => {
                                    setStartDate(new Date(e.target.value + 'T00:00:00'));
                                    setDateFilterType("range");
                                  }} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Fim</label>
                                  <Input type="date" value={endDate ? format(endDate, "yyyy-MM-dd") : ""} onChange={(e) => {
                                    setEndDate(new Date(e.target.value + 'T00:00:00'));
                                    setDateFilterType("range");
                                  }} className="h-8 text-xs" />
                                </div>
                             </div>
                             <Button size="sm" className="w-full h-7 text-[10px]" onClick={() => setDateFilterType("range")}>Aplicar Período</Button>
                          </div>
                        </div>
                      </PopoverContent>
                   </Popover>

                   <Button 
                     variant={dateFilterType === "all" ? "default" : "ghost"} 
                     size="sm" 
                     onClick={() => setDateFilterType("all")}
                     className="text-xs"
                   >
                      Ver Tudo
                   </Button>
                </div>
            </div>
            
            {loadingData && <Loader2 className="animate-spin mx-auto" />}
            
            {!loadingData && filteredAppointments.length === 0 && (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-card/50">
                   <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="w-6 h-6 opacity-50"/>
                   </div>
                   <h3 className="text-lg font-medium text-foreground">Nenhum agendamento encontrado</h3>
                   <p className="text-sm mb-6 max-w-xs mx-auto">Não há horários agendados para este filtro. Deseja adicionar um manualmente?</p>
                   
                   <Dialog open={openManual} onOpenChange={setOpenManual}>
                      <DialogTrigger asChild>
                          <Button><Plus className="w-4 h-4 mr-2"/> Criar Agendamento Manual</Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Novo Agendamento Manual</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleManualSubmit} className="space-y-4">
                              <div>
                                  <Label>Nome do Cliente</Label>
                                  <Input required value={manualBooking.nome} onChange={e => setManualBooking({...manualBooking, nome: e.target.value})} placeholder="Ex: João da Silva"/>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <Label>Serviço</Label>
                                     <select 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={manualBooking.servico}
                                        onChange={e => setManualBooking({...manualBooking, servico: e.target.value})}
                                        required
                                     >
                                        <option value="">Selecione...</option>
                                        {services.map(s => <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>)}
                                     </select>
                                  </div>
                                  <div>
                                     <Label>Profissional</Label>
                                     <select 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={manualBooking.profissional}
                                        onChange={e => setManualBooking({...manualBooking, profissional: e.target.value})}
                                        required
                                     >
                                        <option value="">Selecione...</option>
                                        {professionals.map(p => <option key={p.id} value={p.name}>{p.name.toUpperCase()}</option>)}
                                     </select>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <Label>Data</Label>
                                      <Input type="date" required value={manualBooking.date} onChange={e => setManualBooking({...manualBooking, date: e.target.value})} />
                                  </div>
                                  <div>
                                      <Label>Hora</Label>
                                      <Input type="time" required value={manualBooking.time} onChange={e => setManualBooking({...manualBooking, time: e.target.value})} />
                                  </div>
                              </div>
                              <Button type="submit" className="w-full">Criar Agendamento</Button>
                          </form>
                      </DialogContent>
                   </Dialog>
                </div>
            )}

            <div className="space-y-8">
              {(() => {
                if (viewMode === 'lista') {
                  return (
                    <div className="bg-white border rounded-xl overflow-hidden">
                       <div className="bg-slate-50 border-b px-4 py-3">
                          <h3 className="font-bold text-slate-800">LISTA DE AGENDAMENTOS</h3>
                       </div>
                       <div className="p-4 grid gap-3">
                         {filteredAppointments
                          .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                          .map((apt) => renderAppointmentCard(apt))}
                       </div>
                    </div>
                  );
                }

                if (viewMode === 'data') {
                  const groupedByDate = filteredAppointments.reduce((groups, apt) => {
                    const dateKey = format(new Date(apt.data_hora), "dd/MM/yyyy");
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(apt);
                    return groups;
                  }, {} as Record<string, Appointment[]>);

                  return Object.entries(groupedByDate)
                    .sort(([a], [b]) => {
                      const dateA = new Date(a.split('/').reverse().join('-'));
                      const dateB = new Date(b.split('/').reverse().join('-'));
                      return dateA.getTime() - dateB.getTime();
                    })
                    .map(([date, dateApts]) => (
                      <div key={date} className="bg-slate-50 border rounded-xl overflow-hidden">
                         <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <CalendarIcon className="w-5 h-5 text-primary" />
                               <h3 className="font-bold text-lg text-slate-800">{date}</h3>
                            </div>
                            <Badge variant="secondary" className="bg-slate-100">{dateApts.length} horários</Badge>
                         </div>
                         <div className="p-4 grid gap-3">
                           {dateApts
                            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                            .map((apt) => renderAppointmentCard(apt))}
                         </div>
                      </div>
                    ));
                }

                // Default: By Professional
                const groupedByProf = filteredAppointments.reduce((groups, apt) => {
                  const profName = apt.profissional || "Sem profissional";
                  if (!groups[profName]) groups[profName] = [];
                  groups[profName].push(apt);
                  return groups;
                }, {} as Record<string, Appointment[]>);

                return Object.entries(groupedByProf)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([profName, profApts]) => (
                    <div key={profName} className="bg-slate-50 border rounded-xl overflow-hidden">
                       <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {profName.charAt(0).toUpperCase()}
                             </div>
                             <h3 className="font-bold text-lg uppercase text-slate-800">{profName}</h3>
                          </div>
                          <Badge variant="secondary" className="bg-slate-100">{profApts.length} agendamentos</Badge>
                       </div>
                       <div className="p-4 grid gap-3">
                         {profApts
                          .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                          .map((apt) => renderAppointmentCard(apt))}
                       </div>
                    </div>
                  ));
              })()}
            </div>
          </TabsContent>

          {/* TAB: SERVICES */}
          <TabsContent value="services">
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold uppercase">Adicionar Serviço</h3>
                    <form onSubmit={handleAddService} className="space-y-3 bg-card p-4 rounded-lg border">
                        <div>
                            <Label className="uppercase">Nome</Label>
                            <Input 
                                value={newService.name} 
                                onChange={e => setNewService({...newService, name: e.target.value.toUpperCase()})} 
                                placeholder="Ex: CORTE DE CABELO" 
                            />
                        </div>
                        <div>
                             <Label className="uppercase">Descrição</Label>
                             <Input 
                                 value={newService.description || ""} 
                                 onChange={e => setNewService({...newService, description: e.target.value.toUpperCase()})} 
                                 placeholder="Ex: CORTE MODERNO" 
                             />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label className="uppercase">Preço</Label>
                                <Input 
                                    value={newService.price} 
                                    onChange={e => {
                                        // Simple currency masking
                                        let value = e.target.value.replace(/\D/g, "");
                                        value = (Number(value) / 100).toLocaleString("pt-BR", {
                                            style: "currency",
                                            currency: "BRL"
                                        });
                                        setNewService({...newService, price: value});
                                    }} 
                                    placeholder="R$ 0,00" 
                                />
                             </div>
                             <div>
                                <Label className="uppercase">Duração (minutos)</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number"
                                        value={newService.duration?.replace(/\D/g, "") || ""} 
                                        onChange={e => setNewService({...newService, duration: `${e.target.value} min`})} 
                                        placeholder="Ex: 45" 
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                                </div>
                             </div>
                        </div>
                        <Button type="submit" className="w-full uppercase"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button>
                    </form>
                </div>
                
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold uppercase">Lista de Serviços ({services.length})</h3>
                     <div className="space-y-2">
                        {services.map(svc => (
                            <div key={svc.id} className="flex justify-between items-center p-3 bg-card border rounded-md">
                                <div>
                                    <p className="font-medium uppercase">{svc.name}</p>
                                    <p className="text-xs text-muted-foreground uppercase">{svc.description}</p>
                                    <p className="text-xs text-muted-foreground">{svc.price} • {svc.duration}</p>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteService(svc.id!)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                            </div>
                        ))}
                     </div>
                </div>
             </div>
          </TabsContent>

          {/* TAB: PROFESSIONALS */}
          <TabsContent value="professionals">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold uppercase">Novo Profissional</h3>
                    <form onSubmit={handleAddProfessional} className="space-y-3 bg-card p-4 rounded-lg border">
                        <div>
                            <Label className="uppercase">Nome</Label>
                            <Input 
                                value={newProfessional.name} 
                                onChange={e => setNewProfessional({...newProfessional, name: e.target.value.toUpperCase()})} 
                                placeholder="Ex: ANA SILVA" 
                            />
                        </div>
                        <div>
                            <Label className="uppercase">Cargo / Especialidade</Label>
                            <Input 
                                value={newProfessional.role} 
                                onChange={e => setNewProfessional({...newProfessional, role: e.target.value.toUpperCase()})} 
                                placeholder="Ex: MANICURE" 
                            />
                        </div>
                        <div>
                            <Label className="uppercase">Cor do Cartão</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="color"
                                    value={newProfessional.color || "#0f172a"} 
                                    onChange={e => setNewProfessional({...newProfessional, color: e.target.value})} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground uppercase">{newProfessional.color || "Padrão"}</span>
                            </div>
                        </div>

                        <div>
                            <Label className="uppercase mb-2 block">Serviços Realizados</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-md bg-background">
                                {services.map(svc => (
                                    <div key={svc.id} className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox" 
                                            id={`svc-${svc.id}`}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={newProfessional.services?.includes(svc.name) || false}
                                            onChange={(e) => {
                                                const currentServices = newProfessional.services || [];
                                                if (e.target.checked) {
                                                    setNewProfessional({ ...newProfessional, services: [...currentServices, svc.name] });
                                                } else {
                                                    setNewProfessional({ ...newProfessional, services: currentServices.filter(s => s !== svc.name) });
                                                }
                                            }}
                                        />
                                        <label 
                                            htmlFor={`svc-${svc.id}`} 
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 uppercase cursor-pointer"
                                        >
                                            {svc.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button type="submit" className="w-full uppercase"><Plus className="w-4 h-4 mr-2"/> Cadastrar</Button>
                    </form>
                </div>
                
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold uppercase">Equipe ({professionals.length})</h3>
                     <div className="space-y-2">
                        {professionals.map(prof => (
                            <div key={prof.id} className="flex flex-col p-3 bg-card border rounded-md gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                            style={{ backgroundColor: prof.color || '#0f172a' }}
                                        >
                                            {prof.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium uppercase">{prof.name}</p>
                                            <p className="text-xs text-muted-foreground uppercase">{prof.role}</p>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteProfessional(prof.id!)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {prof.services && prof.services.length > 0 ? (
                                        prof.services.map(s => (
                                            <Badge key={s} variant="secondary" className="text-[10px] uppercase bg-slate-100 text-slate-600">
                                                {s}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground uppercase italic">Faz tudo (Padrão)</span>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
             </div>
          </TabsContent>

          {/* TAB: CONFIG */}
          <TabsContent value="config">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
