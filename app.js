const investments = [
  { name: 'A사업', category: '부동산', region: '국내', amount: 300, opb: 250, returnRate: 5.2, maturity: '2028-12-31', color: 'a' },
  { name: 'B사업', category: 'SOC', region: '국내', amount: 200, opb: 180, returnRate: 4.8, maturity: '2030-06-30', color: 'b' },
  { name: 'C사업', category: '선박·항공기', region: '유럽', amount: 150, opb: 120, returnRate: 6.1, maturity: '2027-09-30', color: 'c' },
  { name: 'D사업', category: '유동화', region: '북미', amount: 100, opb: 80, returnRate: 5.7, maturity: '2029-03-31', color: 'd' },
];

const chartColors = ['#577bd5', '#42a69a', '#8b73d2', '#d8a04f'];
const numberFormat = new Intl.NumberFormat('ko-KR');
const money = (value) => `${numberFormat.format(value)}<small>억원</small>`;
const percent = (value) => `${value.toFixed(1)}%`;

function renderSummary() {
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalOpb = investments.reduce((sum, item) => sum + item.opb, 0);
  const averageReturn = investments.reduce((sum, item) => sum + item.returnRate, 0) / investments.length;

  document.querySelector('#total-investment').innerHTML = money(totalInvestment);
  document.querySelector('#total-opb').innerHTML = money(totalOpb);
  document.querySelector('#investment-count').innerHTML = `${investments.length}<small>건</small>`;
  document.querySelector('#average-return').innerHTML = percent(averageReturn);
  document.querySelector('#chart-total').textContent = `${numberFormat.format(totalInvestment)}억`;
  document.querySelector('#record-count').textContent = investments.length;
  document.querySelector('#footer-count').textContent = investments.length;

  const ratio = totalOpb / totalInvestment * 100;
  document.querySelector('#opb-ratio').textContent = percent(ratio);
  document.querySelector('#ratio-fill').style.width = `${ratio}%`;
  document.querySelector('#ratio-detail').textContent = `${numberFormat.format(totalOpb)}억 / ${numberFormat.format(totalInvestment)}억`;

  const highestReturn = investments.reduce((best, item) => item.returnRate > best.returnRate ? item : best);
  const nearestMaturity = investments.reduce((nearest, item) => item.maturity < nearest.maturity ? item : nearest);
  document.querySelector('#top-return-name').textContent = highestReturn.name;
  document.querySelector('#top-return-value').textContent = percent(highestReturn.returnRate);
  document.querySelector('#nearest-maturity-name').textContent = nearestMaturity.name;
  document.querySelector('#nearest-maturity-date').textContent = nearestMaturity.maturity.replaceAll('-', '.');
}

function renderInvestments() {
  const rows = investments.map((item) => `
    <tr>
      <td><span class="project-name"><span class="project-initial ${item.color}">${item.name[0]}</span>${item.name}</span></td>
      <td><span class="category-pill">${item.category}</span></td>
      <td>${item.region}</td>
      <td class="numeric amount">${numberFormat.format(item.amount)}억</td>
      <td class="numeric amount">${numberFormat.format(item.opb)}억</td>
      <td class="numeric return-value">${percent(item.returnRate)}</td>
      <td class="date-cell">${item.maturity.replaceAll('-', '.')}</td>
    </tr>`).join('');
  document.querySelector('#investment-rows').innerHTML = rows;

  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalOpb = investments.reduce((sum, item) => sum + item.opb, 0);
  document.querySelector('#investment-total-row').innerHTML = `<tr><td colspan="3">합계</td><td class="numeric">${numberFormat.format(totalInvestment)}억</td><td class="numeric">${numberFormat.format(totalOpb)}억</td><td class="numeric">—</td><td>—</td></tr>`;
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

const today = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
document.querySelector('#today').textContent = today;
document.querySelector('#data-as-of').textContent = today;
renderSummary();
renderInvestments();
renderAllocation();
