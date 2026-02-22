/**
 * World Map Projections — Sounny's Projections Engine
 * Core Logic & Rendering
 */

const canvas = document.getElementById('projection-canvas');
const ctx = canvas.getContext('2d');
const select = document.getElementById('projection-select');
const toggleTissot = document.getElementById('toggle-tissot');
const toggleGrat = document.getElementById('toggle-graticule');
const rotLambda = document.getElementById('rot-lambda');
const rotPhi = document.getElementById('rot-phi');

let width, height;
const worldDataCache = { '110m': null, '50m': null };
let currentRes = '110m';
let world = null;
let showTissot = true;
let showGrat = true;
let rotation = [0, 0, 0];
let projection;
let focusedFeature = null; // Stored for drill-down
let activeData = null;      // TopoJSON processed features

// Initialize
async function init() {
    window.addEventListener('resize', resize);
    resize();
    setupListeners();
    await loadData('110m');
}

async function loadData(res) {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) indicator.style.display = 'block';

    if (!worldDataCache[res]) {
        const response = await fetch(`data/world-${res}.json`);
        worldDataCache[res] = await response.json();
    }
    
    world = worldDataCache[res];
    currentRes = res;
    
    // Process geometries
    activeData = topojson.feature(world, world.objects.countries);
    
    // Update active button states
    document.getElementById('btn-res-110m').classList.toggle('active', res === '110m');
    document.getElementById('btn-res-50m').classList.toggle('active', res === '50m');
    
    if (indicator) indicator.style.display = 'none';
    render();
    setupSearch(); 
}


function resize() {
    const container = document.getElementById('canvas-container');
    width = container.clientWidth;
    height = container.clientHeight;
    
    // Scale for retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    
    render();
}

function setupListeners() {
    select.addEventListener('change', () => {
        const option = select.options[select.selectedIndex];
        document.getElementById('proj-name-display').textContent = option.text;
        document.getElementById('proj-type-display').textContent = option.parentElement.label;
        render();
    });
    
    toggleTissot.addEventListener('click', () => {
        showTissot = !showTissot;
        toggleTissot.classList.toggle('active', showTissot);
        render();
    });
    
    toggleGrat.addEventListener('click', () => {
        showGrat = !showGrat;
        toggleGrat.classList.toggle('active', showGrat);
        render();
    });
    
    [rotLambda, rotPhi].forEach(el => {
        el.addEventListener('input', () => {
            rotation = [+rotLambda.value, -rotPhi.value, 0];
            render();
        });
    });

    document.getElementById('btn-res-110m').addEventListener('click', () => {
        if (currentRes !== '110m') loadData('110m');
    });
    
    document.getElementById('btn-res-50m').addEventListener('click', () => {
        if (currentRes !== '50m') loadData('50m');
    });

    document.getElementById('reset-geo').addEventListener('click', () => {
        focusedFeature = null;
        document.getElementById('geo-search').value = '';
        document.getElementById('drilldown-status').style.display = 'none';
        render();
    });
}

function setupSearch() {
    const input = document.getElementById('geo-search');
    const results = document.getElementById('search-results');
    
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        results.innerHTML = '';
        if (query.length < 2) {
            results.style.display = 'none';
            return;
        }

        const matches = activeData.features
            .filter(f => f.properties.name && f.properties.name.toLowerCase().includes(query))
            .slice(0, 10);

        if (matches.length > 0) {
            results.style.display = 'block';
            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.textContent = m.properties.name;
                div.addEventListener('click', () => {
                    focusOnFeature(m);
                    results.style.display = 'none';
                    input.value = m.properties.name;
                });
                results.appendChild(div);
            });
        } else {
            results.style.display = 'none';
        }
    });
}

function focusOnFeature(feature) {
    focusedFeature = feature;
    document.getElementById('drilldown-status').style.display = 'block';
    document.getElementById('current-location-tag').textContent = feature.properties.name;
    render();
}

function render() {
    if (!world) return;
    
    ctx.clearRect(0, 0, width, height);
    
    const projType = select.value;
    
    // Create projection
    if (d3[projType]) {
        projection = d3[projType]();
    } else if (d3.geoProjection) {
        projection = d3[projType]();
    }
    
    // Custom configurations for specific projections
    if (projType === 'geoConicEqualArea' || projType === 'geoConicConformal' || projType === 'geoConicEquidistant') {
        // Standard parallels for Albers/Lambert
        projection.parallels([20, 50]);
    }
    if (projType === 'geoTransverseMercator') {
        // Avoid default clipping logic in raw d3
        projection.rotate([-0, 0, 0]);
    }
    
    projection
        .translate([width / 2, height / 2])
        .rotate(rotation);

    // Dynamic scaling logic
    let scaleDivisor = 5.5;
    if (projType.includes('Azimuthal') || projType.includes('Orthographic') || projType.includes('Stereographic') || projType.includes('Gnomonic')) {
        scaleDivisor = 2.2;
    } else if (projType.includes('Conic')) {
        scaleDivisor = 4.5;
    } else if (projType === 'geoMercator' || projType === 'geoTransverseMercator') {
        scaleDivisor = 6.5; 
    }

    let scale = Math.min(width, height) / scaleDivisor;
    
    // Geographic Drill-down: Zoom to focus
    if (focusedFeature) {
        const bounds = d3.geoBounds(focusedFeature);
        const center = d3.geoCentroid(focusedFeature);
        
        // Update rotation to center on feature
        projection.rotate([-center[0], -center[1], 0]);
        
        // Calculate fitting scale
        const [[x0, y0], [x1, y1]] = d3.geoPath(projection.scale(100)).bounds(focusedFeature);
        const w = x1 - x0;
        const h = y1 - y0;
        const s = 100 / Math.max(w / width, h / height) * 0.8; // 80% padding
        scale = s;
    }

    projection.scale(scale);

    const path = d3.geoPath(projection, ctx);

    // 1. Ocean / Sphere
    ctx.beginPath();
    path({type: 'Sphere'});
    ctx.fillStyle = '#080a14';
    ctx.fill();
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Graticule
    if (showGrat) {
        ctx.beginPath();
        path(d3.geoGraticule10());
        ctx.strokeStyle = 'rgba(76, 201, 240, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // 3. Land
    ctx.beginPath();
    path(activeData);
    ctx.fillStyle = 'rgba(76, 201, 240, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 3b. Focused Feature (Highlight)
    if (focusedFeature) {
        ctx.beginPath();
        path(focusedFeature);
        ctx.fillStyle = 'rgba(247, 37, 133, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'var(--clr-accent-3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 4. Tissot Indicatrices
    if (showTissot) {
        const step = 30;
        ctx.strokeStyle = 'rgba(247, 37, 133, 0.4)';
        ctx.lineWidth = 0.8;
        
        for (let lat = -60; lat <= 60; lat += step) {
            for (let lon = -150; lon <= 150; lon += step) {
                const circle = d3.geoCircle().center([lon, lat]).radius(2.5)();
                ctx.beginPath();
                path(circle);
                ctx.fillStyle = 'rgba(247, 37, 133, 0.1)';
                ctx.fill();
                ctx.stroke();
            }
        }
    }
    
    // 5. Outline
    ctx.beginPath();
    path({type: 'Sphere'});
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

init();
