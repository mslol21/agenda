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
  Phone,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AppointmentStatus = "pendente" | "confirmado" | "recusado";

interface Appointment {
  id: string;
  nome_cliente: string;
  email: string;
  whatsapp: string;
  servico: string;
  data_hora: string;
  status: AppointmentStatus;
  created_at: string;
}

const statusConfig = {
  pendente: {
    label: "Pendente",
    variant: "outline" as const,
    className: "border-warning text-warning",
  },
  confirmado: {
    label: "Confirmado",
    variant: "default" as const,
    className: "bg-success text-success-foreground",
  },
  recusado: {
    label: "Recusado",
    variant: "destructive" as const,
    className: "",
  },
};

const Admin = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
      );

      toast.success(
        status === "confirmado"
          ? "Agendamento confirmado!"
          : "Agendamento recusado"
      );
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Erro ao atualizar agendamento");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = appointments.filter((a) => a.status === "pendente").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Painel do Prestador
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie seus agendamentos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </Badge>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAppointments}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum agendamento
            </h2>
            <p className="text-muted-foreground">
              Os agendamentos solicitados aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {appointments.map((appointment, index) => {
              const config = statusConfig[appointment.status];
              const isUpdating = updatingId === appointment.id;
              const isPending = appointment.status === "pendente";

              return (
                <div
                  key={appointment.id}
                  className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">
                            {appointment.servico}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(appointment.data_hora),
                              "EEEE, dd 'de' MMMM 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </p>
                        </div>
                        <Badge
                          variant={config.variant}
                          className={cn("shrink-0", config.className)}
                        >
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{appointment.nome_cliente}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <a
                            href={`https://wa.me/55${appointment.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
                          >
                            {appointment.whatsapp}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {isPending && (
                      <div className="flex gap-2 md:flex-col lg:flex-row">
                        <Button
                          onClick={() => updateStatus(appointment.id, "confirmado")}
                          disabled={isUpdating}
                          className="flex-1 md:flex-none gap-2"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Confirmar
                        </Button>
                        <Button
                          onClick={() => updateStatus(appointment.id, "recusado")}
                          disabled={isUpdating}
                          variant="outline"
                          className="flex-1 md:flex-none gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
