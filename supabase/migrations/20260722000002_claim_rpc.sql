-- =============================================================================
-- claim_access_code — HASHED token claim (P1-37).
-- The client submits the plaintext token over HTTPS; the server hashes it and
-- compares against access_codes.code_hash. Plaintext is never stored.
-- Authenticated-only, usage-capped, revocable, generic error (no info leak).
-- =============================================================================
create or replace function public.claim_access_code(code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  rec public.access_codes;
  k text;
  uid uuid := (select auth.uid());
  h text := encode(extensions.digest(upper(trim(code)), 'sha256'), 'hex');
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into rec from public.access_codes
    where access_codes.code_hash = h and active and used < max_uses
    for update;
  if rec.code_hash is null then raise exception 'invalid_code'; end if;
  update public.access_codes
    set used = used + 1, claimed_by = uid, claimed_at = now()
    where access_codes.code_hash = rec.code_hash;
  foreach k in array rec.product_keys loop
    insert into public.entitlements (user_id, product_key, source)
    values (uid, k, 'code') on conflict (user_id, product_key) do nothing;
  end loop;
end; $$;
revoke all on function public.claim_access_code(text) from public, anon;
grant execute on function public.claim_access_code(text) to authenticated;

-- Seeding (server-side, dev): generate a high-entropy token, store ONLY its hash.
--   with tok as (select 'MM-'||encode(gen_random_bytes(9),'hex') as t)
--   insert into public.access_codes(code_hash, product_keys, max_uses)
--   select encode(extensions.digest(upper(t),'sha256'),'hex'), array['protocol','twelve_week'], 1 from tok
--   returning (select upper(t) from tok);  -- note the token down; it is not stored
