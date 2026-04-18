const checkBtn = document.getElementById('checkBtn');
const locationSelect = document.getElementById('location');
const needSelect = document.getElementById('need');
const dashboardSection = document.getElementById('dashboardSection');
const resultsSection = document.getElementById('resultsSection');

const allGates = ['Gate 1', 'Gate 2', 'Gate 3'];
const allFood = ['Main Food Court', 'North Food Trucks', 'South Cafe'];

const levels = [
    { text: 'Low', class: 'crowd-low', baseWait: 2, maxWait: 5 },
    { text: 'Medium', class: 'crowd-medium', baseWait: 5, maxWait: 12 },
    { text: 'High', class: 'crowd-high', baseWait: 12, maxWait: 25 }
];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateDistance(currentLocation, targetLocation) {
    if (currentLocation === targetLocation) return 0;
    return getRandomInt(3, 15);
}

function simulateForDestinations(currentLocation, destinations) {
    const data = [];
    destinations.forEach(dest => {
        const levelIndex = getRandomInt(0, 2);
        const level = levels[levelIndex];
        const waitTime = getRandomInt(level.baseWait, level.maxWait);
        const walkingTime = calculateDistance(currentLocation, dest);
        
        let score = 100 - (waitTime * 2) - (walkingTime * 1.5);
        score = Math.max(0, Math.floor(score));

        data.push({
            name: dest,
            levelText: level.text,
            levelClass: level.class,
            waitTime: waitTime,
            walkingTime: walkingTime,
            totalTime: waitTime + walkingTime,
            score: score
        });
    });
    return data;
}

function renderList(data, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    data.forEach(item => {
        let statusClass = 'bg-green';
        if (item.levelText === 'Medium') statusClass = 'bg-yellow';
        if (item.levelText === 'High') statusClass = 'bg-red';

        container.innerHTML += `
            <div class="option-item">
                <div class="option-info">
                    <h4>${item.name}</h4>
                    <p><span class="status-indicator ${statusClass}"></span> Wait: ~${item.waitTime} min &bull; Walk: ${item.walkingTime} min &bull; Score: ${item.score}</p>
                </div>
                <div class="crowd-badge ${item.levelClass}">${item.levelText}</div>
            </div>
        `;
    });
}

function getBestOptionHtml(option, rankIndex, minWalkingTime) {
    let bestStatusClass = 'bg-green';
    let prediction = 'Crowd expected to stay low.';
    let reasoning = 'lowest crowd density';
    
    if (option.levelText === 'Medium') {
        bestStatusClass = 'bg-yellow';
        prediction = 'Crowd expected to clear in 5–10 minutes.';
        reasoning = 'manageable crowd density';
    }
    if (option.levelText === 'High') {
        bestStatusClass = 'bg-red';
        prediction = 'Crowd expected to reduce in 15–20 minutes.';
        reasoning = 'relatively lower wait compared to others';
    }

    const isBest = rankIndex === 0;
    const isNearest = option.walkingTime === minWalkingTime;
    
    let badgesHtml = '';
    if (isBest) badgesHtml += `<div class="badge" style="margin-right: 0.5rem;">#1 Best Route</div>`;
    else badgesHtml += `<div class="badge" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-right: 0.5rem; box-shadow: none;">#${rankIndex + 1} Route</div>`;

    if (isNearest) badgesHtml += `<div class="badge" style="background: linear-gradient(135deg, #f59e0b, #d97706);">📍 Nearest</div>`;

    return `
        <div class="recommendation-card ${isBest ? 'is-best' : ''}">
            <div class="score-badge ${option.score > 70 ? 'high-score' : ''}">
                <div class="score-val">${option.score}</div>
                <div class="score-label">Score</div>
            </div>
            
            <div style="display:flex; flex-wrap:wrap; margin-bottom: 0.5rem;">
                ${badgesHtml}
            </div>
            
            <h3>${option.name}</h3>
            <p><span class="status-indicator ${bestStatusClass}"></span> Est. Wait: ${option.waitTime} min</p>
            <p>Travel Time: ${option.walkingTime} min walk</p>
            <p class="prediction-msg">🕒 ${prediction}</p>
            
            ${isBest ? `<div class="rec-message">Recommended because this option has ${reasoning} and high overall score.</div>` : ''}
        </div>
    `;
}

