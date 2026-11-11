-- public-readiness REQ §5.1: the server reaches the database only with the secret
-- key (service_role). anon and authenticated keep no right on anything in public,
-- including what they held through PUBLIC (functions are executable by PUBLIC by
-- default) and what later migrations create. Run only after both environments
-- serve code on the secret key (DESIGN §9 step 3): code on the anon key stops here.

revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
revoke all on all functions in schema public from anon, authenticated, public;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Objects later migrations create (they run as postgres). Revoking per schema does
-- not cancel the global default that grants EXECUTE on new functions to PUBLIC.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;
-- supabase_admin's defaults cannot be changed from here: what it creates in public
-- still defaults to anon (REQ §5.1 exception); supabase/tests/access.sql finds it.

-- No policies: only service_role reaches these tables, and it is not bound by RLS.
alter table public.users enable row level security;
alter table public.guest_activity enable row level security;
