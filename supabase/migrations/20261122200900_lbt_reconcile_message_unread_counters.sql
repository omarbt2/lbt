-- Recalculate unread counters after removing duplicate message-insert triggers.
CREATE OR REPLACE FUNCTION public.handle_message_read()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF NEW.is_read IS TRUE AND COALESCE(OLD.is_read,false) IS FALSE THEN
    UPDATE public.conversations c
    SET unread_count1=(
          SELECT count(*)::integer FROM public.messages m
          WHERE m.conversation_id=c.id AND m.sender_id<>c.participant1 AND COALESCE(m.is_read,false)=false
        ),
        unread_count2=(
          SELECT count(*)::integer FROM public.messages m
          WHERE m.conversation_id=c.id AND m.sender_id<>c.participant2 AND COALESCE(m.is_read,false)=false
        )
    WHERE c.id=NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.conversations c
SET unread_count1=(
      SELECT count(*)::integer FROM public.messages m
      WHERE m.conversation_id=c.id AND m.sender_id<>c.participant1 AND COALESCE(m.is_read,false)=false
    ),
    unread_count2=(
      SELECT count(*)::integer FROM public.messages m
      WHERE m.conversation_id=c.id AND m.sender_id<>c.participant2 AND COALESCE(m.is_read,false)=false
    );
