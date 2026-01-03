
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
    2023: 2296
};

// Calculate YoY changes from 2004 to 2023
const yearlyChanges = [];
for (let year = 2004; year <= 2023; year++) {
    const prev = indexData[year - 1];
    const curr = indexData[year];
    const change = ((curr - prev) / prev) * 100;
    yearlyChanges.push(change);
}

// Chart instance
let chart = null;

// DOM Elements
const simulateBtn = document.getElementById('simulateBtn');
const initialRentInput = document.getElementById('initialRent');
const minHikeInput = document.getElementById('minHike');
const maxHikeInput = document.getElementById('maxHike');
const fixedAdditionInput = document.getElementById('fixedAddition');
const statsOutput = document.getElementById('statsOutput');

simulateBtn.addEventListener('click', runSimulation);

function runSimulation() {
    const initialRent = parseFloat(initialRentInput.value);
    const minHike = parseFloat(minHikeInput.value);
    const maxHike = parseFloat(maxHikeInput.value);
    const fixedAddition = parseFloat(fixedAdditionInput.value);

    const simulationYears = 5;
    const numSimulations = 2000;
    
    // Store results for each year across all simulations
    // results[yearIndex] = [rent_sim_1, rent_sim_2, ...]
    const results = Array.from({ length: simulationYears + 1 }, () => []);
    
    // Initialize year 0
    for (let i = 0; i < numSimulations; i++) {
        results[0].push(initialRent);
    }

    // Run simulations
    for (let sim = 0; sim < numSimulations; sim++) {
        let currentRent = initialRent;
        for (let year = 1; year <= simulationYears; year++) {
            // Bootstrapping: pick a random historical change
            const randomChange = yearlyChanges[Math.floor(Math.random() * yearlyChanges.length)];
            
            // Calculate effective hike
            let hike = randomChange + fixedAddition;
            
            // Apply constraints
            hike = Math.max(minHike, Math.min(maxHike, hike));
            
            // Apply rent increase
            currentRent = currentRent * (1 + hike / 100);
            results[year].push(currentRent);
        }
    }

    // Calculate statistics for visualization
    const years = Array.from({length: simulationYears + 1}, (_, i) => `Vuosi ${i}`);
    const medianData = [];
    const p10Data = [];
    const p90Data = [];

    for (let year = 0; year <= simulationYears; year++) {
        results[year].sort((a, b) => a - b);
        medianData.push(results[year][Math.floor(numSimulations * 0.5)]);
        p10Data.push(results[year][Math.floor(numSimulations * 0.1)]);
        p90Data.push(results[year][Math.floor(numSimulations * 0.9)]);
    }

    updateChart(years, medianData, p10Data, p90Data);
    updateStats(initialRent, medianData[simulationYears], p10Data[simulationYears], p90Data[simulationYears]);
}

function updateChart(labels, median, p10, p90) {
    const ctx = document.getElementById('rentChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Mediaani',
                    data: median,
                    borderColor: '#6366f1', // Indigo 500
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 4
                },
                {
                    label: '90% kvantiili (Korkea arvio)',
                    data: p90,
                    borderColor: 'rgba(239, 68, 68, 0.5)', // Red 500
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 1,
                    tension: 0.4,
                    fill: '+1', // Fill to next dataset (creating the band)
                    pointRadius: 0
                },
                {
                    label: '10% kvantiili (Matala arvio)',
                    data: p10,
                    borderColor: 'rgba(34, 197, 94, 0.5)', // Green 500
                    backgroundColor: 'rgba(34, 197, 94, 0.1)', // This color fills the gap
                    borderWidth: 1,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Vuokran kehitysennuste (5 vuotta)',
                    color: '#e2e8f0',
                    font: {
                        size: 16,
                        family: 'Outfit'
                    }
                },
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        font: { family: 'Outfit' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
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
                    ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { 
                        color: '#94a3b8',
                        font: { family: 'Outfit' },
                        callback: function(value) {
                            return value + ' €'; 
                        }
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
            <h3>Odotettu vuokra 5v kuluttua</h3>
            <p class="stat-value">${new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(endMedian)}</p>
            <p class="stat-change">+${totalIncreaseP.toFixed(1)}%</p>
        </div>
        <div class="stat-card">
            <h3>Vaihteluväli (80% tn.)</h3>
            <p class="stat-range">${new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(endLow)} € - ${new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(endHigh)} €</p>
            <p class="stat-desc">Suurin osa simulaatioista osuu tälle välille</p>
        </div>
    `;
}

// Run initial simulation
runSimulation();
