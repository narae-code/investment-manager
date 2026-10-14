// GitHub Pages runs this code in the browser. Only a Supabase publishable (anon) key belongs here.
const SUPABASE_URL = 'https://datvpasbuccpxdgnfxbr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CSAfzzK5Sba3vREb3aF9kA_cz6kEZSC';
const supabaseReady = SUPABASE_PUBLISHABLE_KEY !== 'PASTE_SUPABASE_PUBLISHABLE_KEY_HERE'
  && Boolean(window.supabase?.createClient);
const supabaseClient = supabaseReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const storageKey = 'vibe-coding-investments';
function readLegacyInvestments() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidInvestment).map(normalizeInvestment) : [];
  } catch { return []; }
}

const investments = [];
let currentUser = null;
let searchTerm = '';
let editingIndex = null;
let legacyInvestments = [];
let investmentSubscription = null;

function normalizeInvestment(item) {
  return {
    id: item.id ?? null, name: String(item.name).trim(), category: item.category, region: item.region,
    amount: Number(item.amount), opb: Number(item.opb), returnRate: Number(item.returnRate ?? item.return_rate),
    maturity: String(item.maturity ?? item.maturity_date).slice(0, 10), color: item.color || 'a',
  };
}

function isValidInvestment(item) {
  return item && typeof item.name === 'string' && typeof item.category === 'string' && typeof item.region === 'string'
    && Number.isFinite(Number(item.amount)) && Number.isFinite(Number(item.opb))
    && Number.isFinite(Number(item.returnRate ?? item.return_rate)) && /^\d{4}-\d{2}-\d{2}$/.test(String(item.maturity ?? item.maturity_date));
}

function toDatabaseRow(item) {
  return { name: item.name, category: item.category, region: item.region, amount: item.amount, opb: item.opb, return_rate: item.returnRate, maturity_date: item.maturity };
}

function setAppEnabled(enabled) {
  document.querySelector('.app-shell').inert = !enabled;
  document.querySelector('.app-shell').setAttribute('aria-hidden', String(!enabled));
}

