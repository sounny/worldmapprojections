/**
 * World Map Projections — Modern Discovery Engine
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
let world = null;
let showTissot = true;
let showGrat = true;
let rotation = [0, 0, 0];
let projection;

// Initialize
async function init() {
    // Load Data
    const response = await fetch('data/world-110m.json');
    world = await response.json();
    
    window.addEventListener('resize', resize);
    resize();
    
    setupListeners();
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
}

function render() {
    if (!world) return;
    
    ctx.clearRect(0, 0, width, height);
    
    const projType = select.value;
    
    // Create projection
    if (d3[projType]) {
        projection = d3[projType]();
    } else if (d3.geoProjection) {
        // Fallback for custom or plugin projections
        projection = d3[projType]();
    }
    
    projection
        .translate([width / 2, height / 2])
        .rotate(rotation);

    // Dynamic scaling
    const scale = Math.min(width, height) / (projType.includes('Azimuthal') || projType.includes('Orthographic') ? 2.2 : 5.5);
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
