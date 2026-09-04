-- Central Código Vermelho — tabela de execução dos 60 vídeos
-- Rode isto uma vez no SQL Editor do seu projeto Supabase (Project → SQL Editor → New query → Run).

create table if not exists execucao (
  video_id text primary key,
  gravado boolean not null default false,
  gravado_em date,
  editado boolean not null default false,
  editado_em date,
  programado boolean not null default false,
  programado_em date,
  publicado boolean not null default false,
  publicado_em date,
  link text,
  notas text,
  updated_at timestamptz not null default now()
);

-- Segurança em nível de linha (RLS)
alter table execucao enable row level security;

-- Política aberta: qualquer pessoa com o link do site (e a chave anon, que não é secreta)
-- pode ler e gravar o status de execução. Adequado pra um painel interno de equipe pequena.
-- Se um dia quiser exigir login antes de editar, troque estas 3 políticas por regras
-- que checam auth.uid() (posso te ajudar a adicionar login por e-mail do Supabase depois).
create policy "Leitura pública" on execucao for select using (true);
create policy "Gravação pública" on execucao for insert with check (true);
create policy "Atualização pública" on execucao for update using (true);
