let rates = { TRY: 1 };

async function loadRates() {
    try {
        const res = await fetch('https://finans.truncgil.com/v3/today.json');
        const data = await res.json();

        ['USD', 'EUR', 'GBP', 'CHF'].forEach(code => {
            if (data[code] && data[code].Selling) {
                rates[code] = parseFloat(data[code].Selling.replace('.', '').replace(',', '.'));
            }
        });

        calculate();
    } catch (err) {
        console.error("Kurlar yüklenemedi:", err);
    }
}

function calculate() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const from = document.getElementById('from-currency').value;
    const to = document.getElementById('to-currency').value;

    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;

    const total = (amount * fromRate) / toRate;
    
    document.getElementById('result-display').innerText = `${total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`;
}

// Event Listeners
document.getElementById('amount').addEventListener('input', calculate);
document.getElementById('from-currency').addEventListener('change', calculate);
document.getElementById('to-currency').addEventListener('change', calculate);

// Birim Değiştirme (Swap)
document.getElementById('swap-btn').addEventListener('click', () => {
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');

    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;

    calculate();
});

loadRates();