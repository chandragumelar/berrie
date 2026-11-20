-- The client never receives grants on these tables.  The Edge function is the
-- only caller of the RPC and supplies a receipt that it has revalidated.
create table public.berrie_sync_operations (
 store_id uuid not null references public.berrie_access_stores(id),
 device_id uuid not null,
 epoch bigint not null check (epoch between 1 and 9007199254740991),
 local_sequence bigint not null check (local_sequence between 1 and 9007199254740991),
 operation_id uuid not null,
 payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
 receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
 grant_id uuid not null references public.berrie_access_grants(id),
 committed_at timestamptz not null default statement_timestamp(),
 checkpoint_hash text not null check (checkpoint_hash ~ '^[0-9a-f]{64}$'),
 primary key (store_id, operation_id),
 unique (store_id, device_id, epoch, local_sequence)
);
create table public.berrie_sync_stream_heads (
 store_id uuid not null references public.berrie_access_stores(id),
 device_id uuid not null,
 epoch bigint not null,
 local_sequence bigint not null,
 checkpoint_hash text not null check (checkpoint_hash ~ '^[0-9a-f]{64}$'),
 updated_at timestamptz not null default statement_timestamp(),
 primary key (store_id, device_id, epoch)
);
alter table public.berrie_sync_operations enable row level security;
alter table public.berrie_sync_stream_heads enable row level security;
revoke all on public.berrie_sync_operations, public.berrie_sync_stream_heads from public, anon, authenticated;
grant select, insert, update on public.berrie_sync_operations, public.berrie_sync_stream_heads to service_role;

-- p_receipt is already canonical and semantically validated in the trusted
-- Edge runtime.  This function owns order/idempotency/CAS so a failed insert
-- cannot leave either a receipt or its stream head behind.
create function public.berrie_sync_commit(
 p_store uuid, p_device uuid, p_epoch bigint, p_sequence bigint, p_operation uuid,
 p_hash text, p_receipt jsonb, p_grant uuid, p_checkpoint_hash text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 existing public.berrie_sync_operations%rowtype;
 head public.berrie_sync_stream_heads%rowtype;
 now_at timestamptz := statement_timestamp();
begin
 if p_store is null or p_device is null or p_epoch < 1 or p_sequence < 1 or p_operation is null
    or p_hash !~ '^[0-9a-f]{64}$' or p_checkpoint_hash !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_receipt) <> 'object' or p_grant is null then
  return jsonb_build_object('error','invalid_input');
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_store::text, 0));
 select * into existing from public.berrie_sync_operations where store_id=p_store and operation_id=p_operation;
 if existing.operation_id is not null then
  if existing.payload_hash <> p_hash then return jsonb_build_object('error','operation_conflict'); end if;
  return jsonb_build_object('status','ack','operationId',existing.operation_id,'sequence',existing.local_sequence,'committedAt',existing.committed_at,'checkpointHash',existing.checkpoint_hash,'duplicate',true);
 end if;
 select * into head from public.berrie_sync_stream_heads where store_id=p_store and device_id=p_device and epoch=p_epoch for update;
 if p_sequence <> coalesce(head.local_sequence,0)+1 then return jsonb_build_object('error','sequence_wait'); end if;
 insert into public.berrie_sync_operations(store_id,device_id,epoch,local_sequence,operation_id,payload_hash,receipt,grant_id,committed_at,checkpoint_hash)
 values(p_store,p_device,p_epoch,p_sequence,p_operation,p_hash,p_receipt,p_grant,now_at,p_checkpoint_hash);
 insert into public.berrie_sync_stream_heads(store_id,device_id,epoch,local_sequence,checkpoint_hash,updated_at)
 values(p_store,p_device,p_epoch,p_sequence,p_checkpoint_hash,now_at)
 on conflict(store_id,device_id,epoch) do update set local_sequence=excluded.local_sequence,checkpoint_hash=excluded.checkpoint_hash,updated_at=excluded.updated_at;
 return jsonb_build_object('status','ack','operationId',p_operation,'sequence',p_sequence,'committedAt',now_at,'checkpointHash',p_checkpoint_hash,'duplicate',false);
end $$;
revoke execute on function public.berrie_sync_commit(uuid,uuid,bigint,bigint,uuid,text,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.berrie_sync_commit(uuid,uuid,bigint,bigint,uuid,text,jsonb,uuid,text) to service_role;
