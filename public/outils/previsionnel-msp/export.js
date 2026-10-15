/* Exports Excel (.xlsx) et PDF du Prévisionnel Maison de Santé.
   Chargé à la demande par outil.js ; lit le scénario et les résultats déjà calculés par l'outil
   via window.MSP (relu à chaque appel : l'outil peut avoir été remonté). Tout se fait dans le navigateur : rien n'est envoyé. */
(function(){
'use strict';
const M = new Proxy({}, { get: (_, k) => window.MSP[k] });

// Palette claire de l'outil (les exports sont toujours en clair, quel que soit le thème affiché).
const NAVY='#1B2A4A', NAVY_SOFT='#E3E8F2', INK='#16222B', INK2='#4E5E69', MUTED='#86949D', LINE='#D8E1E6', SURFACE2='#EAF0F3', GRID='#E3E9ED', AXIS='#B9C6CE';
const GOOD='#1B8A3A', WARN='#B07200', BAD='#C23B3B';
const SERIES=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#6250d6','#e34948'];
const serie=i=>SERIES[i%SERIES.length];
const CH_LABELS={rent:'Loyer',locatives:'Charges locatives et taxe foncière',telecom:'Téléphone + internet',software:'Logiciel et secrétariat externalisé',consum:'Consommables',accounting:'Comptabilité et paies',bank:'Banque et assurances',cleaning:'Ménage',secretary:'Secrétariat salarié',other:'Autres charges fixes',loan:'Remboursement de l\'emprunt',reserve:'Marge prudentielle'};
const PROF_FIELDS=[
  ['count0','Praticiens à l\'ouverture',''],['extraCount','Arrivées supplémentaires',''],['extraMonth','Mois d\'arrivée des suivants','mois n°'],
  ['parts','Parts de charges par praticien','part(s)'],['social','Cotisations sociales','% du revenu','pct'],['usesBox','Occupe un box de consultation','','bool'],
  ['tarif','Tarif moyen d\'un acte en journée','€'],['consultH','Actes par heure',''],['hoursDay','Heures de consultation par jour','h'],['daysWeek','Jours par semaine','j'],
  ['vacations','Semaines de congés par an','sem.'],['evenings','Soirées par semaine',''],['hoursEvening','Heures par soirée','h'],['tarifSoir','Tarif moyen en soirée','€'],
  ['remplaOn','Remplaçant pendant les congés','','bool'],['remplaKeep','Part conservée par le remplaçant','%','pct'],['remplaStart','Premier remplacement','mois n°'],
  ['collabOn','Collaborateur régulier','','bool'],['collabHours','Heures par semaine du collaborateur','h'],['collabStart','Début de la collaboration','mois n°'],['collabKeep','Part conservée par le collaborateur','%','pct']
];
const DISCLAIMER='Outil d\'aide au montage de projet, sans valeur contractuelle. Les chiffres doivent être validés par un professionnel du chiffre.';

const dateFr=()=>new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
const eur=v=>Math.round((v||0)*100)/100;
function niceMax(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; const m=[1,1.2,1.5,2,2.5,3,4,5,6,8,10].find(k=>n<=k); return m*p; }

function cruiseRows(S,R){ return S.professions.map((p,i)=>{ const r=R.last.prof[p.id]; return {p,i,net:r.net,head:r.head,share:r.chargeShare,gross:r.netBefore,fullRev:r.fullRev}; }); }
// Mêmes règles que la synthèse affichée par l'outil.
function alerts(S,R){
  const a=[];
  if(R.minCash<0) a.push(['bad','Trésorerie négative',`Le fonds de roulement est insuffisant : creux à ${M.fmtK(R.minCash)}. Augmentez le BFR d'au moins ${M.fmtK(-R.minCash)} ou réduisez les charges de départ.`]);
  else if(R.breakEven==null) a.push(['bad','Jamais à l\'équilibre','Les recettes ne couvrent pas les charges sur l\'horizon choisi.']);
  else if(R.breakEven>1) a.push(['warn',`Équilibre au mois ${R.breakEven}`,`Les ${R.breakEven-1} premiers mois sont déficitaires, financés par le fonds de roulement.`]);
  else a.push(['good','Équilibre dès le mois 1','Les recettes couvrent les charges dès l\'ouverture.']);
  cruiseRows(S,R).forEach(({p,gross})=>{ if(gross<0) a.push(['warn',p.name,'La quote-part des charges dépasse les recettes en croisière : revoyez les parts ou l\'activité.']); });
  return a;
}
function keyFigures(S,R){
  const last=R.last, y1=R.years[0];
  return [
    ['Charges mensuelles en croisière', last.chargesTotal, `mois ${R.H} · dont emprunt ${M.fmtEur0(last.charges.loan)} · marge ${Math.round((S.charges.reserve||0)*100)} %`],
    ['Recettes annuelles en croisière', last.rev*12, `${M.fmtEur0(last.rev)} par mois`],
    ['Charges annuelles en croisière', last.chargesTotal*12, `${M.fmtEur0(last.chargesTotal)} par mois`],
    ['Résultat collectif de la première année', y1.result, 'avant cotisations'],
    ['Investissement total', R.needsTotal, `dont matériel ${M.fmtK(R.equipTotal)}, travaux ${M.fmtK(R.needs.works)}`],
    ['Emprunt', R.loan, R.loan>0?`${M.fmtEur0(R.payment)} par mois sur ${S.fin.loanMonths} mois, coût total du crédit ${M.fmtEur0(R.loanTotalCost)}`:'aucun emprunt nécessaire'],
    ['Point d\'équilibre', R.breakEven?`Mois ${R.breakEven}`:'non atteint', R.breakEven?'premier mois où les recettes dépassent les charges':'sur l\'horizon choisi'],
    ['Creux de trésorerie', R.minCash, R.minCash<0?'fonds de roulement insuffisant':`fonds de roulement initial ${M.fmtK(S.invest.bfr)} jamais entamé`]
  ];
}
// Hypothèses saisies hors professions : {l: libellé, v: valeur, u: unité, pct: fraction affichée en %}.
function hypotheses(S,R){
  const L=S.local, C=S.charges, I=S.invest, F=S.fin, A=S.amort;
  const autoBox=I.boxes==null||I.boxes==='';
  return [
    ['Montée en charge et horizon',[
      {l:'Taux d\'activité au mois 1',v:S.ramp.start,pct:1},{l:'Taux d\'activité en vitesse de croisière',v:S.ramp.end,pct:1},
      {l:'Durée de la montée en charge',v:S.ramp.months,u:'mois'},{l:'Horizon du prévisionnel',v:S.horizon,u:'mois'}]],
    ['Local',[
      {l:'Surface',v:L.surface,u:'m²'},{l:'Loyer HT hors charges',v:L.rentM2,u:'€/m²/an'},{l:'TVA sur le loyer',v:L.tva,pct:1},
      {l:'Charges locatives',v:L.chargesM2,u:'€/m²/an'},{l:'Taxe foncière refacturée',v:L.taxeM2,u:'€/m²/an'},{l:'Franchise de loyer',v:L.franchise,u:'mois'},
      {l:'Travaux d\'aménagement',v:L.worksM2,u:'€ TTC/m²'},{l:'Dépôt de garantie',v:L.cautionMonths,u:'mois de loyer'}]],
    ['Charges de fonctionnement',[
      {l:'Téléphone + internet',v:C.telecom,u:'€/mois'},{l:'Logiciel métier',v:C.software,u:'€/praticien/mois'},
      {l:'Consommables médicaux',v:C.medConsum,u:'€/praticien/mois'},{l:'Consommables bureau',v:C.officeConsum,u:'€/praticien/mois'},
      {l:'Comptabilité de la structure',v:C.accountingStructure,u:'€/an'},{l:'Gestion des paies',v:C.accountingPayroll,u:'€/an'},
      {l:'Frais bancaires + assurances',v:C.bankInsurance,u:'€/mois'},{l:'Marge prudentielle',v:C.reserve,pct:1},
      {l:'Ménage : heures par semaine',v:C.cleaningHours,u:'h'},{l:'Ménage : coût horaire tout compris',v:C.cleaningRate,u:'€/h'},
      {l:'Salaire net secrétaire',v:C.secretaryNet,u:'€/mois'},{l:'Charges sociales du secrétariat (en % du net)',v:C.employerRate,pct:1},
      {l:'Prise de poste de la secrétaire',v:C.secretaryStart,u:'mois n°'},{l:'Secrétariat externalisé / téléphonique',v:C.phoneSecretariat,u:'€/mois'},
      ...(C.other||[]).map(o=>({l:o.label||'Autre charge fixe',v:o.monthly,u:'€/mois'}))]],
    ['Matériel',[{l:'Nombre de box de consultation',v:autoBox?R.boxes:I.boxes,u:autoBox?'box (calcul automatique)':'box'}]],
    ['Frais de départ',[{l:'Frais de création de la société',v:I.creation,u:'€'},{l:'Capital initial (SCM / SISA)',v:I.capital,u:'€'},{l:'Besoin en fonds de roulement',v:I.bfr,u:'€'}]],
    ['Apports et emprunt',[
      {l:'Apports personnels',v:F.equity,u:'€'},{l:'Subventions',v:F.grants,u:'€'},{l:'Durée de l\'emprunt',v:F.loanMonths,u:'mois'},
      {l:'Taux annuel (assurance comprise)',v:F.rate,pct:1},{l:'Franchise de remboursement',v:F.deferMonths,u:'mois'}]],
    ['Durées d\'amortissement',[{l:'Frais de création',v:A.creation,u:'ans'},{l:'Matériel et ameublement',v:A.equipment,u:'ans'},{l:'Travaux',v:A.works,u:'ans'}]]
  ];
}
function needsLines(R){ const n=R.needs; return [['Travaux d\'aménagement',n.works],['Dépôt de garantie',n.caution],['Matériel médical',n.equipMed],['Mobilier',n.equipMob],['Informatique',n.equipIT],['Frais de création',n.creation],['Capital initial',n.capital],['Besoin en fonds de roulement',n.bfr]]; }
function equipmentRows(S,R){
  return M.GROUPS.map(g=>({g, items:S.equipment.filter(e=>e.group===g).map(e=>{ const q=(e.perBox?R.boxes:1)*(e.qty||0); return {e, q, total:q*(e.price||0)}; })}));
}

/* ====================== Excel ====================== */
async function xlsx(){
  await M.loadScript('/outils/previsionnel-msp/vendor/exceljs-4.4.0.min.js');
  const S=M.state(), R=M.results();
  const wb=new window.ExcelJS.Workbook();
  wb.creator='100 000 Médecins'; wb.created=new Date();
  const argb=h=>'FF'+h.slice(1).toUpperCase();
  const EUR='#,##0" €";[Red]-#,##0" €"', PCT='0.0%', NUM='General';
  const fill=h=>({type:'pattern',pattern:'solid',fgColor:{argb:argb(h)}});

  function sheet(name, title, widths, landscape){
    const ws=wb.addWorksheet(name,{pageSetup:{paperSize:9,orientation:landscape?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0}});
    ws.columns=widths.map(w=>({width:w}));
    const t=ws.addRow([title]); t.font={bold:true,size:14,color:{argb:argb(NAVY)}};
    const s=ws.addRow([`${S.name||'Scénario'} · exporté le ${dateFr()} depuis 100000medecins.org`]); s.font={italic:true,color:{argb:argb(INK2)}};
    ws.addRow([]);
    return ws;
  }
  function header(ws, values){ const r=ws.addRow(values); r.eachCell({includeEmpty:true},c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=fill(NAVY); c.alignment={vertical:'middle',wrapText:true}; }); return r; }
  function section(ws, text, span){ const r=ws.addRow([text]); r.font={bold:true,color:{argb:argb(NAVY)}}; for(let i=1;i<=span;i++) r.getCell(i).fill=fill(NAVY_SOFT); return r; }
  function row(ws, values, fmts){ const r=ws.addRow(values); (fmts||[]).forEach((f,i)=>{ if(f) r.getCell(i+1).numFmt=f; }); return r; }
  function total(r, span){ r.font={bold:true}; for(let i=1;i<=span;i++) r.getCell(i).border={top:{style:'thin',color:{argb:argb(INK2)}}}; return r; }
  const hypVal=h=>h.pct?(h.v||0):(h.v==null?'':h.v);

  // 1. Synthèse
  let ws=sheet('Synthèse','Prévisionnel Maison de Santé : synthèse',[46,18,24,24,26]);
  header(ws,['Indicateur','Valeur','Précision','','']); ws.mergeCells(ws.lastRow.number,3,ws.lastRow.number,5);
  keyFigures(S,R).forEach(([k,v,d])=>{ const r=row(ws,[k,typeof v==='number'?eur(v):v,d],[null,typeof v==='number'?EUR:null]); ws.mergeCells(r.number,3,r.number,5); r.getCell(2).alignment={horizontal:'right'}; });
  ws.addRow([]);
  section(ws,'Par profession, en vitesse de croisière',5);
  header(ws,['Profession','Praticiens','Recettes mensuelles par praticien à 100 %','Quote-part mensuelle des charges','Revenu net mensuel par praticien']);
  cruiseRows(S,R).forEach(({p,head,fullRev,share,net})=>row(ws,[p.name,head,eur(fullRev),eur(share),eur(net)],[null,NUM,EUR,EUR,EUR]));
  ws.addRow([]);
  section(ws,'Points d\'attention',5);
  alerts(S,R).forEach(([t,h,b])=>{ const r=ws.addRow([`${h} : ${b}`]); ws.mergeCells(r.number,1,r.number,5); r.getCell(1).alignment={wrapText:true,vertical:'top'}; r.getCell(1).font={color:{argb:argb(t==='good'?GOOD:t==='warn'?WARN:BAD)}}; r.height=30; });
  ws.addRow([]);
  const dr=ws.addRow([DISCLAIMER]); ws.mergeCells(dr.number,1,dr.number,5); dr.getCell(1).font={italic:true,color:{argb:argb(MUTED)}}; dr.getCell(1).alignment={wrapText:true}; dr.height=30;

  // 2. Hypothèses
  ws=sheet('Hypothèses','Hypothèses saisies',[46,...S.professions.map(()=>20),16,16,16].slice(0,Math.max(3,S.professions.length+2)));
  const np=S.professions.length;
  section(ws,'Équipe et activité, par praticien',np+2);
  header(ws,['Paramètre',...S.professions.map(p=>p.name),'Unité']);
  PROF_FIELDS.forEach(([k,l,u,kind])=>{
    const vals=S.professions.map(p=>kind==='bool'?(p[k]?'Oui':'Non'):kind==='pct'?(p[k]||0):(p[k]==null?'':p[k]));
    row(ws,[l,...vals,kind==='pct'?'':u],[null,...S.professions.map(()=>kind==='pct'?PCT:kind==='bool'?null:NUM)]);
  });
  ws.addRow([]);
  header(ws,['Paramètre','Valeur','Unité']);
  hypotheses(S,R).forEach(([title,items])=>{
    section(ws,title,3);
    items.forEach(h=>row(ws,[h.l,hypVal(h),h.pct?'':(h.u||'')],[null,h.pct?PCT:NUM]));
  });

  // 3. Matériel
  ws=sheet('Matériel','Matériel et ameublement (prix TTC)',[28,46,16,10,9,18,16,16]);
  row(ws,[`Nombre de box de consultation : ${R.boxes}`]).font={italic:true,color:{argb:argb(INK2)}};
  header(ws,['Groupe','Désignation','Prix unitaire TTC','Quantité','× box','Catégorie','Quantité totale','Total TTC']);
  equipmentRows(S,R).forEach(({g,items})=>{
    items.forEach(({e,q,total:t})=>row(ws,[g,e.name,eur(e.price),e.qty||0,e.perBox?'Oui':'',M.CAT[e.cat]||'',q,eur(t)],[null,null,EUR,NUM,null,null,NUM,EUR]));
    total(row(ws,['',`Sous-total ${g}`,'','','','','',eur(items.reduce((a,x)=>a+x.total,0))],[null,null,null,null,null,null,null,EUR]),8);
  });
  ws.addRow([]);
  [[1,'Mobilier'],[2,'Matériel médical'],[3,'Informatique']].forEach(([c,l])=>row(ws,['',l,'','','','','',eur(R.equipByCat[c])],[null,null,null,null,null,null,null,EUR]));
  total(row(ws,['','Total matériel et ameublement','','','','','',eur(R.equipTotal)],[null,null,null,null,null,null,null,EUR]),8);

  // 4. Financement
  ws=sheet('Financement','Investissement et plan de financement',[46,18]);
  section(ws,'Besoins',2);
  needsLines(R).forEach(([l,v])=>row(ws,[l,eur(v)],[null,EUR]));
  total(row(ws,['Total des besoins',eur(R.needsTotal)],[null,EUR]),2);
  ws.addRow([]);
  section(ws,'Ressources',2);
  [['Apports personnels',S.fin.equity],['Subventions',S.fin.grants],['Emprunt bancaire',R.loan]].forEach(([l,v])=>row(ws,[l,eur(v)],[null,EUR]));
  total(row(ws,['Total des ressources',eur(S.fin.equity+S.fin.grants+R.loan)],[null,EUR]),2);
  ws.addRow([]);
  section(ws,'Emprunt',2);
  if(R.loan>0){
    row(ws,['Montant emprunté',eur(R.loan)],[null,EUR]); row(ws,['Mensualité',eur(R.payment)],[null,EUR]);
    row(ws,['Durée (mois)',S.fin.loanMonths],[null,NUM]); row(ws,['Taux annuel (assurance comprise)',S.fin.rate||0],[null,PCT]);
    row(ws,['Franchise de remboursement (mois)',S.fin.deferMonths||0],[null,NUM]); row(ws,['Coût total du crédit',eur(R.loanTotalCost)],[null,EUR]);
  } else {
    ws.addRow(['Aucun emprunt nécessaire']);
    if(R.surplus>0) row(ws,['Excédent d\'apports ajouté à la trésorerie',eur(R.surplus)],[null,EUR]);
  }
  ws.addRow([]);
  section(ws,'Amortissements (information comptable, sans effet sur la trésorerie)',2);
  row(ws,['Dotation annuelle aux amortissements',eur(R.amortYear)],[null,EUR]);
  row(ws,['Soit par mois',eur(R.amortYear/12)],[null,EUR]);

  // 5. Synthèse annuelle
  const yrs=R.years;
  ws=sheet('Synthèse annuelle','Synthèse annuelle',[50,...yrs.map(()=>16)]);
  const ny=yrs.length+1, EURS=Array(yrs.length).fill(EUR);
  header(ws,['',...yrs.map(y=>`Année ${y.y}`)]);
  row(ws,['Recettes des associés',...yrs.map(y=>eur(y.rev))],[null,...EURS]);
  row(ws,['Charges de la structure',...yrs.map(y=>eur(-y.charges))],[null,...EURS]);
  total(row(ws,['Résultat collectif avant cotisations',...yrs.map(y=>eur(y.result))],[null,...EURS]),ny);
  row(ws,['Cumul du résultat, fonds de roulement compris',...yrs.map(y=>eur(y.cashEnd))],[null,...EURS]);
  section(ws,'Revenu net mensuel moyen par praticien',ny);
  S.professions.forEach(p=>row(ws,[p.name,...yrs.map(y=>eur(y.prof[p.id].netAvg))],[null,...EURS]));

  // 6. Détail mensuel
  const ms=R.months;
  ws=sheet('Détail mensuel','Détail mois par mois',[46,...ms.map(()=>12)],true);
  const nm=ms.length+1, MEUR=Array(ms.length).fill(EUR);
  header(ws,['Mois',...ms.map(r=>r.m)]);
  ws.views=[{state:'frozen',xSplit:1,ySplit:ws.lastRow.number}];
  section(ws,'Effectifs et activité',nm);
  S.professions.forEach(p=>{
    row(ws,[`${p.name} : praticiens`,...ms.map(r=>r.prof[p.id].head)],[null,...Array(ms.length).fill(NUM)]);
    row(ws,[`${p.name} : taux d'activité`,...ms.map(r=>r.prof[p.id].occ)],[null,...Array(ms.length).fill('0%')]);
  });
  section(ws,'Recettes des associés',nm);
  S.professions.forEach(p=>row(ws,[p.name,...ms.map(r=>eur(r.prof[p.id].rev+r.prof[p.id].retro))],[null,...MEUR]));
  total(row(ws,['Total recettes',...ms.map(r=>eur(r.rev))],[null,...MEUR]),nm);
  section(ws,'Charges de la structure',nm);
  Object.keys(CH_LABELS).forEach(k=>row(ws,[CH_LABELS[k],...ms.map(r=>eur(-r.charges[k]))],[null,...MEUR]));
  total(row(ws,['Total charges',...ms.map(r=>eur(-r.chargesTotal))],[null,...MEUR]),nm);
  total(row(ws,['Résultat collectif',...ms.map(r=>eur(r.result))],[null,...MEUR]),nm);
  row(ws,['Cumul du résultat, fonds de roulement compris',...ms.map(r=>eur(r.cash))],[null,...MEUR]);
  section(ws,'Revenu net mensuel par praticien',nm);
  S.professions.forEach(p=>row(ws,[p.name,...ms.map(r=>eur(r.prof[p.id].net))],[null,...MEUR]));

  const buf=await wb.xlsx.writeBuffer();
  M.downloadBlob(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), M.fileSlug()+'.xlsx');
  M.toast('Fichier Excel téléchargé');
}

