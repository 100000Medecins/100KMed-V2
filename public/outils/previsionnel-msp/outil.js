/* Outil « Prévisionnel Maison de Santé » : calcul, interface, compte, partage.
   Monté sur le balisage de la page (#msp) par le composant OutilPrevisionnel, démonté quand on quitte
   la page sans rechargement. Repris de la page autonome d'origine ; calcul inchangé. */
(function(){
'use strict';
let pristine=null; // balisage d'origine, remis à chaque montage (éléments neufs, sans écouteurs)
function monter(){
const root=document.getElementById('msp'); if(!root) return ()=>{};
if(pristine===null) pristine=root.innerHTML; else root.innerHTML=pristine;
const ctrl=new AbortController(), sig={signal:ctrl.signal};

/* ---------- Données par défaut ---------- */
const TEMPLATES = {
  mg:   {name:'Médecin généraliste', tarif:30, tarifSoir:30, consultH:4, hoursDay:6.5, daysWeek:4.5, evenings:1, hoursEvening:3, vacations:6, social:0.30, parts:1, usesBox:true, count0:2, extraCount:1, extraMonth:13, remplaOn:true, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:6, collabStart:13, collabKeep:0.85},
  sf:   {name:'Sage-femme', tarif:28, tarifSoir:28, consultH:2, hoursDay:7, daysWeek:4.5, evenings:0, hoursEvening:0, vacations:6, social:0.30, parts:1, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:true, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:4, collabStart:13, collabKeep:0.85},
  ide:  {name:'Infirmier(ère)', tarif:11, tarifSoir:11, consultH:5, hoursDay:8, daysWeek:5, evenings:0, hoursEvening:0, vacations:5, social:0.30, parts:0.5, usesBox:false, count0:2, extraCount:0, extraMonth:13, remplaOn:true, remplaKeep:0.90, remplaStart:1, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.9},
  kine: {name:'Masseur-kinésithérapeute', tarif:20, tarifSoir:20, consultH:3, hoursDay:8, daysWeek:5, evenings:0, hoursEvening:0, vacations:5, social:0.30, parts:1, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:false, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.85},
  ortho:{name:'Orthophoniste', tarif:36, tarifSoir:36, consultH:2, hoursDay:7, daysWeek:4.5, evenings:0, hoursEvening:0, vacations:6, social:0.28, parts:1, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:false, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.85},
  podo: {name:'Pédicure-podologue', tarif:32, tarifSoir:32, consultH:2, hoursDay:7, daysWeek:4.5, evenings:0, hoursEvening:0, vacations:5, social:0.28, parts:1, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:false, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.85},
  psy:  {name:'Psychologue', tarif:55, tarifSoir:55, consultH:1, hoursDay:7, daysWeek:4.5, evenings:1, hoursEvening:3, vacations:6, social:0.25, parts:1, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:false, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.85},
  diet: {name:'Diététicien(ne)', tarif:45, tarifSoir:45, consultH:1.5, hoursDay:7, daysWeek:4, evenings:0, hoursEvening:0, vacations:6, social:0.25, parts:0.5, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:false, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.85},
  autre:{name:'Autre profession', tarif:30, tarifSoir:30, consultH:2, hoursDay:7, daysWeek:4.5, evenings:0, hoursEvening:0, vacations:6, social:0.28, parts:1, usesBox:true, count0:1, extraCount:0, extraMonth:13, remplaOn:false, remplaKeep:0.85, remplaStart:7, collabOn:false, collabHours:0, collabStart:13, collabKeep:0.85}
};
const TEMPLATE_ORDER = ['mg','sf','ide','kine','ortho','podo','psy','diet','autre'];
const CAT = {1:'Mobilier',2:'Matériel médical',3:'Informatique'};
const GROUPS = ['Par box de consultation','Matériel commun','Salle d\'attente','Secrétariat / accueil','Salle de repos','Sanitaires'];

function defaultEquipment(){
  const B = 'Par box de consultation', C='Matériel commun', A='Salle d\'attente', S='Secrétariat / accueil', R='Salle de repos', W='Sanitaires';
  const rows = [
    [B,'Divan d\'examen électrique',2500,1,2,true],[B,'Table à langer murale',350,1,2,true],[B,'Paravent',150,1,2,true],[B,'Lampe d\'examen sur pied',250,1,2,true],
    [B,'Bureau',500,1,1,true],[B,'Fauteuil praticien',300,1,1,true],[B,'Sièges patients',120,2,1,true],[B,'Tabouret',80,1,1,true],[B,'Meuble de rangement',300,1,1,true],[B,'Étagères',150,1,1,true],[B,'Éclairage',150,1,1,true],
    [B,'Thermomètre sans contact',60,1,2,true],[B,'Tensiomètre manuel + brassards',90,1,2,true],[B,'Saturomètre',60,1,2,true],[B,'Débitmètre de pointe',40,1,2,true],[B,'Échelles d\'acuité visuelle (adulte, enfant)',80,1,2,true],
    [B,'Matériel de suture / petite chirurgie',300,1,2,true],[B,'Toise adulte',60,1,2,true],[B,'Toise bébé',60,1,2,true],[B,'Pèse-personne',150,1,2,true],[B,'Pèse-bébé',150,1,2,true],[B,'Lecteur de glycémie',40,1,2,true],
    [B,'Collecteurs DASRI et poubelles',80,1,2,true],[B,'Matériel pédagogique',100,1,2,true],[B,'Ordinateur',900,1,3,true],[B,'Imprimante multifonction',250,1,3,true],[B,'Lecteur carte Vitale / CPS',300,1,3,true],
    [C,'Dermatoscope',500,1,2,false],[C,'Électrocardiographe',1500,1,2,false],[C,'Doppler obstétrical',400,1,2,false],[C,'Autoclave',3000,1,2,false],[C,'Trousse d\'urgence',300,1,2,false],[C,'Défibrillateur semi-automatique',1500,1,2,false],
    [C,'Masques de ventilation (adulte, enfant, nouveau-né)',300,1,2,false],[C,'Bouteille d\'oxygène 1 m³',300,1,2,false],[C,'Armoire à pharmacie sécurisée',600,1,1,false],[C,'Tests d\'optométrie (Parinaud, Ishihara)',150,1,2,false],
    [C,'Otoscope / nettoyeur d\'oreilles',250,1,2,false],[C,'Tensiomètre électronique',100,1,2,false],[C,'Lecteur de bandelettes urinaires',500,1,2,false],[C,'Pied à perfusion',80,1,2,false],[C,'Planche à massage cardiaque',60,1,2,false],[C,'Ophtalmoscope',300,1,2,false],
    [C,'Mise en service du logiciel métier, paramétrage',1500,1,3,false],[C,'Réseau informatique, NAS, Wi-Fi',1500,1,3,false],[C,'Standard téléphonique',500,1,3,false],[C,'Signalétique extérieure et intérieure',800,1,1,false],
    [A,'Fauteuils et banquettes',1500,1,1,false],[A,'Éclairage',300,1,1,false],[A,'Décoration et affichage',500,1,1,false],[A,'Écran d\'information',400,1,3,false],
    [S,'Comptoir d\'accueil',1500,1,1,false],[S,'Ordinateur',900,1,3,false],[S,'Imprimante',300,1,3,false],[S,'Scanner',200,1,3,false],[S,'Siège',250,1,1,false],[S,'Éclairage',150,1,1,false],
    [R,'Table de réunion et chaises',600,1,1,false],[R,'Rangements',400,1,1,false],[R,'Canapé',600,1,1,false],[R,'Réfrigérateur',400,1,1,false],[R,'Machine à café, bouilloire',150,1,1,false],[R,'Éclairage',200,1,1,false],
    [W,'Sèche-mains',300,1,1,false],[W,'Table à langer',300,1,1,false]
  ];
  return rows.map(r=>({group:r[0],name:r[1],price:r[2],qty:r[3],cat:r[4],perBox:r[5]}));
}

let uid = 1;
function mkProf(key){ const t = Object.assign({}, TEMPLATES[key]); t.id = 'p'+(uid++); t.key=key; return t; }

function defaultState(){
  uid = 1;
  return {
    name:'Mon projet de maison de santé',
    horizon:48,
    ramp:{start:0.2,end:0.95,months:12},
    professions:[mkProf('mg'),mkProf('sf'),mkProf('ide')],
    local:{surface:220,rentM2:150,tva:0,chargesM2:20,taxeM2:15,franchise:3,worksM2:600,cautionMonths:3},
    charges:{telecom:150,software:90,medConsum:60,officeConsum:30,accountingStructure:2400,accountingPayroll:600,bankInsurance:200,reserve:0.10,cleaningHours:8,cleaningRate:28,secretaryNet:1700,employerRate:0.75,secretaryStart:1,phoneSecretariat:0,
      other:[{label:'Maintenance et entretien du matériel',monthly:100},{label:'Collecte des déchets de soins (DASRI)',monthly:60}]},
    invest:{creation:2500,capital:1000,bfr:30000,boxes:null},
    equipment:defaultEquipment(),
    fin:{equity:10000,grants:0,loanMonths:84,rate:0.04,deferMonths:6},
    amort:{creation:3,equipment:5,works:7}
  };
}

/* ---------- État et persistance ---------- */
const KEY='msp-previsionnel-v1';
const OWN_RAW=(()=>{ try{ return localStorage.getItem(KEY); }catch(e){ return null; } })(); // scénario du visiteur à l'arrivée
let S = load() || defaultState();
function load(){ try{ const raw=localStorage.getItem(KEY); if(!raw) return null; const s=JSON.parse(raw); if(!s||!s.professions) return null; uid = 1 + s.professions.reduce((m,p)=>Math.max(m, parseInt(String(p.id).slice(1))||0),0); return s; }catch(e){ return null; } }
// Prévisionnel partagé par lien (lecture seule) : jamais écrit dans le navigateur du visiteur.
const SHARE_TOKEN=(()=>{ let h=''; try{ h=location.hash||''; }catch(e){} const m=/^#partage=([A-Za-z0-9_-]{24})$/.exec(h); return m?m[1]:null; })();
if(SHARE_TOKEN) root.setAttribute('data-shared','loading');
let shared=null;
function save(){ if(shared) return; try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* ---------- Utilitaires ---------- */
const fmtEur = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const fmtEur0 = v => fmtEur.format(Math.round(v||0));
const fmtK = v => { v=v||0; const a=Math.abs(v); if(a>=1e6) return (v/1e6).toLocaleString('fr-FR',{maximumFractionDigits:1})+' M€'; if(a>=1000) return Math.round(v/1000).toLocaleString('fr-FR')+' k€'; return Math.round(v).toLocaleString('fr-FR')+' €'; };
const fmtN = (v,d=0) => (v||0).toLocaleString('fr-FR',{maximumFractionDigits:d});
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getPath(obj,path){ return path.split('.').reduce((o,k)=> o==null?undefined:o[k], obj); }
function setPath(obj,path,val){ const ks=path.split('.'); let o=obj; for(let i=0;i<ks.length-1;i++){ o=o[ks[i]]; } o[ks[ks.length-1]]=val; }
const SERIES = ['--s1','--s2','--s3','--s4','--s5','--s6','--s7','--s8'];
const seriesVar = i => `var(${SERIES[i%SERIES.length]})`;
function pmt(principal, annualRate, n){ if(n<=0||principal<=0) return 0; const r=annualRate/12; if(r===0) return principal/n; return principal*r/(1-Math.pow(1+r,-n)); }

/* ---------- Moteur de calcul ---------- */
function autoBoxes(){ return S.professions.filter(p=>p.usesBox).reduce((a,p)=>a+(p.count0||0)+(p.extraCount||0),0); }
function compute(){
  const H = S.horizon|0;
  const boxes = (S.invest.boxes==null||S.invest.boxes==='') ? autoBoxes() : (S.invest.boxes|0);
  // Matériel
  const equipByCat = {1:0,2:0,3:0}; let equipTotal=0;
  S.equipment.forEach(e=>{ const q=(e.perBox?boxes:1)*(e.qty||0); const t=q*(e.price||0); equipByCat[e.cat]=(equipByCat[e.cat]||0)+t; equipTotal+=t; });
  // Investissements
  const L=S.local, rentHT = L.rentM2*L.surface/12;
  const works = L.worksM2*L.surface, caution = rentHT*L.cautionMonths;
  const needs = {works, caution, equipMed:equipByCat[2], equipMob:equipByCat[1], equipIT:equipByCat[3], creation:S.invest.creation, capital:S.invest.capital, bfr:S.invest.bfr};
  const needsTotal = Object.values(needs).reduce((a,b)=>a+b,0);
  const loan = Math.max(0, needsTotal - S.fin.equity - S.fin.grants);
  const surplus = Math.max(0, S.fin.equity + S.fin.grants - needsTotal);
  const payment = pmt(loan, S.fin.rate, S.fin.loanMonths);
  const loanTotalCost = payment*S.fin.loanMonths - loan;
  // Amortissements annuels (info)
  const amortYear = (S.invest.creation/S.amort.creation) + (equipTotal/S.amort.equipment) + (works/S.amort.works);

  const ramp = S.ramp;
  const occ = k => { if(k<1) return 0; if(ramp.months<=0) return ramp.end; return Math.min(ramp.start + (ramp.end-ramp.start)*(k-1)/ramp.months, ramp.end); };

  const months=[];
  let cash = S.invest.bfr + surplus;
  let breakEven=null;
  for(let m=1;m<=H;m++){
    const row={m, prof:{}, rev:0, retro:0, charges:{}, chargesTotal:0, headcount:0, parts:0};
    // Professions : effectif, taux, recettes
    S.professions.forEach(p=>{
      const n0=p.count0||0, nx=(m>=(p.extraMonth||1))?(p.extraCount||0):0;
      const head=n0+nx;
      const fte = n0*occ(m) + nx*occ(m-(p.extraMonth||1)+1);
      const occAvg = head>0 ? fte/head : 0;
      const wpm = Math.max(0,(52-(p.vacations||0)))/12;
      const dayActs = (p.hoursDay||0)*(p.consultH||0)*(p.daysWeek||0)*wpm;
      const eveActs = (p.evenings||0)*(p.hoursEvening||0)*(p.consultH||0)*wpm;
      const fullRev = dayActs*(p.tarif||0) + eveActs*(p.tarifSoir||0);
      const rev = fullRev*fte;
      // remplaçants de congés
      let remplaGross=0, remplaToAssoc=0;
      if(p.remplaOn && m>=(p.remplaStart||1) && head>0){
        const vacActsPerMonth = (p.hoursDay||0)*(p.consultH||0)*(p.daysWeek||0)*((p.vacations||0)/12);
        remplaGross = vacActsPerMonth*(p.tarif||0)*head*occAvg;
        remplaToAssoc = remplaGross*(1-(p.remplaKeep||0));
      }
      let collabGross=0, collabToAssoc=0;
      if(p.collabOn && m>=(p.collabStart||1)){
        collabGross = (p.collabHours||0)*(p.consultH||0)*(p.tarif||0)*(52/12)*occAvg;
        collabToAssoc = collabGross*(1-(p.collabKeep||0));
      }
      const retro = remplaToAssoc+collabToAssoc;
      row.prof[p.id]={head, fte, occ:occAvg, rev, retro, remplaGross, collabGross, fullRev};
      row.rev += rev+retro; row.retro += retro; row.headcount += head; row.parts += head*(p.parts||0);
    });
    // Charges
    const C=S.charges;
    const ch = row.charges;
    ch.rent = m>(L.franchise||0) ? rentHT*(1+(L.tva||0)) : 0;
    ch.locatives = ((L.chargesM2||0)+(L.taxeM2||0))*L.surface/12;
    ch.telecom = (C.telecom||0);
    ch.software = (C.software||0)*row.headcount + (C.phoneSecretariat||0);
    ch.consum = ((C.medConsum||0)+(C.officeConsum||0))*row.headcount;
    ch.accounting = ((C.accountingStructure||0)+(C.accountingPayroll||0))/12;
    ch.bank = (C.bankInsurance||0);
    ch.cleaning = (C.cleaningHours||0)*(C.cleaningRate||0)*52/12;
    ch.secretary = (m>=(C.secretaryStart||1)) ? (C.secretaryNet||0)*(1+(C.employerRate||0))*13/12 : 0;
    ch.other = (C.other||[]).reduce((a,o)=>a+(o.monthly||0),0);
    ch.loan = (m>(S.fin.deferMonths||0) && m<=(S.fin.deferMonths||0)+(S.fin.loanMonths||0)) ? payment : 0;
    const sub = Object.values(ch).reduce((a,b)=>a+b,0);
    ch.reserve = sub*(C.reserve||0);
    row.chargesTotal = sub + ch.reserve;
    // Répartition et revenu net
    S.professions.forEach(p=>{
      const r=row.prof[p.id];
      const share = row.parts>0 ? row.chargesTotal*(p.parts||0)/row.parts : 0; // par praticien
      r.chargeShare = share;
      const gross = r.head>0 ? (r.rev+r.retro)/r.head - share : 0;
      r.netBefore = gross;
      r.net = Math.max(0, gross)*(1-(p.social||0));
    });
    row.result = row.rev - row.chargesTotal;
    cash += row.result; row.cash = cash;
    if(breakEven==null && row.result>0) breakEven=m;
    months.push(row);
  }
  // Années
  const years=[];
  for(let y=0;y<Math.ceil(H/12);y++){
    const slice=months.slice(y*12,(y+1)*12);
    const yr={y:y+1, rev:0, charges:0, result:0, prof:{}};
    slice.forEach(r=>{ yr.rev+=r.rev; yr.charges+=r.chargesTotal; yr.result+=r.result; });
    S.professions.forEach(p=>{ const nets=slice.map(r=>r.prof[p.id].net); const heads=slice.map(r=>r.prof[p.id].head); yr.prof[p.id]={netAvg: nets.reduce((a,b)=>a+b,0)/slice.length, headEnd: heads[heads.length-1]}; });
    yr.cashEnd = slice[slice.length-1].cash;
    years.push(yr);
  }
  const last = months[months.length-1];
  const minCash = Math.min(...months.map(r=>r.cash));
  return {H, boxes, equipByCat, equipTotal, needs, needsTotal, loan, surplus, payment, loanTotalCost, amortYear, months, years, last, breakEven, minCash, rentHT};
}

/* ---------- Rendu : formulaire ---------- */
function fillStatic(){
  root.querySelectorAll('[data-path]').forEach(el=>{
    if(el.closest('#profList')||el.closest('#equipGroups')||el.closest('#otherTable')) return;
    const v=getPath(S, el.dataset.path);
    if(el.type==='checkbox'){ el.checked=!!v; return; }
    if(el.dataset.kind==='pct') el.value = v==null?'':Math.round(v*1000)/10;
    else el.value = (v==null)?'':v;
  });
  document.getElementById('scenarioName').value = S.name||'';
}

function profCard(p, idx){
  const col = seriesVar(idx);
  const h = (path,label,unit,opts={}) => {
    const id = `${p.id}-${path}`; const v=p[path];
    const kind = opts.pct?'data-kind="pct"':'';
    const val = opts.pct ? Math.round((v||0)*1000)/10 : (v==null?'':v);
    return `<div class="field"><label for="${id}">${label}</label><div class="ctl"><input id="${id}" type="number" data-path="professions.${idx}.${path}" ${kind} value="${val}" min="${opts.min??0}" ${opts.max!=null?`max="${opts.max}"`:''} step="${opts.step??1}"><span class="unit">${unit}</span></div>${opts.help?`<div class="help">${opts.help}</div>`:''}</div>`;
  };
  const chk = (path,label) => `<label class="check"><input type="checkbox" data-path="professions.${idx}.${path}" ${p[path]?'checked':''}> ${label}</label>`;
  return `<div class="card prof" style="--pc:${col}" data-prof="${idx}">
    <div class="card-h">
      <div class="prof-title"><span class="dot" style="background:${col}"></span><input class="name" type="text" data-path="professions.${idx}.name" data-kind="text" value="${esc(p.name)}" aria-label="Nom de la profession"><span class="prof-sum" id="sum-${p.id}"></span></div>
      <button class="btn small danger" type="button" data-action="delProf" data-idx="${idx}">Retirer</button>
    </div>
    <div class="fields">
      ${h('count0','Praticiens à l\'ouverture','',{step:1})}
      ${h('extraCount','Arrivées supplémentaires','',{step:1})}
      ${h('extraMonth','Mois d\'arrivée des suivants','mois n°',{min:1,step:1})}
      ${h('parts','Parts de charges par praticien','part(s)',{step:0.25,help:'Quote-part des charges de la structure (1 = part entière).'})}
      ${h('social','Cotisations sociales','% du revenu',{pct:true,step:1,max:100,help:'URSSAF + caisse de retraite, en % du bénéfice.'})}
      <div class="field"><label>Occupe un box</label>${chk('usesBox','Mobilise un box de consultation')}<div class="help">Décochez pour une activité surtout à domicile.</div></div>
    </div>
    <div class="sub"><div class="sub-h"><h4>Activité d'un praticien</h4></div>
    <div class="fields">
      ${h('tarif','Tarif moyen d\'un acte en journée','€',{step:1})}
      ${h('consultH','Actes par heure','',{step:0.5})}
      ${h('hoursDay','Heures de consultation par jour','h',{step:0.5})}
      ${h('daysWeek','Jours par semaine','j',{step:0.5,max:7})}
      ${h('vacations','Semaines de congés par an','sem.',{step:1,max:52})}
      ${h('evenings','Soirées par semaine','',{step:1,max:7})}
      ${h('hoursEvening','Heures par soirée','h',{step:0.5})}
      ${h('tarifSoir','Tarif moyen en soirée','€',{step:1})}
    </div></div>
    <div class="sub"><div class="sub-h"><h4>Remplacements</h4></div>
    <div class="fields">
      <div class="field"><label>Pendant les congés</label>${chk('remplaOn','Remplaçant pendant les congés')}<div class="help">Les créneaux de vacances restent assurés.</div></div>
      ${h('remplaKeep','Part conservée par le remplaçant','%',{pct:true,step:5,max:100,help:'Le reste (rétrocession) revient au titulaire.'})}
      ${h('remplaStart','Premier remplacement','mois n°',{min:1,step:1})}
      <div class="field"><label>Collaborateur régulier</label>${chk('collabOn','Heures supplémentaires chaque semaine')}<div class="help">Soirées, samedis… assurés par un collaborateur ou remplaçant régulier.</div></div>
      ${h('collabHours','Heures par semaine du collaborateur','h',{step:1})}
      ${h('collabStart','Début de la collaboration','mois n°',{min:1,step:1})}
      ${h('collabKeep','Part conservée par le collaborateur','%',{pct:true,step:5,max:100})}
    </div></div>
  </div>`;
}
function renderProfs(){
  document.getElementById('profList').innerHTML = S.professions.map(profCard).join('');
  const sel=document.getElementById('addProfSel');
  // Seules les professions absentes de l'écran sont proposées ; « Autre profession » l'est toujours.
  const used=new Set(S.professions.map(p=>p.key));
  sel.innerHTML = TEMPLATE_ORDER.filter(k=>k==='autre'||!used.has(k)).map(k=>`<option value="${k}">${esc(TEMPLATES[k].name)}</option>`).join('');
}
function renderOther(){
  const rows=(S.charges.other||[]).map((o,i)=>`<tr><td><input class="txt" type="text" data-path="charges.other.${i}.label" data-kind="text" value="${esc(o.label)}" aria-label="Libellé"></td><td><div class="ctl" style="display:inline-flex"><input type="number" data-path="charges.other.${i}.monthly" value="${o.monthly??''}" min="0" step="10" aria-label="Montant mensuel"><span class="unit">€/mois</span></div></td><td><button class="x" type="button" data-action="delOther" data-idx="${i}" aria-label="Supprimer">×</button></td></tr>`).join('');
  document.getElementById('otherTable').innerHTML = `<thead><tr><th>Libellé</th><th>Montant</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="3" style="color:var(--muted);text-align:left">Aucune autre charge.</td></tr>'}</tbody>`;
}
function renderEquip(){
  const html = GROUPS.map(g=>{
    const items = S.equipment.map((e,i)=>({e,i})).filter(x=>x.e.group===g);
    const rows = items.map(({e,i})=>`<tr>
      <td><input class="txt" type="text" data-path="equipment.${i}.name" data-kind="text" value="${esc(e.name)}" aria-label="Désignation"></td>
      <td><div class="ctl" style="display:inline-flex"><input type="number" data-path="equipment.${i}.price" value="${e.price??''}" min="0" step="10" aria-label="Prix unitaire TTC"><span class="unit">€</span></div></td>
      <td><div class="ctl" style="display:inline-flex;min-width:70px"><input type="number" data-path="equipment.${i}.qty" value="${e.qty??''}" min="0" step="1" aria-label="Quantité"></div></td>
      <td><label class="check" style="justify-content:center"><input type="checkbox" data-path="equipment.${i}.perBox" ${e.perBox?'checked':''} aria-label="Multiplié par le nombre de box"></label></td>
      <td><div class="ctl" style="display:inline-flex"><select data-path="equipment.${i}.cat" data-kind="int" aria-label="Catégorie">${Object.keys(CAT).map(c=>`<option value="${c}" ${String(e.cat)===c?'selected':''}>${CAT[c]}</option>`).join('')}</select></div></td>
      <td class="num" data-eqtotal="${i}"></td>
      <td><button class="x" type="button" data-action="delEquip" data-idx="${i}" aria-label="Supprimer">×</button></td></tr>`).join('');
    return `<div class="card"><div class="card-h"><h3>${esc(g)}</h3><button class="btn small" type="button" data-action="addEquip" data-group="${esc(g)}">+ Ajouter</button></div>
      <div class="tscroll"><table><thead><tr><th>Désignation</th><th>Prix unitaire TTC</th><th>Qté</th><th title="Quantité multipliée par le nombre de box">× box</th><th>Catégorie</th><th>Total</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="7" style="color:var(--muted)">Aucun élément.</td></tr>'}</tbody><tfoot><tr class="total"><td colspan="5">Sous-total</td><td class="num" data-grouptotal="${esc(g)}"></td><td></td></tr></tfoot></table></div></div>`;
  }).join('');
  document.getElementById('equipGroups').innerHTML = html;
}

/* ---------- Rendu : résultats ---------- */
let R=null;
function renderAll(){
  R = compute();
  renderSynthese(); renderLocalHints(); renderEquipTotals(); renderPlan(); renderResults(); profSummaries();
  save();
}
function profSummaries(){
  S.professions.forEach(p=>{ const el=document.getElementById('sum-'+p.id); if(!el) return; const r=R.last.prof[p.id]; el.textContent=`${fmtEur0(r.fullRev)} de recettes mensuelles par praticien à 100 % · ${fmtEur0(r.net)} net en croisière`; });
}
function renderLocalHints(){
  const L=S.local;
  document.getElementById('surfaceHint').textContent = `Repère : environ 45 à 55 m² par box, communs compris (${R.boxes} box → ${fmtN(R.boxes*50)} m²).`;
  const rentTTC = R.rentHT*(1+(L.tva||0)); const loc=((L.chargesM2||0)+(L.taxeM2||0))*L.surface/12;
  document.getElementById('localTotals').innerHTML = `<span>Loyer mensuel : <b>${fmtEur0(rentTTC)}</b></span><span>Charges locatives : <b>${fmtEur0(loc)}</b></span><span>Travaux : <b>${fmtEur0(R.needs.works)}</b></span><span>Dépôt de garantie : <b>${fmtEur0(R.needs.caution)}</b></span>`;
}
function renderEquipTotals(){
  const perBox = R.boxes>0 ? R.equipTotal/R.boxes : 0;
  document.getElementById('boxHint').textContent = `Laissez vide pour le calcul automatique (${autoBoxes()} praticiens occupant un box à terme).`;
  document.getElementById('equipTotals').innerHTML = [
    ['Total matériel et ameublement', fmtEur0(R.equipTotal), `${R.boxes} box · ${fmtEur0(perBox)} par box`],
    ['Mobilier', fmtEur0(R.equipByCat[1]), ''],['Matériel médical', fmtEur0(R.equipByCat[2]), ''],['Informatique', fmtEur0(R.equipByCat[3]), '']
  ].map(([k,v,d])=>`<div class="tile"><div class="k">${k}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`).join('');
  const groupTotals={};
  S.equipment.forEach((e,i)=>{ const t=(e.perBox?R.boxes:1)*(e.qty||0)*(e.price||0); groupTotals[e.group]=(groupTotals[e.group]||0)+t; const cell=root.querySelector(`[data-eqtotal="${i}"]`); if(cell) cell.textContent=fmtEur0(t); });
  root.querySelectorAll('[data-grouptotal]').forEach(td=>{ td.textContent=fmtEur0(groupTotals[td.dataset.grouptotal]||0); });
}
function renderPlan(){
  const n=R.needs;
  const lines=[['Travaux d\'aménagement',n.works],['Dépôt de garantie',n.caution],['Matériel médical',n.equipMed],['Mobilier',n.equipMob],['Informatique',n.equipIT],['Frais de création',n.creation],['Capital initial',n.capital],['Besoin en fonds de roulement',n.bfr]];
  const fin=[['Apports personnels',S.fin.equity],['Subventions',S.fin.grants],['Emprunt bancaire',R.loan]];
  const rows=Math.max(lines.length,fin.length);
  let body='';
  for(let i=0;i<rows;i++){ const a=lines[i], b=fin[i]; body+=`<tr><td>${a?a[0]:''}</td><td class="num">${a?fmtEur0(a[1]):''}</td><td style="text-align:left;border-left:1px solid var(--line)">${b?b[0]:''}</td><td class="num">${b?fmtEur0(b[1]):''}</td></tr>`; }
  const finTotal=S.fin.equity+S.fin.grants+R.loan;
  document.getElementById('planTable').innerHTML=`<thead><tr><th>Besoins</th><th></th><th style="text-align:left;border-left:1px solid var(--line)">Ressources</th><th></th></tr></thead><tbody>${body}</tbody><tfoot><tr class="total"><td>Total des besoins</td><td class="num">${fmtEur0(R.needsTotal)}</td><td style="text-align:left;border-left:1px solid var(--line)">Total des ressources</td><td class="num">${fmtEur0(finTotal)}</td></tr></tfoot>`;
  document.getElementById('loanTotals').innerHTML = R.loan>0
    ? `<span>Emprunt : <b>${fmtEur0(R.loan)}</b></span><span>Mensualité : <b>${fmtEur0(R.payment)}</b></span><span>Coût total du crédit : <b>${fmtEur0(R.loanTotalCost)}</b></span>`
    : `<span>Aucun emprunt nécessaire${R.surplus>0?` · excédent d'apports ${fmtEur0(R.surplus)} ajouté à la trésorerie`:''}</span>`;
  document.getElementById('amortTotals').innerHTML = `<span>Dotation annuelle aux amortissements : <b>${fmtEur0(R.amortYear)}</b> (${fmtEur0(R.amortYear/12)}/mois)</span>`;
}
function cruiseProfRows(){
  const last=R.last;
  return S.professions.map((p,i)=>{ const r=last.prof[p.id]; return {p,i,net:r.net,head:r.head,share:r.chargeShare,gross:r.netBefore}; });
}
function renderSynthese(){
  const last=R.last;
  const profRows=cruiseProfRows();
  const alerts=[];
  if(R.minCash<0) alerts.push(['bad','Trésorerie négative',`Le fonds de roulement est insuffisant : creux à ${fmtK(R.minCash)}. Augmentez le BFR d'au moins ${fmtK(-R.minCash)} ou réduisez les charges de départ.`]);
  else if(R.breakEven==null) alerts.push(['bad','Jamais à l\'équilibre','Les recettes ne couvrent pas les charges sur l\'horizon choisi.']);
  else if(R.breakEven>1) alerts.push(['warn',`Équilibre au mois ${R.breakEven}`,`Les ${R.breakEven-1} premiers mois sont déficitaires, financés par le fonds de roulement.`]);
  else alerts.push(['good','Équilibre dès le mois 1','Les recettes couvrent les charges dès l\'ouverture.']);
  profRows.forEach(({p,gross})=>{ if(gross<0) alerts.push(['warn',esc(p.name),'La quote-part des charges dépasse les recettes en croisière : revoyez les parts ou l\'activité.']); });
  document.getElementById('synthese').innerHTML = `
    <div class="tile hero wide"><div class="k">Charges mensuelles en croisière</div><div class="v">${fmtEur0(last.chargesTotal)}</div><div class="d">mois ${R.H} · dont emprunt ${fmtEur0(last.charges.loan)} · marge ${Math.round((S.charges.reserve||0)*100)} %</div></div>
    <div class="tile wide"><div class="k">Revenu net mensuel par praticien</div>
      <div class="tile-list">${profRows.map(({p,i,net,head})=>`<div class="tile-row"><div class="l"><span class="dot" style="background:${seriesVar(i)}"></span><span>${esc(p.name)}${head>1?` <small>(×${fmtN(head)})</small>`:''}</span></div><b>${fmtEur0(net)}</b></div>`).join('')}</div>
      <div class="d" style="margin-top:6px">en croisière, après charges et cotisations</div></div>
    <div class="tile"><div class="k">Investissement total</div><div class="v">${fmtK(R.needsTotal)}</div><div class="d">dont matériel ${fmtK(R.equipTotal)}, travaux ${fmtK(R.needs.works)}</div></div>
    <div class="tile"><div class="k">Emprunt</div><div class="v">${fmtK(R.loan)}</div><div class="d">${R.loan>0?`${fmtEur0(R.payment)}/mois sur ${S.fin.loanMonths} mois`:'aucun'}</div></div>
    <div class="tile m-hide"><div class="k">Quote-part mensuelle des charges</div><div class="tile-list">${profRows.map(({p,i,share})=>`<div class="tile-row"><div class="l"><span class="dot" style="background:${seriesVar(i)}"></span><span>${esc(p.name)}</span></div><b>${fmtEur0(share)}</b></div>`).join('')}</div><div class="d" style="margin-top:6px">par praticien, en croisière</div></div>
    ${alerts.map(([t,h,b])=>`<div class="alert ${t} wide"><span class="ic">${t==='good'?'✓':t==='warn'?'!':'✕'}</span><div><b>${h}</b> — ${b}</div></div>`).join('')}
    <button class="btn wide m-hide" type="button" id="goResults" style="justify-content:center">Voir les résultats détaillés →</button>`;
  document.getElementById('goResults').addEventListener('click',()=>showTab('resultats'));
}

function renderResults(){
  const last=R.last, profRows=cruiseProfRows();
  const y1=R.years[0];
  document.getElementById('resKpis').innerHTML = [
    ['Recettes annuelles en croisière', fmtK(last.rev*12), `${fmtEur0(last.rev)} / mois`],
    ['Charges annuelles en croisière', fmtK(last.chargesTotal*12), `${fmtEur0(last.chargesTotal)} / mois`],
    ['Première année', fmtK(y1.result), `résultat collectif avant cotisations`],
    ['Point d\'équilibre', R.breakEven?`Mois ${R.breakEven}`:'—', R.breakEven?'premier mois où recettes > charges':'non atteint sur l\'horizon'],
    ['Creux de trésorerie', fmtK(R.minCash), R.minCash<0?'fonds de roulement insuffisant':`fonds de roulement initial ${fmtK(S.invest.bfr)} jamais entamé`]
  ].map(([k,v,d])=>`<div class="tile"><div class="k">${k}</div><div class="v ${/^-/.test(v)?'neg':''}">${v}</div><div class="d">${d}</div></div>`).join('');

  drawChart1(); drawChart2(); drawChart3();

  // Tableau annuel
  const yrs=R.years;
  let thead=`<tr><th></th>${yrs.map(y=>`<th>Année ${y.y}</th>`).join('')}</tr>`;
  let body=`<tr><td>Recettes des associés</td>${yrs.map(y=>`<td class="num">${fmtEur0(y.rev)}</td>`).join('')}</tr>
    <tr><td>Charges de la structure</td>${yrs.map(y=>`<td class="num">${fmtEur0(-y.charges)}</td>`).join('')}</tr>
    <tr class="total"><td>Résultat collectif avant cotisations</td>${yrs.map(y=>`<td class="num ${y.result<0?'neg':''}">${fmtEur0(y.result)}</td>`).join('')}</tr>
    <tr><td>Cumul du résultat, fonds de roulement compris</td>${yrs.map(y=>`<td class="num ${y.cashEnd<0?'neg':''}">${fmtEur0(y.cashEnd)}</td>`).join('')}</tr>
    <tr class="group"><td colspan="${yrs.length+1}">Revenu net mensuel moyen par praticien</td></tr>
    ${S.professions.map((p,i)=>`<tr><td><span class="dot" style="background:${seriesVar(i)};display:inline-block;vertical-align:middle;margin-right:6px"></span>${esc(p.name)}</td>${yrs.map(y=>`<td class="num">${fmtEur0(y.prof[p.id].netAvg)}</td>`).join('')}</tr>`).join('')}`;
  document.getElementById('yearTable').innerHTML=`<thead>${thead}</thead><tbody>${body}</tbody>`;

  // Tableau mensuel
  const ms=R.months;
  const chLabels={rent:'Loyer',locatives:'Charges locatives et taxe foncière',telecom:'Téléphone + internet',software:'Logiciel et secrétariat externalisé',consum:'Consommables',accounting:'Comptabilité et paies',bank:'Banque et assurances',cleaning:'Ménage',secretary:'Secrétariat salarié',other:'Autres charges fixes',loan:'Remboursement de l\'emprunt',reserve:'Marge prudentielle'};
  let mh=`<tr><th>Mois</th>${ms.map(r=>`<th>${r.m}</th>`).join('')}</tr>`;
  let mb=`<tr class="group"><td colspan="${ms.length+1}">Effectifs et activité</td></tr>`;
  S.professions.forEach(p=>{ mb+=`<tr><td>${esc(p.name)} — praticiens</td>${ms.map(r=>`<td class="num">${fmtN(r.prof[p.id].head,1)}</td>`).join('')}</tr><tr><td>${esc(p.name)} — taux d'activité</td>${ms.map(r=>`<td class="num">${Math.round(r.prof[p.id].occ*100)} %</td>`).join('')}</tr>`; });
  mb+=`<tr class="group"><td colspan="${ms.length+1}">Recettes des associés</td></tr>`;
  S.professions.forEach(p=>{ mb+=`<tr><td>${esc(p.name)}</td>${ms.map(r=>`<td class="num">${fmtEur0(r.prof[p.id].rev+r.prof[p.id].retro)}</td>`).join('')}</tr>`; });
  mb+=`<tr class="total"><td>Total recettes</td>${ms.map(r=>`<td class="num">${fmtEur0(r.rev)}</td>`).join('')}</tr>`;
  mb+=`<tr class="group"><td colspan="${ms.length+1}">Charges de la structure</td></tr>`;
  Object.keys(chLabels).forEach(k=>{ mb+=`<tr><td>${chLabels[k]}</td>${ms.map(r=>`<td class="num">${fmtEur0(-r.charges[k])}</td>`).join('')}</tr>`; });
  mb+=`<tr class="total"><td>Total charges</td>${ms.map(r=>`<td class="num">${fmtEur0(-r.chargesTotal)}</td>`).join('')}</tr>`;
  mb+=`<tr class="total"><td>Résultat collectif</td>${ms.map(r=>`<td class="num ${r.result<0?'neg':''}">${fmtEur0(r.result)}</td>`).join('')}</tr>`;
  mb+=`<tr><td>Cumul du résultat, fonds de roulement compris</td>${ms.map(r=>`<td class="num ${r.cash<0?'neg':''}">${fmtEur0(r.cash)}</td>`).join('')}</tr>`;
  mb+=`<tr class="group"><td colspan="${ms.length+1}">Revenu net mensuel par praticien</td></tr>`;
  S.professions.forEach(p=>{ mb+=`<tr><td>${esc(p.name)}</td>${ms.map(r=>`<td class="num">${fmtEur0(r.prof[p.id].net)}</td>`).join('')}</tr>`; });
  document.getElementById('monthTable').innerHTML=`<thead>${mh}</thead><tbody>${mb}</tbody>`;
}

/* ---------- Graphiques SVG ---------- */
const CW=820, CHH=300, PAD={l:56,r:16,t:14,b:30};
function yScale(max,min=0){ const span=(max-min)||1; return v => PAD.t + (CHH-PAD.t-PAD.b)*(1-(v-min)/span); }
function niceMax(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; const m=[1,1.2,1.5,2,2.5,3,4,5,6,8,10].find(k=>n<=k); return m*p; }
function gridLines(y,max,min=0){ const steps=5; let s=''; for(let i=0;i<=steps;i++){ const v=min+(max-min)*i/steps; const yy=y(v); s+=`<line x1="${PAD.l}" x2="${CW-PAD.r}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--grid)" stroke-width="1"/><text x="${PAD.l-8}" y="${(yy+4).toFixed(1)}" text-anchor="end" fill="var(--muted)">${fmtK(v)}</text>`; } return s; }
function xAxis(H,x,w){ let s=''; const n=Math.ceil(H/12); for(let y=0;y<n;y++){ const x0=x(y*12); s+=`<line x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${PAD.t}" y2="${CHH-PAD.b}" stroke="var(--axis)" stroke-dasharray="2 3"/>`; const xm=x(Math.min(y*12+6,H)); s+=`<text x="${xm.toFixed(1)}" y="${CHH-PAD.b+18}" text-anchor="middle">Année ${y+1}</text>`; } s+=`<line x1="${PAD.l}" x2="${CW-PAD.r}" y1="${CHH-PAD.b}" y2="${CHH-PAD.b}" stroke="var(--axis)"/>`; return s; }
function attachTip(container, H, x, w, tipFn){
  const svg=container.querySelector('svg'), tip=container.querySelector('.tip');
  let hits=''; for(let m=0;m<H;m++){ hits+=`<rect data-m="${m}" x="${x(m).toFixed(1)}" y="${PAD.t}" width="${w.toFixed(1)}" height="${CHH-PAD.t-PAD.b}" fill="transparent"/>`; }
  const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.innerHTML=hits; svg.appendChild(g);
  let hl=document.createElementNS('http://www.w3.org/2000/svg','rect'); hl.setAttribute('fill','var(--ink)'); hl.setAttribute('opacity','0.06'); hl.setAttribute('y',PAD.t); hl.setAttribute('height',CHH-PAD.t-PAD.b); hl.setAttribute('width',w); hl.style.display='none'; hl.setAttribute('pointer-events','none'); svg.insertBefore(hl,g);
  g.addEventListener('pointermove',ev=>{ const t=ev.target; if(!t.dataset||t.dataset.m==null) return; const m=+t.dataset.m; hl.setAttribute('x',x(m)); hl.style.display='';
    tip.innerHTML=tipFn(m); tip.style.display='block'; const rect=container.getBoundingClientRect(); let lx=ev.clientX-rect.left+14, ly=ev.clientY-rect.top-10; if(lx+tip.offsetWidth>rect.width) lx=ev.clientX-rect.left-tip.offsetWidth-14; tip.style.left=Math.max(0,lx)+'px'; tip.style.top=Math.max(0,ly)+'px'; });
  g.addEventListener('pointerleave',()=>{ tip.style.display='none'; hl.style.display='none'; });
}
function legendHtml(items){ return `<div class="legend">${items.map(([c,l])=>`<span><span class="dot" style="background:${c}"></span>${l}</span>`).join('')}</div>`; }

function drawChart1(){
  const H=R.H, ms=R.months; const plotW=CW-PAD.l-PAD.r; const bw=plotW/H; const x=m=>PAD.l+m*bw;
  const maxV=niceMax(Math.max(...ms.map(r=>Math.max(r.rev,r.chargesTotal)))*1.05); const y=yScale(maxV);
  let bars=''; ms.forEach((r,m)=>{ let acc=0; S.professions.forEach((p,i)=>{ const v=r.prof[p.id].rev+r.prof[p.id].retro; if(v<=0) return; const y1=y(acc+v), y0=y(acc); bars+=`<rect x="${(x(m)+1).toFixed(1)}" y="${y1.toFixed(1)}" width="${Math.max(1,bw-2).toFixed(1)}" height="${Math.max(0,y0-y1).toFixed(1)}" fill="${seriesVar(i)}" stroke="var(--surface)" stroke-width="1"/>`; acc+=v; }); });
  const line=ms.map((r,m)=>`${m===0?'M':'L'}${(x(m)+bw/2).toFixed(1)},${y(r.chargesTotal).toFixed(1)}`).join('');
  const lastPt={x:x(H-1)+bw/2,y:y(ms[H-1].chargesTotal)};
  const svg=`<svg viewBox="0 0 ${CW} ${CHH}" role="img" aria-label="Recettes mensuelles par profession et charges">${gridLines(y,maxV)}${xAxis(H,x,bw)}${bars}<path d="${line}" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="4" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/></svg><div class="tip"></div>`;
  const el=document.getElementById('chart1'); el.innerHTML=legendHtml([...S.professions.map((p,i)=>[seriesVar(i),esc(p.name)]),['var(--ink)','Charges totales']])+svg;
  attachTip(el,H,x,bw,m=>{ const r=ms[m]; return `<div class="t">Mois ${r.m}</div>${S.professions.map((p,i)=>`<div class="r"><span class="l"><span class="dot" style="background:${seriesVar(i)}"></span>${esc(p.name)}</span><b>${fmtEur0(r.prof[p.id].rev+r.prof[p.id].retro)}</b></div>`).join('')}<div class="r"><span class="l">Recettes</span><b>${fmtEur0(r.rev)}</b></div><div class="r"><span class="l">Charges</span><b>${fmtEur0(r.chargesTotal)}</b></div><div class="r"><span class="l">Résultat</span><b class="${r.result<0?'neg':''}">${fmtEur0(r.result)}</b></div>`; });
}
function drawChart2(){
  const H=R.H, ms=R.months; const plotW=CW-PAD.l-PAD.r; const bw=plotW/H; const x=m=>PAD.l+m*bw;
  const maxV=niceMax(Math.max(1,...ms.flatMap(r=>S.professions.map(p=>r.prof[p.id].net)))*1.1); const y=yScale(maxV);
  let paths='', labels='';
  S.professions.forEach((p,i)=>{ const d=ms.map((r,m)=>`${m===0?'M':'L'}${(x(m)+bw/2).toFixed(1)},${y(r.prof[p.id].net).toFixed(1)}`).join(''); paths+=`<path d="${d}" fill="none" stroke="${seriesVar(i)}" stroke-width="2" stroke-linejoin="round"/>`; const lx=x(H-1)+bw/2, ly=y(ms[H-1].prof[p.id].net); paths+=`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${seriesVar(i)}" stroke="var(--surface)" stroke-width="2"/>`; });
  const svg=`<svg viewBox="0 0 ${CW} ${CHH}" role="img" aria-label="Revenu net mensuel par praticien">${gridLines(y,maxV)}${xAxis(H,x,bw)}${paths}${labels}</svg><div class="tip"></div>`;
  const el=document.getElementById('chart2'); el.innerHTML=legendHtml(S.professions.map((p,i)=>[seriesVar(i),esc(p.name)]))+svg;
  attachTip(el,H,x,bw,m=>{ const r=ms[m]; return `<div class="t">Mois ${r.m}</div>${S.professions.map((p,i)=>`<div class="r"><span class="l"><span class="dot" style="background:${seriesVar(i)}"></span>${esc(p.name)}</span><b>${fmtEur0(r.prof[p.id].net)}</b></div>`).join('')}`; });
}
function drawChart3(){
  const H=R.H, ms=R.months; const plotW=CW-PAD.l-PAD.r; const bw=plotW/H; const x=m=>PAD.l+m*bw;
  const vals=ms.map(r=>r.result); const maxV=niceMax(Math.max(1,...vals)*1.05); const minRaw=Math.min(0,...vals); const minV=minRaw<0?-niceMax(-minRaw*1.05):0; const y=yScale(maxV,minV);
  let bars=''; ms.forEach((r,m)=>{ const v=r.result; const y0=y(0), y1=y(v); bars+=`<rect x="${(x(m)+1).toFixed(1)}" y="${Math.min(y0,y1).toFixed(1)}" width="${Math.max(1,bw-2).toFixed(1)}" height="${Math.max(0.5,Math.abs(y0-y1)).toFixed(1)}" fill="${v<0?'var(--bad)':'var(--accent)'}" stroke="var(--surface)" stroke-width="1"/>`; });
  const svg=`<svg viewBox="0 0 ${CW} ${CHH}" role="img" aria-label="Résultat collectif mensuel">${gridLines(y,maxV,minV)}${xAxis(H,x,bw)}${bars}<line x1="${PAD.l}" x2="${CW-PAD.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--axis)"/></svg><div class="tip"></div>`;
  const el=document.getElementById('chart3'); el.innerHTML=legendHtml([['var(--accent)','Mois excédentaire'],['var(--bad)','Mois déficitaire']])+svg;
  attachTip(el,H,x,bw,m=>{ const r=ms[m]; return `<div class="t">Mois ${r.m}</div><div class="r"><span class="l">Recettes</span><b>${fmtEur0(r.rev)}</b></div><div class="r"><span class="l">Charges</span><b>${fmtEur0(r.chargesTotal)}</b></div><div class="r"><span class="l">Résultat</span><b class="${r.result<0?'neg':''}">${fmtEur0(r.result)}</b></div><div class="r"><span class="l">Cumul avec fonds de roulement</span><b class="${r.cash<0?'neg':''}">${fmtEur0(r.cash)}</b></div>`; });
}

/* ---------- Onglets ---------- */
const TABS=['equipe','local','materiel','financement','resultats','apropos'];
function showTab(name){
  if(!TABS.includes(name)) name='equipe';
  root.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected', b.dataset.tab===name?'true':'false'));
  TABS.forEach(t=>{ document.getElementById('tab-'+t).hidden = t!==name; });
  try{ if(!SHARE_TOKEN) history.replaceState(null,'','#'+name); }catch(e){}
  try{ localStorage.setItem(KEY+'-tab',name); }catch(e){}
}
root.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));

/* ---------- Événements ---------- */
function readValue(el){
  if(el.type==='checkbox') return el.checked;
  if(el.dataset.kind==='text') return el.value;
  if(el.dataset.kind==='int') return el.value===''?null:parseInt(el.value,10);
  if(el.value==='') return (el.dataset.path==='invest.boxes')?null:0;
  const n=parseFloat(el.value); if(isNaN(n)) return 0;
  return el.dataset.kind==='pct' ? n/100 : n;
}
root.addEventListener('input',ev=>{
  const el=ev.target; if(!el.dataset||!el.dataset.path) return;
  setPath(S, el.dataset.path, readValue(el));
  if(el.dataset.path==='horizon') S.horizon = parseInt(el.value,10)||48;
  if(el.dataset.path.startsWith('professions.')&&el.dataset.path.endsWith('.name')){ /* le nom se propage aux résultats */ }
  renderAll();
},sig);
document.getElementById('scenarioName').addEventListener('input',ev=>{ S.name=ev.target.value; save(); });
root.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-action]'); if(!b) return;
  const a=b.dataset.action;
  if(a==='delProf'){ S.professions.splice(+b.dataset.idx,1); renderProfs(); renderAll(); }
  else if(a==='addOther'){ S.charges.other.push({label:'Nouvelle charge',monthly:0}); renderOther(); renderAll(); }
  else if(a==='delOther'){ S.charges.other.splice(+b.dataset.idx,1); renderOther(); renderAll(); }
  else if(a==='addEquip'){ S.equipment.push({group:b.dataset.group,name:'Nouvel élément',price:0,qty:1,cat:1,perBox:b.dataset.group===GROUPS[0]}); renderEquip(); renderAll(); }
  else if(a==='delEquip'){ S.equipment.splice(+b.dataset.idx,1); renderEquip(); renderAll(); }
},sig);
document.getElementById('btnAddProf').addEventListener('click',()=>{ const k=document.getElementById('addProfSel').value; const p=mkProf(k); p.count0=1; p.extraCount=0; S.professions.push(p); renderProfs(); renderAll(); const cards=root.querySelectorAll('.prof'); const c=cards[cards.length-1]; if(c) c.scrollIntoView({behavior:'smooth',block:'start'}); });
document.getElementById('btnReset').addEventListener('click',()=>{
  const btn=document.getElementById('btnReset');
  if(btn.dataset.armed){ delete btn.dataset.armed; btn.textContent='Valeurs par défaut'; S=defaultState(); renderProfs(); renderOther(); renderEquip(); fillStatic(); renderAll(); acctUnlink(); toast('Scénario réinitialisé'); return; }
  btn.dataset.armed='1'; btn.textContent='Confirmer la réinitialisation ?'; setTimeout(()=>{ if(btn.dataset.armed){ delete btn.dataset.armed; btn.textContent='Valeurs par défaut'; } },4000);
});
function openIo(){ const c=document.getElementById('ioCard'); c.hidden=false; renderAcct(); c.scrollIntoView({behavior:'smooth',block:'start'}); }
document.getElementById('btnShare').addEventListener('click',()=>{ acct.notice=''; openIo(); });
document.getElementById('btnCloseIo').addEventListener('click',()=>{ acct.notice=''; document.getElementById('ioCard').hidden=true; });
// Charge un scénario (prévisionnel du compte ou partagé par lien) ; lève une erreur s'il est illisible.
function loadScenario(jsonString){ const s=JSON.parse(jsonString); if(!s||!Array.isArray(s.professions)||!s.local||!s.charges) throw new Error('format'); const d=defaultState(); S=Object.assign(d,s); S.ramp=Object.assign(d.ramp,s.ramp||{}); S.local=Object.assign(d.local,s.local||{}); S.charges=Object.assign(d.charges,s.charges||{}); S.invest=Object.assign(d.invest,s.invest||{}); S.fin=Object.assign(d.fin,s.fin||{}); S.amort=Object.assign(d.amort,s.amort||{}); if(!Array.isArray(S.charges.other)) S.charges.other=[]; if(!Array.isArray(S.equipment)) S.equipment=defaultEquipment(); uid=1+S.professions.reduce((m,p)=>Math.max(m,parseInt(String(p.id).slice(1))||0),0); S.professions.forEach((p,i)=>{ if(!p.id) p.id='p'+(uid++); }); renderProfs(); renderOther(); renderEquip(); fillStatic(); renderAll(); }
function fileSlug(){ const s=String(S.name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+/,'').slice(0,60).replace(/-+$/,''); return 'previsionnel-msp-'+(s||'scenario'); }
function downloadBlob(blob,filename){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000); }
let toastT; function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2200); }

