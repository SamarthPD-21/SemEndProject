const KEY = 'ca01b1de8b434edbae77f259a054ef6a';
const URL = `https://openexchangerates.org/api/latest.json?app_id=${KEY}`;

const data = {
    USD: { name: "United States", flag: "🇺🇸", currencyName: "US Dollar" },
    EUR: { name: "European Union", flag: "🇪🇺", currencyName: "Euro" },
    GBP: { name: "United Kingdom", flag: "🇬🇧", currencyName: "British Pound" },
    JPY: { name: "Japan", flag: "🇯🇵", currencyName: "Japanese Yen" },
    AUD: { name: "Australia", flag: "🇦🇺", currencyName: "Australian Dollar" },
    CAD: { name: "Canada", flag: "🇨🇦", currencyName: "Canadian Dollar" },
    CHF: { name: "Switzerland", flag: "🇨🇭", currencyName: "Swiss Franc" },
    CNY: { name: "China", flag: "🇨🇳", currencyName: "Chinese Yuan" },
    INR: { name: "India", flag: "🇮🇳", currencyName: "Indian Rupee" },
    NZD: { name: "New Zealand", flag: "🇳🇿", currencyName: "New Zealand Dollar" },
    BRL: { name: "Brazil", flag: "🇧🇷", currencyName: "Brazilian Real" },
    RUB: { name: "Russia", flag: "🇷🇺", currencyName: "Russian Ruble" },
    KRW: { name: "South Korea", flag: "🇰🇷", currencyName: "South Korean Won" },
    SGD: { name: "Singapore", flag: "🇸🇬", currencyName: "Singapore Dollar" },
    ZAR: { name: "South Africa", flag: "🇿🇦", currencyName: "South African Rand" }
};

let rates = {};
let list = [];
let chart = null;
const form = document.getElementById('expenseForm');
const listEl = document.getElementById('expensesList');
const currencyEl = document.getElementById('displayCurrency');
const totalEl = document.getElementById('totalExpenses');
const breakdownEl = document.getElementById('categoryBreakdown');
const canvas = document.getElementById('expenseChart')?.getContext('2d');
const legend = document.getElementById('chartLegend');

function load() {
    try {
        const saved = localStorage.getItem('expenses');
        list = saved ? JSON.parse(saved) : [];
        update();
    } catch (e) {
        console.error('Error loading expenses:', e);
        list = [];
    }
}

function updateSelects() {
    const selects = [document.getElementById('currency'), currencyEl];
    const opts = Object.entries(data).map(([code, { flag, currencyName }]) =>
        `<option value="${code}">${flag} ${code} - ${currencyName}</option>`
    ).join('');
    selects.forEach(s => {
        if (s) {
            s.innerHTML = opts;
            s.value = 'USD';
        }
    });
}

function convert(amount, from, to) {
    if (!rates[from] || !rates[to]) return amount;
    return (amount / rates[from]) * rates[to];
}

function format(amount, curr) {
    return `${data[curr]?.flag || "🏳️"} ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr
    }).format(amount)}`;
}

function save() {
    try {
        localStorage.setItem('expenses', JSON.stringify(list));
    } catch (e) {
        console.error('Error saving expenses:', e);
    }
}

function add(desc, amt, cat, curr) {
    list.push({ id: Date.now(), desc, amt, cat, curr, date: new Date().toISOString() });
    save();
    update();
}

function remove(id) {
    list = list.filter(exp => exp.id !== id);
    save();
    update();
}

function total(curr) {
    return list.reduce((sum, { amt, curr: expCurr }) =>
        sum + convert(amt, expCurr, curr), 0);
}

function catTotals(curr) {
    return list.reduce((totals, { amt, cat, curr: expCurr }) => {
        totals[cat] = (totals[cat] || 0) + convert(amt, expCurr, curr);
        return totals;
    }, {});
}

function updateChart(curr) {
    if (!canvas) return;

    const totals = catTotals(curr);
    const cats = Object.keys(totals);
    const amounts = Object.values(totals);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    if (chart) chart.destroy();
    if (!cats.length) {
        legend.innerHTML = '<p>No expenses to display</p>';
        return;
    }

    chart = new Chart(canvas, {
        type: 'pie',
        data: { labels: cats, datasets: [{ data: amounts, backgroundColor: colors, borderWidth: 2 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    legend.innerHTML = cats.map((cat, i) =>
        `<div class="chart-legend-item"><div class="chart-legend-color" style="background: ${colors[i]}"></div>
         <div><strong>${cat}:</strong> ${format(totals[cat], curr)}</div></div>`).join('');
}

function update() {
    const curr = currencyEl.value || 'USD';

    listEl.innerHTML = list.map(({ id, desc, amt, cat, curr: expCurr }) => {
        const converted = convert(amt, expCurr, curr);
        return `<div class="expense-item">
                    <div><strong>${desc}</strong> <span>(${cat})</span></div>
                    <div>${format(amt, expCurr)} → ${format(converted, curr)}
                        <button class="delete-btn" onclick="remove(${id})">Delete</button>
                    </div>
                </div>`;
    }).join('');

    totalEl.innerHTML = `<h3>Total Expenses: ${format(total(curr), curr)}</h3>`;

    breakdownEl.innerHTML = `<h3>Category Breakdown:</h3>` + 
        Object.entries(catTotals(curr)).map(([cat, amt]) => 
            `<div><strong>${cat}:</strong> ${format(amt, curr)}</div>`).join('');

    updateChart(curr);
}

async function updateRates() {
    try {
        const res = await fetch(URL);
        if (!res.ok) throw new Error('Failed to fetch rates');
        const json = await res.json();
        rates = json.rates;
        update();
    } catch (e) {
        console.error('Error fetching rates:', e);
        alert('Failed to fetch rates. Using last known rates.');
    }
}

form?.addEventListener('submit', e => {
    e.preventDefault();
    const desc = document.getElementById('description')?.value;
    const amt = parseFloat(document.getElementById('amount')?.value);
    const cat = document.getElementById('category')?.value;
    const curr = document.getElementById('currency')?.value;
    if (desc && amt && cat && curr) {
        add(desc, amt, cat, curr);
        form.reset();
    } else {
        alert('Please fill out all fields.');
    }
});
currencyEl?.addEventListener('change', update);
window.remove = remove;

load();
updateSelects();
updateRates();
setInterval(updateRates, 3600000);
