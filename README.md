# Central Código Vermelho — sistema de execução

Site estático (HTML/CSS/JS puro, sem build) com o calendário de 30 dias, os 60 roteiros
completos, o mapa de crédito, dores e desejos, o sistema de viralização e um **painel de
execução** (gravado / editado / programado / publicado) que persiste no Supabase — assim
todo o time vê o mesmo status, de qualquer aparelho.

Todos os arquivos deste zip são **novos** — é um projeto novo, não uma atualização de algo
que você já tinha.

## Estrutura de arquivos

- `index.html` — a página
- `style.css` — todo o visual
- `data.js` — o conteúdo (roteiros, calendário, dores/desejos, mapa de crédito)
- `supabase-config.js` — chaves de conexão do Supabase (você preenche, passo 2)
- `app.js` — toda a lógica (abas, filtros, busca, painel de execução, sincronização)
- `supabase/schema.sql` — script que cria a tabela de execução no Supabase

## 1. Ver localmente, sem configurar nada

Dê duplo clique no `index.html` e ele abre no navegador. Funciona sem servidor e sem
internet (exceto pelas fontes do Google Fonts). Sem o Supabase configurado, o painel de
Execução ainda funciona — mas o status fica salvo só no seu navegador, e ninguém mais do
time vê as marcações.

## 2. Configurar o Supabase (pra persistir e compartilhar com o time)

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto (o plano
   gratuito atende de sobra esse uso).
2. No painel do projeto, vá em **SQL Editor → New query**, cole o conteúdo do arquivo
   `supabase/schema.sql` e clique em **Run**. Isso cria a tabela `execucao`.
3. Vá em **Project Settings → API**. Copie o **Project URL** e a chave **anon public**.
4. Abra o arquivo `supabase-config.js` num editor de texto e cole os dois valores:

   ```js
   window.SUPABASE_CONFIG = {
     url: "https://xxxxxxxxxxxx.supabase.co",
     anonKey: "eyJhbGciOi..."
   };
   ```
5. Salve e suba os arquivos pro GitHub (passo 3). Ao abrir o site publicado, a faixa no
   topo da aba Execução deve mudar de "Supabase não configurado" pra "Sincronizando com
   Supabase".

**Nota de segurança:** a chave `anon public` é feita pra ficar exposta no navegador — não
é uma senha secreta, é assim que o Supabase funciona em qualquer site estático. O
`schema.sql` já vem com Row Level Security habilitada e uma política aberta: qualquer
pessoa com o link do site pode ler e gravar o status de execução. Isso é adequado pra um
painel interno de equipe pequena. Se um dia você quiser exigir login antes de editar, me
chama que eu adiciono autenticação por e-mail do Supabase.

## 3. Subir pro GitHub

Como você já usa o GitHub Desktop:

1. Crie um repositório novo (ex: `avaner-codigo-vermelho`) no GitHub.com — pode ser
   privado.
2. No GitHub Desktop: **File → Add Local Repository** → selecione a pasta que você
   descompactou deste zip.
3. Faça o commit inicial ("Primeira versão do site") e clique em **Publish repository**.

## 4. Publicar o site (escolha uma opção)

### Opção A — GitHub Pages (mais simples, grátis)

1. No repositório no GitHub.com, vá em **Settings → Pages**.
2. Em "Source", selecione a branch `main` e a pasta `/(root)`. Salve.
3. Em alguns minutos o site fica no ar em
   `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

### Opção B — Vercel ou Netlify (atualiza sozinho a cada mudança)

1. Crie conta em [vercel.com](https://vercel.com) ou [netlify.com](https://netlify.com)
   com seu GitHub.
2. "Add new project" / "Add new site" → selecione o repositório.
3. Não precisa configurar build command nem output directory (é um site estático) —
   clique em **Deploy**.
4. A cada push no GitHub, o site atualiza sozinho.

## 5. Atualizar o conteúdo depois

Todo o conteúdo (roteiros, calendário, mapa de crédito, dores/desejos) está em `data.js` —
é um objeto JavaScript, dá pra editar o texto direto ali se for um ajuste pontual. Pra uma
atualização maior (trocar notícias, adicionar vídeos, mudar o calendário), me peça que eu
gero uma nova versão completa dos arquivos.

## 6. Time — como usar no dia a dia

1. Abra o link do site (o do GitHub Pages, Vercel ou Netlify).
2. Aba **Execução**: marque as caixinhas conforme grava, edita, programa e publica cada
   vídeo. Marcar uma etapa mais avançada (ex: Programado) já marca as anteriores
   automaticamente (Gravado, Editado).
3. Aba **Calendário**: a bolinha ao lado do horário mostra o status de cada vídeo com a
   mesma cor da aba Execução — cinza (não iniciado), dourado (gravado), verde (editado),
   azul (programado), preto/branco (publicado).
4. Tudo sincroniza pelo Supabase — não precisa recarregar a página pra outra pessoa ver a
   atualização de status, mas se alguém já estava com a aba aberta antes da mudança, um
   F5 atualiza a visão dela.
