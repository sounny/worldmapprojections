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
    
    // Update active button states
    document.getElementById('btn-res-110m').classList.toggle('active', res === '110m');
    document.getElementById('btn-res-50m').classList.toggle('active', res === '50m');
    
    if (indicator) indicator.style.display = 'none';
    render();
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
        scaleDivisor = 6.5; // Avoid overflowing too much
    }

    const scale = Math.min(width, height) / scaleDivisor;
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
    const countries = topojson.feature(world, world.objects.countries);
    ctx.beginPath();
    path(countries);
    ctx.fillStyle = 'rgba(76, 201, 240, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

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