function setAuthMessage(message, isError = false) {
  const element = document.querySelector('#auth-message');
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function showAuthGate(message = '') {
  currentUser = null;
  investments.splice(0, investments.length);
  setAppEnabled(false);
  document.querySelector('#auth-gate').hidden = false;
  document.querySelector('#migration-gate').hidden = true;
  document.querySelector('#profile-name').textContent = '로그인 안 됨';
  document.querySelector('#profile-email').textContent = 'Supabase 계정';
  renderSummary(); renderInvestments(); renderAllocation();
  setAuthMessage(message);
}

async function loadInvestments() {
  if (!currentUser) return;
  const { data, error } = await supabaseClient.from('investments').select('id,name,category,region,amount,opb,return_rate,maturity_date').order('created_at', { ascending: false });
  if (error) throw error;
  investments.splice(0, investments.length, ...(data || []).map(normalizeInvestment));
  renderSummary(); renderInvestments(); renderAllocation();
}

async function insertInvestments(items) {
  if (!currentUser) throw new Error('로그인이 필요합니다.');
  if (!items.length) return [];
  const { data, error } = await supabaseClient.from('investments').insert(items.map(toDatabaseRow)).select('id,name,category,region,amount,opb,return_rate,maturity_date');
  if (error) throw error;
  return (data || []).map(normalizeInvestment);
}

function displayError(error) {
  const message = error?.message || '요청을 완료하지 못했습니다.';
  if (/relation .* does not exist|Could not find the table/i.test(message)) return 'Supabase에 테이블이 없습니다. 제공한 supabase-setup.sql을 먼저 실행해 주세요.';
  if (/Invalid API key|apikey/i.test(message)) return 'Publishable Key 설정을 확인해 주세요.';
  if (/row-level security|permission denied/i.test(message)) return '데이터베이스 권한 또는 RLS 정책을 확인해 주세요.';
  return message;
}

const chartColors = ['#577bd5', '#42a69a', '#8b73d2', '#d8a04f', '#ce7186', '#71869c'];
const numberFormat = new Intl.NumberFormat('ko-KR');
const money = (value) => `${numberFormat.format(value)}<small>억원</small>`;
const percent = (value) => `${Number(value).toFixed(2)}%`;

function renderSummary() {
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalOpb = investments.reduce((sum, item) => sum + item.opb, 0);
  const averageReturn = investments.length ? investments.reduce((sum, item) => sum + item.returnRate, 0) / investments.length : 0;

  document.querySelector('#total-investment').innerHTML = money(totalInvestment);
  document.querySelector('#total-opb').innerHTML = money(totalOpb);
  document.querySelector('#investment-count').innerHTML = `${investments.length}<small>건</small>`;
  document.querySelector('#average-return').innerHTML = percent(averageReturn);
  document.querySelector('#chart-total').textContent = `${numberFormat.format(totalInvestment)}억`;
  document.querySelector('#record-count').textContent = investments.length;
  document.querySelector('#footer-count').textContent = investments.length;

  const ratio = totalInvestment ? totalOpb / totalInvestment * 100 : 0;
  document.querySelector('#opb-ratio').textContent = percent(ratio);
  document.querySelector('#ratio-fill').style.width = `${ratio}%`;
  document.querySelector('#ratio-detail').textContent = `${numberFormat.format(totalOpb)}억 / ${numberFormat.format(totalInvestment)}억`;

  const highestReturn = investments.length ? investments.reduce((best, item) => item.returnRate > best.returnRate ? item : best) : null;
  const nearestMaturity = investments.length ? investments.reduce((nearest, item) => item.maturity < nearest.maturity ? item : nearest) : null;
  document.querySelector('#top-return-name').textContent = highestReturn?.name || '—';
  document.querySelector('#top-return-value').textContent = highestReturn ? percent(highestReturn.returnRate) : '—';
  document.querySelector('#nearest-maturity-name').textContent = nearestMaturity?.name || '—';
  document.querySelector('#nearest-maturity-date').textContent = nearestMaturity ? nearestMaturity.maturity.replaceAll('-', '.') : '—';
}

function renderInvestments() {
  const visibleInvestments = investments.map((item, index) => ({ item, index }))
    .filter(({ item }) => item.name.toLocaleLowerCase('ko-KR').includes(searchTerm.trim().toLocaleLowerCase('ko-KR')))
  const rows = visibleInvestments.map(({ item, index }) => `
    <tr>
      <td><span class="project-name"><span class="project-initial ${item.color}">${escapeHtml(item.name[0])}</span>${escapeHtml(item.name)}</span></td>
      <td><span class="category-pill">${escapeHtml(item.category)}</span></td>
      <td>${escapeHtml(item.region)}</td>
      <td class="numeric amount">${numberFormat.format(item.amount)}억</td>
      <td class="numeric amount">${numberFormat.format(item.opb)}억</td>
      <td class="numeric return-value">${percent(item.returnRate)}</td>
      <td class="date-cell">${item.maturity.replaceAll('-', '.')}</td>
      <td class="row-action"><button class="edit-investment-button" type="button" data-investment-id="${escapeHtml(item.id ?? '')}" data-investment-index="${index}" aria-label="${escapeHtml(item.name)} 투자건 수정">수정</button><button class="delete-investment-button" type="button" data-investment-id="${escapeHtml(item.id ?? '')}" data-investment-index="${index}" aria-label="${escapeHtml(item.name)} 투자건 삭제">삭제</button></td>
    </tr>`).join('');
  document.querySelector('#investment-rows').innerHTML = rows;
  document.querySelectorAll('.edit-investment-button').forEach((button) => {
    button.addEventListener('click', () => openEditDialog(Number(button.dataset.investmentIndex)));
  });
  document.querySelectorAll('.delete-investment-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.investmentIndex);
      if (!Number.isInteger(index) || index < 0 || index >= investments.length) return;
      if (!window.confirm(`${investments[index].name} 투자건을 삭제할까요?`)) return;
      const item = investments[index];
      try {
        const { error } = await supabaseClient.from('investments').delete().eq('id', item.id);
        if (error) throw error;
        investments.splice(index, 1); renderSummary(); renderInvestments(); renderAllocation();
      } catch (error) { window.alert(`삭제하지 못했습니다: ${displayError(error)}`); }
    });
  });

  const totalInvestment = visibleInvestments.reduce((sum, { item }) => sum + item.amount, 0);
  const totalOpb = visibleInvestments.reduce((sum, { item }) => sum + item.opb, 0);
  const averageReturn = visibleInvestments.length
    ? visibleInvestments.reduce((sum, { item }) => sum + item.returnRate, 0) / visibleInvestments.length
    : null;
  document.querySelector('#record-count').textContent = visibleInvestments.length;
  document.querySelector('#footer-count').textContent = visibleInvestments.length;
  document.querySelector('#investment-total-row').innerHTML = `<tr><td colspan="3">합계</td><td class="numeric">${numberFormat.format(totalInvestment)}억</td><td class="numeric">${numberFormat.format(totalOpb)}억</td><td class="numeric">${averageReturn === null ? '—' : percent(averageReturn)}</td><td class="numeric">—</td><td>—</td></tr>`;
}

