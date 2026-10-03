/* Central AVANER — lógica multi-campanha (abas, Hoje, execução, calendário, roteiros, anúncios, pendências) */

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WD = ['dom','seg','ter','qua','qui','sex','sáb'];
function pad(n){ return String(n).padStart(2,'0'); }
function todayISO(){ const t = new Date(); return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate()); }
function parseISO(iso){ const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }
function fmtDate(iso){ return iso.slice(8,10)+'/'+iso.slice(5,7); }
function fmtDay(iso){ return WD[parseISO(iso).getDay()]+' · '+fmtDate(iso); }
function daysTo(iso){ const t = parseISO(todayISO()); return Math.round((parseISO(iso) - t)/864e5); }
function addDays(iso, n){ const d = parseISO(iso); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
function copyText(text, btn){
  const done = () => { if(btn){ const o = btn.textContent; btn.textContent = 'Copiado'; btn.classList.add('ok'); setTimeout(() => { btn.textContent = o; btn.classList.remove('ok'); }, 1400); } else toast('Copiado'); };
  try{ navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)); }
  catch(e){ fallbackCopy(text, done); }
}
function fallbackCopy(text, done){
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); done(); }catch(e){ toast('Não consegui copiar. Selecione o texto manualmente.'); }
  ta.remove();
}

/* ---------- Dados / campanhas ---------- */
const CAMPAIGNS = window.CAMPAIGNS || {};
if (!Object.keys(CAMPAIGNS).length) {
  console.error('Nenhuma campanha carregada. Verifique data.js.');
  const hb = document.querySelector('#hojeBody');
  if (hb) hb.innerHTML = '<div class="notice red"><b>Erro ao carregar os dados.</b> O arquivo data.js não foi carregado corretamente.</div>';
}
let campaignKey = store.get('avaner-campaign', Object.keys(CAMPAIGNS)[0] || 'g11000');
if(!CAMPAIGNS[campaignKey]) campaignKey = Object.keys(CAMPAIGNS)[0];
let ACTIVE_DATA = CAMPAIGNS[campaignKey];
let ITEMS = [];
let byId = {};
let C = {};
function storageKeyFor(key, suffix){ return 'avaner-'+key+'-'+suffix; }
function storageKey(suffix){ return storageKeyFor(campaignKey, suffix); }
function rebuildCampaignRefs(){
  ACTIVE_DATA = CAMPAIGNS[campaignKey];
  C = ACTIVE_DATA.campanha;
  ITEMS = ACTIVE_DATA.reels.concat(ACTIVE_DATA.ads);
  byId = {}; ITEMS.forEach(i => byId[i.id] = i);
}
rebuildCampaignRefs();

/* ---------- Supabase ---------- */
let sb = null;
if (window.supabase && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey) {
  try { sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey); }
  catch (e) { console.error('Falha ao iniciar Supabase:', e); }
}
const STAGES = ['gravado','editado','publicado'];
const STAGE_LABEL = {gravado:'Gravado', editado:'Editado', publicado:'Publicado'};
let exec = {};
let pendState = {};
const stateByCampaign = {};
function defRow(id){ return {item_id:id, gravado:false, gravado_em:null, editado:false, editado_em:null, publicado:false, publicado_em:null, notas:''}; }
function stateFor(key){
  if(!stateByCampaign[key]) stateByCampaign[key] = {
    exec: store.get(storageKeyFor(key, 'exec'), {}),
    pend: store.get(storageKeyFor(key, 'pend'), {})
  };
  return stateByCampaign[key];
}
function syncActiveState(){ const st = stateFor(campaignKey); exec = st.exec; pendState = st.pend; }
function rowOfFor(key, id){ return stateFor(key).exec[id] || defRow(id); }
function rowOf(id){ return rowOfFor(campaignKey, id); }
function stageIdx(r){ let i = 0; STAGES.forEach((s,k) => { if(r[s]) i = k+1; }); return i; }
function pendOfFor(key, pid){
  const data = CAMPAIGNS[key] || {pendencias:[]};
  const base = (data.pendencias || []).find(p => p.id === pid) || {};
  return Object.assign({}, base, stateFor(key).pend[pid] || {});
}
function pendOf(pid){ return pendOfFor(campaignKey, pid); }
function execTableFor(key){ const c = CAMPAIGNS[key].campanha; return c.db_exec || ('camp_'+key+'_execucao'); }
function pendTableFor(key){ const c = CAMPAIGNS[key].campanha; return c.db_pend || ('camp_'+key+'_pendencias'); }
function execTable(){ return execTableFor(campaignKey); }
function pendTable(){ return pendTableFor(campaignKey); }
let syncChannel = null;
let loadGeneration = 0;
syncActiveState();

function setConn(kind, text){
  const el = $('#connStatus');
  el.className = 'conn-status ' + (kind === 'ok' ? 'ok' : 'warn');
  el.innerHTML = '<span class="'+(kind === 'ok' ? 'conn-ok' : 'conn-warn')+'">&#9679; '+esc(text)+'</span>';
  if(kind === 'ok') setTimeout(() => { el.innerHTML = ''; el.className = 'conn-status'; }, 4000);
}

async function loadAll(silent){
  const generation = ++loadGeneration;
  const keys = Object.keys(CAMPAIGNS);
  let hadError = false;
  if(sb){
    const results = await Promise.all(keys.map(async key => {
      const [e1, e2] = await Promise.all([
        sb.from(execTableFor(key)).select('*'),
        sb.from(pendTableFor(key)).select('*')
      ]);
      return {key, e1, e2};
    }));
    if(generation !== loadGeneration) return;
    results.forEach(({key,e1,e2}) => {
      const st = stateFor(key);
      if(e1.error || e2.error){
        hadError = true;
        console.error(e1.error || e2.error);
        st.exec = store.get(storageKeyFor(key, 'exec'), {});
        st.pend = store.get(storageKeyFor(key, 'pend'), {});
      } else {
        st.exec = {}; (e1.data || []).forEach(r => st.exec[r.item_id] = Object.assign(defRow(r.item_id), r));
        st.pend = {}; (e2.data || []).forEach(r => st.pend[r.id] = {status:r.status, obs:r.obs});
        store.set(storageKeyFor(key, 'exec'), st.exec);
        store.set(storageKeyFor(key, 'pend'), st.pend);
      }
    });
    if(hadError) setConn('warn', 'Uma das campanhas não sincronizou com o Supabase. Usando o backup deste navegador onde foi necessário.');
    else if(!silent) setConn('ok', 'Sincronizado com o Supabase. Todos os aparelhos veem o mesmo status.');
  } else {
    keys.forEach(key => { const st = stateFor(key); st.exec = store.get(storageKeyFor(key, 'exec'), {}); st.pend = store.get(storageKeyFor(key, 'pend'), {}); });
    setConn('warn', (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && !window.supabase) ? 'Não consegui carregar o Supabase (sem internet?). Usando o backup deste navegador.' : 'Supabase não configurado. O status fica salvo só neste navegador (veja o README).');
  }
  if(generation !== loadGeneration) return;
  syncActiveState();
  renderAll();
}

