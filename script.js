// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.log('SW registration failed', err));
    });
}

const indexData = {
    2003: 1572,
    2004: 1587,
    2005: 1594,
    2006: 1618,
    2007: 1660,
    2008: 1730,
    2009: 1730,
    2010: 1751,
    2011: 1812,
    2012: 1863,
    2013: 1890,
    2014: 1910,
    2015: 1906,
    2016: 1913,
    2017: 1927,
    2018: 1948,
    2019: 1968,
    2020: 1974,
    2021: 2017,
    2022: 2161,
    2023: 2296,
    2024: 2333
};


// Calculate YoY changes with year info
// yearlyChangesObj = [ {year: 2004, change: 0.95}, ... ]
const yearlyChangesObj = [];
const availableYears = [];

for (let year = 2004; year <= 2024; year++) {
    const prev = indexData[year - 1];
    const curr = indexData[year];
    const change = ((curr - prev) / prev) * 100;
    yearlyChangesObj.push({ year, change });
    availableYears.push(year);
}

// Chart instance
let chart = null;

// Scenarios State
let scenarios = JSON.parse(localStorage.getItem('rent_scenarios') || '{}');
let comparedScenarioIds = new Set();

// DOM Elements
const simulateBtn = document.getElementById('simulateBtn');
const saveScenarioBtn = document.getElementById('saveScenarioBtn');
const scenarioNameInput = document.getElementById('scenarioName');
const scenarioList = document.getElementById('scenarioList');
const minHikeEnabled = document.getElementById('minHikeEnabled');
const maxHikeEnabled = document.getElementById('maxHikeEnabled');
const initialRentInput = document.getElementById('initialRent');
const waterFeeInput = document.getElementById('waterFee');
const minHikeInput = document.getElementById('minHike');
const maxHikeInput = document.getElementById('maxHike');
const fixedAdditionInput = document.getElementById('fixedAddition');
const startYearSelect = document.getElementById('startYear');
const endYearSelect = document.getElementById('endYear');
const statsOutput = document.getElementById('statsOutput');

// Populate Year Selects
availableYears.forEach(year => {
    const optStart = document.createElement('option');
    optStart.value = year;
    optStart.textContent = year;
    startYearSelect.appendChild(optStart);

    const optEnd = document.createElement('option');
    optEnd.value = year;
    optEnd.textContent = year;
    endYearSelect.appendChild(optEnd);
});

// Set defaults (Last 5 years)
const defaultStartYear = availableYears[Math.max(0, availableYears.length - 5)];
startYearSelect.value = defaultStartYear;
endYearSelect.value = availableYears[availableYears.length - 1];

// Workspace Persistence
function saveWorkspace() {
    const workspace = {
        initialRent: initialRentInput.value,
        waterFee: waterFeeInput.value,
        minHike: minHikeInput.value,
        minHikeEnabled: minHikeEnabled.checked,
        maxHike: maxHikeInput.value,
        maxHikeEnabled: maxHikeEnabled.checked,
        fixedAddition: fixedAdditionInput.value,
        startYear: startYearSelect.value,
        endYear: endYearSelect.value
    };
    localStorage.setItem('rent_current_workspace', JSON.stringify(workspace));
}

function restoreWorkspace() {
    const saved = localStorage.getItem('rent_current_workspace');
    if (saved) {
        try {
            const workspace = JSON.parse(saved);
            if (workspace.initialRent) initialRentInput.value = workspace.initialRent;
            if (workspace.waterFee) waterFeeInput.value = workspace.waterFee;
            
            if (workspace.minHikeEnabled !== undefined) {
                minHikeEnabled.checked = workspace.minHikeEnabled;
                minHikeInput.disabled = !workspace.minHikeEnabled;
            }
            if (workspace.minHike) minHikeInput.value = workspace.minHike;

            if (workspace.maxHikeEnabled !== undefined) {
                maxHikeEnabled.checked = workspace.maxHikeEnabled;
                maxHikeInput.disabled = !workspace.maxHikeEnabled;
            }
            if (workspace.maxHike) maxHikeInput.value = workspace.maxHike;

            if (workspace.fixedAddition) fixedAdditionInput.value = workspace.fixedAddition;
            if (workspace.startYear) startYearSelect.value = workspace.startYear;
            if (workspace.endYear) endYearSelect.value = workspace.endYear;
        } catch (e) {
            console.error("Failed to restore workspace", e);
        }
    }
}

// Event Listeners for Auto-save
[initialRentInput, waterFeeInput, minHikeInput, maxHikeInput, fixedAdditionInput, startYearSelect, endYearSelect].forEach(el => {
    el.addEventListener('input', () => {
        saveWorkspace();
        runSimulation();
    });
});

[minHikeEnabled, maxHikeEnabled].forEach(el => {
    el.addEventListener('change', (e) => {
        const targetId = e.target.id.replace('Enabled', '');
        document.getElementById(targetId).disabled = !e.target.checked;
        saveWorkspace();
        runSimulation();
    });
});