/* ====================== PDF ====================== */
// Les polices standard du PDF ne connaissent pas l'espace fine insécable des nombres français.
const tx=s=>String(s==null?'':s).replace(/ /g,' ');
const E=v=>tx(M.fmtEur0(v)), K=v=>tx(M.fmtK(v));
function fmtHyp(h){ if(h.pct) return tx(`${M.fmtN((h.v||0)*100,1)} %`); if(h.v==null||h.v==='') return ''; return tx(`${M.fmtN(h.v,2)}${h.u?' '+h.u:''}`); }

async function imageData(url){
  try{
    const r=await fetch(url); if(!r.ok) return null;
    const blob=await r.blob();
    const data=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(blob); });
    const img=new Image(); img.src=data; await img.decode();
    return {data, w:img.naturalWidth, h:img.naturalHeight};
  }catch{ return null; }
}

async function pdf(){
  await M.loadScript('/outils/previsionnel-msp/vendor/jspdf-4.2.1.umd.min.js');
  await M.loadScript('/outils/previsionnel-msp/vendor/jspdf-autotable-5.0.9.min.js');
  const S=M.state(), R=M.results();
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  if(typeof doc.autoTable!=='function') throw new Error('jspdf-autotable non chargé');
  doc.setProperties({title:`Prévisionnel Maison de Santé : ${S.name||'scénario'}`,author:'100 000 Médecins',creator:'100000medecins.org'});
  const PW=210, PH=297, MX=14, CW=PW-2*MX, TOP=22, BOTTOM=18;
  let y=0;
  const font=(style,size,color)=>{ doc.setFont('helvetica',style); doc.setFontSize(size); doc.setTextColor(color||INK); };
  const ensure=need=>{ if(y+need>PH-BOTTOM){ doc.addPage(); y=TOP; } };
  const after=()=>{ y=doc.lastAutoTable.finalY+8; };
  function heading(text,sub){
    ensure(sub?22:16);
    font('bold',11.5,NAVY); doc.text(tx(text),MX,y);
    if(sub){ y+=4.5; font('normal',8,INK2); doc.splitTextToSize(tx(sub),CW).forEach(l=>{ doc.text(l,MX,y); y+=3.6; }); y+=1.4; }
    else y+=5;
  }
  const TABLE={
    theme:'plain', margin:{left:MX,right:MX,top:TOP,bottom:BOTTOM},
    styles:{font:'helvetica',fontSize:8,textColor:INK,cellPadding:{top:1.3,bottom:1.3,left:2,right:2},lineColor:LINE,lineWidth:{bottom:0.15},overflow:'linebreak'},
    headStyles:{fillColor:NAVY,textColor:'#FFFFFF',fontStyle:'bold',fontSize:7.5},
    footStyles:{fillColor:SURFACE2,textColor:INK,fontStyle:'bold'}
  };
  const table=opts=>{ doc.autoTable(Object.assign({},TABLE,opts,{
    styles:Object.assign({},TABLE.styles,opts.styles||{}),
    headStyles:Object.assign({},TABLE.headStyles,opts.headStyles||{}),
    footStyles:Object.assign({},TABLE.footStyles,opts.footStyles||{}),
    // En-têtes et totaux alignés comme les chiffres de leur colonne.
    didParseCell:d=>{ const cs=(opts.columnStyles||{})[d.column.index]; if(d.section!=='body'&&cs&&cs.halign&&d.cell.colSpan===1) d.cell.styles.halign=cs.halign; }
  })); after(); };
  const groupRow=(text,span)=>[{content:tx(text),colSpan:span,styles:{fillColor:SURFACE2,textColor:INK2,fontStyle:'bold',fontSize:7.5}}];
  // Pastille de couleur dans la première colonne (lignes des professions).
  const dotCell=colors=>d=>{ if(d.section==='body'&&d.column.index===0&&colors[d.row.index]){ doc.setFillColor(colors[d.row.index]); doc.roundedRect(d.cell.x+2,d.cell.y+d.cell.height/2-1.1,2.2,2.2,0.5,0.5,'F'); } };

  // ---------- Page 1 : en-tête et synthèse ----------
  const logo=await imageData('/logos/logo-principal-couleur-trimmed.png');
  if(logo){ const lw=30, lh=lw*logo.h/logo.w; doc.addImage(logo.data,'PNG',PW-MX-lw,12,lw,lh,'logo','FAST'); }
  y=20;
  font('bold',18,NAVY); doc.text('Prévisionnel Maison de Santé',MX,y); y+=7;
  font('normal',12,INK); doc.splitTextToSize(tx(S.name||'Scénario'),CW-40).forEach(l=>{ doc.text(l,MX,y); y+=5.5; });
  font('normal',8.5,MUTED); doc.text(tx(`Édité le ${dateFr()} depuis 100000medecins.org · horizon ${R.H} mois`),MX,y); y+=9;

  const y1=R.years[0], last=R.last;
  const tiles=[
    ['Charges mensuelles en croisière',E(last.chargesTotal),`mois ${R.H}, marge comprise`,true],
    ['Investissement total',K(R.needsTotal),`matériel ${K(R.equipTotal)}, travaux ${K(R.needs.works)}`],
    ['Emprunt',K(R.loan),R.loan>0?`${E(R.payment)} par mois sur ${S.fin.loanMonths} mois`:'aucun'],
    ['Point d\'équilibre',R.breakEven?`Mois ${R.breakEven}`:'Non atteint',R.breakEven?'premier mois excédentaire':'sur l\'horizon choisi'],
    ['Recettes annuelles en croisière',K(last.rev*12),`${E(last.rev)} par mois`],
    ['Charges annuelles en croisière',K(last.chargesTotal*12),`${E(last.chargesTotal)} par mois`],
    ['Résultat de la première année',K(y1.result),'collectif, avant cotisations'],
    ['Creux de trésorerie',K(R.minCash),R.minCash<0?'fonds de roulement insuffisant':'fonds de roulement jamais entamé']
  ];
  const gap=3.5, tw=(CW-3*gap)/4, th=23;
  tiles.forEach(([k,v,d,hero],i)=>{
    const x=MX+(i%4)*(tw+gap), ty=y+Math.floor(i/4)*(th+gap);
    doc.setFillColor(hero?NAVY:SURFACE2); doc.roundedRect(x,ty,tw,th,2,2,'F');
    const c1=hero?'#FFFFFF':INK2, c2=hero?'#FFFFFF':(/^-/.test(v)?BAD:INK);
    font('bold',6.2,c1); doc.splitTextToSize(tx(k.toUpperCase()),tw-5).slice(0,2).forEach((l,j)=>doc.text(l,x+2.5,ty+4.6+j*2.6));
    font('bold',12.5,c2); doc.text(tx(v),x+2.5,ty+13.6);
    font('normal',6.8,c1); doc.splitTextToSize(tx(d),tw-5).slice(0,2).forEach((l,j)=>doc.text(l,x+2.5,ty+17.6+j*2.8));
  });
  y+=2*th+gap+9;

  const prof=cruiseRows(S,R);
  heading('Revenu net par praticien, en vitesse de croisière','Après quote-part des charges de la structure et cotisations sociales.');
  table({
    startY:y,
    head:[['Profession','Praticiens','Recettes à 100 %, par mois','Quote-part des charges, par mois','Revenu net, par mois']],
    body:prof.map(({p,head,fullRev,share,net})=>[tx(p.name),tx(M.fmtN(head,1)),E(fullRev),E(share),E(net)]),
    columnStyles:{0:{cellPadding:{top:1.3,bottom:1.3,left:6,right:2}},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right',fontStyle:'bold'}},
    didDrawCell:dotCell(prof.map(x=>serie(x.i)))
  });

  heading('Points d\'attention');
  alerts(S,R).forEach(([t,h,b])=>{
    const lines=doc.splitTextToSize(tx(`${h} : ${b}`),CW-8);
    const bh=lines.length*3.8+3.4;
    ensure(bh+2);
    doc.setFillColor(t==='good'?'#E3F3E7':t==='warn'?'#FBF0D6':'#FBE3E3'); doc.roundedRect(MX,y,CW,bh,1.5,1.5,'F');
    doc.setFillColor(t==='good'?GOOD:t==='warn'?WARN:BAD); doc.rect(MX,y,1.2,bh,'F');
    font('normal',8.3,INK); lines.forEach((l,j)=>doc.text(l,MX+4,y+4.6+j*3.8));
    y+=bh+2.2;
  });
  y+=5;

  heading('Plan de financement','Le crédit couvre ce que les apports et subventions ne couvrent pas.');
  const needs=needsLines(R), res=[['Apports personnels',S.fin.equity],['Subventions',S.fin.grants],['Emprunt bancaire',R.loan]];
  const planBody=[]; for(let i=0;i<Math.max(needs.length,res.length);i++){ const a=needs[i], b=res[i]; planBody.push([a?tx(a[0]):'',a?E(a[1]):'',b?tx(b[0]):'',b?E(b[1]):'']); }
  table({
    startY:y, head:[['Besoins','','Ressources','']], body:planBody,
    foot:[['Total des besoins',E(R.needsTotal),'Total des ressources',E(S.fin.equity+S.fin.grants+R.loan)]],
    columnStyles:{1:{halign:'right'},3:{halign:'right'}}
  });
  const loanTxt=R.loan>0?`Emprunt de ${E(R.loan)} sur ${S.fin.loanMonths} mois au taux de ${tx(M.fmtN((S.fin.rate||0)*100,2))} % : mensualité ${E(R.payment)}, coût total du crédit ${E(R.loanTotalCost)}${S.fin.deferMonths?`, franchise de ${S.fin.deferMonths} mois`:''}.`:`Aucun emprunt nécessaire${R.surplus>0?` : excédent d'apports de ${E(R.surplus)} ajouté à la trésorerie`:''}.`;
  y-=3; ensure(10); font('normal',8.3,INK2);
  doc.splitTextToSize(tx(loanTxt),CW).forEach(l=>{ doc.text(l,MX,y); y+=3.8; });

  // ---------- Graphiques ----------
  doc.addPage(); y=TOP;
  const ms=R.months, Hm=R.H;
  function legend(items){
    font('normal',7.5,INK2); let x=MX;
    items.forEach(([c,l])=>{ const w=doc.getTextWidth(tx(l))+7; if(x+w>MX+CW){ x=MX; y+=4.2; } doc.setFillColor(c); doc.roundedRect(x,y-2.2,2.4,2.4,0.5,0.5,'F'); doc.text(tx(l),x+3.6,y); x+=w+2; });
    y+=4;
  }
  function frame(h,maxV,minV){
    const X0=MX+15, X1=MX+CW-1, Y0=y, Y1=y+h-6, bw=(X1-X0)/Hm;
    const sx=m=>X0+m*bw, sy=v=>Y0+(Y1-Y0)*(1-(v-minV)/((maxV-minV)||1));
    doc.setLineWidth(0.15); doc.setDrawColor(GRID); font('normal',6.3,MUTED);
    for(let i=0;i<=5;i++){ const v=minV+(maxV-minV)*i/5, yy=sy(v); doc.line(X0,yy,X1,yy); doc.text(K(v),X0-1.5,yy+0.9,{align:'right'}); }
    doc.setDrawColor(AXIS); doc.setLineDashPattern([0.6,0.8],0);
    for(let k=0;k<Math.ceil(Hm/12);k++){ const xx=sx(k*12); doc.line(xx,Y0,xx,Y1); doc.text(`Année ${k+1}`,sx(Math.min(k*12+6,Hm)),Y1+4,{align:'center'}); }
    doc.setLineDashPattern([],0); doc.line(X0,Y1,X1,Y1);
    y+=h+8;
    return {sx,sy,bw};
  }
  const polyline=(pts,color,w)=>{ doc.setDrawColor(color); doc.setLineWidth(w); for(let i=1;i<pts.length;i++) doc.line(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]); const p=pts[pts.length-1]; doc.setFillColor(color); doc.circle(p[0],p[1],0.8,'F'); };
  const CHART_H=62;

  heading('Recettes mensuelles par profession et charges de la structure','Recettes des associés (rétrocessions comprises) ; la ligne noire est le total des charges.');
  legend([...S.professions.map((p,i)=>[serie(i),p.name]),[INK,'Charges totales']]);
  { const maxV=niceMax(Math.max(...ms.map(r=>Math.max(r.rev,r.chargesTotal)))*1.05);
    const f=frame(CHART_H,maxV,0), g=Math.min(0.2,f.bw*0.12);
    ms.forEach((r,m)=>{ let acc=0; S.professions.forEach((p,i)=>{ const v=r.prof[p.id].rev+r.prof[p.id].retro; if(v<=0) return; const ya=f.sy(acc+v), yb=f.sy(acc); doc.setFillColor(serie(i)); doc.rect(f.sx(m)+g,ya,Math.max(0.2,f.bw-2*g),Math.max(0,yb-ya),'F'); acc+=v; }); });
    polyline(ms.map((r,m)=>[f.sx(m)+f.bw/2,f.sy(r.chargesTotal)]),INK,0.45); }

  heading('Revenu net mensuel par praticien','Après quote-part des charges et cotisations sociales, par profession.');
  legend(S.professions.map((p,i)=>[serie(i),p.name]));
  { const maxV=niceMax(Math.max(1,...ms.flatMap(r=>S.professions.map(p=>r.prof[p.id].net)))*1.1);
    const f=frame(CHART_H,maxV,0);
    S.professions.forEach((p,i)=>polyline(ms.map((r,m)=>[f.sx(m)+f.bw/2,f.sy(r.prof[p.id].net)]),serie(i),0.45)); }

  heading('Résultat collectif mensuel','Recettes des associés moins charges de la structure, avant cotisations ; les mois négatifs sont financés par le fonds de roulement.');
  legend([[NAVY,'Mois excédentaire'],[BAD,'Mois déficitaire']]);
  { const vals=ms.map(r=>r.result), maxV=niceMax(Math.max(1,...vals)*1.05), minRaw=Math.min(0,...vals), minV=minRaw<0?-niceMax(-minRaw*1.05):0;
    const f=frame(CHART_H,maxV,minV), g=Math.min(0.2,f.bw*0.12), y0=f.sy(0);
    ms.forEach((r,m)=>{ const yv=f.sy(r.result); doc.setFillColor(r.result<0?BAD:NAVY); doc.rect(f.sx(m)+g,Math.min(y0,yv),Math.max(0.2,f.bw-2*g),Math.max(0.15,Math.abs(y0-yv)),'F'); });
    doc.setDrawColor(AXIS); doc.setLineWidth(0.2); doc.line(f.sx(0),y0,f.sx(Hm),y0); }

  // ---------- Synthèse annuelle et hypothèses ----------
  doc.addPage(); y=TOP;
  const yrs=R.years;
  heading('Synthèse annuelle');
  const manyY=yrs.length>5, yc={}; yrs.forEach((_,j)=>{ yc[j+1]={halign:'right',cellWidth:(CW-(manyY?48:62))/yrs.length}; });
  table({
    startY:y, head:[['',...yrs.map(x=>`Année ${x.y}`)]],
    body:[
      ['Recettes des associés',...yrs.map(x=>E(x.rev))],
      ['Charges de la structure',...yrs.map(x=>E(-x.charges))],
      [{content:'Résultat collectif avant cotisations',styles:{fontStyle:'bold'}},...yrs.map(x=>({content:E(x.result),styles:{fontStyle:'bold',textColor:x.result<0?BAD:INK}}))],
      ['Cumul du résultat, fonds de roulement compris',...yrs.map(x=>({content:E(x.cashEnd),styles:{textColor:x.cashEnd<0?BAD:INK}}))],
      groupRow('Revenu net mensuel moyen par praticien',yrs.length+1),
      ...S.professions.map(p=>[tx(p.name),...yrs.map(x=>E(x.prof[p.id].netAvg))])
    ],
    styles:{fontSize:manyY?6.8:7.5}, headStyles:{fontSize:manyY?6.8:7.5}, columnStyles:Object.assign({0:{cellWidth:manyY?48:62}},yc)
  });

  heading('Hypothèses : équipe et activité','Valeurs par praticien, telles que saisies dans l\'outil.');
  // Colonnes de largeur égale : sinon les noms longs écrasent les colonnes voisines.
  const manyP=S.professions.length>5, pw0=manyP?52:58, pc={};
  S.professions.forEach((_,j)=>{ pc[j+1]={halign:'right',cellWidth:(CW-pw0)/S.professions.length}; });
  table({
    startY:y, head:[['Paramètre',...S.professions.map(p=>tx(p.name))]],
    body:PROF_FIELDS.map(([k,l,u,kind])=>[tx(l+(u&&kind!=='pct'?` (${u})`:'')),...S.professions.map(p=>kind==='bool'?(p[k]?'Oui':'Non'):kind==='pct'?tx(`${M.fmtN((p[k]||0)*100,1)} %`):tx(M.fmtN(p[k],2)))]),
    styles:{fontSize:manyP?6.6:7.2}, headStyles:{fontSize:manyP?6.3:7.5}, columnStyles:Object.assign({0:{cellWidth:pw0}},pc)
  });

  heading('Hypothèses : local, charges, investissement et financement');
  const hb=[]; hypotheses(S,R).forEach(([title,items])=>{ hb.push(groupRow(title,2)); items.forEach(h=>hb.push([tx(h.l),fmtHyp(h)])); });
  table({ startY:y, head:[['Paramètre','Valeur']], body:hb, styles:{fontSize:7.4,cellPadding:{top:1.1,bottom:1.1,left:2,right:2}}, columnStyles:{1:{halign:'right',cellWidth:50}} });

  // ---------- Annexes ----------
  doc.addPage(); y=TOP;
  heading('Annexe 1 : détail mois par mois','Montants mensuels ; revenu net par praticien après charges et cotisations.');
  const nCol=4+S.professions.length, manyC=nCol>8, mc={};
  const unit=(CW-9)/(nCol+0.4); // la colonne du cumul (millions possibles) a 40 % de largeur en plus
  for(let j=1;j<=nCol;j++) mc[j]={halign:'right',cellWidth:j===4?unit*1.4:unit};
  table({
    startY:y,
    head:[['Mois','Recettes','Charges','Résultat','Cumul, fonds de roulement compris',...S.professions.map(p=>tx(`Net ${p.name}`))]],
    body:ms.map(r=>[String(r.m),E(r.rev),E(r.chargesTotal),{content:E(r.result),styles:{textColor:r.result<0?BAD:INK}},{content:E(r.cash),styles:{textColor:r.cash<0?BAD:INK}},...S.professions.map(p=>E(r.prof[p.id].net))]),
    styles:{fontSize:manyC?6:7,cellPadding:{top:1.1,bottom:1.1,left:1.2,right:1.2}}, headStyles:{fontSize:manyC?5.8:6.5}, columnStyles:Object.assign({0:{cellWidth:9}},mc)
  });

  heading('Annexe 2 : matériel et ameublement',`Prix TTC indicatifs ; quantités « × box » multipliées par ${R.boxes} box de consultation.`);
  const eb=[];
  equipmentRows(S,R).forEach(({g,items})=>{
    if(!items.length) return;
    eb.push(groupRow(`${g} : ${M.fmtEur0(items.reduce((a,x)=>a+x.total,0))}`,6));
    items.forEach(({e,total:t})=>eb.push([tx(e.name),E(e.price),tx(M.fmtN(e.qty,2)),e.perBox?'Oui':'',tx(M.CAT[e.cat]||''),E(t)]));
  });
  table({
    startY:y, head:[['Désignation','Prix unitaire','Qté','× box','Catégorie','Total']], body:eb,
    foot:[[{content:tx(`Total (mobilier ${M.fmtEur0(R.equipByCat[1])}, médical ${M.fmtEur0(R.equipByCat[2])}, informatique ${M.fmtEur0(R.equipByCat[3])})`),colSpan:5},E(R.equipTotal)]],
    styles:{fontSize:7.2}, columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'center'},5:{halign:'right'}}
  });

  // ---------- En-têtes et pieds de page ----------
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){
    doc.setPage(i);
    if(i>1){ font('normal',7.5,MUTED); doc.text(doc.splitTextToSize(tx(`Prévisionnel Maison de Santé : ${S.name||'scénario'}`),CW-30)[0],MX,12); doc.text('100000medecins.org',PW-MX,12,{align:'right'}); doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(MX,14,PW-MX,14); }
    doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(MX,PH-12,PW-MX,PH-12);
    font('normal',6.8,MUTED); doc.text(tx(DISCLAIMER),MX,PH-8,{maxWidth:CW-22}); doc.text(`${i} / ${n}`,PW-MX,PH-8,{align:'right'});
  }

  M.downloadBlob(doc.output('blob'), M.fileSlug()+'.pdf');
  M.toast('Fichier PDF téléchargé');
}

window.MSPExport={xlsx, pdf};
})();
