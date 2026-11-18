-- Access data is private to the service role. The Edge Function authenticates
-- the user before invoking any internal database operations.
create table public.berrie_access_stores (
 id uuid primary key,
 owner_user_id uuid not null unique references auth.users(id),
 name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
 time_zone text not null check (time_zone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura')),
 trial_started_at timestamptz not null,
 entitlement_end timestamptz not null check (entitlement_end = trial_started_at + interval '1440 hours'),
 policy_version bigint not null check (policy_version between 1 and 9007199254740991),
 policy_snapshot jsonb not null check (jsonb_typeof(policy_snapshot) = 'object'),
 policy_hash text not null check (policy_hash ~ '^[0-9a-f]{64}$')
);
create table public.berrie_access_devices (
 store_id uuid primary key references public.berrie_access_stores(id),
 device_id uuid not null unique,
 epoch bigint not null check (epoch between 1 and 9007199254740991),
 binding_hash text not null check (binding_hash ~ '^[0-9a-f]{64}$'),
 permit_sequence bigint not null check (permit_sequence between 1 and 9007199254740991)
);
create table public.berrie_access_grants (
 id uuid primary key,
 owner_user_id uuid not null references auth.users(id),
 operation_id uuid not null,
 action text not null check (action in ('activate','refresh')),
 request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
 store_id uuid not null references public.berrie_access_stores(id),
 device_id uuid not null,
 epoch bigint not null check (epoch between 1 and 9007199254740991),
 permit_sequence bigint not null check (permit_sequence between 1 and 9007199254740991),
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 policy_snapshot jsonb not null check (jsonb_typeof(policy_snapshot) = 'object'),
 response_json jsonb check (response_json is null or jsonb_typeof(response_json) = 'object'),
 created_at timestamptz not null,
 unique (owner_user_id,operation_id),
 unique (store_id,device_id,epoch,permit_sequence)
);
create table public.berrie_access_audit (
 id uuid primary key,
 owner_user_id uuid not null references auth.users(id),
 store_id uuid not null references public.berrie_access_stores(id),
 grant_id uuid not null unique references public.berrie_access_grants(id),
 action text not null check (action in ('activate','refresh')),
 recorded_at timestamptz not null,
 detail jsonb not null check (jsonb_typeof(detail) = 'object')
);

alter table public.berrie_access_stores enable row level security;
alter table public.berrie_access_devices enable row level security;
alter table public.berrie_access_grants enable row level security;
alter table public.berrie_access_audit enable row level security;
revoke all on public.berrie_access_stores, public.berrie_access_devices, public.berrie_access_grants, public.berrie_access_audit from public, anon, authenticated;
grant select, insert, update on public.berrie_access_stores, public.berrie_access_devices, public.berrie_access_grants to service_role;
grant select, insert on public.berrie_access_audit to service_role;

-- The unsigned grant is immutable. A signed response may be filled exactly once.
create function public.berrie_access_guard_grant() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_op = 'DELETE' then raise exception 'grant immutable'; end if;
 if (to_jsonb(new) - 'response_json') is distinct from (to_jsonb(old) - 'response_json')
    or old.response_json is not null or new.response_json is null then
  raise exception 'grant immutable';
 end if;
 return new;
end $$;
create trigger berrie_access_grant_immutable before update or delete on public.berrie_access_grants
for each row execute function public.berrie_access_guard_grant();
revoke execute on function public.berrie_access_guard_grant() from public, anon, authenticated;

-- Call only from service role after validating Auth user, request and signer.
-- Each invocation holds the owner lock until transaction commit, including retries.
create function public.berrie_access_create_grant(
 p_owner uuid, p_operation uuid, p_action text, p_request_hash text,
 p_device uuid, p_binding_hash text, p_store uuid, p_name text, p_time_zone text,
 p_key_id text, p_policy jsonb, p_policy_hash text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 s public.berrie_access_stores%rowtype;
 d public.berrie_access_devices%rowtype;
 g public.berrie_access_grants%rowtype;
 now_at timestamptz := date_trunc('milliseconds', statement_timestamp());
 payload jsonb;
 grant_id uuid := gen_random_uuid();
begin
 if p_owner is null or p_operation is null or p_device is null or p_action not in ('activate','refresh')
   or p_request_hash !~ '^[0-9a-f]{64}$' or p_binding_hash !~ '^[0-9a-f]{64}$'
   or p_key_id !~ '^[A-Za-z0-9._:-]{1,200}$' then return jsonb_build_object('error','invalid_input'); end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 0));
 select * into s from public.berrie_access_stores where owner_user_id=p_owner;
 select * into g from public.berrie_access_grants where owner_user_id=p_owner and operation_id=p_operation;
 if g.id is not null then
  if g.request_hash <> p_request_hash or g.action <> p_action then return jsonb_build_object('error','operation_conflict'); end if;
  select * into d from public.berrie_access_devices where store_id=g.store_id;
  if s.id is distinct from g.store_id or d.device_id is distinct from g.device_id or d.epoch is distinct from g.epoch or d.binding_hash is distinct from p_binding_hash then return jsonb_build_object('error','forbidden'); end if;
  if now_at >= to_timestamp(least((g.payload->>'verifiedAt')::numeric,(g.payload->>'entitlementEnd')::numeric)/1000) + interval '168 hours' then return jsonb_build_object('error','grant_expired'); end if;
  return jsonb_build_object('grant',to_jsonb(g),'store',to_jsonb(s));
 end if;
 if p_action='activate' then
  if s.id is not null then
   select * into d from public.berrie_access_devices where store_id=s.id;
   if d.device_id=p_device and d.binding_hash=p_binding_hash then return jsonb_build_object('error','already_activated'); end if;
   return jsonb_build_object('error','device_conflict');
  end if;
  if p_store is null or p_name is null or p_name<>btrim(p_name) or char_length(p_name) not between 1 and 80
    or p_time_zone not in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura') or p_policy is null or p_policy_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error','invalid_input'); end if;
  insert into public.berrie_access_stores values (p_store,p_owner,p_name,p_time_zone,now_at,now_at+interval '1440 hours',1,p_policy,p_policy_hash) returning * into s;
  insert into public.berrie_access_devices values (s.id,p_device,1,p_binding_hash,1) returning * into d;
 else
  if s.id is null or s.id is distinct from p_store then return jsonb_build_object('error','forbidden'); end if;
  select * into d from public.berrie_access_devices where store_id=s.id for update;
  if d.device_id is distinct from p_device or d.binding_hash is distinct from p_binding_hash then return jsonb_build_object('error','forbidden'); end if;
  if now_at >= s.entitlement_end + interval '168 hours' then return jsonb_build_object('error','entitlement_expired'); end if;
  if d.permit_sequence >= 9007199254740991 then return jsonb_build_object('error','service_unavailable'); end if;
  update public.berrie_access_devices set permit_sequence=permit_sequence+1 where store_id=s.id returning * into d;
 end if;
 payload:=jsonb_build_object('version',2,'algorithm','ES256','keyId',p_key_id,'storeId',s.id,'deviceId',d.device_id,'epoch',d.epoch,'actorId',p_owner,'role','owner','scope','cashier','sequence',d.permit_sequence,'verifiedAt',(extract(epoch from now_at)*1000)::bigint,'entitlementEnd',(extract(epoch from s.entitlement_end)*1000)::bigint,'policyVersion',s.policy_version,'policyHash',s.policy_hash);
 insert into public.berrie_access_grants (id,owner_user_id,operation_id,action,request_hash,store_id,device_id,epoch,permit_sequence,payload,policy_snapshot,created_at)
 values (grant_id,p_owner,p_operation,p_action,p_request_hash,s.id,d.device_id,d.epoch,d.permit_sequence,payload,s.policy_snapshot,now_at) returning * into g;
 insert into public.berrie_access_audit values (gen_random_uuid(),p_owner,s.id,g.id,p_action,now_at,jsonb_build_object('deviceId',d.device_id,'epoch',d.epoch,'sequence',d.permit_sequence));
 return jsonb_build_object('grant',to_jsonb(g),'store',to_jsonb(s));
