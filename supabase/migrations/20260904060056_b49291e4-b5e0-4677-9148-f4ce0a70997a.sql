-- Corridor master data
create table public.road_segments (
  id text primary key,
  name text not null,
  highway text not null,
  from_city text not null,
  to_city text not null,
  length_km numeric not null,
  terrain text not null,
  road_condition int not null,
  landslide_risk int not null,
  flood_risk int not null,
  rainfall_mm_24h int not null,
  closed boolean not null default false,
  lane_width_m numeric not null,
  max_vehicle_tonnes numeric not null,
  path jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.road_segments to anon, authenticated;
grant all on public.road_segments to service_role;
alter table public.road_segments enable row level security;
create policy "road_segments readable" on public.road_segments for select using (true);
create policy "road_segments insertable" on public.road_segments for insert with check (true);
create policy "road_segments updatable" on public.road_segments for update using (true) with check (true);

-- Incidents
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('INC-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 4)),
  type text not null,
  segment_id text references public.road_segments(id) on delete set null,
  location text not null default '',
  lat double precision not null,
  lng double precision not null,
  severity text not null default 'Medium',
  status text not null default 'Open',
  affected_road text not null default '',
  clearance_hours int not null default 6,
  note text not null default '',
  photo_url text,
  source text not null default 'field',
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index incidents_segment_idx on public.incidents (segment_id);
create index incidents_status_idx on public.incidents (status);
grant select, insert, update on public.incidents to anon, authenticated;
grant all on public.incidents to service_role;
alter table public.incidents enable row level security;
create policy "incidents readable" on public.incidents for select using (true);
create policy "incidents insertable" on public.incidents for insert with check (true);
create policy "incidents updatable" on public.incidents for update using (true) with check (true);

-- Shipments
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  origin_id text not null,
  destination_id text not null,
  cargo text not null,
  cargo_type text not null default 'general',
  weight_tonnes numeric not null default 0,
  vehicle text not null default '',
  priority text not null default 'standard',
  route_name text not null default '',
  segment_ids text[] not null default '{}',
  eta timestamptz,
  status text not null default 'Planned',
  risk_score int not null default 0,
  operator text not null default '',
  delay_hours numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipments_status_idx on public.shipments (status);
grant select, insert, update on public.shipments to anon, authenticated;
grant all on public.shipments to service_role;
alter table public.shipments enable row level security;
create policy "shipments readable" on public.shipments for select using (true);
create policy "shipments insertable" on public.shipments for insert with check (true);
create policy "shipments updatable" on public.shipments for update using (true) with check (true);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  severity text not null default 'Warning',
  title text not null,
  body text not null default '',
  segment_id text,
  shipment_code text,
  incident_id uuid references public.incidents(id) on delete cascade,
  acknowledged boolean not null default false,
  source text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index alerts_created_idx on public.alerts (created_at desc);
grant select, insert, update on public.alerts to anon, authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "alerts readable" on public.alerts for select using (true);
create policy "alerts insertable" on public.alerts for insert with check (true);
create policy "alerts updatable" on public.alerts for update using (true) with check (true);

-- updated_at maintenance
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger road_segments_updated_at before update on public.road_segments
  for each row execute function public.update_updated_at_column();
create trigger incidents_updated_at before update on public.incidents
  for each row execute function public.update_updated_at_column();
create trigger shipments_updated_at before update on public.shipments
  for each row execute function public.update_updated_at_column();
create trigger alerts_updated_at before update on public.alerts
  for each row execute function public.update_updated_at_column();

-- Event-driven alert generation from real incident activity
create or replace function public.generate_incident_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  road text;
begin
  road := coalesce(nullif(new.affected_road, ''), coalesce(new.segment_id, 'corridor'));

  if tg_op = 'INSERT' and new.status <> 'Resolved' and new.severity in ('High', 'Critical') then
    insert into public.alerts (kind, severity, title, body, segment_id, incident_id, source)
    values (
      case when new.type in ('Road closure', 'Landslide') and new.severity = 'Critical'
        then 'Route blocked' else 'High disaster risk' end,
      case when new.severity = 'Critical' then 'Critical' else 'Warning' end,
      new.severity || ' ' || lower(new.type) || ' on ' || road,
      coalesce(nullif(new.note, ''), 'Field-reported incident') || ' — ' || new.location
        || '. Estimated clearance ' || new.clearance_hours || ' h. Affected routes are being re-scored.',
      new.segment_id, new.id, 'incident'
    );
  elsif tg_op = 'UPDATE' and new.status = 'Resolved' and old.status <> 'Resolved' then
    insert into public.alerts (kind, severity, title, body, segment_id, incident_id, source)
    values (
      'Accessibility deterioration', 'Info',
      lower(new.type) || ' cleared on ' || road,
      'Incident ' || new.code || ' marked resolved. Corridor risk and accessibility have been recalculated.',
      new.segment_id, new.id, 'incident'
    );
  elsif tg_op = 'UPDATE' and new.severity <> old.severity and new.status <> 'Resolved'
        and new.severity in ('High', 'Critical') then
    insert into public.alerts (kind, severity, title, body, segment_id, incident_id, source)
    values (
      'High disaster risk',
      case when new.severity = 'Critical' then 'Critical' else 'Warning' end,
      'Severity raised to ' || new.severity || ' on ' || road,
      'Incident ' || new.code || ' escalated from ' || old.severity || ' to ' || new.severity
        || '. Route ranking will be recalculated.',
      new.segment_id, new.id, 'incident'
    );
  end if;

  return new;
end;
$$;

create trigger incidents_alert_insert after insert on public.incidents
  for each row execute function public.generate_incident_alert();
create trigger incidents_alert_update after update on public.incidents
  for each row execute function public.generate_incident_alert();