/* ---------- Compte 100 000 Médecins : prévisionnels enregistrés (5 au plus) ---------- */
// L'outil est servi par le site : l'API est sur le même domaine et reçoit la session de l'utilisateur.
// États : loading, user (connecté), anon (non connecté), error (API injoignable), off (outil hors du site).
const API='/api/outils/previsionnels', ACCT_KEY=KEY+'-compte';
const acct={state:'loading', items:[], max:5, notice:'', busy:false};
let acctReady=null;
// Lien entre le scénario affiché et un prévisionnel du compte : {id, snap} (snap = état au dernier enregistrement).
let link=(()=>{ try{ const l=JSON.parse(localStorage.getItem(ACCT_KEY)||'null'); return l&&l.id?l:null; }catch(e){ return null; } })();
function setLink(l){ link=l; try{ if(l) localStorage.setItem(ACCT_KEY,JSON.stringify(l)); else localStorage.removeItem(ACCT_KEY); }catch(e){} }
function acctUnlink(){ setLink(null); renderAcct(); }
const snapshot=()=>JSON.stringify(S);
const fmtDate=iso=>{ const d=new Date(iso); return isNaN(d)?'':d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
function loginHref(){ return '/connexion?redirect='+encodeURIComponent(location.pathname); }
async function api(path,opts){ opts=opts||{}; const init={method:opts.method||'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}; if(opts.body){ init.headers['Content-Type']='application/json'; init.body=opts.body; } const r=await fetch(API+path,init); let data=null; try{ data=await r.json(); }catch(e){} return {status:r.status, ok:r.ok, data}; }
function acctRefresh(){
  acctReady=api('').then(res=>{
    if(res.status===401){ acct.state='anon'; acct.items=[]; }
    else if(res.ok&&res.data&&Array.isArray(res.data.items)){ acct.state='user'; acct.items=res.data.items; acct.max=res.data.max||acct.max; acct.notice=''; if(link&&!acct.items.some(i=>i.id===link.id)) setLink(null); }
    else acct.state=res.status===404?'off':'error';
  }).catch(()=>{ acct.state=location.protocol==='file:'?'off':'error'; }).finally(renderAcct);
  return acctReady;
}
function renderAcct(){
  renderSwitch();
  if(shared) renderSharedBanner();
  const box=document.getElementById('acct'); if(!box) return;
  const st=acct.state;
  if(st==='off'){ box.innerHTML='<p class="lead">L\'enregistrement et le partage sont disponibles sur 100000medecins.org, une fois connecté.</p>'; return; }
  const head=extra=>`<div class="sub-h"><h4>Dans mon compte</h4>${extra||''}</div>`;
  if(st==='loading'){ box.innerHTML=head()+'<p class="acct-status">Vérification de votre connexion…</p>'; return; }
  if(st==='error'){ box.innerHTML=head()+'<p class="acct-status">Vos prévisionnels enregistrés sont momentanément indisponibles.</p><div class="add-row" style="margin-top:8px"><button class="btn small" type="button" data-acct="retry">Réessayer</button></div>'; return; }
  if(st==='anon'){
    box.innerHTML=head()+`${acct.notice?`<div class="alert warn" style="margin-bottom:10px"><span class="ic">!</span><div>${esc(acct.notice)}</div></div>`:''}<p class="lead">Connectez-vous à votre compte 100 000 Médecins pour enregistrer jusqu'à ${acct.max} prévisionnels nommés, les retrouver sur tous vos appareils et les exporter en Excel ou en PDF.</p><div class="add-row" style="margin-top:10px"><a class="btn primary" href="${esc(loginHref())}">Se connecter</a><a class="btn" href="/inscription">Créer un compte</a></div>`;
    return;
  }
  const n=acct.items.length;
  const rows=acct.items.map(it=>{ const cur=link&&link.id===it.id; return `<tr><td>${esc(it.nom)}${cur?' <span class="chip">ouvert</span>':''}${it.partage_jeton?' <span class="chip">partagé</span>':''}<div class="help">modifié le ${esc(fmtDate(it.updated_at))}</div></td><td><button class="btn small" type="button" data-acct="open" data-id="${esc(it.id)}">Ouvrir</button><button class="btn small danger" type="button" data-acct="del" data-id="${esc(it.id)}">Supprimer</button></td></tr>`; }).join('');
  box.innerHTML=head(`<span class="chip">${n} / ${acct.max}</span>`)+`
    <div class="field" style="max-width:520px"><label for="acctName">Nom du prévisionnel</label><div class="ctl"><input id="acctName" type="text" maxlength="120" value="${esc(S.name)}"></div><div class="help">Un nom parlant pour le retrouver, par exemple « MSP centre-ville, hypothèse prudente ».</div></div>
    <p class="acct-status" id="acctStatus"></p>
    <div class="add-row" style="margin-top:10px"><button class="btn primary" type="button" data-acct="save" id="acctSave">Enregistrer</button><button class="btn" type="button" data-acct="saveNew" id="acctSaveNew">Enregistrer comme nouveau</button></div>
    ${shareBox()}
    ${n?`<div class="tscroll" style="margin-top:14px"><table class="acct-list"><thead><tr><th>Prévisionnels enregistrés</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="acct-status">Aucun prévisionnel enregistré pour l\'instant.</p>'}`;
  acctStatus();
}
function acctStatus(){
  const el=document.getElementById('acctStatus'); if(!el) return;
  const full=acct.items.length>=acct.max, dirty=!!link&&link.snap!==snapshot();
  let msg, warn=false;
  if(dirty){ msg='Modifications non enregistrées : « Enregistrer » met à jour ce prévisionnel dans votre compte.'; warn=true; }
  else if(link) msg='Ce prévisionnel est à jour dans votre compte.';
  else if(full){ msg=`Limite de ${acct.max} prévisionnels atteinte : ouvrez-en un pour le remplacer, ou supprimez-en un.`; warn=true; }
  else msg='Ce prévisionnel n\'est pas encore enregistré dans votre compte.';
  el.textContent=msg; el.classList.toggle('warn',warn);
  const sv=document.getElementById('acctSave'), sn=document.getElementById('acctSaveNew');
  if(sv) sv.disabled=!link&&full;
  if(sn){ sn.hidden=!link; sn.disabled=full; }
}
function arm(btn,label){ if(btn.dataset.armed) return true; const old=btn.textContent; btn.dataset.armed='1'; btn.textContent=label; setTimeout(()=>{ if(btn.isConnected&&btn.dataset.armed){ delete btn.dataset.armed; btn.textContent=old; } },4000); return false; }
function busy(btn,on){ acct.busy=on; if(on) btn.setAttribute('aria-busy','true'); else btn.removeAttribute('aria-busy'); }
async function acctSave(asNew,btn){
  const nom=String(S.name||'').trim().slice(0,120);
  if(!nom){ toast('Donnez un nom au prévisionnel avant de l\'enregistrer'); const f=document.getElementById('acctName'); if(f) f.focus(); return; }
  const updating=!!link&&!asNew;
  busy(btn,true);
  try{
    const body=JSON.stringify({nom, donnees:S});
    const res=updating?await api('/'+encodeURIComponent(link.id),{method:'PUT',body}):await api('',{method:'POST',body});
    if(res.ok&&res.data&&res.data.item){ setLink({id:res.data.item.id, snap:snapshot()}); toast(updating?'Prévisionnel mis à jour dans votre compte':'Prévisionnel enregistré dans votre compte'); }
    else if(res.status===401){ toast('Votre session a expiré : reconnectez-vous pour enregistrer'); }
    else if(res.status===409){ toast(`Limite de ${acct.max} prévisionnels atteinte`); }
    else if(res.status===404&&updating){ setLink(null); toast('Ce prévisionnel n\'existe plus dans votre compte : enregistrez-le à nouveau'); }
    else toast('Enregistrement impossible, réessayez');
  }catch(e){ toast('Enregistrement impossible, réessayez'); }
  finally{ busy(btn,false); await acctRefresh(); }
}
async function acctOpen(id,btn){
  busy(btn,true);
  try{
    const res=await api('/'+encodeURIComponent(id));
    if(res.ok&&res.data&&res.data.item){
      loadScenario(JSON.stringify(res.data.item.donnees));
      S.name=res.data.item.nom; fillStatic(); save();
      setLink({id, snap:snapshot()});
      toast(`« ${res.data.item.nom} » ouvert`);
      root.scrollIntoView({behavior:'smooth',block:'start'});
    } else if(res.status===404){ toast('Ce prévisionnel n\'existe plus'); }
    else toast('Ouverture impossible, réessayez');
  }catch(e){ toast('Ce prévisionnel est illisible'); }
  finally{ busy(btn,false); await acctRefresh(); }
}
async function acctDelete(id,btn){
  busy(btn,true);
  try{
    const res=await api('/'+encodeURIComponent(id),{method:'DELETE'});
    if(res.ok||res.status===404){ if(link&&link.id===id) setLink(null); toast('Prévisionnel supprimé de votre compte'); }
    else toast('Suppression impossible, réessayez');
  }catch(e){ toast('Suppression impossible, réessayez'); }
  finally{ busy(btn,false); await acctRefresh(); }
}
document.getElementById('acct').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-acct]'); if(!b||b.disabled||acct.busy) return;
  const a=b.dataset.acct, id=b.dataset.id;
  if(a==='retry'){ acct.state='loading'; renderAcct(); acctRefresh(); }
  else if(a==='save') acctSave(false,b);
  else if(a==='saveNew') acctSave(true,b);
  else if(a==='open'){
    // Sans confirmation seulement si le scénario affiché est déjà à jour dans le compte (rien à perdre).
    const saved=!!link&&link.snap===snapshot();
    if(saved&&link.id===id){ toast('Ce prévisionnel est déjà ouvert'); return; }
    if(!saved&&!arm(b,'Remplacer ?')){ toast('Le scénario affiché sera remplacé : cliquez à nouveau pour confirmer'); return; }
    acctOpen(id,b);
  }
  else if(a==='del'){ if(!arm(b,'Confirmer ?')) return; acctDelete(id,b); }
  else if(a==='share') shareSet(true,b);
  else if(a==='stopShare'){ if(!arm(b,'Confirmer ?')){ toast('Le lien déjà envoyé ne fonctionnera plus'); return; } shareSet(false,b); }
  else if(a==='copyLink') copyText(document.getElementById('shareUrl'),'Lien copié');
});

/* ---------- Lien de partage du prévisionnel ouvert (propriétaire) ---------- */
// Le lien porte le code après « # » : jamais transmis au serveur avec l'adresse de la page.
const shareUrl=t=>location.origin+'/outils/previsionnel-maison-de-sante#partage='+t;
function shareBox(){
  const cur=link&&acct.items.find(i=>i.id===link.id);
  const head='<div class="sub"><div class="sub-h"><h4>Partager ce prévisionnel</h4></div>';
  if(!cur) return acct.items.length?head+'<p class="acct-status">Pour partager un prévisionnel, ouvrez-le ou enregistrez-le d\'abord.</p></div>':'';
  if(!cur.partage_jeton) return head+`<p class="lead">Créez un lien pour montrer « ${esc(cur.nom)} » en lecture seule à un associé, à votre expert-comptable ou à votre banque, sans qu'ils aient besoin d'un compte. Ils pourront en télécharger le PDF. Vous pourrez désactiver le lien à tout moment.</p><div class="add-row" style="margin-top:10px"><button class="btn" type="button" data-acct="share">Créer un lien de partage</button></div></div>`;
  return head+`<p class="lead">Toute personne qui a ce lien voit « ${esc(cur.nom)} » en lecture seule, dans sa dernière version enregistrée, avec votre nom, et peut en télécharger le PDF.</p>
    <div class="add-row" style="margin-top:10px"><div class="ctl share-url"><input id="shareUrl" type="text" readonly value="${esc(shareUrl(cur.partage_jeton))}" aria-label="Lien de partage"></div><button class="btn primary" type="button" data-acct="copyLink">Copier le lien</button><button class="btn danger" type="button" data-acct="stopShare">Désactiver le lien</button></div></div>`;
}
async function shareSet(on,btn){
  if(!link) return;
  busy(btn,true);
  try{
    const res=await api('/'+encodeURIComponent(link.id)+'/partage',on?{method:'POST',body:'{}'}:{method:'DELETE'});
    if(res.ok) toast(on?'Lien de partage créé':'Lien de partage désactivé');
    else if(res.status===401) toast('Votre session a expiré : reconnectez-vous');
    else toast('Opération impossible, réessayez');
  }catch(e){ toast('Opération impossible, réessayez'); }
  finally{ busy(btn,false); await acctRefresh(); }
}
function copyText(input,msg){
  const done=()=>toast(msg), select=()=>{ input.focus(); input.select(); toast('Sélectionné : copiez avec Ctrl+C'); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done).catch(select); else select();
}

/* ---------- Prévisionnel partagé : lecture seule pour qui ouvre le lien ---------- */
const sharedBanner=document.getElementById('sharedBanner');
function leaveShared(){
  // Recharge la page sans le code de partage : le visiteur retrouve son propre scénario.
  history.replaceState(null,'',location.pathname+location.search); location.reload();
}
function renderSharedBanner(){
  const s=shared;
  const copy=acct.state==='user'?'<button class="btn" type="button" data-shared="copy">Copier dans mon compte</button>'
    :acct.state==='anon'?`<a class="btn" href="${esc(loginHref())}">Se connecter pour le copier</a>`:'';
  sharedBanner.className='notice';
  sharedBanner.innerHTML=`<div><b>« ${esc(s.nom)} »</b>, partagé par ${esc(s.auteur||'un membre de 100 000 Médecins')} · lecture seule, version du ${esc(fmtDate(s.updated_at))}</div>
    <div class="add-row"><button class="btn primary" type="button" data-shared="pdf">Télécharger le PDF</button>${copy}<button class="btn ghost" type="button" data-shared="leave">Revenir à mon scénario</button></div>`;
  sharedBanner.hidden=false;
}
function lockForm(){ root.querySelectorAll('.main input, .main select, .main textarea, #scenarioName').forEach(el=>{ el.disabled=true; }); }
async function openShared(token){
  root.setAttribute('data-shared','loading');
  let res={status:0};
  try{ const r=await fetch('/api/outils/partages/'+token,{cache:'no-store',headers:{Accept:'application/json'}}); res={status:r.status, data:await r.json().catch(()=>null)}; }catch(e){}
  if(!(res.status===200&&res.data&&res.data.item)){
    root.removeAttribute('data-shared');
    sharedBanner.className='alert bad'; sharedBanner.hidden=false;
    sharedBanner.innerHTML=`<div><b>Lien de partage</b> : ${res.status===404?'ce lien n\'est plus valable (son propriétaire l\'a peut-être désactivé).':'le prévisionnel partagé est momentanément indisponible.'} Voici votre propre scénario.</div>`;
    return;
  }
  const it=res.data.item;
  shared={nom:it.nom, auteur:it.auteur, updated_at:it.updated_at};
  try{ loadScenario(JSON.stringify(it.donnees)); }catch(e){ shared=null; root.removeAttribute('data-shared'); toast('Prévisionnel partagé illisible'); return; }
  S.name=it.nom; fillStatic(); lockForm();
  root.setAttribute('data-shared','on');
  renderSwitch(); renderSharedBanner();
}
// Copie dans le compte du visiteur, puis retour sur son outil avec la copie ouverte.
async function copyShared(btn){
  // Le scénario du visiteur, s'il n'est pas à jour dans son compte, serait remplacé : second clic demandé.
  if(OWN_RAW&&!(link&&link.snap===OWN_RAW)&&!arm(btn,'Remplacer mon scénario en cours ?')){ toast('Votre scénario en cours, non enregistré, sera remplacé par la copie'); return; }
  const nom=(shared.nom+' (copie)').slice(0,120);
  busy(btn,true);
  try{
    S.name=nom;
    const res=await api('',{method:'POST',body:JSON.stringify({nom, donnees:S})});
    if(res.ok&&res.data&&res.data.item){
      const snap=snapshot();
      try{ localStorage.setItem(KEY,snap); localStorage.setItem(ACCT_KEY,JSON.stringify({id:res.data.item.id, snap})); }catch(e){}
      toast('Copié dans votre compte'); setTimeout(leaveShared,700); return;
    }
    S.name=shared.nom;
    toast(res.status===409?`Limite de ${acct.max} prévisionnels atteinte : supprimez-en un d'abord`:res.status===401?'Connectez-vous pour copier ce prévisionnel':'Copie impossible, réessayez');
  }catch(e){ S.name=shared.nom; toast('Copie impossible, réessayez'); }
  finally{ busy(btn,false); }
}
sharedBanner.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-shared]'); if(!b||acct.busy) return;
  if(b.dataset.shared==='pdf') runExport('pdf');
  else if(b.dataset.shared==='copy') copyShared(b);
  else if(b.dataset.shared==='leave') leaveShared();
});
let statusT;
root.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.id==='acctName'){ S.name=t.value; document.getElementById('scenarioName').value=t.value; save(); }
  else if(t.id==='scenarioName'){ const a=document.getElementById('acctName'); if(a) a.value=t.value; }
  if(link){ clearTimeout(statusT); statusT=setTimeout(acctStatus,150); }
},sig);
root.addEventListener('click',()=>{ if(link){ clearTimeout(statusT); statusT=setTimeout(acctStatus,150); } },sig);