function renderDonut(groupKey, chartId, legendId, totalId, label) {
  const totals = investments.reduce((groups, item) => {
    groups[item[groupKey]] = (groups[item[groupKey]] || 0) + item.amount;
    return groups;
  }, {});
  const entries = Object.entries(totals);
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const chart = document.querySelector(chartId);
  const circumference = 2 * Math.PI * 48;
  let offset = 0;
  chart.innerHTML = totalInvestment ? `<svg viewBox="0 0 120 120" aria-hidden="true">${entries.map(([name, amount], index) => {
    const length = amount / totalInvestment * circumference;
    const segment = `<circle class="donut-slice" cx="60" cy="60" r="48" fill="none" stroke="${chartColors[index % chartColors.length]}" stroke-width="20" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"><title>${escapeHtml(name)}: ${numberFormat.format(amount)}억</title></circle>`;
    offset += length;
    return segment;
  }).join('')}</svg>` : '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="#e9edf2" stroke-width="20" /></svg>';
  chart.setAttribute('aria-label', `${label}: ${entries.map(([name, amount]) => `${name} ${numberFormat.format(amount)}억원`).join(', ') || '데이터 없음'}`);
  document.querySelector(totalId).textContent = `${numberFormat.format(totalInvestment)}억`;
  document.querySelector(legendId).innerHTML = entries.map(([name, amount], index) => `
    <span class="legend-item"><i class="legend-swatch" style="background:${chartColors[index % chartColors.length]}"></i>${escapeHtml(name)}<strong>${totalInvestment ? Math.round(amount / totalInvestment * 100) : 0}%</strong></span>`).join('');
}

function renderAllocation() {
  renderDonut('category', '#donut-chart', '#chart-legend', '#chart-total', '자산분류별 투자금액');
  renderDonut('region', '#region-donut-chart', '#region-chart-legend', '#region-chart-total', '투자지역별 투자금액');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const today = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
document.querySelector('#today').textContent = today;
document.querySelector('#data-as-of').textContent = today;

document.querySelector('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseReady) { setAuthMessage('app.js에 Supabase Publishable Key를 설정해 주세요. Secret key는 입력하지 마세요.', true); return; }
  const form = event.currentTarget;
  const button = document.querySelector('#sign-in-button');
  button.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: form.elements.email.value.trim(), password: form.elements.password.value });
    if (error) throw error;
    setAuthMessage('로그인 중…');
  } catch (error) { setAuthMessage(displayError(error), true); }
  finally { button.disabled = false; }
});
document.querySelector('#sign-out-button').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) window.alert(`로그아웃하지 못했습니다: ${displayError(error)}`);
});

async function showSignedInApp(user) {
  currentUser = user;
  document.querySelector('#profile-name').textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자';
  document.querySelector('#profile-email').textContent = user.email || '';
  document.querySelector('#profile-avatar').textContent = (user.email || '?').slice(0, 1).toLocaleUpperCase('ko-KR');
  try {
    await loadInvestments();
    if (investmentSubscription) await supabaseClient.removeChannel(investmentSubscription);
    investmentSubscription = supabaseClient.channel('shared-investments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => {
        if (currentUser?.id === user.id) loadInvestments().catch((error) => console.error('투자 목록 새로고침 실패:', error));
      }).subscribe();
    document.querySelector('#auth-gate').hidden = true;
    setAppEnabled(true);
    legacyInvestments = readLegacyInvestments();
    const importedKey = `vibe-coding-investments-imported:${user.id}`;
    if (legacyInvestments.length && !localStorage.getItem(importedKey)) {
      const existingNames = new Set(investments.map((item) => normalizeInvestmentName(item.name)));
      const candidates = legacyInvestments.filter((item) => !existingNames.has(normalizeInvestmentName(item.name)));
      document.querySelector('#migration-preview').innerHTML = `<p>브라우저 저장 데이터 ${legacyInvestments.length}건 · 현재 계정에 없는 이름 ${candidates.length}건</p><ul>${legacyInvestments.map((item) => `<li>${escapeHtml(item.name)} · ${numberFormat.format(item.amount)}억원${existingNames.has(normalizeInvestmentName(item.name)) ? ' (중복 예정)' : ''}</li>`).join('')}</ul>`;
      document.querySelector('#migration-gate').hidden = false;
      document.querySelector('#migration-confirm-checkbox').checked = false;
      document.querySelector('#migration-import-button').disabled = true;
      document.querySelector('#migration-message').textContent = '';
    }
  } catch (error) { showAuthGate(displayError(error)); }
}

document.querySelector('#migration-confirm-checkbox').addEventListener('change', (event) => {
  document.querySelector('#migration-import-button').disabled = !event.target.checked;
});
document.querySelector('#migration-skip-button').addEventListener('click', () => { document.querySelector('#migration-gate').hidden = true; });
document.querySelector('#migration-import-button').addEventListener('click', async () => {
  const button = document.querySelector('#migration-import-button');
  button.disabled = true;
  try {
    const existingNames = new Set(investments.map((item) => normalizeInvestmentName(item.name)));
    const candidates = legacyInvestments.filter((item) => !existingNames.has(normalizeInvestmentName(item.name)));
    const inserted = await insertInvestments(candidates);
    investments.unshift(...inserted);
    localStorage.setItem(`vibe-coding-investments-imported:${currentUser.id}`, new Date().toISOString());
    renderSummary(); renderInvestments(); renderAllocation();
    document.querySelector('#migration-message').textContent = `${inserted.length}건을 가져왔습니다. 기존 브라우저 데이터는 그대로 보존됩니다.`;
    window.setTimeout(() => { document.querySelector('#migration-gate').hidden = true; }, 1800);
  } catch (error) {
    document.querySelector('#migration-message').textContent = displayError(error);
    button.disabled = !document.querySelector('#migration-confirm-checkbox').checked;
  }
});

if (!supabaseReady) setAuthMessage('Supabase Publishable Key 설정이 필요합니다. app.js의 SUPABASE_PUBLISHABLE_KEY를 설정해 주세요.', true);
else {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) window.setTimeout(() => showSignedInApp(session.user), 0);
    else {
      if (investmentSubscription) supabaseClient.removeChannel(investmentSubscription);
      investmentSubscription = null;
      showAuthGate();
    }
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) showAuthGate(displayError(error));
    else if (data.session?.user) showSignedInApp(data.session.user);
    else showAuthGate();
  }).catch((error) => showAuthGate(displayError(error)));
}

setAppEnabled(false);
renderSummary();
renderInvestments();
renderAllocation();

document.querySelector('#investment-search').addEventListener('input', (event) => {
  searchTerm = event.target.value;
  renderInvestments();
});

const dialog = document.querySelector('#investment-dialog');
const form = document.querySelector('#investment-form');
const opbInput = document.querySelector('#investment-opb');
const amountInput = document.querySelector('#investment-amount');
const maturityInput = document.querySelector('#investment-maturity');
const returnInput = document.querySelector('#investment-return');
maturityInput.addEventListener('input', () => {
  const digits = maturityInput.value.replace(/\D/g, '').slice(0, 8);
  maturityInput.value = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}${digits.length > 6 ? `-${digits.slice(6)}` : ''}` : digits;
});
maturityInput.addEventListener('blur', () => {
  const digits = maturityInput.value.replace(/\D/g, '');
  if (digits.length === 8) {
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    maturityInput.setCustomValidity(valid ? '' : '유효한 날짜를 YYYYMMDD 형식으로 입력해 주세요.');
  } else {
    maturityInput.setCustomValidity(digits.length === 0 ? '만기일을 입력해 주세요.' : '만기일은 YYYYMMDD 형식의 숫자 8자리로 입력해 주세요.');
  }
});