// Initial Restore
restoreWorkspace();

simulateBtn.addEventListener('click', () => runSimulation());
saveScenarioBtn.addEventListener('click', saveScenario);

function saveScenario() {
    const name = scenarioNameInput.value.trim();
    if (!name) {
        alert('Anna skenaariolle nimi');
        return;
    }

    const scenarioId = 'scenario_' + Date.now();
    const config = {
        id: scenarioId,
        name: name,
        initialRent: parseFloat(initialRentInput.value),
        waterFee: parseFloat(waterFeeInput.value) || 0,
        minHike: minHikeEnabled.checked ? parseFloat(minHikeInput.value) : -Infinity,
        maxHike: maxHikeEnabled.checked ? parseFloat(maxHikeInput.value) : Infinity,
        fixedAddition: parseFloat(fixedAdditionInput.value),
        startYear: parseInt(startYearSelect.value),
        endYear: parseInt(endYearSelect.value)
    };

    // Run simulation once to store the median results for comparison
    const results = simulate(config);
    config.medianResults = results.median;

    scenarios[scenarioId] = config;
    localStorage.setItem('rent_scenarios', JSON.stringify(scenarios));
    scenarioNameInput.value = '';
    renderScenarios();
}

function deleteScenario(id) {
    delete scenarios[id];
    comparedScenarioIds.delete(id);
    localStorage.setItem('rent_scenarios', JSON.stringify(scenarios));
    renderScenarios();
    runSimulation(); // Refresh chart
}

function toggleCompare(id) {
    if (comparedScenarioIds.has(id)) {
        comparedScenarioIds.delete(id);
    } else {
        comparedScenarioIds.add(id);
    }
    renderScenarios();
    runSimulation();
}

function loadScenario(id) {
    const config = scenarios[id];
    initialRentInput.value = config.initialRent;
    waterFeeInput.value = config.waterFee;
    
    if (config.minHike === -Infinity) {
        minHikeEnabled.checked = false;
        minHikeInput.disabled = true;
    } else {
        minHikeEnabled.checked = true;
        minHikeInput.disabled = false;
        minHikeInput.value = config.minHike;
    }

    if (config.maxHike === Infinity) {
        maxHikeEnabled.checked = false;
        maxHikeInput.disabled = true;
    } else {
        maxHikeEnabled.checked = true;
        maxHikeInput.disabled = false;
        maxHikeInput.value = config.maxHike;
    }

    fixedAdditionInput.value = config.fixedAddition;
    startYearSelect.value = config.startYear;
    endYearSelect.value = config.endYear;
    saveWorkspace();
    runSimulation();
}

function renderScenarios() {
    scenarioList.innerHTML = '';
    Object.values(scenarios).forEach(s => {
        const div = document.createElement('div');
        div.className = `scenario-item ${comparedScenarioIds.has(s.id) ? 'compared' : ''}`;
        div.innerHTML = `
            <span class="scenario-name" onclick="loadScenario('${s.id}')">${s.name}</span>
            <div class="scenario-actions">
                <button onclick="toggleCompare('${s.id}')" title="Vertaile">📊</button>
                <button onclick="deleteScenario('${s.id}')" title="Poista">🗑️</button>
            </div>
        `;
        scenarioList.appendChild(div);
    });
}

function simulate(config) {
    const initialRent = config.initialRent;
    const waterFee = config.waterFee;
    const minHike = config.minHike;
    const maxHike = config.maxHike;
    const fixedAddition = config.fixedAddition;
    const effectiveStart = Math.min(config.startYear, config.endYear);
    const effectiveEnd = Math.max(config.startYear, config.endYear);

    const filteredChanges = yearlyChangesObj
        .filter(item => item.year >= effectiveStart && item.year <= effectiveEnd)
        .map(item => item.change);
        
    if (filteredChanges.length === 0) return null;

    const simulationYears = 5;
    const numSimulations = 2000;
    const results = Array.from({ length: simulationYears + 1 }, () => []);
    const initialTotal = initialRent + waterFee;
    
    for (let i = 0; i < numSimulations; i++) {
        results[0].push(initialTotal);
    }

    for (let sim = 0; sim < numSimulations; sim++) {
        let currentRent = initialRent;
        for (let year = 1; year <= simulationYears; year++) {
            const randomChange = filteredChanges[Math.floor(Math.random() * filteredChanges.length)];
            let hike = randomChange + fixedAddition;
            hike = Math.max(minHike, Math.min(maxHike, hike));
            currentRent = currentRent * (1 + hike / 100);
            results[year].push(currentRent + waterFee);
        }
    }

    const median = [];
    const p10 = [];
    const p90 = [];

    for (let year = 0; year <= simulationYears; year++) {
        results[year].sort((a, b) => a - b);
        median.push(results[year][Math.floor(numSimulations * 0.5)]);
        p10.push(results[year][Math.floor(numSimulations * 0.1)]);
        p90.push(results[year][Math.floor(numSimulations * 0.9)]);
    }

    return { median, p10, p90, initialTotal };
}

