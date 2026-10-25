'use strict';

const evidenceByRoute = {
  'sulfate-route': [{ title: 'Unlocking the potential of sulphide tailings: characterization for critical-mineral recovery', publisher: 'Chemosphere research article · 2023', url: 'https://doi.org/10.1016/j.chemosphere.2023.138582', note: 'Supports characterization and recovery as a research pathway. It does not validate this listing, sulfate yield, or a buyer.' }],
  'carbon-route': [{ title: 'Adsorption of COD in wastewater by activated carbon from rice husk', publisher: 'IOP Conference Series: Earth and Environmental Science · 2020', url: 'https://doi.org/10.1088/1755-1315/596/1/012063', note: 'A specific experimental study, not certification for drinking water or any other treatment system.' }],
  'biochar-route': [{ title: 'Rice husk and husk biochar soil amendments in a well-weathered soil', publisher: 'Journal of Environmental Management · 2023', url: 'https://pubmed.ncbi.nlm.nih.gov/37068400/', note: 'Site-specific soil research; it does not establish an application rate or suitability for another farm.' }],
  'biogas-route': [{ title: 'Basic information about anaerobic digestion', publisher: 'U.S. Environmental Protection Agency', url: 'https://www.epa.gov/anaerobic-digestion/basic-information-about-anaerobic-digestion', note: 'Describes biogas and digestate outputs. A local digester, safe operations, and permitting still need review.' }],
  'digestate-route': [{ title: 'Basic information about anaerobic digestion', publisher: 'U.S. Environmental Protection Agency', url: 'https://www.epa.gov/anaerobic-digestion/basic-information-about-anaerobic-digestion', note: 'Digestate uses depend on treatment, quality, rules, and local conditions; this is not a fertilizer approval.' }],
  'fiber-route': [{ title: 'Performance of interior finishing panels made from denim textile waste', publisher: 'Textile Research Journal · 2022', url: 'https://doi.org/10.1177/00405175221109636', note: 'Supports a researched textile-panel pathway, not certification of the mapped insulation product.' }],
  'metal-route': [{ title: 'Recovery of metals contained in spent catalysts', publisher: 'Revista de Metalurgia · experimental study', url: 'https://doi.org/10.3989/revmetalm.1995.v31.i4.952', note: 'Demonstrates one process-specific recovery study; catalyst chemistry and modern compliance must be checked.' }],
  'aggregate-route': [{ title: 'Construction and demolition debris recycling options and tips', publisher: 'Florida Department of Environmental Protection', url: 'https://floridadep.gov/waste/waste-reduction/content/construction-and-demolition-debris-recycling-options-and-tips', note: 'Lists common reuse pathways; local contamination limits and engineering approval still govern use.' }]
};
const farmEvidence = [
  { title: 'Basic information about anaerobic digestion', publisher: 'U.S. Environmental Protection Agency', url: 'https://www.epa.gov/anaerobic-digestion/basic-information-about-anaerobic-digestion', note: 'General process background; site design and safe operation require qualified review.' },
  { title: 'Environmental benefits of anaerobic digestion', publisher: 'U.S. Environmental Protection Agency', url: 'https://www.epa.gov/anaerobic-digestion/environmental-benefits-anaerobic-digestion-ad', note: 'Digestate application remains subject to quality and applicable local rules.' }
];
let aiConfigured = false;
let aiStatusChecked = false;
let lastAnalysis = null;