function validateOpb() {
  const amount = Number(amountInput.value);
  const opb = Number(opbInput.value);
  opbInput.setCustomValidity(opbInput.value && amountInput.value && opb > amount ? 'OPB는 투자금액보다 클 수 없습니다.' : '');
}

amountInput.addEventListener('input', validateOpb);
maturityInput.addEventListener('input', () => maturityInput.setCustomValidity(''));
opbInput.addEventListener('input', validateOpb);
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

function openEditDialog(index) {
  if (!Number.isInteger(index) || index < 0 || index >= investments.length) return;
  editingIndex = index;
  const item = investments[index];
  form.elements.name.value = item.name;
  form.elements.category.value = item.category;
  form.elements.region.value = item.region;
  form.elements.amount.value = item.amount;
  form.elements.opb.value = item.opb;
  form.elements.returnRate.value = Number(item.returnRate).toFixed(2);
  form.elements.maturity.value = item.maturity;
  document.querySelector('#dialog-title').textContent = '투자건 수정';
  document.querySelector('.dialog-heading .eyebrow').textContent = 'EDIT INVESTMENT';
  document.querySelector('.dialog-heading p').textContent = '투자자산 정보를 확인하고 수정해 주세요.';
  document.querySelector('.submit-button').textContent = '저장';
  dialog.showModal();
}

