import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
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
    } catch (e) {
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
    try {
      await addDoc(collection(db, "profissionais"), { ...newProfessional, services: [] });
      setNewProfessional({ name: "", role: "" });
      toast.success("Profissional adicionado");
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
          <TabsList className="mb-8 grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="professionals">Profissionais</TabsTrigger>
            <TabsTrigger value="settings">Config</TabsTrigger>
          </TabsList>

          {/* TAB: AGENDA */}
          <TabsContent value="agenda" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Agendamentos</h2>
              <Badge variant="secondary">{appointments.length} Total</Badge>
            </div>
            
            {loadingData && <Loader2 className="animate-spin mx-auto" />}
            
            {!loadingData && appointments.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">Nenhum agendamento encontrado.</div>
            )}

            <div className="grid gap-4">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-card border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold">{apt.servico}</h3>
                            <Badge variant={apt.status === 'confirmado' ? 'default' : apt.status === 'recusado' ? 'destructive' : 'outline'}>
                                {apt.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {format(new Date(apt.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {apt.profissional && ` • com ${apt.profissional}`}
                        </p>
                        <p className="text-sm mt-1">
                            {apt.nome_cliente} • {apt.whatsapp}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {apt.status === 'pendente' && (
                            <>
                                <Button size="sm" onClick={() => updateStatus(apt.id!, 'confirmado')}><Check className="w-4 h-4 mr-1"/> Confirmar</Button>
                                <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id!, 'recusado')}><X className="w-4 h-4 mr-1"/> Recusar</Button>
                            </>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAppointment(apt.id!)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB: SERVICES */}
          <TabsContent value="services">
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Adicionar Serviço</h3>
                    <form onSubmit={handleAddService} className="space-y-3 bg-card p-4 rounded-lg border">
                        <div>
                            <Label>Nome</Label>
                            <Input value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="Ex: Corte de Cabelo" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label>Preço</Label>
                                <Input value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} placeholder="R$ 50" />
                             </div>
                             <div>
                                <Label>Duração</Label>
                                <Input value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})} placeholder="45 min" />
                             </div>
                        </div>
                        <Button type="submit" className="w-full"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button>
                    </form>
                </div>
                
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Lista de Serviços ({services.length})</h3>
                     <div className="space-y-2">
                        {services.map(svc => (
                            <div key={svc.id} className="flex justify-between items-center p-3 bg-card border rounded-md">
                                <div>
                                    <p className="font-medium">{svc.name}</p>
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
                    <h3 className="text-lg font-semibold">Novo Profissional</h3>
                    <form onSubmit={handleAddProfessional} className="space-y-3 bg-card p-4 rounded-lg border">
                        <div>
                            <Label>Nome</Label>
                            <Input value={newProfessional.name} onChange={e => setNewProfessional({...newProfessional, name: e.target.value})} placeholder="Ex: Ana Silva" />
                        </div>
                        <div>
                            <Label>Cargo / Especialidade</Label>
                            <Input value={newProfessional.role} onChange={e => setNewProfessional({...newProfessional, role: e.target.value})} placeholder="Ex: Manicure" />
                        </div>
                        <Button type="submit" className="w-full"><Plus className="w-4 h-4 mr-2"/> Cadastrar</Button>
                    </form>
                </div>
                
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Equipe ({professionals.length})</h3>
                     <div className="space-y-2">
                        {professionals.map(prof => (
                            <div key={prof.id} className="flex justify-between items-center p-3 bg-card border rounded-md">
                                <div>
                                    <p className="font-medium">{prof.name}</p>
                                    <p className="text-xs text-muted-foreground">{prof.role}</p>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteProfessional(prof.id!)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                            </div>
                        ))}
                     </div>
                </div>
             </div>
          </TabsContent>

          {/* TAB: SETTINGS */}
          <TabsContent value="settings">
            <div className="bg-card p-6 rounded-lg border text-center text-muted-foreground space-y-6">
                <div>
                  <SettingsIcon className="w-10 h-10 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">Configurações de Horário</h3>
                  <p>Funcionalidade em desenvolvimento.</p>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium mb-2">Ações de Desenvolvimento</h4>
                  <Button onClick={handleSeedData} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Popular Banco de Dados (Seed)
                  </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