/* ---------- « Changer » : ouvrir un autre prévisionnel du compte depuis l'en-tête ---------- */
const switchWrap=document.getElementById('switchWrap'), switchBtn=document.getElementById('btnSwitch'), switchMenu=document.getElementById('switchMenu');
const otherSaved=()=>acct.state==='user'?acct.items.filter(it=>!link||it.id!==link.id):[];
function fillSwitch(){ switchMenu.innerHTML=otherSaved().map(it=>`<button class="switch-item" type="button" role="menuitem" data-id="${esc(it.id)}">${esc(it.nom)}<small>modifié le ${esc(fmtDate(it.updated_at))}</small></button>`).join(''); }
function closeSwitch(){ switchMenu.hidden=true; switchBtn.setAttribute('aria-expanded','false'); }
// Affiché seulement s'il existe un autre prévisionnel que celui à l'écran.
function renderSwitch(){ switchWrap.hidden=!otherSaved().length; if(switchWrap.hidden) closeSwitch(); else if(!switchMenu.hidden) fillSwitch(); }
switchBtn.addEventListener('click',()=>{
  if(!switchMenu.hidden){ closeSwitch(); return; }
  fillSwitch(); switchMenu.style.left='0px'; switchMenu.hidden=false; switchBtn.setAttribute('aria-expanded','true');
  // Le menu reste dans la largeur visible (sur mobile, le bouton est souvent près du bord droit).
  const r=switchWrap.getBoundingClientRect(), w=switchMenu.offsetWidth, vw=document.documentElement.clientWidth;
  switchMenu.style.left=Math.max(8-r.left, Math.min(0, vw-8-w-r.left))+'px';
});
switchMenu.addEventListener('click',ev=>{
  const b=ev.target.closest('.switch-item'); if(!b||acct.busy) return;
  // Même règle que « Ouvrir » : confirmation par un second clic si le scénario affiché n'est pas à jour dans le compte.
  const saved=!!link&&link.snap===snapshot();
  if(!saved&&!b.dataset.armed){ b.dataset.armed='1'; b.classList.add('armed'); b.querySelector('small').textContent=link?'Modifications non enregistrées : cliquez à nouveau pour ouvrir quand même':'Scénario affiché non enregistré : cliquez à nouveau pour le remplacer'; return; }
  closeSwitch(); acctOpen(b.dataset.id,switchBtn);
});
document.addEventListener('click',ev=>{ if(!switchMenu.hidden&&!ev.target.closest('#switchWrap')) closeSwitch(); },sig);
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&!switchMenu.hidden){ closeSwitch(); switchBtn.focus(); } },sig);

