'use strict';

// Theme ---------------------------------------------------------------
const root=document.documentElement;
const themeChoices=Array.from(document.querySelectorAll('[data-theme-choice]'));
const themeMeta=document.getElementById('theme-color');
function applyTheme(theme,persist=true){
  const next=theme==='dark'?'dark':'light';
  root.dataset.theme=next;
  themeChoices.forEach(button=>{
    const active=button.dataset.themeChoice===next;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  if(themeMeta)themeMeta.setAttribute('content',next==='dark'?'#10110f':'#f7f7f2');
  if(persist){try{localStorage.setItem('akhil-theme',next);}catch{}}
  window.dispatchEvent(new CustomEvent('themechange',{detail:{theme:next}}));
}
applyTheme(root.dataset.theme==='dark'?'dark':'light',false);
themeChoices.forEach(button=>button.addEventListener('click',()=>applyTheme(button.dataset.themeChoice)));

// Book covers ---------------------------------------------------------
const bookCovers=[
  {
    urls:[
      'https://covers.openlibrary.org/b/isbn/9780977304561-L.jpg',
      'https://covers.openlibrary.org/b/isbn/9780977304585-L.jpg'
    ],
    alts:['The Art of Problem Solving, Volume 1 cover','The Art of Problem Solving, Volume 2 cover'],
    titles:['AoPS Volume 1','AoPS Volume 2'],
    edition:'Volumes 1 & 2 · 7th edition covers'
  },
  {
    urls:['https://covers.openlibrary.org/b/isbn/9781934124048-L.jpg'],
    alts:['Intermediate Algebra by Richard Rusczyk and Mathew Crawford book cover'],
    titles:['Intermediate Algebra'],
    edition:'AoPS · Richard Rusczyk & Mathew Crawford'
  },
  {
    urls:['https://covers.openlibrary.org/b/isbn/9781934124062-L.jpg'],
    alts:['Intermediate Counting & Probability by David Patrick book cover'],
    titles:['Intermediate Counting & Probability'],
    edition:'AoPS · David Patrick'
  },
  {
    urls:['https://covers.openlibrary.org/b/isbn/9780070856134-L.jpg'],
    alts:['Principles of Mathematical Analysis by Walter Rudin, third edition book cover'],
    titles:['Principles of Mathematical Analysis'],
    edition:'Walter Rudin · 3rd edition'
  },
  {
    urls:['https://covers.openlibrary.org/b/isbn/9781305480513-L.jpg'],
    alts:['Calculus by James Stewart, eighth edition book cover'],
    titles:['Calculus'],
    edition:'James Stewart · 8th edition'
  },
  {
    urls:['https://covers.openlibrary.org/b/isbn/9780135851258-L.jpg'],
    alts:['Linear Algebra and Its Applications by Lay, Lay and McDonald, sixth edition book cover'],
    titles:['Linear Algebra and Its Applications'],
    edition:'Lay, Lay & McDonald · 6th edition'
  }
];

function coverFallback(title){
  const fallback=document.createElement('div');
  fallback.className='book-cover-fallback';
  fallback.setAttribute('role','img');
  fallback.setAttribute('aria-label',`${title} cover`);
  fallback.innerHTML=`<span>BOOK / COVER</span><strong>${title}</strong><small>Cover preview unavailable</small>`;
  return fallback;
}

function updateBookCover(index){
  const selected=bookCovers[index],stage=$('book-cover-stage');
  if(!stage||stage.dataset.current===String(index))return;
  stage.dataset.current=String(index);
  stage.replaceChildren();
  selected.urls.forEach((url,i)=>{
    const img=document.createElement('img');
    img.src=url;
    img.alt=selected.alts[i];
    img.width=280;
    img.height=380;
    img.decoding='async';
    img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>img.replaceWith(coverFallback(selected.titles[i])),{once:true});
    stage.appendChild(img);
  });
  $('book-edition').textContent=selected.edition;
}
updateBookCover(0);

// Penney's game -------------------------------------------------------
const sequenceButtons=Array.from(document.querySelectorAll('[data-sequence]'));
let penneyChoice=null,penneyCounter=null;
const opposite=flip=>flip==='H'?'T':'H';
function counterPattern(sequence){return opposite(sequence[1])+sequence.slice(0,2);}
function chooseSequence(sequence){
  penneyChoice=sequence;penneyCounter=counterPattern(sequence);
  sequenceButtons.forEach(button=>button.classList.toggle('selected',button.dataset.sequence===sequence));
  $('penney-player').textContent=sequence;$('penney-computer').textContent=penneyCounter;
  $('penney-status').textContent=`You chose ${sequence}. The counter-pattern is ${penneyCounter}.`;
  $('penney-run').disabled=false;$('penney-result').hidden=true;
}
function racePatterns(a,b){
  let trail='';
  for(let toss=0;toss<500;toss++){
    trail+=(Math.random()<.5?'H':'T');if(trail.length>3)trail=trail.slice(-3);
    if(trail===a)return 'player';if(trail===b)return 'counter';
  }
  return 'counter';
}
function simulatePenney(rounds=1000){
  let player=0,counter=0;
  for(let i=0;i<rounds;i++)racePatterns(penneyChoice,penneyCounter)==='player'?player++:counter++;
  return {player,counter,rounds};
}
sequenceButtons.forEach(button=>button.addEventListener('click',()=>chooseSequence(button.dataset.sequence)));
$('penney-run')?.addEventListener('click',()=>{
  if(!penneyChoice)return;
  const r=simulatePenney();const pct=r.counter/r.rounds*100;
  $('penney-result').hidden=false;
  $('penney-result').innerHTML=`<strong>${penneyCounter}</strong> won ${r.counter.toLocaleString()} of ${r.rounds.toLocaleString()} races <span>(${pct.toFixed(1)}%)</span>. Re-run it and the exact number will move, but the structural advantage remains.`;
});
$('penney-reset')?.addEventListener('click',()=>{
  penneyChoice=penneyCounter=null;sequenceButtons.forEach(button=>button.classList.remove('selected'));
  $('penney-player').textContent='—';$('penney-computer').textContent='—';$('penney-status').textContent='Pick any three-flip pattern.';$('penney-run').disabled=true;$('penney-result').hidden=true;
});

// Four-state Markov chain --------------------------------------------
// Zeros deliberately remove direct edges. The long-run share is roughly A 12%, B 57%, C 10%, D 21%.
const transitionMatrix=[
  [.15,.65,.20,0],
  [.10,.55,0,.35],
  [0,.60,.25,.15],
  [.20,.55,.25,0]
];
const stateNames=['A','B','C','D'];
const nodePositions=[[105,220],[310,82],[515,220],[310,360]];
let markovState=1,markovSteps=0,markovCounts=[0,1,0,0],markovRunning=false,markovMoving=false,markovFrame=0,markovTimer=0;
const edgePaths=new Map(),nodeGroups=[],visitStats=[],nodePulses=[];
for(let i=0;i<stateNames.length;i++){
  const [x,y]=nodePositions[i],group=svgElement('g',{class:'markov-node',role:'button',tabindex:0,'aria-label':`Start at state ${stateNames[i]}`},$('markov-nodes'));
  svgElement('circle',{cx:x,cy:y,r:35},group);svgElement('text',{x,y},group,stateNames[i]);
  group.addEventListener('click',()=>resetMarkov(i));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();resetMarkov(i);}});nodeGroups.push(group);
  const stat=document.createElement('div');stat.className='visit-stat';const label=document.createElement('span');label.textContent=stateNames[i];const count=document.createElement('strong'),percentage=document.createElement('small'),track=document.createElement('div'),fill=document.createElement('div');track.className='visit-track';fill.className='visit-fill';track.appendChild(fill);stat.append(label,count,percentage,track);$('markov-visits').appendChild(stat);visitStats.push({stat,count,percentage,fill});
}
function makeEdge(i,j){
  const a=nodePositions[i],b=nodePositions[j],center=[310,220];
  if(i===j){
    const dist=Math.max(1,Math.hypot(a[0]-center[0],a[1]-center[1])),ux=(a[0]-center[0])/dist,uy=(a[1]-center[1])/dist,nx=-uy,ny=ux;
    const start=[a[0]+ux*25+nx*26,a[1]+uy*25+ny*26],end=[a[0]+ux*25-nx*26,a[1]+uy*25-ny*26];
    return `M${start} C${a[0]+ux*92+nx*62},${a[1]+uy*92+ny*62} ${a[0]+ux*92-nx*62},${a[1]+uy*92-ny*62} ${end}`;
  }
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
  const bend=(i+j)%2===0?24:-24,c=[(a[0]+b[0])/2+nx*bend,(a[1]+b[1])/2+ny*bend];
  const startLen=Math.hypot(c[0]-a[0],c[1]-a[1]),endLen=Math.hypot(c[0]-b[0],c[1]-b[1]);
  return `M${a[0]+(c[0]-a[0])/startLen*37},${a[1]+(c[1]-a[1])/startLen*37} Q${c} ${b[0]+(c[0]-b[0])/endLen*39},${b[1]+(c[1]-b[1])/endLen*39}`;
}
transitionMatrix.forEach((row,i)=>row.forEach((p,j)=>{if(p<=0)return;const path=svgElement('path',{d:makeEdge(i,j),class:'markov-edge','marker-end':'url(#markov-arrow)'},$('markov-edges'));edgePaths.set(i+','+j,path);}));
function updateMarkovStats(){
  $('markov-step-count').textContent='Step '+markovSteps;$('markov-state-label').textContent=stateNames[markovState];
  nodeGroups.forEach((g,i)=>{g.classList.toggle('active',i===markovState);g.setAttribute('aria-pressed',String(i===markovState));});
  visitStats.forEach(({stat,count,percentage,fill},i)=>{const pct=markovCounts[i]/(markovSteps+1)*100;count.textContent=String(markovCounts[i]);percentage.textContent=pct.toFixed(1)+'%';fill.style.width=pct+'%';stat.classList.toggle('active',i===markovState);});
}
function positionTraveler(x,y){$('markov-traveler').setAttribute('transform',`translate(${x} ${y})`);}
function stopMarkov(cancel=false){markovRunning=false;clearTimeout(markovTimer);$('markov-run').textContent='Run';if(cancel){cancelAnimationFrame(markovFrame);markovMoving=false;positionTraveler(...nodePositions[markovState]);$('markov-step').disabled=false;}$('markov-status').textContent=markovMoving?'Pausing after this transition.':`Paused at ${stateNames[markovState]}. ${markovSteps} transitions complete.`;}
function resetMarkov(start=1){stopMarkov(true);markovState=start;markovSteps=0;markovCounts=[0,0,0,0];markovCounts[start]=1;nodePulses.forEach(pulse=>pulse?.cancel());nodeGroups.forEach(g=>g.classList.remove('node-hit'));positionTraveler(...nodePositions[start]);updateMarkovStats();$('markov-status').textContent=`Ready. Starting at ${stateNames[start]}.`;}
function sampleMarkov(row,draw=Math.random()){let sum=0;for(let i=0;i<row.length;i++){sum+=row[i];if(draw<sum)return i;}return row.findLastIndex(p=>p>0);}
function pulseNode(i){
  if(reducedMotion.matches)return;const circle=nodeGroups[i].children[0];nodePulses[i]?.cancel();
  const css=getComputedStyle(root),base=css.getPropertyValue('--node-bg').trim()||'#f7f7f2',ink=css.getPropertyValue('--ink').trim()||'#171714',accent=css.getPropertyValue('--accent').trim()||'#f34c28';
  if(circle.animate)nodePulses[i]=circle.animate([{fill:accent,stroke:accent},{fill:base,stroke:ink}],{duration:720,easing:'cubic-bezier(.2,.8,.2,1)'});else nodeGroups[i].classList.add('node-hit');
}
function markovStep(){
  if(markovMoving)return;const from=markovState,to=sampleMarkov(transitionMatrix[from]),path=edgePaths.get(from+','+to);if(!path)return;
  const length=path.getTotalLength(),duration=Number($('markov-speed').value);markovMoving=true;$('markov-step').disabled=true;$('markov-status').textContent=`${stateNames[from]} → ${stateNames[to]}`;nodeGroups.forEach(g=>g.classList.remove('node-hit'));
  const arrive=()=>{markovState=to;markovSteps++;markovCounts[to]++;markovMoving=false;positionTraveler(...nodePositions[to]);updateMarkovStats();pulseNode(to);$('markov-step').disabled=false;if(markovRunning)markovTimer=setTimeout(markovStep,reducedMotion.matches?duration:160);else $('markov-status').textContent=`Paused at ${stateNames[to]}. ${markovSteps} transitions complete.`;};
  if(reducedMotion.matches){arrive();return;}
  const start=performance.now(),edgeStart=path.getPointAtLength(0),edgeEnd=path.getPointAtLength(length);
  const travel=now=>{const progress=Math.min(1,(now-start)/duration);let point;if(progress<.12){const t=progress/.12;point={x:nodePositions[from][0]+(edgeStart.x-nodePositions[from][0])*t,y:nodePositions[from][1]+(edgeStart.y-nodePositions[from][1])*t};}else if(progress>.88){const t=(progress-.88)/.12;point={x:edgeEnd.x+(nodePositions[to][0]-edgeEnd.x)*t,y:edgeEnd.y+(nodePositions[to][1]-edgeEnd.y)*t};}else point=path.getPointAtLength((progress-.12)/.76*length);positionTraveler(point.x,point.y);if(progress<1)markovFrame=requestAnimationFrame(travel);else arrive();};
  markovFrame=requestAnimationFrame(travel);
}
$('markov-run')?.addEventListener('click',()=>{if(markovRunning){stopMarkov();return;}markovRunning=true;$('markov-run').textContent='Pause';if(!markovMoving)markovStep();});
$('markov-step')?.addEventListener('click',()=>{stopMarkov();markovStep();});$('markov-reset')?.addEventListener('click',()=>resetMarkov(1));
resetMarkov(1);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMarkov(true);});
if('IntersectionObserver' in window){const pauseObserver=new IntersectionObserver(entries=>{if(entries.every(entry=>!entry.isIntersecting)&&markovRunning)stopMarkov(true);},{threshold:0});pauseObserver.observe($('markov'));}

