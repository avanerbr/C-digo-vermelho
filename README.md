# Central de Campanhas AVANER

Painel estático (HTML/CSS/JS) inspirado no Código Vermelho, agora preparado para várias campanhas no mesmo sistema.

Campanhas incluídas nesta versão:

- **Grupo 11.000 · Imóveis** — campanha completa, com 20 Reels, 8 anúncios, WhatsApp, números e pendências.
- **Grupo 20.004 · Caminhões** — base oficial carregada (números, regras, estratégia inicial e pendências). Os roteiros e anúncios ainda não foram inventados: entram quando forem aprovados.

## O que mudou

No topo existe um seletor de campanha. Cada campanha tem seus próprios status, pendências e tabelas no Supabase, sem misturar Grupo 11.000 com Grupo 20.004.

A navegação continua:

**Hoje → Visão geral → Execução → Calendário → Roteiros → Anúncios → WhatsApp → Números → Pendências**

## Arquivos

- `index.html` — página principal
- `style.css` — visual
- `data.js` — conteúdo aprovado do Grupo 11.000
- `data-trucks.js` — base do Grupo 20.004
- `app.js` — lógica multi-campanha
- `supabase-config.js` — configuração já existente do Supabase
- `supabase/schema.sql` — tabelas das duas campanhas

## 1. Supabase

Abra o projeto atual no Supabase:

**SQL Editor → New query → cole `supabase/schema.sql` → Run**

O SQL é idempotente: pode ser executado mesmo se `g11_execucao` e `g11_pendencias` já existirem.

Ele mantém/cria:

- `g11_execucao`
- `g11_pendencias`
- `g20004_execucao`
- `g20004_pendencias`

Também liga as quatro tabelas ao Realtime sem tentar adicioná-las duas vezes.

## 2. GitHub

Se este sistema vai substituir o repositório da Central atual:

1. Faça backup do repositório atual.
2. Substitua os arquivos da raiz pelos arquivos deste zip.
3. Faça commit e push.
4. Aguarde o deploy normal do projeto.

Não há build: é um site estático.

## 3. Grupo 11.000

A regra final de lance já está aplicada:

- Base do lance fixo: crédito integral + taxa.
- Carta de R$ 1 milhão: base R$ 1.157.500.
- Lance fixo de 30%: R$ 347.250.
- Embutido máximo: 30% do crédito nominal = R$ 300.000.
- Complemento do cliente: R$ 47.250.
- Crédito líquido: R$ 700.000.

O valor incorreto de R$ 652.750 não está no sistema.

## 4. Grupo 20.004 · Caminhões

A base foi criada a partir da tabela oficial fornecida:

- crédito de R$ 200 mil a R$ 400 mil;
- 120 meses;
- 720 participantes;
- taxa promocional 10,85% (era 15,5%);
- promoção até 30/10/2026;
- vendas/vencimento até 23/11/2026;
- assembleia em 26/11/2026;
- tabela de parcelas completa;
- regras gerais de contemplação e lance descritas na tabela oficial.

Como ainda faltam confirmações para transformar algumas regras de lance em exemplos comerciais, elas aparecem em **Pendências**. Nenhum roteiro foi criado automaticamente.

## 5. Uso diário

O status de cada campanha é independente. Trocar de campanha no seletor também troca:

- execução;
- calendário;
- roteiros;
- anúncios;
- WhatsApp;
- números;
- pendências;
- sincronização no Supabase.

Com Supabase disponível, celular e computador veem as mesmas marcações em tempo real. Sem conexão, o painel usa backup local do navegador.
