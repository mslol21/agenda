import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Settings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";

export const AdminSettings = () => {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<Settings>({
        days: {
            "0": { isOpen: false, startTime: "09:00", endTime: "18:00" }, // Domingo
            "1": { isOpen: true, startTime: "09:00", endTime: "18:00" }, // Segunda
            "2": { isOpen: true, startTime: "09:00", endTime: "18:00" }, // Terça
            "3": { isOpen: true, startTime: "09:00", endTime: "18:00" }, // Quarta
            "4": { isOpen: true, startTime: "09:00", endTime: "18:00" }, // Quinta
            "5": { isOpen: true, startTime: "09:00", endTime: "18:00" }, // Sexta
            "6": { isOpen: true, startTime: "09:00", endTime: "18:00" }, // Sábado
        },
        appointmentInterval: 60
    });

    const daysMap = [
        { id: "1", name: "Segunda-feira" },
        { id: "2", name: "Terça-feira" },
        { id: "3", name: "Quarta-feira" },
        { id: "4", name: "Quinta-feira" },
        { id: "5", name: "Sexta-feira" },
        { id: "6", name: "Sábado" },
        { id: "0", name: "Domingo" },
    ];

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as Settings);
                }
            } catch (error) {
                console.error("Erro ao buscar configurações:", error);
                toast.error("Erro ao carregar configurações.");
            }
        };
        fetchSettings();
    }, []);

    const handleDayChange = (dayId: string, field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            days: {
                ...prev.days,
                [dayId]: {
                    ...prev.days[dayId],
                    [field]: value
                }
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "settings", "general"), settings);
            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold uppercase">Horários de Funcionamento</h3>
                </div>

                <div className="grid gap-4">
                    {daysMap.map((day) => (
                        <div key={day.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background/50 rounded-md border">
                            <div className="flex items-center gap-3 min-w-[150px]">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={settings.days[day.id]?.isOpen || false}
                                    onChange={(e) => handleDayChange(day.id, "isOpen", e.target.checked)}
                                />
                                <span className={settings.days[day.id]?.isOpen ? "font-medium" : "text-muted-foreground"}>{day.name}</span>
                            </div>

                            <div className="flex items-center gap-2 flex-1">
                                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Início:</span>
                                        <Input 
                                            type="time" 
                                            className="w-32"
                                            value={settings.days[day.id]?.startTime || "09:00"}
                                            onChange={(e) => handleDayChange(day.id, "startTime", e.target.value)}
                                            disabled={!settings.days[day.id]?.isOpen}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Fim:</span>
                                        <Input 
                                            type="time" 
                                            className="w-32"
                                            value={settings.days[day.id]?.endTime || "18:00"}
                                            onChange={(e) => handleDayChange(day.id, "endTime", e.target.value)}
                                            disabled={!settings.days[day.id]?.isOpen}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {!settings.days[day.id]?.isOpen && (
                                <div className="text-xs font-semibold text-destructive px-3 py-1 bg-destructive/10 rounded-full">
                                    FECHADO
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold uppercase">Regras de Agendamento</h3>
                
                <div className="max-w-md">
                    <Label className="mb-2 block">Intervalo entre Horários</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={settings.appointmentInterval}
                        onChange={(e) => setSettings(prev => ({ ...prev, appointmentInterval: Number(e.target.value) }))}
                    >
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={45}>45 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={90}>1 hora e 30 min</option>
                        <option value={120}>2 horas</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-2">
                        Define de quanto em quanto tempo os horários serão gerados (ex: 09:00, 09:30, 10:00).
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto uppercase font-bold">
                    {loading ? "Salvando..." : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Configurações
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};
