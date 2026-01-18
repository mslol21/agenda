import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";

const timeSlots = [
  { time: "09:00", period: "Manhã" },
  { time: "10:00", period: "Manhã" },
  { time: "11:00", period: "Manhã" },
  { time: "14:00", period: "Tarde" },
  { time: "15:00", period: "Tarde" },
  { time: "16:00", period: "Tarde" },
  { time: "17:00", period: "Tarde" },
  { time: "18:00", period: "Tarde" },
];

interface TimeSlotPickerProps {
  selectedDate: Date | undefined;
  selectedTime: string;
  onSelectTime: (time: string) => void;
}

export const TimeSlotPicker = ({
  selectedDate,
  selectedTime,
  onSelectTime,
}: TimeSlotPickerProps) => {
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDate) {
        setBookedTimes([]);
        return;
      }

      setIsLoading(true);
      try {
        // Get start and end of the selected day
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Firestore Query
        // Note: We store dates as ISO strings in "data_hora" field.
        const bookingsRef = collection(db, "agendamentos");
        const q = query(
            bookingsRef,
            where("data_hora", ">=", startOfDay.toISOString()),
            where("data_hora", "<=", endOfDay.toISOString())
        );

        const querySnapshot = await getDocs(q);
        const booked: string[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Filter out 'recusado' manually if compound query index is missing, 
            // or add .where("status", "!=", "recusado") if index exists.
            // Safe bet for dev without index creation: filter in JS.
            if (data.status !== "recusado") {
                const date = new Date(data.data_hora);
                booked.push(
                    `${date.getHours().toString().padStart(2, "0")}:${date
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`
                );
            }
        });

        setBookedTimes(booked);
      } catch (error) {
        console.error("Error fetching booked times:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedTimes();
  }, [selectedDate]);

  const morningSlots = timeSlots.filter((slot) => slot.period === "Manhã");
  const afternoonSlots = timeSlots.filter((slot) => slot.period === "Tarde");

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Selecione uma data primeiro</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderTimeSlot = (slot: { time: string; period: string }) => {
    const isBooked = bookedTimes.includes(slot.time);
    const isSelected = selectedTime === slot.time;

    return (
      <button
        key={slot.time}
        type="button"
        disabled={isBooked}
        onClick={() => onSelectTime(slot.time)}
        className={cn(
          "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          isBooked && "bg-muted/50 border-muted cursor-not-allowed opacity-60",
          isSelected && !isBooked && "border-primary bg-primary/10 shadow-md",
          !isSelected && !isBooked && "border-border hover:border-primary/50 hover:bg-accent cursor-pointer"
        )}
      >
        <span
          className={cn(
            "text-lg font-semibold",
            isBooked && "text-muted-foreground line-through",
            isSelected && !isBooked && "text-primary"
          )}
        >
          {slot.time}
        </span>
        {isBooked && (
          <span className="text-xs text-destructive mt-1">Ocupado</span>
        )}
        {isSelected && !isBooked && (
          <span className="text-xs text-primary mt-1">Selecionado</span>
        )}
      </button>
    );
  };

  const availableCount = timeSlots.length - bookedTimes.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {availableCount} horário{availableCount !== 1 ? "s" : ""} disponível
          {availableCount !== 1 ? "is" : ""}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-border bg-background"></span>
            Livre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-muted/50 border border-muted"></span>
            Ocupado
          </span>
        </div>
      </div>

      {/* Morning slots */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <span className="text-amber-500">☀️</span> Manhã
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {morningSlots.map(renderTimeSlot)}
        </div>
      </div>

      {/* Afternoon slots */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <span className="text-orange-500">🌅</span> Tarde
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {afternoonSlots.map(renderTimeSlot)}
        </div>
      </div>
    </div>
  );
};
