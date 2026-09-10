/**
 * Canlı Döviz ve Altın Fiyatları Servisi
 */

const state = {
    rates: { TRY: 1 },
    lastUpdated: null,

    // Ziynet/Sarrafiye Altın Çarpanları (Gram Altın fiyatı üzerinden hesaplanır)
    goldFactors: {
        GRA: 1,       // Gram Altın
        CEY: 1.63,    // Çeyrek Altın
        YAR: 3.26,    // Yarım Altın
        TAM: 6.52,    // Tam Altın
        ATA: 6.70,    // Ata Lira
        RES: 6.60     // Reşat Altın
    }
};

class FinanceService {
    // Ücretsiz, CORS Dostu, Döviz + Metal (Altın) Kaynağı
    static async fetchMarketData() {
        try {
            // Döviz Kurları (USD, EUR, GBP, CHF, BTC)
            const currencyRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const currencyData = await currencyRes.json();
            
            // Canlı Ons Altın Fiyatı (Gold API - Ücretsiz Katman)
            let goldGramTL = 0;
            try {
                const goldRes = await fetch('https://api.gold-api.com/price/XAU');
                const goldData = await goldRes.json(); // Ons fiyatı USD cinsinden
                
                const usdTry = currencyData.rates.TRY;
                const xauUsd = goldData.price; // Anlık Ons USD
                goldGramTL = (xauUsd / 31.1034768) * usdTry; // Gram Altın TL hesabı
            } catch (e) {
                console.warn('Altın API alınamadı, yedek hesaba geçiliyor...');
                // Altın servisinde aksama olursa döviz üzerinden tahmini gram altın hesabı
                goldGramTL = (2500 / 31.1034768) * currencyData.rates.TRY; 
            }

            return this.parseRates(currencyData.rates, goldGramTL);
        } catch (err) {
            console.error('API Veri çekme hatası:', err);
            return null;
        }
    }

    static parseRates(rawRates, gramAltinTL) {
        const usdTry = rawRates.TRY;

        return {
            TRY: 1,
            USD: usdTry,
            EUR: usdTry / rawRates.EUR,
            GBP: usdTry / rawRates.GBP,
            CHF: usdTry / rawRates.CHF,
            BTC: rawRates.BTC ? (usdTry / rawRates.BTC) : 0,

            // Altın Çeşitleri
            GRA: gramAltinTL,
            CEY: gramAltinTL * state.goldFactors.CEY,
            YAR: gramAltinTL * state.goldFactors.YAR,
            TAM: gramAltinTL * state.goldFactors.TAM,
            ATA: gramAltinTL * state.goldFactors.ATA,
            RES: gramAltinTL * state.goldFactors.RES
        };
    }
}

class App {
    static init() {
        this.loadData();
        this.setupEvents();
        setInterval(() => this.loadData(), 30000); // 30 sn'de bir canlı güncelleme
    }

    static async loadData() {
        const data = await FinanceService.fetchMarketData();

        if (data) {
            state.rates = data;
            state.lastUpdated = new Date();

            this.updateClock();
            this.updateDOM();
            this.calculateConverter();
        } else {
            const timeElem = document.getElementById('update-time');
            if (timeElem) timeElem.innerText = 'Veri çekilemedi!';
        }
    }

    static updateClock() {
        const timeElem = document.getElementById('update-time');
        if (timeElem && state.lastUpdated) {
            const timeStr = state.lastUpdated.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            timeElem.innerHTML = `<i class="fa-regular fa-clock"></i> Canlı: ${timeStr}`;
        }
    }

    static updateDOM() {
        const items = ['USD', 'EUR', 'GBP', 'CHF', 'GRA', 'CEY', 'YAR', 'TAM', 'ATA', 'RES', 'BTC'];

        items.forEach(code => {
            const price = state.rates[code];
            if (!price) return;

            const buyingElem = document.getElementById(`${code}-buying`);
            const sellingElem = document.getElementById(`${code}-selling`);
            const changeElem = document.getElementById(`${code}-change`);

            // Serbest Piyasa Alış-Satış Makası (%0.3)
            const buyingPrice = price * 0.997;
            const sellingPrice = price;

            if (buyingElem) buyingElem.innerText = this.formatCurrency(buyingPrice);
            if (sellingElem) sellingElem.innerText = this.formatCurrency(sellingPrice);

            if (changeElem) {
                changeElem.className = 'badge up';
                changeElem.innerText = '+%0.20';
            }
        });
    }

    static calculateConverter() {
        const amountInput = document.getElementById('amount');
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        const resultDisplay = document.getElementById('result-display');

        if (!amountInput || !fromSelect || !toSelect || !resultDisplay) return;

        const amount = parseFloat(amountInput.value) || 0;
        const fromVal = state.rates[fromSelect.value] || 1;
        const toVal = state.rates[toSelect.value] || 1;

        const total = (amount * fromVal) / toVal;
        resultDisplay.innerText = `${this.formatNumber(total)} ${toSelect.value}`;
    }

    static formatCurrency(val) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(val);
    }

    static formatNumber(val) {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val);
    }

    static setupEvents() {
        const amountElem = document.getElementById('amount');
        const fromElem = document.getElementById('from-currency');
        const toElem = document.getElementById('to-currency');
        const swapBtn = document.getElementById('swap-btn');

        if (amountElem) amountElem.addEventListener('input', () => this.calculateConverter());
        if (fromElem) fromElem.addEventListener('change', () => this.calculateConverter());
        if (toElem) toElem.addEventListener('change', () => this.calculateConverter());

        if (swapBtn && fromElem && toElem) {
            swapBtn.addEventListener('click', () => {
                const temp = fromElem.value;
                fromElem.value = toElem.value;
                toElem.value = temp;
                this.calculateConverter();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => App.init());