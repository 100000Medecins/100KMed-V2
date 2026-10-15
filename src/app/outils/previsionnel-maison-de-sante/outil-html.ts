// Balisage de l'outil « Prévisionnel Maison de Santé » (rempli et animé par
// public/outils/previsionnel-msp/outil.js). Repris de la page autonome d'origine, sans le titre de
// l'outil, que porte la page.
export const OUTIL_HTML = String.raw`
<div class="wrap">
  <header class="top">
    <div class="top-in">
      <div class="scenario"><span>Scénario</span><input id="scenarioName" type="text" aria-label="Nom du scénario">
        <div class="switch" id="switchWrap" hidden>
          <button class="btn small" id="btnSwitch" type="button" aria-haspopup="menu" aria-expanded="false" title="Ouvrir un autre prévisionnel enregistré">Changer<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></button>
          <div class="switch-menu" id="switchMenu" role="menu" hidden></div>
        </div>
      </div>
      <div class="top-actions">
        <button class="btn ghost" id="btnReset" type="button">Valeurs par défaut</button>
        <button class="btn" id="btnShare" type="button">Sauvegarder / partager</button>
        <button class="btn" id="btnXlsx" type="button" title="Exporter en Excel (.xlsx)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10"/></svg>Excel</button>
        <button class="btn" id="btnPdf" type="button" title="Exporter en PDF"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10"/></svg>PDF</button>
      </div>
    </div>
  </header>

  <div id="sharedBanner" hidden></div>

  <div class="main">
    <section>
      <nav class="tabs" role="tablist" aria-label="Étapes">
        <button class="tab" role="tab" data-tab="equipe" type="button"><span class="n">1</span>Équipe &amp; activité</button>
        <button class="tab" role="tab" data-tab="local" type="button"><span class="n">2</span>Local &amp; charges</button>
        <button class="tab" role="tab" data-tab="materiel" type="button"><span class="n">3</span>Matériel</button>
        <button class="tab" role="tab" data-tab="financement" type="button"><span class="n">4</span>Investissement &amp; financement</button>
        <button class="tab" role="tab" data-tab="resultats" type="button"><span class="n">5</span>Résultats</button>
        <button class="tab" role="tab" data-tab="apropos" type="button"><span class="n">?</span>Méthode</button>
      </nav>

      <div class="panel" id="tab-equipe" role="tabpanel">
        <div class="card">
          <div class="card-h"><h2>Montée en charge et horizon</h2><p>Commun à toute l'équipe</p></div>
          <div class="fields">
            <div class="field"><label for="f-ramp-start">Taux d'activité au mois 1</label><div class="ctl"><input id="f-ramp-start" type="number" data-path="ramp.start" data-kind="pct" min="0" max="100" step="5"><span class="unit">%</span></div><div class="help">Part des créneaux réellement remplis à l'ouverture.</div></div>
            <div class="field"><label for="f-ramp-end">Taux d'activité en vitesse de croisière</label><div class="ctl"><input id="f-ramp-end" type="number" data-path="ramp.end" data-kind="pct" min="0" max="100" step="5"><span class="unit">%</span></div><div class="help">95 % = agenda quasi plein, le reste étant les trous et absences.</div></div>
            <div class="field"><label for="f-ramp-months">Durée de la montée en charge</label><div class="ctl"><input id="f-ramp-months" type="number" data-path="ramp.months" min="0" max="60" step="1"><span class="unit">mois</span></div><div class="help">Progression linéaire ; chaque nouvel arrivant suit la même courbe à partir de son arrivée.</div></div>
            <div class="field"><label for="f-horizon">Horizon du prévisionnel</label><div class="ctl"><select id="f-horizon" data-path="horizon" data-kind="int"><option value="36">3 ans (36 mois)</option><option value="48">4 ans (48 mois)</option><option value="60">5 ans (60 mois)</option><option value="84">7 ans (84 mois)</option></select></div></div>
          </div>
        </div>

        <div id="profList" style="display:grid;gap:18px"></div>

        <div class="card" id="addProfCard">
          <div class="card-h"><h3>Ajouter une profession</h3><p>Chaque profession a ses propres tarifs, horaires, congés et cotisations.</p></div>
          <div class="add-row">
            <select id="addProfSel" aria-label="Profession à ajouter"></select>
            <button class="btn primary" id="btnAddProf" type="button">Ajouter</button>
          </div>
        </div>
      </div>

      <div class="panel" id="tab-local" role="tabpanel" hidden>
        <div class="card">
          <div class="card-h"><h2>Local</h2><p>Loyer, charges locatives, travaux</p></div>
          <div class="fields">
            <div class="field"><label for="f-surface">Surface</label><div class="ctl"><input id="f-surface" type="number" data-path="local.surface" min="0" step="5"><span class="unit">m²</span></div><div class="help" id="surfaceHint"></div></div>
            <div class="field"><label for="f-rent">Loyer HT hors charges</label><div class="ctl"><input id="f-rent" type="number" data-path="local.rentM2" min="0" step="5"><span class="unit">€/m²/an</span></div></div>
            <div class="field"><label for="f-tva">TVA sur le loyer</label><div class="ctl"><select id="f-tva" data-path="local.tva" data-kind="num"><option value="0">Non assujetti (0 %)</option><option value="0.2">20 %</option></select></div><div class="help">Souvent non due si ni le bailleur ni les praticiens ne sont assujettis.</div></div>
            <div class="field"><label for="f-chm2">Charges locatives</label><div class="ctl"><input id="f-chm2" type="number" data-path="local.chargesM2" min="0" step="1"><span class="unit">€/m²/an</span></div><div class="help">Eau, électricité, chauffage, entretien des communs.</div></div>
            <div class="field"><label for="f-tf">Taxe foncière refacturée</label><div class="ctl"><input id="f-tf" type="number" data-path="local.taxeM2" min="0" step="1"><span class="unit">€/m²/an</span></div></div>
            <div class="field"><label for="f-franchise">Franchise de loyer</label><div class="ctl"><input id="f-franchise" type="number" data-path="local.franchise" min="0" step="1"><span class="unit">mois</span></div><div class="help">Mois gratuits négociés avec le bailleur.</div></div>
            <div class="field"><label for="f-works">Travaux d'aménagement</label><div class="ctl"><input id="f-works" type="number" data-path="local.worksM2" min="0" step="50"><span class="unit">€ TTC/m²</span></div><div class="help">Second œuvre léger : 400 à 800 €/m² ; réhabilitation lourde : 1 000 à 1 500 €/m².</div></div>
            <div class="field"><label for="f-caution">Dépôt de garantie</label><div class="ctl"><input id="f-caution" type="number" data-path="local.cautionMonths" min="0" step="1"><span class="unit">mois de loyer</span></div></div>
          </div>
          <div class="inline-total" id="localTotals"></div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Charges de fonctionnement</h2><p>Mensuelles sauf mention contraire</p></div>
          <div class="fields">
            <div class="field"><label for="f-telecom">Téléphone + internet</label><div class="ctl"><input id="f-telecom" type="number" data-path="charges.telecom" min="0" step="10"><span class="unit">€/mois</span></div></div>
            <div class="field"><label for="f-soft">Logiciel métier</label><div class="ctl"><input id="f-soft" type="number" data-path="charges.software" min="0" step="5"><span class="unit">€/praticien/mois</span></div><div class="help">Abonnement, hébergement HDS, messagerie sécurisée, agenda en ligne.</div></div>
            <div class="field"><label for="f-cmed">Consommables médicaux</label><div class="ctl"><input id="f-cmed" type="number" data-path="charges.medConsum" min="0" step="5"><span class="unit">€/praticien/mois</span></div></div>
            <div class="field"><label for="f-coff">Consommables bureau</label><div class="ctl"><input id="f-coff" type="number" data-path="charges.officeConsum" min="0" step="5"><span class="unit">€/praticien/mois</span></div></div>
            <div class="field"><label for="f-acc1">Comptabilité de la structure</label><div class="ctl"><input id="f-acc1" type="number" data-path="charges.accountingStructure" min="0" step="100"><span class="unit">€/an</span></div></div>
            <div class="field"><label for="f-acc2">Gestion des paies</label><div class="ctl"><input id="f-acc2" type="number" data-path="charges.accountingPayroll" min="0" step="50"><span class="unit">€/an</span></div></div>
            <div class="field"><label for="f-bank">Frais bancaires + assurances</label><div class="ctl"><input id="f-bank" type="number" data-path="charges.bankInsurance" min="0" step="10"><span class="unit">€/mois</span></div><div class="help">Multirisque locaux, RC de la structure, tenue de compte.</div></div>
            <div class="field"><label for="f-reserve">Marge prudentielle</label><div class="ctl"><input id="f-reserve" type="number" data-path="charges.reserve" data-kind="pct" min="0" max="50" step="1"><span class="unit">%</span></div><div class="help">Majoration « au cas où » appliquée à toutes les charges.</div></div>
          </div>

          <div class="sub">
            <div class="sub-h"><h4>Ménage</h4></div>
            <div class="fields">
              <div class="field"><label for="f-clh">Heures par semaine</label><div class="ctl"><input id="f-clh" type="number" data-path="charges.cleaningHours" min="0" step="1"><span class="unit">h</span></div></div>
              <div class="field"><label for="f-clr">Coût horaire tout compris</label><div class="ctl"><input id="f-clr" type="number" data-path="charges.cleaningRate" min="0" step="1"><span class="unit">€/h</span></div></div>
            </div>
          </div>

          <div class="sub">
            <div class="sub-h"><h4>Secrétariat</h4></div>
            <div class="fields">
              <div class="field"><label for="f-secnet">Salaire net secrétaire</label><div class="ctl"><input id="f-secnet" type="number" data-path="charges.secretaryNet" min="0" step="50"><span class="unit">€/mois</span></div><div class="help">0 si pas de salarié.</div></div>
              <div class="field"><label for="f-secrate">Charges sociales (salariales + patronales)</label><div class="ctl"><input id="f-secrate" type="number" data-path="charges.employerRate" data-kind="pct" min="0" max="150" step="5"><span class="unit">% du net</span></div><div class="help">Coût employeur ≈ net × (1 + taux). Un 13e mois est intégré.</div></div>
              <div class="field"><label for="f-secstart">Prise de poste</label><div class="ctl"><input id="f-secstart" type="number" data-path="charges.secretaryStart" min="1" step="1"><span class="unit">mois n°</span></div></div>
              <div class="field"><label for="f-sectel">Secrétariat externalisé / téléphonique</label><div class="ctl"><input id="f-sectel" type="number" data-path="charges.phoneSecretariat" min="0" step="10"><span class="unit">€/mois</span></div></div>
            </div>
          </div>

          <div class="sub">
            <div class="sub-h"><h4>Autres charges fixes</h4><button class="btn small" type="button" data-action="addOther">+ Ajouter une ligne</button></div>
            <div class="tscroll"><table id="otherTable"></table></div>
          </div>
        </div>
      </div>

      <div class="panel" id="tab-materiel" role="tabpanel" hidden>
        <div class="card">
          <div class="card-h"><h2>Matériel et ameublement</h2><p>Prix TTC indicatifs 2026, à ajuster sur devis</p></div>
          <div class="fields" style="margin-bottom:12px">
            <div class="field"><label for="f-boxes">Nombre de box de consultation</label><div class="ctl"><input id="f-boxes" type="number" data-path="invest.boxes" min="0" step="1" placeholder="auto"><span class="unit">box</span></div><div class="help" id="boxHint"></div></div>
          </div>
          <div class="kpis" id="equipTotals"></div>
        </div>
        <div id="equipGroups" style="display:grid;gap:18px"></div>
      </div>

      <div class="panel" id="tab-financement" role="tabpanel" hidden>
        <div class="card">
          <div class="card-h"><h2>Frais de départ</h2></div>
          <div class="fields">
            <div class="field"><label for="f-creation">Frais de création de la société</label><div class="ctl"><input id="f-creation" type="number" data-path="invest.creation" min="0" step="100"><span class="unit">€</span></div><div class="help">Statuts, annonces légales, greffe, conseil.</div></div>
            <div class="field"><label for="f-capital">Capital initial (SCM / SISA)</label><div class="ctl"><input id="f-capital" type="number" data-path="invest.capital" min="0" step="100"><span class="unit">€</span></div></div>
            <div class="field"><label for="f-bfr">Besoin en fonds de roulement</label><div class="ctl"><input id="f-bfr" type="number" data-path="invest.bfr" min="0" step="1000"><span class="unit">€</span></div><div class="help">Trésorerie d'avance pour payer les charges des premiers mois. Vérifiez-le avec la trésorerie prévisionnelle (onglet Résultats).</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Plan de financement</h2><p>Le crédit couvre ce que les apports et subventions ne couvrent pas</p></div>
          <div class="tscroll"><table id="planTable"></table></div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Apports et emprunt</h2></div>
          <div class="fields">
            <div class="field"><label for="f-equity">Apports personnels</label><div class="ctl"><input id="f-equity" type="number" data-path="fin.equity" min="0" step="1000"><span class="unit">€</span></div></div>
            <div class="field"><label for="f-grants">Subventions</label><div class="ctl"><input id="f-grants" type="number" data-path="fin.grants" min="0" step="1000"><span class="unit">€</span></div><div class="help">ARS (FIR), collectivités, Région, URPS…</div></div>
            <div class="field"><label for="f-loanm">Durée de l'emprunt</label><div class="ctl"><input id="f-loanm" type="number" data-path="fin.loanMonths" min="1" step="12"><span class="unit">mois</span></div></div>
            <div class="field"><label for="f-rate">Taux annuel (assurance comprise)</label><div class="ctl"><input id="f-rate" type="number" data-path="fin.rate" data-kind="pct" min="0" max="20" step="0.1"><span class="unit">%</span></div></div>
            <div class="field"><label for="f-defer">Franchise de remboursement</label><div class="ctl"><input id="f-defer" type="number" data-path="fin.deferMonths" min="0" step="1"><span class="unit">mois</span></div><div class="help">Mois sans échéance au démarrage (simplification : sans intérêts intercalaires).</div></div>
          </div>
          <div class="inline-total" id="loanTotals"></div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Durées d'amortissement</h2><p>Information comptable, sans effet sur la trésorerie</p></div>
          <div class="fields">
            <div class="field"><label for="f-am1">Frais de création</label><div class="ctl"><input id="f-am1" type="number" data-path="amort.creation" min="1" step="1"><span class="unit">ans</span></div></div>
            <div class="field"><label for="f-am2">Matériel et ameublement</label><div class="ctl"><input id="f-am2" type="number" data-path="amort.equipment" min="1" step="1"><span class="unit">ans</span></div></div>
            <div class="field"><label for="f-am3">Travaux</label><div class="ctl"><input id="f-am3" type="number" data-path="amort.works" min="1" step="1"><span class="unit">ans</span></div></div>
          </div>
          <div class="inline-total" id="amortTotals"></div>
        </div>
      </div>

      <div class="panel" id="tab-resultats" role="tabpanel" hidden>
        <div class="notice">Ce sont des <b>prévisionnels</b> : relisez posément chaque chiffre saisi, comparez les revenus en vitesse de croisière aux statistiques de votre profession, puis finalisez avec un expert-comptable.</div>
        <div class="kpis" id="resKpis"></div>

        <div class="card">
          <div class="card-h"><h2>Recettes mensuelles par profession et charges de la structure</h2><p>Recettes des associés (rétrocessions comprises) ; la ligne noire est le total des charges</p></div>
          <div class="chart" id="chart1"></div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Revenu net mensuel par praticien</h2><p>Après quote-part des charges et cotisations sociales, par profession</p></div>
          <div class="chart" id="chart2"></div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Résultat collectif mensuel</h2><p>Recettes des associés − charges de la structure, avant cotisations ; les mois négatifs sont financés par le fonds de roulement</p></div>
          <div class="chart" id="chart3"></div>
        </div>

        <div class="card">
          <div class="card-h"><h2>Synthèse annuelle</h2></div>
          <div class="tscroll"><table id="yearTable"></table></div>
        </div>

        <div class="card">
          <details><summary>Détail mois par mois</summary>
            <div class="tscroll" style="margin-top:10px"><table id="monthTable"></table></div>
          </details>
        </div>
      </div>

      <div class="panel" id="tab-apropos" role="tabpanel" hidden>
        <div class="card about">
          <h2>Méthode de calcul</h2>
          <p class="lead" style="margin-top:8px">L'outil transpose un business-plan Excel conçu par un jeune médecin pour son propre projet de cabinet pluriprofessionnel (SCM/SISA), généralisé à toutes les professions d'une maison de santé. Les cases de saisie correspondent aux « cases bleues » de l'Excel d'origine ; tout le reste se recalcule instantanément.</p>
          <h3 style="margin-top:16px">Recettes</h3>
          <ol>
            <li>Pour chaque profession, l'activité « pleine » d'un praticien = heures de consultation × actes par heure × tarif moyen, sur (52 − semaines de congés) / 12 semaines par mois.</li>
            <li>Un taux d'activité part du taux du mois 1 et monte linéairement jusqu'au taux de croisière. Chaque nouvel associé suit la même courbe à partir de son arrivée.</li>
            <li>Remplacements de congés : les créneaux laissés vides pendant les vacances sont assurés par un remplaçant qui conserve une part des honoraires (rétrocession) ; le reste revient au titulaire.</li>
            <li>Collaborateur régulier : des heures supplémentaires chaque semaine (soirées, samedis) sur le même principe.</li>
          </ol>
          <h3 style="margin-top:16px">Charges et répartition</h3>
          <ol>
            <li>Les charges de la structure (loyer, charges, logiciel, consommables, comptabilité, personnel, emprunt…) sont totalisées puis majorées de la marge prudentielle. Elles correspondent aux apports mensuels des associés à la SCM/SISA.</li>
            <li>Elles sont réparties entre praticiens présents selon leurs parts (ex. 1 part par médecin, 0,5 par infirmier qui exerce surtout au domicile).</li>
            <li>Revenu net par praticien = (recettes propres + rétrocessions reçues − quote-part des charges) × (1 − taux de cotisations sociales de la profession). Les cotisations sont une approximation ; un expert-comptable affinera.</li>
          </ol>
          <h3 style="margin-top:16px">Investissements et financement</h3>
          <ul>
            <li>Besoins = travaux + dépôt de garantie + matériel (par box × nombre de box, plus le matériel commun) + frais de création + capital + fonds de roulement.</li>
            <li>Emprunt = besoins − apports − subventions ; mensualité calculée à taux constant ; franchise de remboursement sans intérêts intercalaires (simplification).</li>
            <li>La trésorerie prévisionnelle part du fonds de roulement et cumule recettes − charges ; si elle passe en négatif, le fonds de roulement est insuffisant.</li>
          </ul>
          <h3 style="margin-top:16px">Limites</h3>
          <ul>
            <li>Les valeurs pré-remplies sont des ordres de grandeur 2026, pas des références tarifaires officielles : tarifs conventionnels, loyers et prix du matériel varient fortement selon le lieu et le projet.</li>
            <li>Pas de fiscalité (impôt sur le revenu, CFE), pas d'amortissements dans les résultats, pas de revalorisation annuelle.</li>
            <li>Les infirmiers et autres professions exerçant surtout au domicile ne mobilisent pas de box ; leur quote-part est réglée via les parts.</li>
          </ul>
          <p class="lead" style="margin-top:14px">Vos saisies restent dans votre navigateur, sauf les prévisionnels que vous enregistrez dans votre compte 100 000 Médecins. Depuis votre compte, le bouton « Sauvegarder / partager » permet aussi de créer un lien de partage en lecture seule, pour un associé, votre expert-comptable ou votre banque.</p>
        </div>
      </div>
    </section>

    <aside class="aside">
      <div class="syn" id="synthese"></div>
    </aside>
  </div>

  <div class="card io" id="ioCard" hidden style="margin-top:18px">
    <div class="card-h"><h2>Sauvegarder et partager</h2><button class="btn ghost small" type="button" id="btnCloseIo">Fermer</button></div>
    <div id="acct"></div>
  </div>

  <p class="footer">Outil d'aide au montage de projet, sans valeur contractuelle. Les chiffres doivent être validés par un professionnel du chiffre.</p>
</div>
<div class="toast" id="toast" role="status"></div>
`