/* ---------- Exports Excel et PDF (membres connectés) ---------- */
// Bibliothèques et code d'export chargés au premier clic seulement (vendor/ : exceljs, jsPDF, jspdf-autotable).
const scripts={};
function loadScript(src){ if(!scripts[src]) scripts[src]=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>{ delete scripts[src]; rej(new Error(src)); }; document.head.appendChild(s); }); return scripts[src]; }
window.MSP={ state:()=>S, results:()=>R, CAT, GROUPS, autoBoxes, fmtEur0, fmtK, fmtN, fileSlug, downloadBlob, loadScript, toast };
const EXPORT_BTN={xlsx:document.getElementById('btnXlsx'), pdf:document.getElementById('btnPdf')};
async function runExport(kind){
  const btn=EXPORT_BTN[kind]; if(btn.getAttribute('aria-busy')==='true') return;
  if(acct.state==='error') acctRefresh();
  if(acctReady) await acctReady;
  // Sur un prévisionnel partagé, le PDF est ouvert à tous ; l'Excel reste réservé aux membres connectés.
  if(acct.state!=='user'&&!(shared&&kind==='pdf')){
    if(acct.state==='anon'&&shared){ toast('L\'export Excel est réservé aux membres connectés ; le PDF est disponible'); }
    else if(acct.state==='anon'){ acct.notice='Les exports Excel et PDF sont réservés aux membres connectés.'; openIo(); }
    else toast(acct.state==='off'?'Exports disponibles sur 100000medecins.org, une fois connecté':'Export momentanément indisponible, réessayez');
    return;
  }
  btn.setAttribute('aria-busy','true');
  try{ await loadScript('/outils/previsionnel-msp/export.js'); await window.MSPExport[kind](); }
  catch(e){ console.error(e); toast('Export impossible, réessayez'); }
  finally{ btn.removeAttribute('aria-busy'); }
}
EXPORT_BTN.xlsx.addEventListener('click',()=>runExport('xlsx'));
EXPORT_BTN.pdf.addEventListener('click',()=>runExport('pdf'));

