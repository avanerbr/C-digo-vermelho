// Base oficial da campanha Grupo 20.004 — Caminhões / veículos pesados e leves.
// Conteúdo (Reels e anúncios) ainda não foi criado: o painel já está preparado para receber a campanha sem inventar roteiros.
const DATA_TRUCK = {
  campanha: {
    nome: 'Grupo 20.004',
    apelido: 'Caminhões',
    selo: 'Caminhões',
    inicio: '2026-10-03',
    fim_taxa: '2026-10-30',
    fim_vendas: '2026-11-23',
    assembleia: '2026-11-26',
    taxa: '10,85%',
    taxa_anterior: '15,5%',
    taxa_depois: 'a confirmar',
    limite_hora: 'a confirmar',
    pos_taxa_text: 'Condição após 30/10 ainda precisa ser confirmada.',
    db_exec: 'g20004_execucao',
    db_pend: 'g20004_pendencias',
    ad_notice: 'Campanha de conteúdo ainda em preparação. Use apenas os números oficiais já cadastrados e confirme as regras pendentes antes de publicar conteúdo sobre lance.',
    status_label: 'Base oficial carregada · conteúdo em preparação'
  },
  estrategia: `
    <h3>Direção da campanha</h3>
    <p>A linguagem pode seguir o mesmo jeito consultivo da campanha de imóveis, mas o cliente e a decisão são diferentes. Aqui o foco é <b>capacidade produtiva, caixa e planejamento de frota</b>.</p>
    <h3>Perfil que a campanha deve conversar</h3>
    <ul>
      <li>Transportador autônomo que pretende comprar ou trocar o caminhão.</li>
      <li>Pequeno e médio frotista que quer aumentar ou renovar a frota.</li>
      <li>Empresa de logística ou prestador de serviço que depende do veículo para produzir.</li>
      <li>Produtor rural e empresário que precisa de veículo pesado ou leve para a operação.</li>
      <li>Cliente comparando consórcio com financiamento e avaliando impacto no caixa.</li>
    </ul>
    <h3>Eixos sugeridos</h3>
    <ul>
      <li><b>Custo do capital:</b> taxa promocional de 10,85% versus 15,5%.</li>
      <li><b>Produção:</b> o veículo como ferramenta que precisa trabalhar e gerar receita.</li>
      <li><b>Caixa:</b> estruturar a compra sem retirar capital de giro sem necessidade.</li>
      <li><b>Planejamento de frota:</b> preparar hoje a troca ou expansão que acontecerá nos próximos meses.</li>
      <li><b>Estratégia de contemplação:</b> sorteio e modalidades de lance conforme as regras oficiais.</li>
    </ul>
    <p><b>Importante:</b> isto é direção estratégica, não são roteiros aprovados. Os Reels e anúncios devem ser construídos e validados antes de entrar no calendário.</p>
  `,
  reels: [],
  ads: [],
  entradas: [],
  pendencias: [
    {
      id: 'T1',
      assunto: 'Condição/taxa de 31/10 até 23/11',
      afeta: [],
      status: 'PENDENTE',
      obs: 'A campanha promocional de 10,85% está confirmada até 30/10. Confirmar qual condição vale depois dessa data até o limite de vendas em 23/11.'
    },
    {
      id: 'T2',
      assunto: 'Base exata do lance fixo de 25%',
      afeta: [],
      status: 'PENDENTE',
      obs: 'A tabela informa lance fixo de 25% do valor do plano. Confirmar a base de cálculo antes de criar exemplos em reais.'
    },
    {
      id: 'T3',
      assunto: 'Base exata do lance embutido de 30%',
      afeta: [],
      status: 'PENDENTE',
      obs: 'A tabela informa utilização de lance embutido de 30% nas opções permitidas. Confirmar a base de cálculo antes de criar exemplos em reais.'
    },
    {
      id: 'T4',
      assunto: 'Horário limite e documentos no último dia da promoção',
      afeta: [],
      status: 'PENDENTE',
      obs: 'Confirmar antes de criar peças de reta final para 30/10.'
    }
  ],
  numeros: {
    regras: [
      'Grupo 20.004 · novo plano de caminhões / veículos pesados e leves',
      'Créditos: R$ 200 mil a R$ 400 mil',
      'Prazo: 120 meses · 720 participantes',
      'Taxa de administração promocional: 10,85% (era 15,5%) · desconto de 30% na taxa',
      'Campanha promocional válida até 30/10/2026',
      'Limite para venda/vencimento: 23/11/2026',
      'Data da assembleia: 26/11/2026',
      'Sem taxa de adesão · sem fundo de reserva · sem cobrança de seguro para lance',
      'Até 8 contemplações mensais, conforme disponibilidade financeira do grupo: 1 sorteio, até 3 lances livres, até 3 lances exclusivos e 1 lance fixo',
      'Lance fixo informado na tabela: 25% do valor do plano',
      'Nas opções de lance livre e lance fixo, a tabela informa possibilidade de parcelar o lance em 4x sem juros e utilizar lance embutido de 30%',
      'Para as modalidades de lance, a tabela informa possibilidade de diluir 100% do lance nas parcelas vincendas',
      'Parcelas antecipadas espontaneamente podem ser utilizadas como lance',
      'Crédito e parcela são corrigidos anualmente pelo IPCA; primeira correção na 14ª parcela; correções limitadas a 10% ao ano quando o indicador superar esse percentual',
      'Junção de cotas de caminhões somente entre cotas do plano de venda de caminhões'
    ],
    tabelas: [
      {
        titulo: 'Tabela oficial · Grupo 20.004',
        headers: ['Crédito', 'Parcela'],
        rows: [
          [200000,'1.927,21'],[210000,'2.023,57'],[220000,'2.119,93'],[230000,'2.216,29'],[240000,'2.312,65'],
          [250000,'2.409,02'],[260000,'2.505,38'],[270000,'2.601,74'],[280000,'2.698,10'],[290000,'2.794,46'],
          [300000,'2.890,82'],[310000,'2.987,18'],[320000,'3.083,54'],[330000,'3.179,90'],[340000,'3.276,26'],
          [350000,'3.372,62'],[360000,'3.468,98'],[370000,'3.565,34'],[380000,'3.661,70'],[390000,'3.758,06'],[400000,'3.854,42']
        ]
      }
    ],
    contas: [
      ['Taxa original', '15,5%'],
      ['Taxa promocional', '10,85%'],
      ['Desconto informado na taxa administrativa', '30%'],
      ['Crédito mínimo / parcela', 'R$ 200.000 / R$ 1.927,21'],
      ['Crédito de R$ 300 mil / parcela', 'R$ 300.000 / R$ 2.890,82'],
      ['Crédito máximo / parcela', 'R$ 400.000 / R$ 3.854,42']
    ]
  }
};

window.CAMPAIGNS = {
  g11000: DATA,
  g20004: DATA_TRUCK
};
