'use strict';
const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const books = [
  ['The Art of Problem Solving', 'Volumes 1 & 2 · AoPS', 'A broad foundation in algebra, geometry, number theory, counting, and problem-solving techniques.'],
  ['Intermediate Algebra', 'AoPS', 'Polynomials, complex numbers, sequences, inequalities, and the algebra behind challenging problems.'],
  ['Intermediate Counting & Probability', 'AoPS', 'Combinatorial reasoning, counting methods, probability, and the art of choosing the right approach.'],
  ['Principles of Mathematical Analysis', 'Walter Rudin', 'A rigorous treatment of limits, continuity, differentiation, integration, and sequences of functions.'],
  ['Calculus', 'James Stewart', 'Single-variable and multivariable calculus, through partial derivatives, multiple integrals, and vector calculus.'],
  ['Linear Algebra and Its Applications', 'Linear algebra', 'Systems of equations, vector spaces, linear transformations, eigenvalues, and their applications.']
];
let currentBook = 0;
function selectBook(index) {
  currentBook = (index + books.length) % books.length;
  const [title, author, description] = books[currentBook];
  $('book-count').textContent = `${String(currentBook + 1).padStart(2, '0')} / 06`;
  $('book-title').textContent = title; $('book-author').textContent = author; if (typeof updateBookCover === 'function') updateBookCover(currentBook);
  document.querySelectorAll('[data-book]').forEach((button, i) => {button.classList.toggle('selected', i === currentBook); button.setAttribute('aria-pressed', String(i === currentBook));});
}
document.querySelectorAll('[data-book]').forEach(button => ['click','pointerenter','focus'].forEach(event=>button.addEventListener(event, () => selectBook(Number(button.dataset.book)))));
$('book-prev').addEventListener('click', () => selectBook(currentBook - 1));
$('book-next').addEventListener('click', () => selectBook(currentBook + 1));

const sections = document.querySelectorAll('main>section');
const navLinks = document.querySelectorAll('.site-header nav a');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {for (const entry of entries) if (entry.isIntersecting) navLinks.forEach(link => {const active = link.hash === '#' + entry.target.id;link.classList.toggle('active', active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}, {rootMargin:'-15% 0px -60% 0px'});
  sections.forEach(section => observer.observe(section));
}

// Intentionally synthetic. Only the start and final 114% gain reflect the supplied result.
const anchors = [[0,100],[5,108],[9,102],[15,124],[20,117],[25,145],[30,132],[36,168],[41,155],[47,194],[51,179],[56,204],[60,214]];
const equity = Array.from({length:61}, (_, day) => {
  let k = anchors.findIndex(([d]) => d >= day); if(k === 0) return 100;
  const [a, x] = anchors[k-1], [b, y] = anchors[k], t = (day-a)/(b-a);
  return x+(y-x)*t+Math.sin(t*Math.PI)*Math.sin(day*3.7)*3;
});
const px = i => 50 + i/60*925, py = value => 300 - (value-80)/160*270;
const ns = 'http://www.w3.org/2000/svg';
function svgElement(tag, attrs, parent, content) {const node = document.createElementNS(ns, tag); for(const [key,val] of Object.entries(attrs)) node.setAttribute(key,String(val)); if(content)node.textContent=content; parent.appendChild(node); return node;}
[100,140,180,220].forEach(value => {svgElement('line',{x1:50,x2:975,y1:py(value),y2:py(value),class:'grid-line'},$('equity-grid'));svgElement('text',{x:0,y:py(value)+4,class:'grid-text'},$('equity-grid'),String(value));});
const line = equity.map((value,i)=>`${i?'L':'M'}${px(i).toFixed(1)},${py(value).toFixed(1)}`).join(' ');
$('equity-line').setAttribute('d',line);$('equity-area').setAttribute('d',`${line} L975,300 L50,300 Z`);
[0,15,30,47,60].forEach(day=>svgElement('circle',{cx:px(day),cy:py(equity[day]),r:5,class:'trade-marker'},$('trade-markers')));
const sampleEvents = [
  [0,'Build a position','An illustrative entry before a favorable move. Actual trades have not been supplied.'],
  [12,'Add into strength','A sample increase in exposure as the synthetic portfolio rises.'],
  [26,'Manage the drawdown','An illustrative pullback shows the risk that accompanies an aggressive strategy.'],
  [42,'Take some profit','A sample exit after a rally illustrates timing decisions.'],
  [56,'Finish the season','The illustration ends at 214, representing the supplied 114% portfolio growth.']
];
function updateTrade(day) {
  day=Math.max(0,Math.min(60,Math.round(day)));$('trade-range').value=String(day);
  const x=px(day),y=py(equity[day]);$('equity-cursor').setAttribute('x1',x);$('equity-cursor').setAttribute('x2',x);$('equity-cursor').setAttribute('y1',15);$('equity-cursor').setAttribute('y2',300);$('equity-dot').setAttribute('cx',x);$('equity-dot').setAttribute('cy',y);
  $('trade-readout').textContent=`${day===0?'START':day===60?'FINISH':Math.round(day/60*100)+'% OF SEASON'} · ${equity[day].toFixed(1)}`;
  let event=0; sampleEvents.forEach((item,i)=>{if(day>=item[0])event=i;});
  $('trade-event-number').textContent=`Example / 0${event+1}`;$('trade-event-title').textContent=sampleEvents[event][1];$('trade-event-text').textContent=sampleEvents[event][2];
}
$('trade-range').addEventListener('input', e=>updateTrade(Number(e.target.value)));
$('equity-svg').addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&e.buttons===0)return;const box=e.currentTarget.getBoundingClientRect();updateTrade(((e.clientX-box.left)/box.width*1000-50)/925*60);});
$('equity-svg').addEventListener('click',e=>{const box=e.currentTarget.getBoundingClientRect();updateTrade(((e.clientX-box.left)/box.width*1000-50)/925*60);});
updateTrade(0);

