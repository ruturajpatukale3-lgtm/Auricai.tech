-- ═══════════════════════════════════════════════════════════
-- Auricai — Deal Events Database Trigger
-- ═══════════════════════════════════════════════════════════

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.log_deal_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Deal Creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.events (org_id, type, entity_id, metadata, created_at)
    VALUES (
      NEW.org_id, 
      'deal_created', 
      NEW.id, 
      jsonb_build_object(
        'deal_name', NEW.name, 
        'deal_value', NEW.value, 
        'deal_status', NEW.status
      ), 
      NOW()
    );
  
  -- Handle Deal Status Updates
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if the status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.events (org_id, type, entity_id, metadata, created_at)
      VALUES (
        NEW.org_id, 
        'deal_status_changed', 
        NEW.id, 
        jsonb_build_object(
          'deal_name', NEW.name, 
          'deal_value', NEW.value, 
          'old_status', OLD.status, 
          'new_status', NEW.status
        ), 
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the trigger if it already exists
DROP TRIGGER IF EXISTS deal_event_trigger ON public.deals;

-- 3. Create the trigger
CREATE TRIGGER deal_event_trigger
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_event();