function subscribe(){
  if(!sb || !sb.channel) return;
  try{
    if(syncChannel && sb.removeChannel) sb.removeChannel(syncChannel);
    const subscribedKey = campaignKey;
    const execT = execTableFor(subscribedKey);
    const pendT = pendTableFor(subscribedKey);
    syncChannel = sb.channel('avaner-sync-'+subscribedKey)
      .on('postgres_changes', {event:'*', schema:'public', table:execT}, p => {
        if(subscribedKey !== campaignKey) return;
        const r = p.new; if(r && r.item_id){ const st = stateFor(subscribedKey); st.exec[r.item_id] = Object.assign(defRow(r.item_id), r); store.set(storageKeyFor(subscribedKey,'exec'), st.exec); syncActiveState(); renderAll(); }
      })
      .on('postgres_changes', {event:'*', schema:'public', table:pendT}, p => {
        if(subscribedKey !== campaignKey) return;
        const r = p.new; if(r && r.id){ const st = stateFor(subscribedKey); st.pend[r.id] = {status:r.status, obs:r.obs}; store.set(storageKeyFor(subscribedKey,'pend'), st.pend); syncActiveState(); renderAll(); }
      })
      .subscribe();
  }catch(e){ console.error(e); }
}

document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') loadAll(true); });

async function saveRow(row){
  stateFor(campaignKey).exec = exec;
  store.set(storageKey('exec'), exec);
  if(sb){
    const {error} = await sb.from(execTable()).upsert(row, {onConflict:'item_id'});
    if(error){ console.error(error); toast('Não salvou no Supabase. Ficou só neste aparelho.'); }
  }
}
async function savePend(id){
  stateFor(campaignKey).pend = pendState;
  store.set(storageKey('pend'), pendState);
  if(sb){
    const p = pendOf(id);
    const {error} = await sb.from(pendTable()).upsert({id, status:p.status, obs:p.obs, updated_at:new Date().toISOString()}, {onConflict:'id'});
    if(error){ console.error(error); toast('Não salvou no Supabase. Ficou só neste aparelho.'); }
  }
}

/* ---------- Situação (alerta) ---------- */
function situacaoFor(key, item){
  const ps = (item.pend || []).map(pid => pendOfFor(key, pid));
  const blocked = ps.filter(p => p.status === 'BLOQUEADO');
  const pending = ps.filter(p => p.status === 'PENDENTE');
  if(blocked.length) return {cls:'red', label:'Bloqueado', blocked, pending};
  if(pending.length || item.obs) return {cls:'yellow', label:'Atenção', blocked, pending};
  const start = item.kind === 'reel' ? item.date : item.inicio;
  if(start > todayISO()) return {cls:'gray', label:'Ainda não chegou', blocked, pending};
  return {cls:'green', label:'Liberado', blocked, pending};
}
function situacao(item){ return situacaoFor(campaignKey, item); }
function alertPill(item){ const s = situacao(item); return '<span class="alert '+s.cls+'">'+s.label+'</span>'; }
function isBlockedFor(key, item){ return situacaoFor(key, item).cls === 'red'; }
function isBlocked(item){ return isBlockedFor(campaignKey, item); }
function nextStepFor(key, item){
  const r = rowOfFor(key, item.id);
  if(isBlockedFor(key, item) && r.editado) return 'Aguardar liberação';
  if(!r.gravado) return item.kind === 'ad' ? 'Gravar' : 'Gravar';
  if(!r.editado) return 'Editar';
  if(!r.publicado) return item.kind === 'ad' ? 'Subir no Meta' : 'Publicar';
  return 'Feito';
}
function nextStep(item){ return nextStepFor(campaignKey, item); }

/* ---------- Mudar etapa ---------- */
async function setStage(id, stage, val){
  const item = byId[id];
  if(stage === 'publicado' && val && isBlocked(item)){
    toast(id+' está bloqueado. Libere a pendência antes de publicar.');
    renderAll(); return;
  }
  const r = Object.assign(defRow(id), rowOf(id));
  const k = STAGES.indexOf(stage);
  if(val){
    for(let i=0;i<=k;i++){ const s = STAGES[i]; if(!r[s]){ r[s] = true; r[s+'_em'] = todayISO(); } }
  } else {
    for(let i=k;i<STAGES.length;i++){ const s = STAGES[i]; r[s] = false; r[s+'_em'] = null; }
  }
  r.updated_at = new Date().toISOString();
  exec[id] = r;
  renderAll();
  await saveRow(r);
}
async function setStageFor(key, id, stage, val){
  const data = CAMPAIGNS[key]; if(!data) return;
  const item = (data.reels||[]).concat(data.ads||[]).find(i => i.id === id); if(!item) return;
  const st = stateFor(key); const r = Object.assign(defRow(id), rowOfFor(key,id));
  const k = STAGES.indexOf(stage);
  if(stage === 'publicado' && val && isBlockedFor(key,item)){ toast(id+' está bloqueado. Libere a pendência antes de publicar.'); renderAll(); return; }
  if(val){ for(let i=0;i<=k;i++){ const ss=STAGES[i]; if(!r[ss]){ r[ss]=true; r[ss+'_em']=todayISO(); } } }
  else { for(let i=k;i<STAGES.length;i++){ const ss=STAGES[i]; r[ss]=false; r[ss+'_em']=null; } }
  r.updated_at = new Date().toISOString(); st.exec[id]=r; store.set(storageKeyFor(key,'exec'),st.exec); renderAll();
  if(sb){ const {error}=await sb.from(execTableFor(key)).upsert(r,{onConflict:'item_id'}); if(error){ console.error(error); toast('Não salvou no Supabase. Ficou só neste aparelho.'); } }
}

async function setNota(id, val){
  const r = Object.assign(defRow(id), rowOf(id));
  r.notas = val; r.updated_at = new Date().toISOString(); exec[id] = r;
  await saveRow(r);
}

