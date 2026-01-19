import { useEffect, useState } from "react";
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

  // Filter States
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Manual Booking States
  const [openManual, setOpenManual] = useState(false);
  const [manualBooking, setManualBooking] = useState({
      nome: "",
      servico: "",
      profissional: "",
      date: "",
      time: ""
  });

  // Filter Logic
  const filteredAppointments = appointments.filter(apt => {
      if (!selectedDate) return true;
      const aptDate = new Date(apt.data_hora);
      return (
          aptDate.getDate() === selectedDate.getDate() &&
          aptDate.getMonth() === selectedDate.getMonth() &&
          aptDate.getFullYear() === selectedDate.getFullYear()
      );
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
  }, []);

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
  // Renders
  // ------------------------------------------------------------------

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
              className="data-[state=active]:bg-blue-700 data-[state=active]:text-white hover:bg-white/60 transition-colors"
            >
              Agenda
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                 <h2 className="text-2xl font-semibold">Agendamentos</h2>
                 <Badge variant="secondary">{filteredAppointments.length} de {appointments.length}</Badge>
              </div>
              
              <div className="flex items-center gap-2 bg-card border p-1 rounded-lg">
                 <Button 
                   variant={!selectedDate ? "secondary" : "ghost"} 
                   size="sm" 
                   onClick={() => setSelectedDate(undefined)}
                   className="text-xs"
                 >
                    Todos
                 </Button>
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={selectedDate ? "secondary" : "ghost"} size="sm" className={cn("text-xs justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {selectedDate ? format(selectedDate, "dd/MM") : "Filtrar Data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                 </Popover>
                 {selectedDate && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(undefined)}><X className="h-3 w-3"/></Button>}
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
              {Object.entries(
                filteredAppointments.reduce((groups, apt) => {
                  const profName = apt.profissional || "Sem profissional";
                  if (!groups[profName]) groups[profName] = [];
                  groups[profName].push(apt);
                  return groups;
                }, {} as Record<string, Appointment[]>)
              ).sort(([a], [b]) => a.localeCompare(b)) // Sort Professionals Alphabetically
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
                        .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()) // Sort by Time
                        .map((apt) => (
                        <div key={apt.id} className="bg-white border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {/* Status Badges */}
                                    {apt.status === 'confirmado' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Confirmado</Badge>}
                                    {apt.status === 'pendente' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Pendente</Badge>}
                                    {apt.status === 'recusado' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Recusado</Badge>}
                                    
                                    <span className="text-sm text-muted-foreground uppercase">• {apt.servico}</span>
                                </div>
                                
                                <h3 className="font-bold text-lg flex items-center gap-2 uppercase">
                                  {apt.nome_cliente}
                                  {apt.whatsapp && (
                                      <a 
                                        href={`https://wa.me/55${apt.whatsapp.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full w-6 h-6"
                                        title="Abrir WhatsApp"
                                      >
                                          <Phone className="w-3 h-3 fill-current" />
                                      </a>
                                  )}
                                </h3>

                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <CalendarIcon className="w-4 h-4"/>
                                        {format(new Date(apt.data_hora), "dd 'de' MMMM", { locale: ptBR })}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4"/>
                                        <span className="font-semibold text-foreground">{format(new Date(apt.data_hora), "HH:mm")}</span>
                                    </div>
                                </div>
                                
                            </div>
                            
                            <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                                {apt.status === 'pendente' && (
                                    <>
                                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(apt.id!, 'confirmado')}><Check className="w-4 h-4 mr-1"/> Aceitar</Button>
                                        <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => updateStatus(apt.id!, 'recusado')}><X className="w-4 h-4 mr-1"/> Recusar</Button>
                                    </>
                                )}
                                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => deleteAppointment(apt.id!)}><Trash2 className="w-4 h-4"/></Button>
                            </div>
                        </div>
                     ))}
                   </div>
                </div>
              ))}
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