checkBtn.addEventListener('click', () => {
    const originalText = checkBtn.innerText;
    checkBtn.innerText = 'Analyzing...';
    checkBtn.style.opacity = '0.7';
    checkBtn.disabled = true;

    setTimeout(() => {
        const currentLocation = locationSelect.value;
        const need = needSelect.value;

        // Simulate all data
        const gateData = simulateForDestinations(currentLocation, allGates);
        const foodData = simulateForDestinations(currentLocation, allFood);

        // Sort data by score descending
        gateData.sort((a, b) => b.score - a.score);
        foodData.sort((a, b) => b.score - a.score);

        // Determine Best Options based on Need
        let bestDataList = (need === 'Food') ? foodData : gateData;
        const sortedForBest = [...bestDataList].sort((a, b) => b.score - a.score);
        
        // Extract Top 3 and nearest logic
        const top3 = sortedForBest.slice(0, 3);
        const minWalkingTime = Math.min(...bestDataList.map(i => i.walkingTime));

        // Generate HTML for top 3
        let top3Html = '';
        top3.forEach((opt, idx) => {
            top3Html += getBestOptionHtml(opt, idx, minWalkingTime);
        });

        // 1. Overview Tab
        const needText = need === 'Food' ? 'food / refreshments' : need.toLowerCase();
        document.getElementById('overviewSummary').innerText = `You are looking for ${needText} near ${currentLocation}. Here are your top 3 recommendations:`;
        document.getElementById('overviewRecommendation').innerHTML = top3Html;

        // 2. Gates Tab
        renderList(gateData, 'gatesList');

        // 3. Food Tab
        renderList(foodData, 'foodList');

        // 4. Navigation Tab
        document.getElementById('navRoute').innerHTML = top3Html;

        // 5. Alerts Tab
        const alertsContainer = document.getElementById('alertsContainer');
        let alertHtml = '';
        
        const best = top3[0];
        if (best.levelText === 'High') {
            const alternative = top3.length > 1 ? top3[1].name : 'waiting it out';
            alertHtml += `<div class="alert-box alert-warning" style="margin-bottom:1rem;">⚠️ High crowd detected at ${best.name} – consider alternative: ${alternative}.</div>`;
        } else if (best.levelText === 'Low') {
            alertHtml += `<div class="alert-box alert-safe" style="margin-bottom:1rem;">✅ Safe: Low crowd levels. Best time to go!</div>`;
        } else {
            alertHtml += `<div class="alert-box alert-notice" style="margin-bottom:1rem;">ℹ️ Notice: Moderate crowds. Normal travel times.</div>`;
        }

        const highGates = gateData.filter(g => g.levelText === 'High');
        if (highGates.length > 0) {
            alertHtml += `<div class="alert-box alert-warning">⚠️ Warning: ${highGates.map(g=>g.name).join(', ')} currently experiencing high crowds.</div>`;
        }

        alertsContainer.innerHTML = alertHtml;

        // Populate Dashboard Stats
        const avgWait = Math.round(gateData.reduce((acc, curr) => acc + curr.waitTime, 0) / gateData.length);
        document.getElementById('statAvgWait').innerText = `${avgWait} min`;
        
        const attendance = getRandomInt(55000, 60000);
        const capacity = Math.round((attendance / 65000) * 100);
        document.getElementById('statAttendance').innerText = attendance.toLocaleString();
        document.getElementById('statCapacity').innerText = `${capacity}% Capacity`;

        const freeCounters = getRandomInt(1, 6);
        document.getElementById('statCounters').innerText = `${freeCounters}/6`;

        // Update Map Heat
        const zones = [
            { id: 'zoneNorth', name: 'North Stand' },
            { id: 'zoneSouth', name: 'South Stand' },
            { id: 'zoneEast', name: 'East' },
            { id: 'zoneWest', name: 'West' },
            { id: 'zoneField', name: 'Playing Field' }
        ];

        let bestZone = null;
        let lowestCrowd = 3;

        zones.forEach(zone => {
            const el = document.getElementById(zone.id);
            // Reset background classes
            el.classList.remove('bg-green', 'bg-yellow', 'bg-red', 'is-best-zone');
            
            const r = getRandomInt(0, 2);
            if (r < lowestCrowd) {
                lowestCrowd = r;
                bestZone = zone;
            }

            if (r === 0) el.classList.add('bg-green');
            else if (r === 1) el.classList.add('bg-yellow');
            else el.classList.add('bg-red');

            el.innerHTML = zone.name;
        });

        // Highlight best area
        if (bestZone) {
            const el = document.getElementById(bestZone.id);
            el.classList.add('is-best-zone');
            el.innerHTML = `${bestZone.name} <span class="best-area-badge">⭐ Best Area</span>`;
        }

        // Show sections and reset button
        dashboardSection.classList.remove('hidden');
        resultsSection.classList.remove('hidden');
        checkBtn.innerText = originalText;
        checkBtn.style.opacity = '1';
        checkBtn.disabled = false;
        
        dashboardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    }, 800);
});

// Tab switching logic
window.showTab = function(element, tabId) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}
