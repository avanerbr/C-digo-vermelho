-- Central de Campanhas AVANER — Grupo 11.000 + Grupo 20.004
-- Pode rodar este arquivo mesmo se as tabelas do Grupo 11.000 já existirem.
-- Não altera a tabela "execucao" do Código Vermelho original.

create table if not exists g11_execucao (
  item_id text primary key,
  gravado boolean not null default false,
  gravado_em date,
  editado boolean not null default false,
  editado_em date,
  publicado boolean not null default false,
  publicado_em date,
  notas text,
  updated_at timestamptz not null default now()
);

create table if not exists g11_pendencias (
  id text primary key,
  status text not null check (status in ('PENDENTE','CONFIRMADO','BLOQUEADO')),
  obs text,
  updated_at timestamptz not null default now()
);

create table if not exists g20004_execucao (
  item_id text primary key,
  gravado boolean not null default false,
  gravado_em date,
  editado boolean not null default false,
  editado_em date,
  publicado boolean not null default false,
  publicado_em date,
  notas text,
  updated_at timestamptz not null default now()
);

create table if not exists g20004_pendencias (
  id text primary key,
  status text not null check (status in ('PENDENTE','CONFIRMADO','BLOQUEADO')),
  obs text,
  updated_at timestamptz not null default now()
);

alter table g11_execucao enable row level security;
alter table g11_pendencias enable row level security;
alter table g20004_execucao enable row level security;
alter table g20004_pendencias enable row level security;

-- Painel interno: mesma política aberta do Código Vermelho/Central anterior.
drop policy if exists "g11 exec leitura" on g11_execucao;
drop policy if exists "g11 exec insercao" on g11_execucao;
drop policy if exists "g11 exec atualizacao" on g11_execucao;
drop policy if exists "g11 pend leitura" on g11_pendencias;
drop policy if exists "g11 pend insercao" on g11_pendencias;
drop policy if exists "g11 pend atualizacao" on g11_pendencias;

create policy "g11 exec leitura" on g11_execucao for select using (true);
create policy "g11 exec insercao" on g11_execucao for insert with check (true);
create policy "g11 exec atualizacao" on g11_execucao for update using (true);
create policy "g11 pend leitura" on g11_pendencias for select using (true);
create policy "g11 pend insercao" on g11_pendencias for insert with check (true);
create policy "g11 pend atualizacao" on g11_pendencias for update using (true);

drop policy if exists "g20004 exec leitura" on g20004_execucao;
drop policy if exists "g20004 exec insercao" on g20004_execucao;
drop policy if exists "g20004 exec atualizacao" on g20004_execucao;
drop policy if exists "g20004 pend leitura" on g20004_pendencias;
drop policy if exists "g20004 pend insercao" on g20004_pendencias;
drop policy if exists "g20004 pend atualizacao" on g20004_pendencias;

create policy "g20004 exec leitura" on g20004_execucao for select using (true);
create policy "g20004 exec insercao" on g20004_execucao for insert with check (true);
create policy "g20004 exec atualizacao" on g20004_execucao for update using (true);
create policy "g20004 pend leitura" on g20004_pendencias for select using (true);
create policy "g20004 pend insercao" on g20004_pendencias for insert with check (true);
create policy "g20004 pend atualizacao" on g20004_pendencias for update using (true);

-- Realtime entre celular/computador. Só adiciona se ainda não estiver na publicação.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='g11_execucao') then
    alter publication supabase_realtime add table g11_execucao;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='g11_pendencias') then
    alter publication supabase_realtime add table g11_pendencias;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='g20004_execucao') then
    alter publication supabase_realtime add table g20004_execucao;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='g20004_pendencias') then
    alter publication supabase_realtime add table g20004_pendencias;
  end if;
end $$;