function resetInvestmentForm() {
  editingIndex = null;
  form.reset();
  opbInput.setCustomValidity('');
  maturityInput.setCustomValidity('');
  document.querySelector('#dialog-title').textContent = '투자건 등록';
  document.querySelector('.dialog-heading .eyebrow').textContent = 'NEW INVESTMENT';
  document.querySelector('.dialog-heading p').textContent = '새로운 투자자산 정보를 입력해 주세요.';
  document.querySelector('.submit-button').textContent = '등록';
}

document.querySelector('#open-investment-modal').addEventListener('click', () => {
  resetInvestmentForm();
  dialog.showModal();
});
document.querySelector('#close-investment-modal').addEventListener('click', resetInvestmentForm);
document.querySelector('#cancel-investment').addEventListener('click', resetInvestmentForm);
dialog.addEventListener('close', resetInvestmentForm);
dialog.addEventListener('cancel', resetInvestmentForm);

returnInput.addEventListener('blur', () => {
  if (returnInput.value && Number.isFinite(Number(returnInput.value))) {
    returnInput.value = Number(returnInput.value).toFixed(2);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  validateOpb();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const updatedInvestment = {
    id: editingIndex === null ? null : investments[editingIndex].id,
    name: formData.get('name').trim(), category: formData.get('category'), region: formData.get('region'),
    amount: Number(formData.get('amount')), opb: Number(formData.get('opb')),
    returnRate: Number(Number(formData.get('returnRate')).toFixed(2)), maturity: formData.get('maturity'),
    color: editingIndex === null ? String.fromCharCode(97 + investments.length % 4) : investments[editingIndex].color,
  };
  const submitButton = form.querySelector('.submit-button');
  submitButton.disabled = true;
  try {
    if (editingIndex === null) {
      const [created] = await insertInvestments([updatedInvestment]);
      investments.unshift(created);
    } else {
      const { data, error } = await supabaseClient.from('investments').update(toDatabaseRow(updatedInvestment)).eq('id', updatedInvestment.id).select('id,name,category,region,amount,opb,return_rate,maturity_date').single();
      if (error) throw error;
      investments[editingIndex] = normalizeInvestment(data);
    }
    renderSummary(); renderInvestments(); renderAllocation();
    resetInvestmentForm(); dialog.close();
  } catch (error) { window.alert(`저장하지 못했습니다: ${displayError(error)}`); }
  finally { submitButton.disabled = false; }
});

const excelFileInput = document.querySelector('#excel-file-input');
const excelResult = document.querySelector('#excel-result');
document.querySelector('#excel-upload-button').addEventListener('click', () => excelFileInput.click());
excelFileInput.addEventListener('change', async () => {
  const file = excelFileInput.files?.[0];
  excelFileInput.value = '';
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) {
    showExcelResult({ total: 0, added: 0, duplicates: 0, errors: ['.xlsx 파일을 선택해 주세요.'] });
    return;
  }
  if (!window.XLSX) {
    showExcelResult({ total: 0, added: 0, duplicates: 0, errors: ['Excel 처리 모듈을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'] });
    return;
  }
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel 파일에 시트가 없습니다.');
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: null, blankrows: false });
    const dataRows = rows.slice(1).map((cells, index) => ({ cells, rowNumber: index + 2 }))
      .filter(({ cells }) => cells.some((cell) => cell !== null && String(cell).trim() !== ''));
    const outcome = { total: dataRows.length, added: 0, duplicates: 0, errors: [] };
    const knownNames = new Set(investments.map(({ name }) => normalizeInvestmentName(name)));
    const additions = [];
    const categories = new Set(['부동산', 'SOC', '선박·항공기', '유동화', '상품·파생', '기타']);
    const regions = new Set(['국내', '북미', '중남미', '아시아', '유럽', '오세아니아', '중동']);
    dataRows.forEach(({ cells, rowNumber }) => {
      const [nameCell, categoryCell, regionCell, amountCell, opbCell, returnCell, maturityCell] = cells;
      const name = String(nameCell ?? '').trim();
      const category = String(categoryCell ?? '').trim();
      const region = String(regionCell ?? '').trim();
      const amount = parseExcelNumber(amountCell);
      const opb = parseExcelNumber(opbCell);
      const returnRate = parseExcelNumber(returnCell);
      const maturity = parseExcelDate(maturityCell);
      const issues = [];
      if (!name) issues.push('투자건명');
      if (!categories.has(category)) issues.push('자산분류');
      if (!regions.has(region)) issues.push('투자지역');
      if (amount === null || amount < 0) issues.push('투자금액(0 이상의 숫자)');
      if (opb === null || opb < 0) issues.push('OPB(0 이상의 숫자)');
      else if (amount !== null && opb > amount) issues.push('OPB(투자금액 이하)');
      if (returnRate === null) issues.push('수익률(숫자)');
      if (!maturity) issues.push('만기일(유효한 YYYY-MM-DD 날짜)');
      if (issues.length) {
        outcome.errors.push(`${rowNumber}행: ${issues.join(', ')} 항목을 확인해 주세요.`);
        return;
      }
      const normalizedName = normalizeInvestmentName(name);
      if (knownNames.has(normalizedName)) {
        outcome.duplicates += 1;
        return;
      }
      knownNames.add(normalizedName);
      additions.push({ name, category, region, amount, opb, returnRate: Number(returnRate.toFixed(2)), maturity, color: String.fromCharCode(97 + (investments.length + additions.length) % 4) });
    });
    outcome.added = additions.length;
    if (additions.length) {
      try {
        const inserted = await insertInvestments(additions);
        investments.unshift(...inserted);
        outcome.added = inserted.length;
      } catch (error) {
        outcome.added = 0;
        outcome.errors.push(`Supabase 저장 실패: ${displayError(error)}`);
      }
    }
    if (outcome.added) {
      renderSummary();
      renderInvestments();
      renderAllocation();
    }
    showExcelResult(outcome);
  } catch (error) {
    showExcelResult({ total: 0, added: 0, duplicates: 0, errors: [`파일을 읽지 못했습니다: ${error.message || '파일 형식을 확인해 주세요.'}`] });
  }
});

