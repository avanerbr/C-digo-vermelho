/* Central Código Vermelho — lógica da página (abas, filtros, calendário, execução) */

/* ---------- Supabase ---------- */
let supabaseClient = null;
if (window.supabase && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey) {
  try {
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  } catch (e) { console.error('Falha ao iniciar Supabase:', e); }
}

/* ---------- Theme toggle ---------- */
const themeBtn = document.getElementById('themeToggle');
function applyTheme(t){
  const root = document.documentElement;
  if(t === 'system'){ root.removeAttribute('data-theme'); }
  else{ root.setAttribute('data-theme', t); }
  themeBtn.textContent = 'Tema: ' + (t === 'system' ? 'sistema' : t === 'dark' ? 'escuro' : 'claro');
}
let savedTheme = 'system';
try{ savedTheme = localStorage.getItem('avaner-theme') || 'system'; }catch(e){}
applyTheme(savedTheme);
themeBtn.addEventListener('click', () => {
  const order = ['system','light','dark'];
  const next = order[(order.indexOf(savedTheme)+1) % order.length];
  savedTheme = next;
  applyTheme(next);
  try{ localStorage.setItem('avaner-theme', next); }catch(e){}
});

/* ---------- Tabs ---------- */
const tabButtons = document.querySelectorAll('nav.tabs button');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.setAttribute('aria-selected','false'));
    btn.setAttribute('aria-selected','true');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    window.scrollTo({top:0, behavior:'instant'});
  });
});
function goToView(view){
  document.querySelector('nav.tabs button[data-view="'+view+'"]').click();
}

/* ---------- Pilar colors ---------- */
const PILAR_COLOR = {
  "Alavancagem Patrimonial": {bg:"var(--gold-soft)", fg:"var(--gold-ink)", bar:"var(--gold)"},
  "Alavancagem Financeira": {bg:"var(--positive-soft)", fg:"var(--positive-ink)", bar:"var(--positive)"},
  "Alavancagem de Capital": {bg:"var(--gold-soft)", fg:"var(--gold-ink)", bar:"var(--gold)"},
  "Projeções": {bg:"var(--positive-soft)", fg:"var(--positive-ink)", bar:"var(--positive)"},
  "Código Vermelho": {bg:"var(--alert-soft)", fg:"var(--alert-ink)", bar:"var(--alert)"},
  "Mitos & Educação": {bg:"var(--paper-raised)", fg:"var(--ink-soft)", bar:"var(--ink-soft)"},
  "Cases & Prova Social": {bg:"var(--paper-raised)", fg:"var(--ink-soft)", bar:"var(--ink-soft)"},
  "CTA Direto": {bg:"var(--alert-soft)", fg:"var(--alert-ink)", bar:"var(--alert)"},
};
function pilarChip(pilar){
  const c = PILAR_COLOR[pilar] || {bg:"var(--paper-raised)", fg:"var(--ink-soft)"};
  return '<span class="pilar-chip" style="background:'+c.bg+';color:'+c.fg+'">'+pilar+'</span>';
}

/* ---------- Ticker ---------- */
const tickerFacts = [
  '<span><b>83,9 mi</b> de brasileiros inadimplentes — recorde (jul/2026)</span>',
  '<span><b>436%</b> a.a. no rotativo do cartão (pico de 451%)</span>',
  '<span><b>321%</b> a.a. no cheque especial — recorde desde 1994</span>',
  '<span><b>14%</b> Selic ao ano — 13,75% projetado pra dez/2026</span>',
  '<span><b>3º tri/2026</b>: bancos vão restringir crédito, confirma o BC</span>',
  '<span><b>25%</b> é a projeção de crescimento do consórcio de imóveis em 2026</span>',
  '<span><b>12,85 mi</b> de brasileiros já estão no consórcio</span>',
  '<span><b>60</b> roteiros · <b>30</b> dias · <b>1</b> meta: alavancagem</span>',
];
document.getElementById('ticker').innerHTML = (tickerFacts.concat(tickerFacts)).join('<span aria-hidden="true">&mdash;</span>');

/* ---------- Visão geral ---------- */
const counts = {};
DATA.scripts.forEach(s => counts[s.pilar] = (counts[s.pilar]||0)+1);
document.getElementById('statsRow').innerHTML = [
  ['60','Roteiros completos'],
  ['30','Dias de calendário'],
  ['8','Pilares de conteúdo'],
  [String(DATA.dores.length + DATA.desejos.length), 'Dores + desejos mapeados'],
].map(([n,l]) => '<div class="stat"><div class="n tabular">'+n+'</div><div class="l">'+l+'</div></div>').join('');