/* ---------- Tema ---------- */
const themeBtn = $('#themeToggle');
let theme = store.get('avaner-theme', 'system');
function applyTheme(t){
  if(t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  themeBtn.textContent = 'Tema: ' + (t === 'system' ? 'sistema' : t === 'dark' ? 'escuro' : 'claro');
}
applyTheme(theme);
themeBtn.addEventListener('click', () => { const o = ['system','light','dark']; theme = o[(o.indexOf(theme)+1)%3]; applyTheme(theme); store.set('avaner-theme', theme); });

/* ---------- Seletor de campanha ---------- */
const campaignSelect = $('#campaignSelect');
function campaignLabel(key){
  const d = CAMPAIGNS[key] && CAMPAIGNS[key].campanha;
  return d ? d.nome + (d.apelido ? ' · '+d.apelido : '') : key;
}
function renderCampaignChrome(){
  const title = C.nome || 'Campanha';
  $('#brandTitle').innerHTML = title.includes('Grupo ') ? 'Grupo <em>'+esc(title.replace('Grupo ',''))+'</em>' : esc(title);
  $('#brandSub').textContent = (C.apelido ? C.apelido+' · ' : '')+'Central de campanha · Avaner · Consórcio Yamaha';
  $('#footerText').textContent = title+' · Avaner · uso interno';
  $('#reelsEyebrow').textContent = ACTIVE_DATA.reels.length ? ACTIVE_DATA.reels.length+' Reels' : 'Conteúdo em preparação';
  $('#adsLede').textContent = C.ad_notice || 'Um argumento por anúncio. Todo tráfego leva direto ao WhatsApp do Michael.';
  $('#calEyebrow').textContent = 'Calendário · '+title;
  const geral = $('#geralEstrategia');
  geral.innerHTML = '<h3>Estratégia</h3>' + (ACTIVE_DATA.estrategia || '');
}
async function switchCampaign(key){
  if(!CAMPAIGNS[key] || key === campaignKey) return;
  campaignKey = key;
  store.set('avaner-campaign', key);
  ++loadGeneration; // invalida qualquer leitura antiga ainda em voo
  rebuildCampaignRefs();
  syncActiveState();
  openCards.clear();
  execFilter = 'Todos';
  rotFilter = 'Todos';
  $('#execSearch').value = '';
  $('#rotSearch').value = '';
  renderCampaignChrome();
  renderExecFilters();
  renderRotFilters();
  renderAll();
  await loadAll(false);
  subscribe();
}
if(campaignSelect){
  campaignSelect.innerHTML = Object.keys(CAMPAIGNS).map(k => '<option value="'+esc(k)+'">'+esc(campaignLabel(k))+'</option>').join('');
  campaignSelect.value = campaignKey;
  campaignSelect.addEventListener('change', () => switchCampaign(campaignSelect.value));
}

/* ---------- Abas ---------- */
const tabs = document.querySelectorAll('nav.tabs button');
function goToView(view){
  tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-'+view));
  const b = document.querySelector('nav.tabs button[data-view="'+view+'"]');
  if(b && b.scrollIntoView) b.scrollIntoView({block:'nearest', inline:'center'});
  window.scrollTo({top:0});
  store.set('avaner-tab', view);
}
tabs.forEach(b => b.addEventListener('click', () => goToView(b.dataset.view)));

function openItem(id){
  const item = byId[id]; if(!item) return;
  const view = item.kind === 'ad' ? 'anuncios' : 'roteiros';
  if(view === 'roteiros'){ rotFilter = 'Todos'; $('#rotSearch').value = ''; renderRoteiros(); }
  goToView(view);
  requestAnimationFrame(() => {
    const card = document.querySelector('.script-card[data-id="'+id+'"]');
    if(card){ card.setAttribute('data-open','true'); card.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
}

/* ---------- Componentes ---------- */
function tipoChip(item){ const t = item.kind === 'ad' ? 'Anúncio' : item.tipo; return '<span class="tipo t-'+t+'">'+t+'</span>'; }
function dotsFor(key,item){ const r = rowOfFor(key,item.id); return '<span class="dots" title="Gravado · Editado · Publicado">'+STAGES.map(s => '<i class="'+(r[s]?'on':'')+'"></i>').join('')+'</span>'; }
function dots(item){ return dotsFor(campaignKey,item); }
function stageButtons(item){
  const r = rowOf(item.id); const bl = isBlocked(item);
  return STAGES.map(s => {
    const label = (item.kind === 'ad' && s === 'publicado') ? 'No ar' : STAGE_LABEL[s];
    const dis = (s === 'publicado' && bl && !r.publicado) ? ' disabled title="Bloqueado por pendência"' : '';
    return '<button class="btn stage" type="button" data-stage="'+s+'" data-id="'+item.id+'" aria-pressed="'+!!r[s]+'"'+dis+'>'+label+'</button>';
  }).join('');
}
function whenOf(item){ return item.kind === 'reel' ? fmtDay(item.date) + (item.slot ? ' · '+item.slot : '') : fmtDate(item.inicio)+' a '+fmtDate(item.fim); }
function pendNotices(item){
  const s = situacao(item); let h = '';
  s.blocked.forEach(p => h += '<div class="notice red"><b>Bloqueado:</b> '+esc(p.assunto)+'. '+esc(p.obs||'')+'</div>');
  s.pending.forEach(p => h += '<div class="notice yellow"><b>Pendente:</b> '+esc(p.assunto)+'. '+esc(p.obs||'')+'</div>');
  if(item.obs) h += '<div class="notice yellow"><b>Atenção:</b> '+esc(item.obs)+'</div>';
  return h;
}

/* ---------- HOJE ---------- */
function renderHoje(){
  const t = todayISO();
  $('#hojeEyebrow').textContent = 'Hoje · ' + fmtDay(t) + ' · todas as campanhas';
  const activeKeys = Object.keys(CAMPAIGNS).filter(key => {
    const c = CAMPAIGNS[key].campanha;
    return t <= c.assembleia; // inclui campanhas que começam nos próximos dias
  });
  $('#hojeLede').textContent = activeKeys.length
    ? activeKeys.length+' campanha'+(activeKeys.length>1?'s':'')+' ativa'+(activeKeys.length>1?'s':'')+' ou em preparação. Esta tela junta imóveis e caminhões; o seletor continua valendo para as outras abas.'
    : 'Nenhuma campanha está dentro da janela ativa hoje.';

  const all = [];
  activeKeys.forEach(key => {
    const d = CAMPAIGNS[key];
    (d.reels||[]).forEach(item => all.push({key,item}));
    (d.ads||[]).forEach(item => all.push({key,item}));
  });
  const hoje = all.filter(x => x.item.kind === 'reel' && x.item.date === t);
  const atras = all.filter(x => x.item.kind === 'reel' && x.item.date < t && !rowOfFor(x.key,x.item.id).publicado);
  const adsAtivos = all.filter(x => x.item.kind === 'ad' && x.item.inicio <= t && x.item.fim >= t);
  const adsPrep = all.filter(x => x.item.kind === 'ad' && x.item.inicio > t && x.item.inicio <= addDays(t,3) && !rowOfFor(x.key,x.item.id).editado);
  const prox = all.filter(x => x.item.kind === 'reel' && x.item.date > t).sort((a,b) => a.item.date.localeCompare(b.item.date)).slice(0,8);

  $('#hojeTitle').textContent = hoje.length ? (hoje.length === 1 ? '1 conteúdo pra hoje' : hoje.length+' conteúdos pra hoje') : 'Painel de hoje';
  let h = '';
  h += group('Pra fazer hoje', hoje.map(card).join('') || '<div class="empty-note">Nenhum Reel com data de hoje nas campanhas ativas.</div>');
  if(atras.length) h += group('Atrasados (data passou e não foi publicado)', atras.sort(sortByDate).map(card).join(''));
  if(adsAtivos.length) h += group('Anúncios que devem estar no ar', adsAtivos.map(card).join(''));
  if(adsPrep.length) h += group('Anúncios pra preparar (começam nos próximos dias)', adsPrep.map(card).join(''));
  if(prox.length) h += group('Próximos', prox.map(compact).join(''));
  if(activeKeys.some(k => !(CAMPAIGNS[k].reels||[]).length && !(CAMPAIGNS[k].ads||[]).length)){
    const empties = activeKeys.filter(k => !(CAMPAIGNS[k].reels||[]).length && !(CAMPAIGNS[k].ads||[]).length).map(k => campaignShort(k)).join(', ');
    h += '<div class="notice yellow"><b>Conteúdo em preparação:</b> '+esc(empties)+'. A base da campanha já está no sistema, mas ainda não há roteiros/anúncios aprovados.</div>';
  }
  $('#hojeBody').innerHTML = h;

  function sortByDate(a,b){ return (a.item.date||a.item.inicio).localeCompare(b.item.date||b.item.inicio); }
  function group(title, inner){ return '<div class="today-group"><h3>'+title+'</h3>'+inner+'</div>'; }
  function campaignShort(key){ const d=CAMPAIGNS[key].campanha; return d.apelido || d.nome; }
  function campaignBadge(key){ const d=CAMPAIGNS[key].campanha; const cls=key==='g11000'?'imovel':'caminhao'; return '<span class="campaign-badge '+cls+'">'+esc((d.apelido||d.nome).toUpperCase())+'</span>'; }
  function situPill(key,item){ const ss=situacaoFor(key,item); return '<span class="alert '+ss.cls+'">'+ss.label+'</span>'; }
  function notices(key,item){
    const ss=situacaoFor(key,item); let out='';
    ss.blocked.forEach(p => out += '<div class="notice red"><b>Bloqueado:</b> '+esc(p.assunto)+'. '+esc(p.obs||'')+'</div>');
    ss.pending.forEach(p => out += '<div class="notice yellow"><b>Pendente:</b> '+esc(p.assunto)+'. '+esc(p.obs||'')+'</div>');
    if(item.obs) out += '<div class="notice yellow"><b>Atenção:</b> '+esc(item.obs)+'</div>';
    return out;
  }
  function globalStageButtons(key,item){
    const r=rowOfFor(key,item.id), bl=isBlockedFor(key,item);
    return STAGES.map(st => {
      const label=(item.kind==='ad'&&st==='publicado')?'No ar':STAGE_LABEL[st];
      const dis=(st==='publicado'&&bl&&!r.publicado)?' disabled title="Bloqueado por pendência"':'';
      return '<button class="btn stage" type="button" data-stage="'+st+'" data-id="'+item.id+'" data-campaign="'+key+'" aria-pressed="'+!!r[st]+'"'+dis+'>'+label+'</button>';
    }).join('');
  }
  function card(x){
    const key=x.key,item=x.item, ss=situacaoFor(key,item);
    const turb=item.kind==='reel'?(item.turbinar?'Sim':'Não'):'Anúncio';
    return '<div class="card today-card '+ss.cls+'">'
      + '<div class="row1">'+campaignBadge(key)+'<span class="code">'+item.id+'</span>'+tipoChip(item)+situPill(key,item)+(item.turbinar?'<span class="tag boost">turbinar</span>':'')+dotsFor(key,item)+'</div>'
      + '<div class="tt">'+esc(item.titulo)+'</div>'
      + '<div class="meta"><b>Quando</b><span>'+whenOf(item)+'</span><b>Próximo passo</b><span class="next-step">'+nextStepFor(key,item)+'</span>'
      + (item.kind==='reel'?'<b>Turbinar</b><span>'+turb+'</span>':'')
      + '<b>CTA</b><span>'+esc(item.kind==='reel'?item.cta:'WhatsApp · "'+item.whatsapp+'"')+'</span></div>'
      + notices(key,item)
      + '<div class="btn-row"><button class="btn primary" type="button" data-open="'+item.id+'" data-campaign="'+key+'">Abrir '+(item.kind==='ad'?'anúncio':'roteiro')+'</button>'
      + '<button class="btn" type="button" data-tp="'+item.id+'" data-campaign="'+key+'">Teleprompter</button>'+globalStageButtons(key,item)+'</div></div>';
  }
  function compact(x){ const key=x.key,item=x.item; return '<div class="card compact" data-open="'+item.id+'" data-campaign="'+key+'" role="button" tabindex="0">'+campaignBadge(key)+'<span class="code">'+item.id+'</span><span class="tt">'+esc(item.titulo)+'</span><span class="tag">'+fmtDay(item.date)+'</span>'+dotsFor(key,item)+'</div>'; }
}

/* ---------- VISÃO GERAL ---------- */
function renderGeral(){
  const vendaSub = C.pos_taxa_text || (C.taxa_depois ? 'condição seguinte: '+C.taxa_depois : '');
  const dates = [[C.fim_taxa,'Fim da condição '+C.taxa,(C.limite_hora && C.limite_hora !== 'a confirmar') ? 'proposta até '+C.limite_hora : 'horário limite a confirmar'],[C.fim_vendas,'Fim das vendas',vendaSub],[C.assembleia,'1ª assembleia','']];
  $('#geralDates').innerHTML = '<div class="stat"><div class="n tabular">'+esc(C.taxa)+'</div><div class="l">Taxa de administração atual</div><div class="s">'+(C.taxa_anterior ? 'era '+esc(C.taxa_anterior) : '')+'</div></div>'
    + dates.map(([d,l,sub]) => { const n = daysTo(d); const txt = n > 1 ? n+' dias' : n === 1 ? 'amanhã' : n === 0 ? 'hoje' : 'encerrado';
      return '<div class="stat '+(n>=0 && n<=7 ? 'hot':'')+'"><div class="n tabular">'+txt+'</div><div class="l">'+esc(l)+' · '+fmtDate(d)+'</div>'+(sub?'<div class="s">'+esc(sub)+'</div>':'')+'</div>'; }).join('');
  const total = ITEMS.length;
  const cnt = st => ITEMS.filter(i => rowOf(i.id)[st]).length;
  const done = ITEMS.reduce((a,i) => a + stageIdx(rowOf(i.id)), 0);
  const pct = total ? Math.round(done/(total*3)*100) : 0;
  $('#geralStats').innerHTML = [['Conteúdos', total, ACTIVE_DATA.reels.length+' Reels · '+ACTIVE_DATA.ads.length+' anúncios'],['Gravados', cnt('gravado')+'/'+total,''],['Editados', cnt('editado')+'/'+total,''],['Publicados', cnt('publicado')+'/'+total,''],['Andamento', pct+'%','das etapas concluídas']]
    .map(([l,n,sub]) => '<div class="stat"><div class="n tabular">'+n+'</div><div class="l">'+l+'</div>'+(sub?'<div class="s">'+sub+'</div>':'')+'</div>').join('');
  const buckets = [0,0,0,0]; ITEMS.forEach(i => buckets[stageIdx(rowOf(i.id))]++);
  const names = ['Não iniciado','Gravado','Editado','Publicado'], cols = ['var(--wait)','var(--gold)','var(--track)','var(--positive)'];
  $('#geralBar').innerHTML = total ? buckets.map((c,i) => c ? '<span class="exec-seg" style="width:'+(c/total*100)+'%;background:'+cols[i]+'" title="'+names[i]+': '+c+'"></span>' : '').join('') : '<span class="result-count">Conteúdo ainda não cadastrado nesta campanha.</span>';
  $('#geralLegend').innerHTML = names.map((n,i) => '<span class="exec-legend-item"><i style="background:'+cols[i]+'"></i>'+n+' <span class="tabular">('+buckets[i]+')</span></span>').join('');
  const abertas = ACTIVE_DATA.pendencias.map(p => pendOf(p.id)).filter(p => p.status !== 'CONFIRMADO');
  $('#geralPend').innerHTML = abertas.length ? abertas.map(p => '<div class="notice '+(p.status === 'BLOQUEADO' ? 'red':'yellow')+'"><b>'+p.status+':</b> '+esc(p.assunto)+(p.afeta.length ? ' ('+p.afeta.join(', ')+')' : '')+'</div>').join('') : '<div class="empty-note">Nenhuma pendência aberta.</div>';
}
/* ---------- EXECUÇÃO ---------- */
let execFilter = 'Todos';
const EXEC_FILTERS = ['Todos','Reels','Anúncios','Turbinar','Bloqueado','Atenção','Não publicados'];
function renderExecFilters(){
  const box = $('#execFilters'); box.querySelectorAll('.chip').forEach(c => c.remove());
  EXEC_FILTERS.forEach(f => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = f; b.setAttribute('aria-pressed', String(f === execFilter));
    b.addEventListener('click', () => { execFilter = f; renderExecFilters(); renderExec(); }); box.insertBefore(b, $('#execSearch')); });
}
function passFilter(item, f){
  const s = situacao(item);
  if(f === 'Reels') return item.kind === 'reel';
  if(f === 'Anúncios') return item.kind === 'ad';
  if(f === 'Turbinar') return !!item.turbinar;
  if(f === 'Bloqueado') return s.cls === 'red';
  if(f === 'Atenção') return s.cls === 'yellow';
  if(f === 'Não publicados') return !rowOf(item.id).publicado;
  return true;
}
function renderExec(){
  const q = ($('#execSearch').value || '').trim().toLowerCase();
  const list = ITEMS.filter(i => passFilter(i, execFilter) && (!q || (i.id+' '+i.titulo).toLowerCase().includes(q)));
  $('#execCount').textContent = list.length+' de '+ITEMS.length+' conteúdos';
  $('#execBody').innerHTML = list.map(i => {
    const r = rowOf(i.id); const bl = isBlocked(i);
    return '<tr><td class="exec-data tabular">'+whenOf(i)+'</td>'
      + '<td><button class="linkcode" type="button" data-open="'+i.id+'">'+i.id+'</button></td>'
      + '<td class="exec-titulo">'+esc(i.titulo)+' '+(i.turbinar?'<span class="tag boost">turbinar</span>':'')+'</td>'
      + '<td class="alert-cell">'+alertPill(i)+'</td>'
      + STAGES.map(s => '<td class="exec-check"><input type="checkbox" data-stage="'+s+'" data-id="'+i.id+'" '+(r[s]?'checked':'')+((s==='publicado' && bl && !r.publicado)?' disabled title="Bloqueado por pendência"':'')+' aria-label="'+STAGE_LABEL[s]+' '+i.id+'"></td>').join('')
      + '<td><input type="text" class="exec-notes" data-nota="'+i.id+'" placeholder="Notas..." value="'+esc(r.notas||'')+'"></td></tr>';
  }).join('') || '<tr><td colspan="8" style="color:var(--ink-soft);text-align:center;padding:24px;">Nada encontrado.</td></tr>';
}
$('#execSearch').addEventListener('input', renderExec);
$('#execBody').addEventListener('change', e => {
  const cb = e.target.closest('input[type=checkbox][data-stage]'); if(cb){ setStage(cb.dataset.id, cb.dataset.stage, cb.checked); return; }
  const nt = e.target.closest('input[data-nota]'); if(nt) setNota(nt.dataset.nota, nt.value);
});

/* ---------- CALENDÁRIO ---------- */
const STAGE_COL = ['var(--wait)','var(--gold)','var(--track)','var(--positive)'];
function calendarMarks(){
  const m = {};
  m[C.fim_taxa] = 'Fim da condição '+C.taxa+(C.limite_hora && C.limite_hora !== 'a confirmar' ? ' · '+C.limite_hora : '');
  m[C.fim_vendas] = 'Fim das vendas';
  m[C.assembleia] = '1ª assembleia';
  return m;
}
function renderCal(){
  $('#calLegend').innerHTML = ['Não iniciado','Gravado','Editado','Publicado'].map((n,i) => '<span class="exec-legend-item"><i style="background:'+STAGE_COL[i]+'"></i>'+n+'</span>').join('')
    + '<span class="exec-legend-item"><span class="alert green">Liberado</span></span><span class="exec-legend-item"><span class="alert yellow">Atenção</span></span><span class="exec-legend-item"><span class="alert red">Bloqueado</span></span><span class="exec-legend-item"><span class="alert gray">Ainda não chegou</span></span>';
  const byDate = {}; ACTIVE_DATA.reels.forEach(r => (byDate[r.date] = byDate[r.date] || []).push(r));
  const marks = calendarMarks();
  const t = todayISO();
  const month = (y, m, last, title) => {
    const first = new Date(y, m, 1).getDay();
    let h = '<div class="month"><h3>'+title+'</h3><div class="cal7">'+WD.map(w => '<div class="wd">'+w+'</div>').join('');
    for(let i=0;i<first;i++) h += '<div class="cday pad"></div>';
    for(let d=1; d<=last; d++){
      const iso = y+'-'+pad(m+1)+'-'+pad(d);
      const items = byDate[iso] || [];
      const mark = marks[iso];
      h += '<div class="cday'+(iso===t?' today':'')+(!items.length && !mark ? ' empty':'')+'"><div class="dn"><span><span class="wdl">'+WD[new Date(y,m,d).getDay()]+' · </span>'+pad(d)+'/'+pad(m+1)+'</span>'+(iso===t?'<span>hoje</span>':'')+'</div>'
        + (mark ? '<div class="mark">'+esc(mark)+'</div>' : '')
        + items.map(it => { const st = situacao(it); return '<button class="citem '+st.cls+'" type="button" data-open="'+it.id+'" title="'+esc(st.label)+'"><i class="sd" style="background:'+STAGE_COL[stageIdx(rowOf(it.id))]+'"></i><span class="c">'+it.id+'</span><span class="t">'+esc(it.titulo)+(it.slot?' ('+it.slot+')':'')+'</span></button>'; }).join('')
        + '</div>';
    }
    return h + '</div></div>';
  };
  const a = parseISO(C.inicio), b = parseISO(C.assembleia);
  let y = a.getFullYear(), m = a.getMonth(), out = '';
  while(y < b.getFullYear() || (y === b.getFullYear() && m <= b.getMonth())){
    const lastFull = new Date(y, m+1, 0).getDate();
    const last = (y === b.getFullYear() && m === b.getMonth()) ? b.getDate() : lastFull;
    const title = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(y,m,1));
    out += month(y,m,last,title.charAt(0).toUpperCase()+title.slice(1));
    m++; if(m>11){m=0;y++;}
  }
  $('#calBody').innerHTML = out;
}
/* ---------- ROTEIROS ---------- */
let rotFilter = 'Todos';
const ROT_FILTERS = ['Todos','Comercial','Estratégia','Simulação','Objeção','Autoridade','Turbinar','Atenção','Bloqueado'];
function renderRotFilters(){
  const box = $('#rotFilters'); box.querySelectorAll('.chip').forEach(c => c.remove());
  ROT_FILTERS.forEach(f => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = f; b.setAttribute('aria-pressed', String(f === rotFilter));
    b.addEventListener('click', () => { rotFilter = f; renderRotFilters(); renderRoteiros(); }); box.insertBefore(b, $('#rotSearch')); });
}
function field(label, html, cls, copy){
  return '<div class="field '+(cls||'')+'"><div class="fl">'+label+(copy ? '<button class="copy-btn" type="button" data-copy="'+copy+'">copiar</button>' : '')+'</div><div class="fv">'+html+'</div></div>';
}
const paras = arr => arr.map(p => '<p>'+esc(p)+'</p>').join('');
const COPYSRC = {};
function reelCard(r, idx){
  const open = openCards.has(r.id);
  COPYSRC[r.id+':roteiro'] = r.roteiro.join('\n\n'); COPYSRC[r.id+':legenda'] = r.legenda;
  const pends = (r.pend||[]).map(pendOf);
  return '<div class="card script-card" data-id="'+r.id+'" data-open="'+open+'">'
    + '<div class="script-head" data-toggle="'+r.id+'"><span class="idx tabular">'+r.id+'</span>'+tipoChip(r)+'<span class="titulo">'+esc(r.titulo)+'</span>'
    + '<span class="meta-r"><span class="tag">'+fmtDay(r.date)+(r.slot?' · '+r.slot:'')+'</span>'+alertPill(r)+(r.turbinar?'<span class="tag boost">turbinar</span>':'')+(r.serie?'<span class="tag">série</span>':'')+(r.fala_livre?'<span class="tag">fala livre</span>':'')+dots(r)+'</span><span class="chevron">&#9662;</span></div>'
    + '<div class="script-body">'
    + pendNotices(r)
    + '<div class="field-grid">'
    + field('Gancho de tela', esc(r.gancho), 'tela wide')
    + field(r.fala_livre ? 'Tópicos (fala livre)' : 'Roteiro', r.fala_livre ? '<ul>'+r.roteiro.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>' : paras(r.roteiro), 'wide', r.id+':roteiro')
    + (r.gancho_alt ? field('Gancho alternativo (regravar se performar)', esc(r.gancho_alt)) : '')
    + field('CTA', esc(r.cta))
    + field('Direção de fala', esc(r.direcao), 'falar')
    + field('Edição', esc(r.edicao), 'editar')
    + field('Legenda', esc(r.legenda), 'legenda wide', r.id+':legenda')
    + (r.whatsapp ? field('Mensagem pré-preenchida (se turbinar)', '"'+esc(r.whatsapp)+'"', 'msg') : '')
    + (pends.length ? field('Regras confirmadas ligadas a este vídeo', pends.map(p => '<p><b>'+p.status+'</b> · '+esc(p.assunto)+': '+esc(p.obs||'')+'</p>').join(''), 'wide') : '')
    + '</div>'
    + '<div class="btn-row"><button class="btn primary" type="button" data-tp="'+r.id+'">Teleprompter</button>'+stageButtons(r)+'</div>'
    + '</div></div>';
}
const openCards = new Set();
function renderRoteiros(){
  const q = ($('#rotSearch').value || '').trim().toLowerCase();
  const list = ACTIVE_DATA.reels.filter(r => {
    const s = situacao(r);
    if(rotFilter === 'Turbinar' && !r.turbinar) return false;
    if(rotFilter === 'Atenção' && s.cls !== 'yellow') return false;
    if(rotFilter === 'Bloqueado' && s.cls !== 'red') return false;
    if(['Comercial','Estratégia','Simulação','Objeção','Autoridade'].includes(rotFilter) && r.tipo !== rotFilter) return false;
    if(!q) return true;
    return (r.id+' '+r.titulo+' '+r.gancho+' '+r.roteiro.join(' ')+' '+r.legenda).toLowerCase().includes(q);
  });
  $('#rotCount').textContent = list.length+' roteiro'+(list.length === 1 ? '' : 's');
  $('#rotList').innerHTML = list.map(reelCard).join('') || '<p style="color:var(--ink-soft)">Nada encontrado.</p>';
}
$('#rotSearch').addEventListener('input', renderRoteiros);

/* ---------- ANÚNCIOS ---------- */
function adCard(a){
  const open = openCards.has(a.id);
  COPYSRC[a.id+':roteiro'] = a.roteiro.join('\n\n'); COPYSRC[a.id+':copy'] = a.copy; COPYSRC[a.id+':msg'] = a.whatsapp;
  return '<div class="card script-card" data-id="'+a.id+'" data-open="'+open+'">'
    + '<div class="script-head" data-toggle="'+a.id+'"><span class="idx tabular">'+a.id+'</span>'+tipoChip(a)+'<span class="titulo">'+esc(a.nome)+'</span>'
    + '<span class="meta-r"><span class="tag">'+esc(a.duracao)+'</span><span class="tag">'+esc(a.plano)+'</span>'+alertPill(a)+dots(a)+'</span><span class="chevron">&#9662;</span></div>'
    + '<div class="script-body">'
    + pendNotices(a)
    + '<div class="field-grid">'
    + field('Gancho de tela', esc(a.gancho), 'tela wide')
    + field('Roteiro', paras(a.roteiro), 'wide', a.id+':roteiro')
    + (a.gancho_alt ? field('Gancho alternativo', esc(a.gancho_alt)) : '')
    + field('Veiculação', esc(a.periodo))
    + field('Copy do anúncio (texto principal no Meta)', esc(a.copy), 'legenda wide', a.id+':copy')
    + field('Mensagem pré-preenchida do WhatsApp', '"'+esc(a.whatsapp)+'"', 'msg', a.id+':msg')
    + field('Interesse provável', esc(a.interesse))
    + '</div>'
    + '<div class="btn-row"><button class="btn primary" type="button" data-tp="'+a.id+'">Teleprompter</button>'+stageButtons(a)+'</div>'
    + '</div></div>';
}
function renderAds(){ $('#adList').innerHTML = ACTIVE_DATA.ads.length ? ACTIVE_DATA.ads.map(adCard).join('') : '<div class="empty-note">Anúncios ainda não cadastrados nesta campanha.</div>'; }

/* ---------- WHATSAPP ---------- */
function renderWA(){
  const groups = {}; ACTIVE_DATA.entradas.forEach(e => (groups[e.grupo] = groups[e.grupo] || []).push(e));
  const keys = Object.keys(groups);
  $('#waBody').innerHTML = keys.length ? keys.map(g => '<div class="wa-group"><h3>'+esc(g)+'</h3>'
    + groups[g].map(e => { COPYSRC['wa:'+e.id] = e.mensagem; const it = byId[e.id];
      return '<div class="card wa-row"><div class="src"><span class="code">'+e.id+'</span>'+esc(e.nome)+(it && isBlocked(it) ? ' <span class="alert red">Bloqueado</span>' : '')+'</div>'
        + '<div><div class="m">"'+esc(e.mensagem)+'"<button class="copy-btn" type="button" data-copy="wa:'+e.id+'">copiar</button></div><div class="i">Interesse provável: '+esc(e.interesse)+'</div></div></div>'; }).join('')
    + '</div>').join('') : '<div class="empty-note">Mensagens de entrada serão adicionadas quando os anúncios/Reels desta campanha forem aprovados.</div>';
}

/* ---------- NÚMEROS ---------- */
function money(n){ return 'R$ '+n.toLocaleString('pt-BR'); }
function renderNum(){
  const N = ACTIVE_DATA.numeros;
  let tables = '';
  if(N.tabelas && N.tabelas.length){
    tables = '<div class="num-tables">'+N.tabelas.map(t => '<div><h3>'+esc(t.titulo)+'</h3><div class="table-scroll"><table class="exec-table"><thead><tr>'+t.headers.map(h => '<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'
      + t.rows.map(r => '<tr>'+r.map((v,i) => '<td class="n">'+(typeof v === 'number' ? money(v) : (i>0 && /^[\d.]+,\d{2}$/.test(String(v)) ? 'R$ '+esc(v) : esc(v)))+'</td>').join('')+'</tr>').join('')
      + '</tbody></table></div></div>').join('')+'</div>';
  } else {
    tables = '<div class="num-tables">'
      + '<div><h3>Plano Parcela Reduzida</h3><div class="table-scroll"><table class="exec-table"><thead><tr><th>Crédito integral</th><th>Reduzido</th><th>Parcela reduzida</th><th>Parcela integral</th></tr></thead><tbody>'
      + (N.reduzido||[]).map(r => '<tr><td class="n">'+money(r[0])+'</td><td class="n">'+money(r[1])+'</td><td class="n">R$ '+r[2]+'</td><td class="n">R$ '+r[3]+'</td></tr>').join('')+'</tbody></table></div></div>'
      + '<div><h3>Plano Integral</h3><div class="table-scroll"><table class="exec-table"><thead><tr><th>Crédito</th><th>Parcela</th></tr></thead><tbody>'
      + (N.integral||[]).map(r => '<tr><td class="n">'+money(r[0])+'</td><td class="n">R$ '+r[1]+'</td></tr>').join('')+'</tbody></table></div></div>'
      + '</div>';
  }
  $('#numBody').innerHTML = '<div class="section-block prose"><h3>Regras do grupo</h3><ul>'+N.regras.map(r => '<li>'+esc(r)+'</li>').join('')+'</ul></div>'
    + tables
    + '<div class="section-block"><h3>Contas de referência</h3><div class="table-scroll"><table class="exec-table"><tbody>'
    + N.contas.map(c => '<tr><td>'+esc(c[0])+'</td><td class="n">'+esc(c[1])+'</td></tr>').join('')+'</tbody></table></div>'
    + (N.nota ? '<p class="result-count" style="margin-top:10px">'+esc(N.nota)+'</p>' : '')+'</div>';
}
/* ---------- PENDÊNCIAS ---------- */
function renderPend(){
  const list = ACTIVE_DATA.pendencias.map(p => pendOf(p.id));
  const abertas = list.filter(p => p.status !== 'CONFIRMADO').length;
  $('#pendBadge').textContent = abertas ? String(abertas) : '';
  const order = {BLOQUEADO:0, PENDENTE:1, CONFIRMADO:2};
  $('#pendBody').innerHTML = list.slice().sort((a,b) => order[a.status]-order[b.status]).map(p =>
    '<div class="card pend-card '+p.status+'"><div class="row1"><span class="as">'+esc(p.assunto)+'</span>'
    + '<select data-pend="'+p.id+'" aria-label="Status da pendência">'+['PENDENTE','CONFIRMADO','BLOQUEADO'].map(s => '<option'+(s===p.status?' selected':'')+'>'+s+'</option>').join('')+'</select></div>'
    + '<div class="af">Conteúdo afetado: '+(p.afeta.length ? p.afeta.map(id => '<button class="linkcode" type="button" data-open="'+id+'">'+id+'</button>').join('') : 'nenhum diretamente')+'</div>'
    + '<textarea data-pendobs="'+p.id+'" aria-label="Observação">'+esc(p.obs||'')+'</textarea></div>').join('');
}
$('#pendBody').addEventListener('change', async e => {
  const sel = e.target.closest('select[data-pend]');
  if(sel){ const id = sel.dataset.pend; pendState[id] = Object.assign({}, pendState[id], {status:sel.value, obs:pendOf(id).obs}); renderAll(); toast('Pendência marcada como '+sel.value); await savePend(id); return; }
  const ta = e.target.closest('textarea[data-pendobs]');
  if(ta){ const id = ta.dataset.pendobs; pendState[id] = Object.assign({}, pendState[id], {status:pendOf(id).status, obs:ta.value}); await savePend(id); toast('Observação salva'); }
});

/* ---------- Cliques globais ---------- */
document.addEventListener('click', e => {
  const st = e.target.closest('button[data-stage]');
  if(st){
    const key = st.dataset.campaign || campaignKey;
    if(key === campaignKey) setStage(st.dataset.id, st.dataset.stage, st.getAttribute('aria-pressed') !== 'true');
    else setStageFor(key, st.dataset.id, st.dataset.stage, st.getAttribute('aria-pressed') !== 'true');
    return;
  }
  const tg = e.target.closest('[data-toggle]');
  if(tg){ const id = tg.dataset.toggle; const card = tg.parentElement; const o = card.getAttribute('data-open') === 'true';
    card.setAttribute('data-open', String(!o)); if(o) openCards.delete(id); else openCards.add(id); return; }
  const cp = e.target.closest('[data-copy]');
  if(cp){ copyText(COPYSRC[cp.dataset.copy] || '', cp); return; }
  const tpBtn = e.target.closest('[data-tp]');
  if(tpBtn){ const key=tpBtn.dataset.campaign||campaignKey; const item=(CAMPAIGNS[key].reels||[]).concat(CAMPAIGNS[key].ads||[]).find(i=>i.id===tpBtn.dataset.tp); openTP(item); return; }
  const op = e.target.closest('[data-open]');
  if(op){ const key=op.dataset.campaign||campaignKey; hideResults(); if(key!==campaignKey){ switchCampaign(key).then(()=>{ openCards.add(op.dataset.open); openItem(op.dataset.open); }); } else { openCards.add(op.dataset.open); openItem(op.dataset.open); } return; }
  if(!e.target.closest('.gsearch')) hideResults();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ const op = e.target.closest && e.target.closest('.compact[data-open]'); if(op) op.click(); }
});

/* ---------- Busca global ---------- */
const gInput = $('#globalSearch'), gRes = $('#globalResults');
function hideResults(){ gRes.hidden = true; }
gInput.addEventListener('input', () => {
  const q = gInput.value.trim().toLowerCase();
  if(q.length < 2){ hideResults(); return; }
  const hits = [];
  ITEMS.forEach(i => {
    const hay = [i.id, i.titulo, i.gancho || '', (i.roteiro||[]).join(' '), i.legenda || '', i.copy || '', i.whatsapp || ''].join(' ');
    const k = hay.toLowerCase().indexOf(q);
    if(k >= 0) hits.push({i, snip: hay.slice(Math.max(0,k-40), k+60)});
  });
  ACTIVE_DATA.pendencias.forEach(p => { if((p.assunto+' '+p.obs).toLowerCase().includes(q)) hits.push({pend:p}); });
  gRes.innerHTML = hits.slice(0, 12).map(h => h.pend
    ? '<button type="button" data-goto="pendencias"><span class="code">PEND</span><span>'+esc(h.pend.assunto)+'</span></button>'
    : '<button type="button" data-open="'+h.i.id+'"><span class="code">'+h.i.id+'</span><span>'+esc(h.i.titulo)+'<span class="snip">…'+esc(h.snip)+'…</span></span></button>').join('') || '<div class="empty">Nada encontrado.</div>';
  gRes.hidden = false;
});
gRes.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if(g){ hideResults(); goToView(g.dataset.goto); } });
gInput.addEventListener('keydown', e => { if(e.key === 'Escape'){ gInput.value = ''; hideResults(); } });