document.querySelector('#excel-download-button').addEventListener('click', () => {
  if (!window.XLSX) {
    showExcelResult({ total: 0, added: 0, duplicates: 0, errors: ['Excel 처리 모듈을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'] });
    return;
  }
  const data = [
    ['투자건명', '자산분류', '투자지역', '투자금액', 'OPB', '수익률', '만기일'],
    ...investments.map(({ name, category, region, amount, opb, returnRate, maturity }) => [name, category, region, amount, opb, Number(returnRate).toFixed(2), maturity]),
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, sheet, '투자건');
  XLSX.writeFile(workbook, `투자포트폴리오_${new Date().toISOString().slice(0, 10)}.xlsx`);
});

function normalizeInvestmentName(name) {
  return String(name).trim().toLocaleLowerCase('ko-KR');
}

function parseExcelNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const normalized = String(value).replace(/[,%\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseExcelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && window.XLSX) {
    const parts = XLSX.SSF.parse_date_code(value);
    if (parts) return formatExcelDate(parts.y, parts.m, parts.d);
  }
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function formatExcelDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function showExcelResult({ total, added, duplicates, errors }) {
  excelResult.hidden = false;
  excelResult.innerHTML = `<div class="excel-result-heading"><strong>Excel 처리 결과</strong><button type="button" class="excel-result-close" aria-label="결과 닫기">×</button></div><p>총 업로드 행 수 <strong>${total}</strong> · 정상 추가 <strong>${added}</strong> · 중복 건너뜀 <strong>${duplicates}</strong> · 오류 <strong>${errors.length}</strong></p>${errors.length ? `<ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}`;
  excelResult.querySelector('.excel-result-close').addEventListener('click', () => { excelResult.hidden = true; });
}
