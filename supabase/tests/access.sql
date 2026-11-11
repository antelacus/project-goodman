-- public-readiness REQ §anon-denied, §default-privileges, §rls-all.
-- Run on the live database after every migration; it changes nothing (rolled back).
-- Any failure raises with the offending objects.
begin;

do $$
declare
  open_objects text;
  probe_open text;
  no_rls text;
  service_missing text;
begin
  -- §anon-denied: effective rights, PUBLIC included.
  select string_agg(format('%s %s', kind, name), ', ') into open_objects from (
    select 'table' kind, c.relname name from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
       and (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         or has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
    union all
    select 'sequence', c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'S'
       and (has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE') or has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE'))
    union all
    select 'function', p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) o;
  if open_objects is not null then raise exception 'anon-denied: open to anon/authenticated: %', open_objects; end if;

  -- §default-privileges: what a migration (postgres) creates next.
  create table public.zz_access_probe (id int);
  create sequence public.zz_access_probe_seq;
  create function public.zz_access_probe_fn() returns int language sql as 'select 1';
  select string_agg(x, ', ') into probe_open from (
    select 'table' x where has_table_privilege('anon', 'public.zz_access_probe', 'SELECT,INSERT') or has_table_privilege('authenticated', 'public.zz_access_probe', 'SELECT,INSERT')
    union all select 'sequence' where has_sequence_privilege('anon', 'public.zz_access_probe_seq', 'USAGE') or has_sequence_privilege('authenticated', 'public.zz_access_probe_seq', 'USAGE')
    union all select 'function' where has_function_privilege('anon', 'public.zz_access_probe_fn()', 'EXECUTE') or has_function_privilege('public', 'public.zz_access_probe_fn()', 'EXECUTE')
    union all select 'service_role cannot use the new table' where not (has_table_privilege('service_role', 'public.zz_access_probe', 'SELECT') and has_table_privilege('service_role', 'public.zz_access_probe', 'INSERT') and has_table_privilege('service_role', 'public.zz_access_probe', 'UPDATE') and has_table_privilege('service_role', 'public.zz_access_probe', 'DELETE'))
  ) p;
  if probe_open is not null then raise exception 'default-privileges: new objects open: %', probe_open; end if;

  -- §rls-all
  select string_agg(c.relname, ', ') into no_rls from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
     and c.relname not like 'zz_access_probe%';
  if no_rls is not null then raise exception 'rls-all: RLS disabled on: %', no_rls; end if;

  -- The secret key (service_role) still reaches everything the app uses.
  select string_agg(c.relname, ', ') into service_missing from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not (has_table_privilege('service_role', c.oid, 'SELECT') and has_table_privilege('service_role', c.oid, 'INSERT')
          and has_table_privilege('service_role', c.oid, 'UPDATE') and has_table_privilege('service_role', c.oid, 'DELETE'));
  if service_missing is not null then raise exception 'service_role lost rights on: %', service_missing; end if;

  raise notice 'access.sql: all checks passed';
end $$;

rollback;