const pilarOrder = PILAR_ORDER;
const maxCount = Math.max(...pilarOrder.map(p => counts[p]||0));
document.getElementById('pilarBars').innerHTML = pilarOrder.map(p => {
  const c = counts[p]||0;
  const color = (PILAR_COLOR[p]||{}).bar || 'var(--ink-soft)';
  return '<div class="pilar-bar-row"><span>'+p+'</span><span class="pilar-bar-track"><span class="pilar-bar-fill tabular" style="width:'+(c/maxCount*100)+'%;background:'+color+'"></span></span><span class="n tabular">'+c+'</span></div>';
}).join('');

/* ---------- Dores & desejos ---------- */
document.getElementById('doresGrid').innerHTML = DATA.dores.map(d =>
  '<div class="pain-card dor"><div class="tag">Dor</div><div class="t">'+d.nome+'</div><div class="d">'+d.desc+'</div></div>'
).join('');
document.getElementById('desejosGrid').innerHTML = DATA.desejos.map(d =>
  '<div class="pain-card desejo"><div class="tag">Desejo</div><div class="t">'+d.nome+'</div><div class="d">'+d.desc+'</div></div>'
).join('');

/* ---------- Mapa de crédito ---------- */
document.getElementById('creditBody').innerHTML = DATA.mapa_credito.map(c =>
  '<tr><td class="tipo">'+c.tipo+'</td><td class="taxa tabular">'+c.taxa+'</td><td>'+c.nota+'</td><td class="fonte">'+c.fonte+'</td></tr>'
).join('');

/* ---------- Dados compartilhados de calendário/roteiro ---------- */
const scriptById = {};
DATA.scripts.forEach(s => scriptById[s.id] = s);
const calByScriptId = {};
DATA.calendario.forEach(row => { calByScriptId[row.script_id] = row; });

function fmtDate(iso){
  const [y,m,d] = iso.split('-');
  return d+'/'+m;
}

/* =====================================================================
   EXECUÇÃO — status de produção (gravado/editado/programado/publicado)
   Sincroniza com Supabase quando configurado; senão usa localStorage.
   ===================================================================== */
const STAGES = ['gravado','editado','programado','publicado'];
const STAGE_NAMES = ['Não iniciado','Gravado','Editado','Programado','Publicado'];
const STAGE_COLORS = ['var(--ink-soft)','var(--gold)','var(--positive)','var(--track)','var(--ink)'];

let execucaoState = {};

function defaultExecRow(id){
  return {video_id:id, gravado:false, gravado_em:null, editado:false, editado_em:null,
           programado:false, programado_em:null, publicado:false, publicado_em:null, notas:''};
}
function todayISO(){ return new Date().toISOString().slice(0,10); }

function loadExecucaoLocal(){
  try{ return JSON.parse(localStorage.getItem('avaner-execucao')||'{}'); }catch(e){ return {}; }
}
function saveExecucaoLocal(){
  try{ localStorage.setItem('avaner-execucao', JSON.stringify(execucaoState)); }catch(e){}
}

async function loadExecucao(){
  DATA.scripts.forEach(s => { execucaoState[s.id] = defaultExecRow(s.id); });
  const connEl = document.getElementById('execConnStatus');
  if(supabaseClient){
    connEl.className = 'conn-status ok';
    connEl.innerHTML = '<span class="conn-ok">&#9679; Sincronizando com Supabase — todo o time vê este status</span>';
    const {data, error} = await supabaseClient.from('execucao').select('*');
    if(error){
      console.error('Erro ao carregar execução do Supabase:', error);
      connEl.className = 'conn-status warn';
      connEl.innerHTML = '<span class="conn-warn">&#9679; Não consegui falar com o Supabase agora — usando o backup local deste navegador</span>';
      Object.assign(execucaoState, loadExecucaoLocal());
    } else if(data){
      data.forEach(row => { execucaoState[row.video_id] = Object.assign(defaultExecRow(row.video_id), row); });
    }
  } else {
    connEl.className = 'conn-status warn';
    connEl.innerHTML = '<span class="conn-warn">&#9679; Supabase não configurado — status salvo só neste navegador (veja README.md)</span>';
    Object.assign(execucaoState, loadExecucaoLocal());
    DATA.scripts.forEach(s => { if(!execucaoState[s.id]) execucaoState[s.id] = defaultExecRow(s.id); });
  }
  renderExecucao();
  renderCalendario();
}