function runSimulation() {
    const config = {
        initialRent: parseFloat(initialRentInput.value),
        waterFee: parseFloat(waterFeeInput.value) || 0,
        minHike: minHikeEnabled.checked ? parseFloat(minHikeInput.value) : -Infinity,
        maxHike: maxHikeEnabled.checked ? parseFloat(maxHikeInput.value) : Infinity,
        fixedAddition: parseFloat(fixedAdditionInput.value),
        startYear: parseInt(startYearSelect.value),
        endYear: parseInt(endYearSelect.value)
    };

    const baselineConfig = {
        ...config,
        minHike: -Infinity,
        maxHike: Infinity,
        fixedAddition: 0
    };

    const simResult = simulate(config);
    const baselineResult = simulate(baselineConfig);

    if (!simResult || !baselineResult) {
        alert("Valitulla aikavälillä ei ole dataa!");
        return;
    }

    const simulationYears = 5;
    const years = Array.from({length: simulationYears + 1}, (_, i) => `Vuosi ${i}`);
    
    updateChart(years, simResult, baselineResult, Array.from(comparedScenarioIds).map(id => scenarios[id]));
    updateStats(simResult.initialTotal, simResult.median[simulationYears], simResult.p10[simulationYears], simResult.p90[simulationYears]);
}

function updateChart(labels, mainResult, baselineResult, comparedScenarios) {
    const ctx = document.getElementById('rentChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    const datasets = [];

    // 1. Baseline datasets (Lowest layer)
    datasets.push({
        label: 'Puhdas indeksi (10-90% vaihtelu)',
        data: baselineResult.p90,
        borderColor: 'rgba(148, 163, 184, 0.3)',
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        borderWidth: 1,
        tension: 0.4,
        fill: '+1',
        pointRadius: 0,
        borderDash: [3, 3]
    });

    datasets.push({
        label: 'Baseline Spread Bottom',
        data: baselineResult.p10,
        borderColor: 'rgba(148, 163, 184, 0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        hidden: true
    });

    datasets.push({
        label: 'Puhdas indeksi (Mediaani)',
        data: baselineResult.median,
        borderColor: 'rgba(71, 85, 105, 0.4)',
        borderWidth: 1.5,
        borderDash: [10, 5],
        tension: 0.4,
        fill: false,
        pointRadius: 0
    });

    // 2. Main simulation datasets
    datasets.push({
        label: 'Nykyinen (Mediaani)',
        data: mainResult.median,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        zIndex: 10
    });

    datasets.push({
        label: 'Nykyinen (90% kvantiili)',
        data: mainResult.p90,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 1,
        tension: 0.4,
        fill: '+1',
        pointRadius: 0
    });

    datasets.push({
        label: 'Nykyinen (10% kvantiili)',
        data: mainResult.p10,
        borderColor: 'rgba(34, 197, 94, 0.4)',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 1,
        tension: 0.4,
        fill: false,
        pointRadius: 0
    });

    // 3. Comparison lines
    comparedScenarios.forEach((s, index) => {
        const colors = ['#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
        const color = colors[index % colors.length];
        datasets.push({
            label: s.name,
            data: s.medianResults,
            borderColor: color,
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 0,
            fill: false
        });
    });

    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: {
                    display: true,
                    text: 'Arvioitu kuukausimaksu (Vuokra + Vesi)',
                    color: '#1e293b',
                    font: { size: 16, family: 'Outfit' }
                },
                legend: {
                    labels: { 
                        color: '#475569', 
                        font: { family: 'Outfit' },
                        filter: function(item) {
                            // Hide the helper dataset from legend
                            return !item.text.includes('Baseline Spread Bottom');
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label.includes('Baseline Spread Bottom')) return null;
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#64748b', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { 
                        color: '#64748b',
                        font: { family: 'Outfit' },
                        callback: function(value) { return value + ' €'; }
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

function updateStats(start, endMedian, endLow, endHigh) {
    const totalIncreaseP = ((endMedian - start) / start) * 100;
    
    statsOutput.innerHTML = `
        <div class="stat-card">
            <h3>Odotettu kuukausierä 5v kuluttua</h3>
            <p class="stat-value">${new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(endMedian)}</p>
            <p class="stat-change">+${totalIncreaseP.toFixed(1)}%</p>
        </div>
        <div class="stat-card">
            <h3>Vaihteluväli (80% tn.)</h3>
            <p class="stat-range">${new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(endLow)} € - ${new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(endHigh)} €</p>
            <p class="stat-desc">Nykyisillä asetuksilla</p>
        </div>
    `;
}

// Initial render
renderScenarios();
runSimulation();