/* ---------- Bandeau collé sous la barre du site ---------- */
// Sur grand écran, le logo du site déborde sous sa barre : collé, le bandeau lui laisse la place.
const topBar=root.querySelector('.top');
const collage=new IntersectionObserver(([e])=>topBar.classList.toggle('colle', e.intersectionRatio<1 && e.boundingClientRect.top<80),{threshold:[1],rootMargin:'-73px 0px 0px 0px'});
collage.observe(topBar); ctrl.signal.addEventListener('abort',()=>collage.disconnect());

/* ---------- Démarrage ---------- */
renderProfs(); renderOther(); renderEquip(); fillStatic(); renderAll();
let startTab = (location.hash||'').slice(1); if(!TABS.includes(startTab)){ try{ startTab=localStorage.getItem(KEY+'-tab')||'equipe'; }catch(e){ startTab='equipe'; } }
showTab(startTab);
renderAcct(); acctRefresh();
if(SHARE_TOKEN) openShared(SHARE_TOKEN);
// Lien de partage collé dans la barre d'adresse alors que la page est déjà ouverte : seul le « # » change.
window.addEventListener('hashchange',()=>{ const m=/^#partage=([A-Za-z0-9_-]{24})$/.exec(location.hash||''); if((m?m[1]:null)!==SHARE_TOKEN) location.reload(); },sig);

return ()=>{ ctrl.abort(); delete window.MSP; };
}
window.MSPOutil={monter};
})();