async function updateExecucao(videoId, field, value){
  const row = execucaoState[videoId] || defaultExecRow(videoId);
  row[field] = value;
  if(STAGES.includes(field)){
    row[field+'_em'] = value ? (row[field+'_em'] || todayISO()) : row[field+'_em'];
    if(value){
      const idx = STAGES.indexOf(field);
      for(let i=0;i<idx;i++){
        const earlier = STAGES[i];
        if(!row[earlier]){ row[earlier] = true; row[earlier+'_em'] = row[earlier+'_em'] || todayISO(); }
      }
    }
  }
  row.updated_at = new Date().toISOString();
  execucaoState[videoId] = row;
  renderExecucao();
  renderCalendario();
  if(supabaseClient){
    const {error} = await supabaseClient.from('execucao').upsert(row, {onConflict:'video_id'});
    if(error) console.error('Erro ao salvar no Supabase:', error);
  } else {
    saveExecucaoLocal();
  }
}

function stageIndex(row){
  let idx = 0;
  STAGES.forEach((s,i) => { if(row[s]) idx = i+1; });
  return idx;
}

let execStatusFilter = 'Todos';

function renderExecFilters(){
  const opts = ['Todos','Pendente','Em andamento','Programado','Publicado'];
  const box = document.getElementById('execFilters');
  box.querySelectorAll('.chip').forEach(c => c.remove());
  const frag = document.createDocumentFragment();
  opts.forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.textContent = o;
    btn.setAttribute('aria-pressed', String(o === execStatusFilter));
    btn.addEventListener('click', () => { execStatusFilter = o; renderExecFilters(); renderExecucao(); });
    frag.appendChild(btn);
  });
  box.insertBefore(frag, document.getElementById('execSearchBox'));
}