const canvas=$('sim-canvas'),ctx=canvas.getContext('2d');
let simulation=null, frame=0, animationId=0, simulationRunning=false;
function normalSample(){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function generateSimulation(drift,volatility,count){
  const paths=[],firstShocks=[];
  let lo=100,hi=100;
  for(let j=0;j<count;j++){
    const path=[100];
    for(let day=1;day<=252;day++){const z=normalSample();if(j===0)firstShocks.push(z);const price=path[day-1]*Math.exp((drift-.5*volatility*volatility)/252+volatility/Math.sqrt(252)*z);path.push(price);lo=Math.min(lo,price);hi=Math.max(hi,price);}
    paths.push(path);
  }
  const ends=paths.map(path=>path[252]).sort((a,b)=>a-b);
  const quantile=q=>{const pos=(ends.length-1)*q,a=Math.floor(pos);return ends[a]+(ends[Math.min(a+1,ends.length-1)]-ends[a])*(pos-a);};
  return {paths,firstShocks,lo:Math.max(0,lo*.92),hi:hi*1.06,low:quantile(.1),median:quantile(.5),high:quantile(.9)};
}
function drawSimulation(day){
  if(!ctx)return;
  const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const css=getComputedStyle(document.documentElement),dark=document.documentElement.dataset.theme==='dark',accent=css.getPropertyValue('--accent').trim()||'#ef4825',muted=css.getPropertyValue('--muted').trim()||'#626759',gridColor=dark?'#34372f':'#c7cdbc',pathColor=dark?'rgba(173,190,163,.16)':`rgba(62,83,49,${simulation?.paths?.length>100?.13:.2})`;
  const left=40,top=16,right=12,bottom=18,lo=simulation?.lo??50,hi=simulation?.hi??180;
  const x=i=>left+i/252*(width-left-right),y=v=>top+(hi-v)/(hi-lo)*(height-top-bottom);
  ctx.font='11px monospace';ctx.textBaseline='middle';
  for(let i=0;i<=4;i++){const value=lo+(hi-lo)*i/4,yy=y(value);ctx.strokeStyle=gridColor;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(width-right,yy);ctx.stroke();ctx.fillStyle=muted;ctx.fillText(String(Math.round(value)),0,yy);}
  if(!simulation){ctx.fillStyle=muted;ctx.font='13px monospace';ctx.textAlign='center';ctx.fillText('Run to explore the possibilities',width/2,height/2);ctx.textAlign='left';return;}
  simulation.paths.forEach((path,j)=>{ctx.beginPath();for(let i=0;i<=day;i++){if(i===0)ctx.moveTo(x(i),y(path[i]));else ctx.lineTo(x(i),y(path[i]));}ctx.strokeStyle=j===0?accent:pathColor;ctx.lineWidth=j===0?2:1;ctx.stroke();});
  // Draw the highlighted sampled path on top of all other paths.
  ctx.beginPath();for(let i=0;i<=day;i++){if(i===0)ctx.moveTo(x(i),y(simulation.paths[0][i]));else ctx.lineTo(x(i),y(simulation.paths[0][i]));}ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  if(day>0&&day<252){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x(day),y(simulation.paths[0][day]),3,0,Math.PI*2);ctx.fill();}
}
function renderSample(day){const shock=day>0?simulation.firstShocks[day-1]:0;$('sample-value').textContent=`z = ${shock>=0?'+':''}${shock.toFixed(3)}`;$('sample-day').textContent=`Day ${day} / 252 · Highlighted path`;}
function finishSimulation(){frame=252;drawSimulation(frame);renderSample(frame);simulationRunning=false;['drift','volatility','paths'].forEach(id=>$(id).disabled=false);$('run-sim').disabled=false;$('run-sim').textContent='Run again';$('sim-low').textContent=simulation.low.toFixed(1);$('sim-median').textContent=simulation.median.toFixed(1);$('sim-high').textContent=simulation.high.toFixed(1);$('sim-status').textContent=`${simulation.paths.length} paths complete. Ending values use an initial index of 100. Each run draws new random shocks.`;canvas.setAttribute('aria-label',`${simulation.paths.length} simulated stock paths from 100 over 252 trading days (about one year). Median ending value ${simulation.median.toFixed(1)}, 10th percentile ${simulation.low.toFixed(1)}, 90th percentile ${simulation.high.toFixed(1)}.`);}
function runSimulation(animate=true){
  cancelAnimationFrame(animationId);simulationRunning=true;['drift','volatility','paths'].forEach(id=>$(id).disabled=true);
  const drift=Number($('drift').value)/100,vol=Number($('volatility').value)/100,count=Number($('paths').value);
  simulation=generateSimulation(drift,vol,count);frame=0;$('run-sim').disabled=true;$('run-sim').textContent='Sampling…';$('sim-status').textContent=`Sampling ${count} possible paths…`;['sim-low','sim-median','sim-high'].forEach(id=>$(id).textContent='…');
  if(reducedMotion.matches||!animate){finishSimulation();return simulation;}
  const start=performance.now();
  const tick=now=>{frame=Math.min(252,Math.floor((now-start)/3200*252));drawSimulation(frame);renderSample(frame);if(frame<252)animationId=requestAnimationFrame(tick);else finishSimulation();};
  animationId=requestAnimationFrame(tick);return simulation;
}
function updateAssumptions(){ $('drift-value').textContent=$('drift').value+'%';$('volatility-value').textContent=$('volatility').value+'%';if(simulation&&!simulationRunning)$('sim-status').textContent='Assumptions changed. Run again to update the paths.';}
['drift','volatility','paths'].forEach(id=>$(id).addEventListener('input',updateAssumptions));
$('run-sim').addEventListener('click',()=>runSimulation());
$('reset-sim').addEventListener('click',()=>{cancelAnimationFrame(animationId);simulationRunning=false;['drift','volatility','paths'].forEach(id=>$(id).disabled=false);simulation=null;frame=0;$('drift').value='8';$('volatility').value='25';$('paths').value='100';updateAssumptions();$('run-sim').disabled=false;$('run-sim').textContent='Run simulation';$('sample-value').textContent='z = +0.000';$('sample-day').textContent='Ready to sample';['sim-low','sim-median','sim-high'].forEach(id=>$(id).textContent='—');$('sim-status').textContent='Choose your assumptions and run the simulation.';canvas.setAttribute('aria-label','Monte Carlo simulated stock paths over one year. Ready to run.');drawSimulation(0);});
if('ResizeObserver' in window)new ResizeObserver(()=>drawSimulation(frame)).observe(canvas);else window.addEventListener('resize',()=>drawSimulation(frame));
window.addEventListener('themechange',()=>drawSimulation(frame));
drawSimulation(0);
// Populate the demonstration once it comes into view, without doing animation work off screen.
if('IntersectionObserver' in window){const simObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){if(!simulation)runSimulation();simObserver.disconnect();}},{threshold:.2});simObserver.observe($('simulation'));}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&simulationRunning){cancelAnimationFrame(animationId);finishSimulation();}});