// Scroll-counted stats ------------------------------------------------
const countNodes=Array.from(document.querySelectorAll('.count-up'));
function formatCount(node,value,final=false){
  const target=Number(node.dataset.countTo),decimals=Number(node.dataset.countDecimals||0),prefix=node.dataset.countPrefix||'',suffix=node.dataset.countSuffix||'';
  let body=decimals?value.toFixed(decimals):String(Math.round(value));
  if(node.dataset.countFormat==='comma')body=Number(body).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  if(final&&decimals)body=target.toFixed(decimals);
  return prefix+body+suffix;
}
function animateCount(node){
  if(node.dataset.counted==='true')return;node.dataset.counted='true';const target=Number(node.dataset.countTo),duration=900,start=performance.now();
  if(reducedMotion.matches){node.textContent=formatCount(node,target,true);return;}
  const tick=now=>{const t=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-t,4);node.textContent=formatCount(node,target*ease,t===1);if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
}
if('IntersectionObserver' in window){
  const countObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){animateCount(entry.target);countObserver.unobserve(entry.target);}}),{threshold:.55});
  countNodes.forEach(node=>{node.textContent=formatCount(node,0);countObserver.observe(node);});
}else countNodes.forEach(animateCount);

// Branching competition timeline -------------------------------------
const competitionTimeline=$('competition-timeline');
if(competitionTimeline&&!reducedMotion.matches){
  const timelineNodes=Array.from(competitionTimeline.querySelectorAll('.timeline-node'));let timelineTicking=false;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const updateTimeline=()=>{
    timelineTicking=false;const vh=window.innerHeight,rect=competitionTimeline.getBoundingClientRect();
    const progress=clamp((vh*.70-rect.top)/(Math.max(1,rect.height-vh*.15)));competitionTimeline.style.setProperty('--timeline-progress',progress.toFixed(4));
    timelineNodes.forEach(node=>{const r=node.getBoundingClientRect(),p=clamp((vh*.82-r.top)/(vh*.42));node.style.setProperty('--branch-progress',p.toFixed(4));node.classList.toggle('timeline-visible',p>.02);});
  };
  const requestTimeline=()=>{if(!timelineTicking){timelineTicking=true;requestAnimationFrame(updateTimeline);}};
  addEventListener('scroll',requestTimeline,{passive:true});addEventListener('resize',requestTimeline);requestTimeline();
}else if(competitionTimeline){competitionTimeline.style.setProperty('--timeline-progress','1');competitionTimeline.querySelectorAll('.timeline-node').forEach(node=>node.style.setProperty('--branch-progress','1'));}

// Section entrances ---------------------------------------------------
if(!reducedMotion.matches&&'IntersectionObserver' in window){
  const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}});},{threshold:.06,rootMargin:'0px 0px -35px 0px'});
  document.querySelectorAll('.hero-top,.hero h1,.hero-bottom,.section-head,.knowledge,.subhead,.books-layout,.probability-game,.cs-stack,.research-feature,.project,.project-rows article,.hackathons,.results,.market-panel,.wharton,.markov-panel,.sim-panel,.current-work,.experience-list article,.academic-stats,.coursework').forEach((node,i)=>{
    if(node.parentElement.closest('.probability-game,.markov-panel,.sim-panel,.research-feature'))return;
    node.classList.add('reveal');if(node.matches('.probability-game,.market-panel,.markov-panel,.sim-panel,.project'))node.classList.add('reveal-scale');if(node.matches('.project,.project-rows article'))node.style.setProperty('--reveal-delay',(i%2)*90+'ms');revealObserver.observe(node);
  });
  reducedMotion.addEventListener('change',event=>{if(event.matches){document.querySelectorAll('.reveal').forEach(node=>node.classList.add('is-visible'));revealObserver.disconnect();}});
}