function renderExecucao(){
  const rows = DATA.scripts.map(s => ({script:s, exec: execucaoState[s.id] || defaultExecRow(s.id)}));
  const total = rows.length;
  const bucketCounts = [0,0,0,0,0];
  rows.forEach(r => bucketCounts[stageIndex(r.exec)]++);

  document.getElementById('execStats').innerHTML = [
    ['Gravados', rows.filter(r=>r.exec.gravado).length],
    ['Editados', rows.filter(r=>r.exec.editado).length],
    ['Programados', rows.filter(r=>r.exec.programado).length],
    ['Publicados', rows.filter(r=>r.exec.publicado).length],
  ].map(([l,n]) => '<div class="stat"><div class="n tabular">'+n+'<span style="font-size:15px;color:var(--ink-soft)">/'+total+'</span></div><div class="l">'+l+'</div></div>').join('');

  document.getElementById('execProgressBar').innerHTML = STAGE_NAMES.map((name,i) => {
    const c = bucketCounts[i];
    if(!c) return '';
    return '<span class="exec-seg" style="width:'+(c/total*100)+'%;background:'+STAGE_COLORS[i]+'" title="'+name+': '+c+'"></span>';
  }).join('');
  document.getElementById('execProgressLegend').innerHTML = STAGE_NAMES.map((name,i) =>
    '<span class="exec-legend-item"><i style="background:'+STAGE_COLORS[i]+'"></i>'+name+' <span class="tabular">('+bucketCounts[i]+')</span></span>'
  ).join('');

  let filtered = rows;
  if(execStatusFilter !== 'Todos'){
    const map = {'Pendente':[0],'Em andamento':[1,2],'Programado':[3],'Publicado':[4]};
    const v = map[execStatusFilter];
    filtered = filtered.filter(r => v.includes(stageIndex(r.exec)));
  }
  const q = (document.getElementById('execSearchBox').value || '').trim().toLowerCase();
  if(q){
    filtered = filtered.filter(r => (r.script.titulo+' '+r.script.pilar).toLowerCase().includes(q));
  }
  document.getElementById('execResultCount').textContent = filtered.length + ' de ' + total + ' vídeos';

  document.getElementById('execTableBody').innerHTML = filtered.map(r => {
    const s = r.script, ex = r.exec;
    const calRow = calByScriptId[s.id];
    const dataStr = calRow ? fmtDate(calRow.data)+' · '+calRow.horario : '—';
    return '<tr data-id="'+s.id+'">'
      + '<td class="exec-data tabular">'+dataStr+'</td>'
      + '<td>'+pilarChip(s.pilar)+'</td>'
      + '<td class="exec-titulo">'+s.titulo+'</td>'
      + STAGES.map(st => '<td class="exec-check"><input type="checkbox" '+(ex[st]?'checked':'')+' onchange="updateExecucao(\''+s.id+'\',\''+st+'\',this.checked)" aria-label="'+st+'"></td>').join('')
      + '<td><input type="text" class="exec-notes" placeholder="Notas..." value="'+String(ex.notas||'').replace(/"/g,'&quot;')+'" onchange="updateExecucao(\''+s.id+'\',\'notas\',this.value)"></td>'
      + '</tr>';
  }).join('') || '<tr><td colspan="8" style="color:var(--ink-soft);text-align:center;padding:24px;">Nada encontrado.</td></tr>';
}
document.getElementById('execSearchBox').addEventListener('input', renderExecucao);
renderExecFilters();

/* ---------- Calendário ---------- */
const byDate = {};
DATA.calendario.forEach(row => { (byDate[row.data] = byDate[row.data]||[]).push(row); });
const p0 = DATA.periodo;
document.getElementById('calPeriodo').textContent = 'Período · ' + fmtDate(p0.inicio)+'/'+p0.inicio.slice(0,4) + ' a ' + fmtDate(p0.fim)+'/'+p0.fim.slice(0,4);

function renderCalendario(){
  const calDates = Object.keys(byDate).sort();
  document.getElementById('calGrid').innerHTML = calDates.map(date => {
    const rows = byDate[date];
    const slots = rows.map(r => {
      const s = scriptById[r.script_id];
      const ex = execucaoState[s.id] || defaultExecRow(s.id);
      const idx = stageIndex(ex);
      return '<div class="cal-slot" data-sid="'+s.id+'">'
        + '<span class="stage-dot" style="background:'+STAGE_COLORS[idx]+'" title="'+STAGE_NAMES[idx]+'"></span>'
        + '<span class="time tabular">'+r.horario+'</span>'
        + '<div class="info">'+pilarChip(s.pilar)+'<div class="titulo">'+s.titulo+'</div></div>'
        + '</div>';
    }).join('');
    return '<div class="card cal-day"><div class="date"><span>'+rows[0].dia_semana+'</span><span class="tabular">'+fmtDate(date)+'</span></div>'+slots+'</div>';
  }).join('');
}

document.getElementById('calGrid').addEventListener('click', (e) => {
  const slot = e.target.closest('.cal-slot');
  if(!slot) return;
  openScriptFromCalendar(slot.dataset.sid);
});
function openScriptFromCalendar(sid){
  goToView('roteiros');
  document.getElementById('searchBox').value = '';
  activePilarFilter = 'Todos';
  renderFilters();
  renderScripts();
  requestAnimationFrame(() => {
    const card = document.querySelector('.script-card[data-id="'+sid+'"]');
    if(card){
      card.setAttribute('data-open','true');
      card.scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
}

/* ---------- Roteiros ---------- */
let activePilarFilter = 'Todos';
function renderFilters(){
  const chips = ['Todos'].concat(pilarOrder);
  document.getElementById('filters').querySelectorAll('.chip').forEach(c => c.remove());
  const frag = document.createDocumentFragment();
  chips.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.textContent = p + (p !== 'Todos' ? ' ('+(counts[p]||0)+')' : ' ('+DATA.scripts.length+')');
    btn.setAttribute('aria-pressed', String(p === activePilarFilter));
    btn.addEventListener('click', () => { activePilarFilter = p; renderFilters(); renderScripts(); });
    frag.appendChild(btn);
  });
  document.getElementById('filters').insertBefore(frag, document.getElementById('searchBox'));
}

function scriptField(label, value, cls){
  return '<div class="field '+(cls||'')+'"><div class="fl">'+label+'</div><div class="fv">'+value+'</div></div>';
}

function renderScripts(){
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const list = DATA.scripts.filter(s => {
    if(activePilarFilter !== 'Todos' && s.pilar !== activePilarFilter) return false;
    if(!q) return true;
    const hay = (s.titulo+' '+s.gancho+' '+s.corpo+' '+s.virada+' '+s.dor+' '+s.desejo+' '+s.fonte).toLowerCase();
    return hay.includes(q);
  });
  document.getElementById('resultCount').textContent = list.length + ' roteiro' + (list.length===1?'':'s');
  document.getElementById('scriptList').innerHTML = list.map((s, i) => {
    const capa = s.capa ? scriptField('Capa / frame de abertura', s.capa) : '';
    const fonte = s.fonte ? '<div class="fonte-line">Fonte: '+s.fonte+'</div>' : '';
    return '<div class="card script-card" data-id="'+s.id+'">'
      + '<div class="script-head" onclick="toggleCard(this.parentElement)">'
        + '<span class="idx tabular">'+String(i+1).padStart(2,'0')+'</span>'
        + pilarChip(s.pilar)
        + '<span class="titulo">'+s.titulo+'</span>'
        + '<span class="chevron">&#9662;</span>'
      + '</div>'
      + '<div class="script-body">'
        + '<div class="gancho-line">&ldquo;'+s.gancho+'&rdquo;</div>'
        + '<div class="field-grid">'
          + scriptField('Corpo (desenvolvimento)', s.corpo)
          + scriptField('Virada pro consórcio', s.virada)
          + scriptField('CTA', s.cta)
          + scriptField('Como falar', s.como_falar, 'falar')
          + scriptField('Como editar', s.como_editar, 'editar')
          + capa
        + '</div>'
        + '<div class="tag-row">'
          + '<span class="pill dor">Dor: '+s.dor+'</span>'
          + '<span class="pill desejo">Desejo: '+s.desejo+'</span>'
        + '</div>'
        + fonte
      + '</div>'
    + '</div>';
  }).join('') || '<p style="color:var(--ink-soft)">Nada encontrado.</p>';
}
function toggleCard(card){
  const open = card.getAttribute('data-open') === 'true';
  card.setAttribute('data-open', String(!open));
}
document.getElementById('searchBox').addEventListener('input', renderScripts);
renderFilters();
renderScripts();

/* ---------- Sistema de viralização ---------- */
const viralRules = [
  ['Regra dos 3 segundos', 'Se em 3 segundos não tiver um número específico, uma afirmação polêmica ou uma pergunta que dói, o vídeo já perdeu metade da audiência. Nunca abra com contexto — abra no meio da informação mais forte que você tem.'],
  ['5 fórmulas de gancho', 'Número solto sem contexto ("7,8%. Guarda esse número"). Autoridade institucional ("Isso não é opinião minha, é o Banco Central"). Pergunta que incomoda ("Até quando você vai esperar a Selic cair?"). Confissão pessoal ("Eu queria não ter que gravar esse vídeo"). Lista com promessa ("Você pode fazer tudo certo e ainda ser negado. Óh os motivos"). Alterne — nunca repita a mesma fórmula 2 vídeos seguidos.'],
  ['Ritmo de corte', 'A cada 1,5-2s para urgência/lista. A cada 3-4s para o ritmo padrão do formato cortes. A cada 4-5s para tom grave ou confidencial. Quebrar o padrão com um plano fixo no início é o recurso mais forte pra parecer diferente do resto do feed — use no máximo 1x por semana.'],
  ['Texto na tela', 'Só o dado central — número, palavra-chave — em caixa alta, cor de destaque, some no corte seguinte. Texto demais compete com sua fala; de menos perde quem assiste sem som.'],
  ['Som e trilha', 'Efeito seco/impacto ao revelar um dado ruim. Efeito positivo só nos vídeos de boa notícia (Projeções) — reserve, perde força se usar toda hora. Trilha de tensão no Código Vermelho; mais neutra em Projeções; silêncio nos vídeos de tom pessoal.'],
  ['Capa / thumbnail', 'O primeiro frame é sua capa mesmo antes do play. Um número gigante, uma palavra de impacto, ou sua expressão mais forte — nunca o rosto neutro sorrindo, isso não para o scroll.'],
  ['Estrutura de retenção', 'Gancho (0-3s) → Corpo com dado real e fonte citada (3-20s) → Virada que reenquadra o problema (20-30s) → CTA com palavra-código (30-40s). A virada é o ponto mais fácil de errar — ela precisa mudar a perspectiva, não só empurrar produto.'],
  ['CTA que gera comentário', '"Comenta X" funciona melhor que "me chama no direct" porque comentário público alimenta o alcance — o algoritmo entende como conversa, não só consumo. Reserve "link na bio" pros fechamentos de semana.'],
  ['1 ideia por vídeo', 'Um vídeo, um dado, uma virada, um CTA. Se sentir vontade de encaixar 2 dados fortes no mesmo roteiro, são 2 vídeos, não 1.'],
  ['Checklist antes de gravar', 'Meu gancho funciona mudo, só com o texto na tela? O dado tem fonte real? Eu disse isso do jeito que eu falo, ou do jeito que eu escrevo? Tem virada clara pro consórcio? O CTA pede ação específica?'],
];
document.getElementById('viralList').innerHTML = viralRules.map((r,i) =>
  '<div class="viral-item"><div class="viral-num tabular">'+String(i+1).padStart(2,'0')+'</div><div><h4>'+r[0]+'</h4><p>'+r[1]+'</p></div></div>'
).join('');

/* ---------- Boot ---------- */
loadExecucao();
