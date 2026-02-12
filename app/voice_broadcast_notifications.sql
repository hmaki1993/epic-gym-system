-- Trigger to notify users when a new voice broadcast is sent
-- This allows users to receive alerts even when the app is in the background or closed

CREATE OR REPLACE FUNCTION public.notify_voice_broadcast()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Get sender name
    SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
    sender_name := COALESCE(sender_name, 'Staff Member');

    -- Insert notification for all relevant users (managed by notification policies)
    -- This will trigger the global realtime listener even if the user is in the background
    INSERT INTO public.notifications (
        title, 
        message, 
        type, 
        user_id, -- user_id is NULL for global/targeted notifications
        target_role,
        related_student_id
    )
    VALUES (
        '🎙️ Walkie Talkie',
        sender_name || ' is broadcasting...',
        'general', -- Using 'general' as it's safe for high-priority alerts
        NULL,      -- NULL means it will be filtered by role in the select policy
        'all',      -- Special flag to indicate all roles should receive (or filter in SQL)
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_voice_broadcast ON public.voice_broadcasts;
CREATE TRIGGER on_voice_broadcast 
AFTER INSERT ON public.voice_broadcasts 
FOR EACH ROW EXECUTE FUNCTION public.notify_voice_broadcast();

-- Ensure voice_broadcasts table is in realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'voice_broadcasts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_broadcasts;
    END IF;
END $$;
