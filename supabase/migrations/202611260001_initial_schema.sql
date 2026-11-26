create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table public.plant_species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null unique,
  scientific_name text,
  description text,
  care_instructions text not null,
  created_at timestamptz not null default now()
);

create table public.user_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  species_id uuid not null references public.plant_species (id) on delete restrict,
  nickname text not null,
  location text,
  light_level text check (light_level in ('low', 'medium', 'bright_indirect', 'direct')),
  notes text,
  acquired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.user_plants (id) on delete cascade,
  event_type text not null check (event_type in ('watering', 'fertilizing', 'pruning', 'repotting', 'observation')),
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plant_id uuid references public.user_plants (id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index user_plants_user_id_idx on public.user_plants (user_id, created_at desc);
create index care_events_plant_id_occurred_at_idx on public.care_events (plant_id, occurred_at desc);
create index ai_sessions_user_id_updated_at_idx on public.ai_sessions (user_id, updated_at desc);
create index ai_messages_session_id_created_at_idx on public.ai_messages (session_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_plants_set_updated_at
before update on public.user_plants
for each row execute function public.set_updated_at();

create trigger ai_sessions_set_updated_at
before update on public.ai_sessions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Plant owner'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.save_ai_exchange(
  p_session_id uuid,
  p_question text,
  p_answer text,
  p_plant_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid := p_session_id;
  v_session public.ai_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  if p_plant_id is not null and not exists (
    select 1 from public.user_plants
    where id = p_plant_id and user_id = v_user_id
  ) then
    raise exception 'Plant not found' using errcode = 'P0001';
  end if;

  if v_session_id is null then
    insert into public.ai_sessions (user_id, plant_id, title)
    values (v_user_id, p_plant_id, left(p_question, 100))
    returning id into v_session_id;
  else
    select * into v_session
    from public.ai_sessions
    where id = v_session_id and user_id = v_user_id
    for update;

    if not found then
      raise exception 'AI session not found' using errcode = 'P0001';
    end if;

    if p_plant_id is not null and v_session.plant_id is not null
      and v_session.plant_id <> p_plant_id then
      raise exception 'Session belongs to a different plant' using errcode = 'P0001';
    end if;

    update public.ai_sessions
    set plant_id = coalesce(plant_id, p_plant_id)
    where id = v_session_id;
  end if;

  insert into public.ai_messages (session_id, role, content)
  values (v_session_id, 'user', p_question);

  insert into public.ai_messages (session_id, role, content)
  values (v_session_id, 'assistant', p_answer);

  return v_session_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.plant_species enable row level security;
alter table public.user_plants enable row level security;
alter table public.care_events enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.ai_messages enable row level security;

create policy "Users read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Users read plant species"
on public.plant_species for select to authenticated
using (true);

create policy "Users manage own plants"
on public.user_plants for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage care events for own plants"
on public.care_events for all to authenticated
using (
  exists (
    select 1 from public.user_plants
    where user_plants.id = care_events.plant_id
      and user_plants.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_plants
    where user_plants.id = care_events.plant_id
      and user_plants.user_id = (select auth.uid())
  )
);

create policy "Users manage own AI sessions"
on public.ai_sessions for all to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    plant_id is null or exists (
      select 1 from public.user_plants
      where user_plants.id = ai_sessions.plant_id
        and user_plants.user_id = (select auth.uid())
    )
  )
);

create policy "Users read messages in own AI sessions"
on public.ai_messages for select to authenticated
using (
  exists (
    select 1 from public.ai_sessions
    where ai_sessions.id = ai_messages.session_id
      and ai_sessions.user_id = (select auth.uid())
  )
);

grant select on public.plant_species to authenticated;
grant select, insert, update, delete on public.profiles, public.user_plants, public.care_events, public.ai_sessions, public.ai_messages to authenticated;
grant execute on function public.save_ai_exchange(uuid, text, text, uuid) to authenticated;
revoke all on function public.save_ai_exchange(uuid, text, text, uuid) from public, anon;

insert into public.plant_species (common_name, scientific_name, description, care_instructions) values
  ('Monstera', 'Monstera deliciosa', 'Popularna tropska biljka sa velikim, rascijepljenim listovima.', 'Svijetlo indirektno svjetlo; zaliti kada se gornji sloj zemlje osuši; obezbijediti dobru drenažu.'),
  ('Zlatni puzavac', 'Epipremnum aureum', 'Otporna puzavica pogodna za početnike.', 'Indirektno svjetlo; pustiti da se zemlja prosuši između zalivanja; podnosi slabije svjetlo.'),
  ('Svekrvin jezik', 'Dracaena trifasciata', 'Sukulentna biljka koja dobro podnosi sušu.', 'Indirektno do jače svjetlo; zalivati rijetko tek kada se zemlja potpuno osuši.'),
  ('Mirni ljiljan', 'Spathiphyllum wallisii', 'Tropska biljka sa tamnim listovima i bijelim cvjetovima.', 'Srednje do indirektno svjetlo; održavati blago vlažnu zemlju, bez stajaće vode.'),
  ('Fikus elastika', 'Ficus elastica', 'Sobno drvo sa sjajnim, kožastim listovima.', 'Jarko indirektno svjetlo; zaliti kada se gornjih nekoliko centimetara zemlje prosuši.')
on conflict (common_name) do nothing;
