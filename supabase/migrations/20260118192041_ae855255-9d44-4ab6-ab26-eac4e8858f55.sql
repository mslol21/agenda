-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('pendente', 'confirmado', 'recusado');

-- Create the appointments table
CREATE TABLE public.agendamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_cliente TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    servico TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert new appointments (public booking form)
CREATE POLICY "Anyone can create appointments"
ON public.agendamentos
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read appointments (for admin panel - will add auth later if needed)
CREATE POLICY "Anyone can view appointments"
ON public.agendamentos
FOR SELECT
USING (true);

-- Allow anyone to update appointments (for admin panel)
CREATE POLICY "Anyone can update appointments"
ON public.agendamentos
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();