function setEngineStatus(message, mode) {
  const node = document.getElementById('analysisEngineStatus');
  if (!node) return;
  node.className = 'engine-status ' + mode;
  node.innerHTML = '<i></i><span>' + escapeHtml(message) + '</span>';
}
function setPipeline(active, completed = []) {
  document.querySelectorAll('#analysisPipeline [data-step]').forEach(node => {
    const key = node.dataset.step;
    node.dataset.state = completed.includes(key) ? 'complete' : key === active ? 'active' : 'pending';
  });
}
function populateAnalysisFamilies() {
  const select = document.getElementById('analysisFamily');
  for (const [id, name] of Object.entries(familyNames)) {
    if (id === 'other') continue;
    const option = document.createElement('option');
    option.value = id;
    option.textContent = name;
    select.append(option);
  }
  const other = document.createElement('option');
  other.value = 'other';
  other.textContent = familyNames.other;
  select.append(other);
}
async function checkAnalysisService() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const status = await response.json();
    aiConfigured = response.ok && status.configured === true;
    aiStatusChecked = true;
    setEngineStatus(aiConfigured ? (window.AetherisAuth.isSignedIn() ? 'Gemini ready · ' + status.model : 'Gemini available · sign in to analyze') : 'Offline rules mode · no model key configured', aiConfigured ? (window.AetherisAuth.isSignedIn() ? 'ready' : 'offline') : 'offline');
  } catch {
    aiConfigured = false;
    aiStatusChecked = true;
    setEngineStatus('Offline rules mode · start the local server for AI', 'offline');
  }
}
function localExtraction(description, selectedFamily) {
  const chosen = selectedFamily && selectedFamily !== 'auto' ? selectedFamily : 'other';
  const resolved = resolveFamily(chosen, description);
  const familyId = resolved.family;
  const detectedProperties = extractedProperties(description);
  return {
    provider: 'local-rules',
    extraction: {
      familyId,
      materialForm: '',
      composition: '',
      contaminants: [],
      statedSpecs: detectedProperties,
      mappedProperties: detectedProperties,
      missingInformation: ['composition assay', 'contamination results', 'verified processor capacity'],
      summary: familyId === 'other'
        ? 'The local material catalog could not confidently map this description.'
        : 'Local taxonomy mapped the description to ' + familyLabel(familyId) + '. No model was called.',
      confidence: 'low'
    }
  };
}
async function requestAIExtraction(description, selectedFamily, listingType) {
  return window.AetherisAuth.request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ description, selectedFamily: selectedFamily === 'auto' ? 'other' : selectedFamily, listingType })
  });
}
function scoreScreeningMatch(match) {
  const request = match.request;
  const offer = match.offer;
  let score = match.route ? 48 : 62;
  const required = request.requiredProperties?.length ? request.requiredProperties : extractedProperties(request.material);
  const coverage = required.length ? match.aligned.length / required.length : 0;
  score += Math.round(22 * coverage);
  const offerRegion = regionGroup(offer.location);
  const requestRegion = regionGroup(request.location);
  let regionReason = 'Region not provided';
  if (offer.location && request.location && offer.location.trim().toLowerCase() === request.location.trim().toLowerCase()) {
    score += 12;
    regionReason = 'Same listed location';
  } else if (offerRegion === requestRegion && offerRegion !== 'Other' && offerRegion !== 'Unspecified') {
    score += 8;
    regionReason = 'Same broad region; transport is not confirmed';
  } else if (offer.location && request.location) {
    regionReason = 'Different regions; transport feasibility is unknown';
  }
  if (offerRegion === 'Unspecified' || requestRegion === 'Unspecified') score += 2;
  let volumeReason = match.route ? 'Conversion yield unknown; quantities are not compared' : 'Volume not provided';
  if (!match.route && match.ratio !== null && match.ratio !== undefined) {
    score += match.ratio >= 1 ? 12 : 6;
    volumeReason = match.ratio >= 1 ? 'Listed direct volume covers the stated request' : 'Listed direct volume is below the stated request';
  }
  return {
    ...match,
    score: Math.max(0, Math.min(100, score)),
    reasons: [
      match.route ? 'A mapped process route connects these material families' : 'Direct material-family match',
      required.length ? match.aligned.length + ' of ' + required.length + ' stated spec tags align' : 'Buyer specifications are not detailed enough to compare',
      regionReason,
      volumeReason
    ]
  };
}
function matchLabel(score) {
  return score >= 76 ? 'Strong screening fit' : score >= 58 ? 'Partial screening fit' : 'Needs more information';
}
function renderExtraction(extraction, provider, note) {
  const familyName = familyLabel(extraction.familyId);
  const facts = [
    extraction.materialForm && ['Form', extraction.materialForm],
    extraction.composition && ['Composition stated', extraction.composition],
    extraction.contaminants?.length && ['Contaminants stated', extraction.contaminants.join(', ')],
    extraction.statedSpecs?.length && ['Specifications', extraction.statedSpecs.join(', ')]
  ].filter(Boolean);
  const missing = extraction.missingInformation?.length
    ? '<ul>' + extraction.missingInformation.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
    : '<p>No missing fields flagged; verify against the original listing.</p>';
  const factMarkup = facts.length
    ? facts.map(([label, value]) => '<div class="extracted-fact"><small>' + escapeHtml(label) + '</small><b>' + escapeHtml(value) + '</b></div>').join('')
    : '<div class="extracted-fact"><small>Detected family</small><b>' + escapeHtml(familyName) + '</b></div>';
  return '<div class="extraction-card"><div class="extraction-heading"><div><small>LISTING INTERPRETATION</small><h4>' + escapeHtml(familyName) + '</h4></div><span class="confidence-badge">Extraction confidence: ' + escapeHtml(extraction.confidence) + '</span></div><p>' + escapeHtml(extraction.summary || 'Material facts extracted for route screening.') + '</p><div class="extracted-facts">' + factMarkup + '</div><div class="extraction-missing"><b>Information to confirm</b>' + missing + '</div><small class="provider-note">' + escapeHtml(note || providerLabel(provider)) + '</small></div>';
}
function providerLabel(provider) {
  return provider === 'gemini-generate-content' ? 'Gemini structured extraction · route selection and match ranking remain grounded in the local graph.' : 'Rules-based offline extraction · no model was called.';
}
function renderMatchCards(matches) {
  if (!matches.length) return '<div class="no-match-card"><b>No compatible listing in this demo yet</b><p>Your material is mapped, but the exchange has no opposite-side listing on a direct or known processing route. Add the other side or use a broader description.</p></div>';
  return '<div class="candidate-grid">' + matches.slice(0, 5).map(match => {
    const counterparty = match.offer.type === lastAnalysis.role ? match.request : match.offer;
    const partner = match.offer.type === lastAnalysis.role ? match.offer : match.request;
    const typeLabel = counterparty.type === 'offer' ? 'Surplus offer' : 'Buyer request';
    const routeTitle = match.route ? match.route.process + ' → ' + match.route.industry : 'Direct material-family match';
    const action = match.route
      ? '<button class="candidate-action" data-open-route="' + escapeHtml(match.route.id) + '">Inspect pathway</button>'
      : '<button class="candidate-action" data-open-listing="' + escapeHtml(counterparty.id) + '">Open listing</button>';
    return '<article class="candidate-card"><div class="candidate-top"><span>' + escapeHtml(typeLabel) + '</span><b>' + match.score + '<small>/100 fit</small></b></div><h4>' + escapeHtml(partner.company || 'Demo organization') + '</h4><p>' + escapeHtml(familyLabel(counterparty.family)) + ' · ' + escapeHtml(counterparty.location || 'Region not listed') + '</p><div class="candidate-route">' + escapeHtml(routeTitle) + '</div><strong class="fit-label">' + escapeHtml(matchLabel(match.score)) + '</strong><ul>' + match.reasons.map(reason => '<li>' + escapeHtml(reason) + '</li>').join('') + '</ul><p class="candidate-warning">' + (match.route ? 'Processor availability, yield, cost and product qualification remain unknown.' : 'Confirm the buyer and seller specifications before treating this as a match.') + '</p>' + action + '</article>';
  }).join('') + '</div><p class="fit-disclaimer">Screening fit is a transparent rule score, not a probability, safety claim, or offer to transact.</p>';
}
function renderAnalysisResults(extraction, provider, matches, note) {
  const results = document.getElementById('analysisResults');
  results.innerHTML = '<div class="analysis-result-head"><div><p class="eyebrow">MATCH ANALYSIS</p><h3>' + matches.length + ' candidate ' + (matches.length === 1 ? 'path' : 'paths') + ' found</h3></div><span class="result-mode ' + (provider === 'gemini-generate-content' ? 'result-ai' : 'result-rules') + '">' + (provider === 'gemini-generate-content' ? 'AI assisted' : 'Offline rules') + '</span></div><div class="analysis-actions"><button id="saveAnalysisListing" class="button-outline small">Publish ' + (lastAnalysis.role === 'offer' ? 'surplus offer' : 'buyer request') + '</button><small>Published publicly under your organization.</small></div>' + renderExtraction(extraction, provider, note) + '<div class="candidate-results"><h4>Ranked marketplace candidates</h4>' + renderMatchCards(matches) + '</div>';
  results.querySelectorAll('[data-open-route]').forEach(button => button.addEventListener('click', () => {
    setGraphFilter('all');
    setGraphMode('network');
    selectRoute(button.dataset.openRoute);
    document.getElementById('discovery').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  results.querySelectorAll('[data-open-listing]').forEach(button => button.addEventListener('click', () => jumpToListing(button.dataset.openListing)));
  results.querySelector('#saveAnalysisListing')?.addEventListener('click', saveAnalysisListing);
}
async function analyzeMaterial() {
  const description = document.getElementById('analysisDescription').value.trim();
  const selectedFamily = document.getElementById('analysisFamily').value;
  const role = document.getElementById('analysisType').value;
  const amount = Number(document.getElementById('analysisAmount').value) || null;
  const unit = document.getElementById('analysisUnit').value;
  const region = document.getElementById('analysisRegion').value.trim();
  const button = document.getElementById('analyzeMaterial');
  const results = document.getElementById('analysisResults');
  if (description.length < 8) {
    results.innerHTML = '<p class="analysis-error">Add at least a short material description before analysis.</p>';
    document.getElementById('analysisDescription').focus();
    return;
  }
  button.disabled = true;
  button.textContent = 'Analyzing listing…';
  setPipeline('extract');
  results.innerHTML = '<p class="analysis-loading"><i></i> Extracting stated facts and preparing the local pathway search…</p>';
  let payload;
  let note = '';
  try {
    if (!aiStatusChecked) await checkAnalysisService();
    if (aiConfigured && window.AetherisAuth.isSignedIn()) payload = await requestAIExtraction(description, selectedFamily, role);
    else { payload = localExtraction(description, selectedFamily); if (aiConfigured) note = 'Sign in to enable Gemini extraction. Used local rules for this analysis.'; }
  } catch (error) {
    payload = localExtraction(description, selectedFamily);
    note = (error.message || 'AI is unavailable.') + ' Continued with local rules; no model result was used.';
    aiConfigured = false;
    setEngineStatus('AI unavailable · offline rules fallback active', 'offline');
  }
  setPipeline('retrieve', ['extract']);
  const explicitFamily = selectedFamily !== 'auto' && selectedFamily !== 'other' ? selectedFamily : '';
  const familyId = resolveFamily(explicitFamily || payload.extraction.familyId || 'other', description).family;
  const extraction = { ...payload.extraction, familyId };
  const extracted = [...new Set([...(payload.extraction.mappedProperties || []), ...extractedProperties(description)])];
  const proposed = {
    id: 'analysis-' + Date.now(),
    type: role,
    family: familyId,
    company: role === 'offer' ? 'Your surplus' : 'Your request',
    material: description,
    amount,
    unit,
    location: region,
    price: null,
    properties: [...new Set([...(familyProps[familyId] || []), ...extracted])],
    requiredProperties: extracted
  };
  lastAnalysis = { role, description, familyId, amount, unit, region, mappedProperties: extraction.mappedProperties || [], saved: false };
  const ranked = compatiblePairs(proposed).map(scoreScreeningMatch).sort((a, b) => b.score - a.score);
  setPipeline('rank', ['extract', 'retrieve']);
  renderAnalysisResults(extraction, payload.provider, ranked.slice(0, 5), note);
  setPipeline('qualify', ['extract', 'retrieve', 'rank']);
  requestAnimationFrame(() => setPipeline(null, ['extract', 'retrieve', 'rank', 'qualify']));
  button.disabled = false;
  button.textContent = 'Analyze & find matches';
}
async function saveAnalysisListing() {
  if (!lastAnalysis || lastAnalysis.saved) return;
  if (!window.AetherisAuth.require()) return;
  const item = {
    type: lastAnalysis.role, family: lastAnalysis.familyId, material: lastAnalysis.description,
    amount: lastAnalysis.amount, unit: lastAnalysis.unit, location: lastAnalysis.region, price: null,
    properties: [...new Set([...(familyProps[lastAnalysis.familyId] || []), ...lastAnalysis.mappedProperties])],
    requiredProperties: [...new Set(lastAnalysis.mappedProperties)]
  };
  const button = document.getElementById('saveAnalysisListing');
  if (button) { button.disabled = true; button.textContent = 'Publishing…'; }
  try {
    const response = await window.AetherisAuth.request('/api/listings', { method: 'POST', body: JSON.stringify(item) });
    listings.unshift(response.listing); lastAnalysis.saved = true;
    buildFilterOptions(); renderListings(); renderInspector(); renderRouteRail();
    if (button) button.textContent = 'Published to marketplace';
    toast('Listing published under your organization');
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = 'Publish listing'; }
    toast(error.message || 'Could not publish listing.');
  }
}
function renderRouteEvidence() {
  const panel = document.getElementById('inspectorEvidence');
  if (!panel) return;
  const entries = mapMode === 'farm' ? farmEvidence : (evidenceByRoute[selectedRouteId] || []);
  if (!entries.length) {
    panel.innerHTML = '<p class="eyebrow">ROUTE EVIDENCE</p><p class="evidence-caveat">No source record is attached to this pathway yet. Treat it as an unverified discovery hypothesis.</p>';
    return;
  }
  panel.innerHTML = '<p class="eyebrow">ROUTE EVIDENCE</p><p class="evidence-caveat">Sources support general process plausibility; they do not verify this feedstock, site, buyer, economics, or safety.</p><div class="evidence-links">' + entries.map(source => '<article><a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.title) + ' ↗</a><small>' + escapeHtml(source.publisher) + '</small><p>' + escapeHtml(source.note) + '</p></article>').join('') + '</div>';
}
function updateRoiEstimate() {
  const ids = ['roiInputTons', 'roiOutputTons', 'roiDisposalCost', 'roiInputValue', 'roiCosts'];
  const values = ids.map(id => document.getElementById(id).value);
  const output = document.getElementById('roiOutput');
  if (values.some(value => value === '')) {
    output.textContent = 'Enter all five values for an annual scenario estimate.';
    return;
  }
  const numbers = values.map(Number);
  if (numbers.some(value => !Number.isFinite(value) || value < 0)) {
    output.textContent = 'Use zero or a positive number for every input.';
    return;
  }
  const [sourceTons, outputTons, disposalCost, substituteValue, processingCost] = numbers;
  const annual = 12 * (sourceTons * disposalCost + outputTons * substituteValue - processingCost);
  output.innerHTML = '<span>Illustrative annual net opportunity</span><b>' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(annual) + '</b><small>Calculated only from your inputs; it is not a forecast, saving, or validated buyer price.</small>';
}
function initializeAnalysis() {
  populateAnalysisFamilies();
  checkAnalysisService();
  document.getElementById('analyzeMaterial').addEventListener('click', analyzeMaterial);
  window.addEventListener('aetheris:auth-changed', checkAnalysisService);
  document.getElementById('analysisDescription').addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') analyzeMaterial();
  });
  ['roiInputTons', 'roiOutputTons', 'roiDisposalCost', 'roiInputValue', 'roiCosts'].forEach(id => document.getElementById(id).addEventListener('input', updateRoiEstimate));
  const observer = new MutationObserver(renderRouteEvidence);
  observer.observe(document.getElementById('inspectorTitle'), { childList: true, characterData: true, subtree: true });
  observer.observe(document.getElementById('pathKind'), { childList: true, characterData: true, subtree: true });
  renderRouteEvidence();
}
initializeAnalysis();