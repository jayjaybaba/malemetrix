-- mm-transform: FAL_KEY aus dem Supabase-Vault lesen können.
-- Hintergrund: Edge-Function-Secrets sind der dokumentierte Standardweg
-- (EDGE_FUNCTIONS.md). Dieser Getter ist der Fallback, damit der Key auch
-- ohne Dashboard-Zugriff sicher hinterlegt werden kann: Der Wert liegt
-- verschlüsselt im Vault (vault.create_secret — der Wert selbst steht
-- BEWUSST NICHT in dieser Migration), lesbar AUSSCHLIESSLICH für
-- service_role — anon/authenticated können die Funktion nicht ausführen,
-- Clients kommen strukturell nicht an den Key.
-- Live verifiziert 05.08.2026: service_role liest (len 69), anon → 42501.
create or replace function public.mm_get_fal_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'FAL_KEY' limit 1;
$$;

revoke all on function public.mm_get_fal_key() from public;
revoke all on function public.mm_get_fal_key() from anon;
revoke all on function public.mm_get_fal_key() from authenticated;
grant execute on function public.mm_get_fal_key() to service_role;
