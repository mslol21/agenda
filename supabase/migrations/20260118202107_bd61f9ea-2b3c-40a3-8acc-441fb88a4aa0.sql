-- Create function to check for conflicting appointments
CREATE OR REPLACE FUNCTION public.check_conflicting_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check if there's an existing appointment at the same time that is not refused
  IF EXISTS (
    SELECT 1 FROM public.agendamentos
    WHERE data_hora = NEW.data_hora
      AND status != 'recusado'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Já existe um agendamento para este horário. Por favor, escolha outro horário.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert or update
CREATE TRIGGER prevent_double_booking
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_conflicting_appointments();