import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { Settings } from "@/types";

interface TimeSlotPickerProps {
  selectedDate: Date | undefined;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  settings: Settings | null;
  professionalName?: string;
}

export const TimeSlotPicker = ({
  selectedDate,
  selectedTime,
  onSelectTime,
  settings,
  professionalName
}: TimeSlotPickerProps) => {
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [generatedSlots, setGeneratedSlots] = useState<{ time: string; period: string }[]>([]);

  // Generate slots based on settings
  useEffect(() => {
    if (!settings || !selectedDate) {
      setGeneratedSlots([]);
      return;
    }

    const dayId = selectedDate.getDay().toString();
    const dayConfig = settings.days[dayId];

    if (!dayConfig || !dayConfig.isOpen) {
      setGeneratedSlots([]);
      return;
    }

    const slots: { time: string; period: string }[] = [];
    const interval = settings.appointmentInterval || 60; // default 60 min

    const [startHour, startMin] = dayConfig.startTime.split(':').map(Number);
    const [endHour, endMin] = dayConfig.endTime.split(':').map(Number);

    let current = new Date(selectedDate);
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(endHour, endMin, 0, 0);

    const now = new Date();
    // Margin of 2 hours from now
    const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    while (current < end) {
      // Check if slot is in the past or within 2 hour margin
      // Note: current is the slot start time
      if (current < minBookingTime) {
         current.setMinutes(current.getMinutes() + interval);
         continue; 
      }

      const timeStr = formatTime(current);
      const hour = current.getHours();
      let period = "Manhã";
      if (hour >= 12 && hour < 18) period = "Tarde";
      if (hour >= 18) period = "Noite";

      slots.push({ time: timeStr, period });

      current.setMinutes(current.getMinutes() + interval);
    }

    setGeneratedSlots(slots);

  }, [settings, selectedDate]);

  // Helper
  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Fetch bookings
  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDate) {
        setBookedTimes([]);
        return;
      }

      setLoadingBookings(true);
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

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
            // Filter by professional if provided
            if (data.status !== "recusado") {
                if (professionalName && data.profissional !== professionalName) {
                    return; // Skip if it's for another professional
                }
                const date = new Date(data.data_hora);
                booked.push(formatTime(date));
            }
        });

        setBookedTimes(booked);
      } catch (error) {
        console.error("Error fetching booked times:", error);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookedTimes();
  }, [selectedDate, professionalName]); // Added professionalName dependency

  if (!settings) {
      return <div className="p-4 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto"/> Carregando configurações...</div>;
  }

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Selecione uma data primeiro</p>
      </div>
    );
  }

  if (loadingBookings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Check if day is closed
  const dayConfig = settings.days[selectedDate.getDay().toString()];
  if (!dayConfig?.isOpen) {
      return (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-destructive" />
            <p className="text-sm font-medium">Não atendemos neste dia.</p>
          </div>
      );
  }

  if (generatedSlots.length === 0) {
      return <div className="py-8 text-center text-muted-foreground">Nenhum horário configurado.</div>;
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
      </button>
    );
  };

  const availableCount = generatedSlots.length - bookedTimes.length;
  const morningSlots = generatedSlots.filter(s => s.period === "Manhã");
  const afternoonSlots = generatedSlots.filter(s => s.period === "Tarde");
  const nightSlots = generatedSlots.filter(s => s.period === "Noite");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {availableCount > 0 ? `${availableCount} horários disponíveis` : "Sem horários livres"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Livre</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted"></span> Ocupado</span>
        </div>
      </div>

      {morningSlots.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Manhã</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{morningSlots.map(renderTimeSlot)}</div>
        </div>
      )}

      {afternoonSlots.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-4">Tarde</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{afternoonSlots.map(renderTimeSlot)}</div>
        </div>
      )}

      {nightSlots.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-4">Noite</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{nightSlots.map(renderTimeSlot)}</div>
        </div>
      )}
    </div>
  );
};