/* ---------- Teleprompter ---------- */
const tp = {on:false, speed:3, size:store.get('avaner-tpsize', 38), raf:0, last:0, acc:0, lock:null};
function applyTP(){ $('#tpText').style.fontSize = tp.size+'px'; $('#tpSpd').textContent = 'vel '+tp.speed; $('#tpPlay').textContent = tp.on ? '❚❚ Pausar' : '▶ Rolar'; }
function openTP(item){
  if(!item) return;
  $('#tpText').innerHTML = '<p style="opacity:.55;font-size:.6em">'+esc(item.id+' · '+item.titulo)+'</p>'+item.roteiro.map(p => '<p>'+esc(p)+'</p>').join('');
  $('#tp').hidden = false; document.body.style.overflow = 'hidden'; $('#tpScroll').scrollTop = 0; applyTP();
  try{ navigator.wakeLock && navigator.wakeLock.request('screen').then(l => tp.lock = l).catch(() => {}); }catch(e){}
}
function closeTP(){ stopTP(); $('#tp').hidden = true; document.body.style.overflow = ''; try{ tp.lock && tp.lock.release(); }catch(e){} }
function stepTP(ts){ if(!tp.on) return; if(tp.last){ tp.acc += (ts-tp.last)*tp.speed*0.012; const px = Math.floor(tp.acc); if(px > 0){ $('#tpScroll').scrollTop += px; tp.acc -= px; } } tp.last = ts; tp.raf = requestAnimationFrame(stepTP); }
function startTP(){ tp.on = true; tp.last = 0; tp.raf = requestAnimationFrame(stepTP); applyTP(); }
function stopTP(){ tp.on = false; cancelAnimationFrame(tp.raf); applyTP(); }
$('#tpPlay').onclick = () => tp.on ? stopTP() : startTP();
$('#tpFast').onclick = () => { tp.speed = Math.min(10, tp.speed+1); applyTP(); };
$('#tpSlow').onclick = () => { tp.speed = Math.max(1, tp.speed-1); applyTP(); };
$('#tpBig').onclick = () => { tp.size = Math.min(80, tp.size+4); store.set('avaner-tpsize', tp.size); applyTP(); };
$('#tpSmall').onclick = () => { tp.size = Math.max(22, tp.size-4); store.set('avaner-tpsize', tp.size); applyTP(); };
$('#tpMirror').onclick = () => $('#tp').classList.toggle('mirror');
$('#tpTop').onclick = () => { $('#tpScroll').scrollTop = 0; };
$('#tpClose').onclick = closeTP;
$('#tpScroll').addEventListener('click', () => tp.on ? stopTP() : startTP());
document.addEventListener('keydown', e => { if($('#tp').hidden) return; if(e.key === 'Escape') closeTP(); if(e.key === ' '){ e.preventDefault(); tp.on ? stopTP() : startTP(); } });

/* ---------- Render ---------- */
function renderAll(){
  renderHoje(); renderGeral(); renderExec(); renderCal(); renderRoteiros(); renderAds(); renderWA(); renderNum(); renderPend();
}
renderCampaignChrome();
renderExecFilters(); renderRotFilters();
renderAll();
const savedTab = store.get('avaner-tab', 'hoje'); if(savedTab !== 'hoje' && document.getElementById('view-'+savedTab)) goToView(savedTab);
loadAll(false).then(subscribe);