// Optional agent access uses the same controls, state, and calculation as the visible demo.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({name:'run_monte_carlo_demo',title:'Run Monte Carlo demonstration',description:'Set the visible demonstration assumptions and run a synthetic one-year stock simulation. This is not a trading or forecasting tool.',inputSchema:{type:'object',properties:{driftPercent:{type:'integer',minimum:-20,maximum:40},volatilityPercent:{type:'integer',minimum:5,maximum:70},paths:{type:'integer',enum:[30,100,200]}},required:['driftPercent','volatilityPercent','paths'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['driftPercent','volatilityPercent','paths'].includes(key))||!Number.isInteger(input.driftPercent)||input.driftPercent< -20||input.driftPercent>40||!Number.isInteger(input.volatilityPercent)||input.volatilityPercent<5||input.volatilityPercent>70||![30,100,200].includes(input.paths))throw new Error('Use integer drift from -20 to 40, volatility from 5 to 70, and 30, 100, or 200 paths.');$('drift').value=String(input.driftPercent);$('volatility').value=String(input.volatilityPercent);$('paths').value=String(input.paths);updateAssumptions();const result=runSimulation(false);return {paths:input.paths,startValue:100,days:252,percentile10:result.low,median:result.median,percentile90:result.high,synthetic:true};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