end $$;
revoke execute on function public.berrie_access_create_grant(uuid,uuid,text,text,uuid,text,uuid,text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.berrie_access_create_grant(uuid,uuid,text,text,uuid,text,uuid,text,text,text,jsonb,text) to service_role;

-- Serializes competing signers; never replaces a response already stored.
create function public.berrie_access_finalize_grant(
 p_owner uuid, p_grant uuid, p_binding_hash text, p_payload jsonb, p_response jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 g public.berrie_access_grants%rowtype;
 d public.berrie_access_devices%rowtype;
 s public.berrie_access_stores%rowtype;
 now_at timestamptz := statement_timestamp();
begin
 select * into g from public.berrie_access_grants where id=p_grant and owner_user_id=p_owner for update;
 if g.id is null or g.payload is distinct from p_payload then return jsonb_build_object('error','forbidden'); end if;
 select * into s from public.berrie_access_stores where id=g.store_id and owner_user_id=p_owner;
 select * into d from public.berrie_access_devices where store_id=g.store_id;
 if s.id is null or d.device_id is distinct from g.device_id or d.epoch is distinct from g.epoch or d.binding_hash is distinct from p_binding_hash then return jsonb_build_object('error','forbidden'); end if;
 if now_at >= to_timestamp(least((g.payload->>'verifiedAt')::numeric,(g.payload->>'entitlementEnd')::numeric)/1000) + interval '168 hours' then return jsonb_build_object('error','grant_expired'); end if;
 if g.response_json is not null then return jsonb_build_object('response',g.response_json); end if;
 if jsonb_typeof(p_response) <> 'object' or p_response->>'status' <> 'ok' or p_response->>'grantId' <> g.id::text
   or p_response->'permit'->'payload' is distinct from g.payload or p_response->'policy' is distinct from g.policy_snapshot
   or p_response->'identity' is distinct from jsonb_build_object('storeId',g.store_id,'deviceId',g.device_id,'epoch',g.epoch,'actorId',g.owner_user_id)
   or p_response->'store' is distinct from jsonb_build_object('id',s.id,'name',s.name,'timeZone',s.time_zone,'trialStartedAt',to_jsonb(s.trial_started_at),'entitlementEnd',to_jsonb(s.entitlement_end))
   or coalesce(p_response->'permit'->>'signature','') !~ '^[A-Za-z0-9_-]{86}$' then return jsonb_build_object('error','invalid_input'); end if;
 update public.berrie_access_grants set response_json=p_response where id=g.id returning * into g;
 return jsonb_build_object('response',g.response_json);
end $$;
revoke execute on function public.berrie_access_finalize_grant(uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.berrie_access_finalize_grant(uuid,uuid,text,jsonb,jsonb) to service_role;
