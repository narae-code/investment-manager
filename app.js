const defaultInvestments = [
  { name: 'A사업', category: '부동산', region: '국내', amount: 300, opb: 250, returnRate: 5.2, maturity: '2028-12-31', color: 'a' },
  { name: 'B사업', category: 'SOC', region: '국내', amount: 200, opb: 180, returnRate: 4.8, maturity: '2030-06-30', color: 'b' },
  { name: 'C사업', category: '선박·항공기', region: '유럽', amount: 150, opb: 120, returnRate: 6.1, maturity: '2027-09-30', color: 'c' },
  { name: 'D사업', category: '유동화', region: '북미', amount: 100, opb: 80, returnRate: 5.7, maturity: '2029-03-31', color: 'd' },
];

const storageKey = 'vibe-coding-investments';
function loadInvestments() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) {
      localStorage.setItem(storageKey, JSON.stringify(defaultInvestments));
      return defaultInvestments.map((item) => ({ ...item }));
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaultInvestments.map((item) => ({ ...item }));
  } catch {
    return defaultInvestments.map((item) => ({ ...item }));
  }
}

const investments = loadInvestments();
function saveInvestments() {
  localStorage.setItem(storageKey, JSON.stringify(investments));
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
  const rows = investments.map((item, index) => `
    <tr>
      <td><span class="project-name"><span class="project-initial ${item.color}">${escapeHtml(item.name[0])}</span>${escapeHtml(item.name)}</span></td>
      <td><span class="category-pill">${escapeHtml(item.category)}</span></td>
      <td>${escapeHtml(item.region)}</td>
      <td class="numeric amount">${numberFormat.format(item.amount)}억</td>
      <td class="numeric amount">${numberFormat.format(item.opb)}억</td>
      <td class="numeric return-value">${percent(item.returnRate)}</td>
      <td class="date-cell">${item.maturity.replaceAll('-', '.')}</td>
      <td class="row-action"><button class="delete-investment-button" type="button" data-investment-index="${index}" aria-label="${escapeHtml(item.name)} 투자건 삭제">삭제</button></td>
    </tr>`).join('');
  document.querySelector('#investment-rows').innerHTML = rows;
  document.querySelectorAll('.delete-investment-button').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.investmentIndex);
      if (!Number.isInteger(index) || index < 0 || index >= investments.length) return;
      if (!window.confirm(`${investments[index].name} 투자건을 삭제할까요?`)) return;
      investments.splice(index, 1);
      saveInvestments();
      renderSummary();
      renderInvestments();
      renderAllocation();
    });
  });

  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalOpb = investments.reduce((sum, item) => sum + item.opb, 0);
  document.querySelector('#investment-total-row').innerHTML = `<tr><td colspan="4">합계</td><td class="numeric">${numberFormat.format(totalInvestment)}억</td><td class="numeric">${numberFormat.format(totalOpb)}억</td><td class="numeric">—</td><td>—</td></tr>`;
}

function renderAllocation() {
  const totals = investments.reduce((categories, item) => {
    categories[item.category] = (categories[item.category] || 0) + item.amount;
    return categories;
  }, {});
  const entries = Object.entries(totals);
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  let angle = 0;
  const slices = entries.map(([, amount], index) => {
    const end = angle + amount / totalInvestment * 360;
    const slice = `${chartColors[index]} ${angle}deg ${end}deg`;
    angle = end;
    return slice;
  });

  const chart = document.querySelector('#donut-chart');
  chart.style.background = `conic-gradient(${slices.join(', ')})`;
  chart.setAttribute('aria-label', entries.map(([category, amount]) => `${category} ${numberFormat.format(amount)}억원`).join(', '));
  document.querySelector('#chart-legend').innerHTML = entries.map(([category, amount], index) => `
    <span class="legend-item"><i class="legend-swatch" style="background:${chartColors[index]}"></i>${category}<strong>${Math.round(amount / totalInvestment * 100)}%</strong></span>`).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const today = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
document.querySelector('#today').textContent = today;
document.querySelector('#data-as-of').textContent = today;
renderSummary();
renderInvestments();
renderAllocation();

const dialog = document.querySelector('#investment-dialog');
const form = document.querySelector('#investment-form');
const opbInput = document.querySelector('#investment-opb');
const amountInput = document.querySelector('#investment-amount');
const maturityInput = document.querySelector('#investment-maturity');
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

document.querySelector('#open-investment-modal').addEventListener('click', () => dialog.showModal());
document.querySelector('#close-investment-modal').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-investment').addEventListener('click', () => dialog.close());

function validateOpb() {
  const amount = Number(amountInput.value);
  const opb = Number(opbInput.value);
  opbInput.setCustomValidity(opbInput.value && amountInput.value && opb > amount ? 'OPB는 투자금액보다 클 수 없습니다.' : '');
}

amountInput.addEventListener('input', validateOpb);
maturityInput.addEventListener('input', () => maturityInput.setCustomValidity(''));
opbInput.addEventListener('input', validateOpb);
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

form.addEventListener('submit', (event) => {
  event.preventDefault();
  validateOpb();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  investments.push({
    name: formData.get('name').trim(), category: formData.get('category'), region: formData.get('region'),
    amount: Number(formData.get('amount')), opb: Number(formData.get('opb')),
    returnRate: Number(formData.get('returnRate')), maturity: formData.get('maturity'),
    color: String.fromCharCode(97 + investments.length % 4),
  });
  saveInvestments();
  renderSummary();
  renderInvestments();
  renderAllocation();
  form.reset();
  dialog.close();
});
