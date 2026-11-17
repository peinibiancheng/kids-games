/* 佩奇的快乐小游戏 3D 版 — 全部美术由 Three.js 基础几何体程序化生成 */
(function(){
'use strict';

/* ---------------- 渲染器 / 相机 / 通用工具 ---------------- */
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
view.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, .1, 300);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();
let t = 0;
let scene = null, camPos = new THREE.Vector3(0,6,16), camTarget = new THREE.Vector3(0,2,0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const matCache = new Map();
function mat(color, opts){
  const key = color + '|' + JSON.stringify(opts || {});
  if(!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial(Object.assign({color, flatShading:true}, opts||{})));
  return matCache.get(key);
}
function add(parent, geo, color, x, y, z, opts){
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.set(x||0, y||0, z||0);
  m.castShadow = !(opts && opts.cast === false);
  m.receiveShadow = !!(opts && opts.receive);
  if(opts && opts.rot) m.rotation.set(opts.rot[0]||0, opts.rot[1]||0, opts.rot[2]||0);
  if(opts && opts.scale) m.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
  parent.add(m); return m;
}
function box(p,w,h,d,c,x,y,z,o){ return add(p,new THREE.BoxGeometry(w,h,d),c,x,y,z,o); }
function ball(p,r,c,x,y,z,o){ return add(p,new THREE.SphereGeometry(r,20,14),c,x,y,z,o); }
function cyl(p,rt,rb,h,c,x,y,z,o){ return add(p,new THREE.CylinderGeometry(rt,rb,h,18),c,x,y,z,o); }
function cone(p,r,h,c,x,y,z,o){ return add(p,new THREE.ConeGeometry(r,h,18),c,x,y,z,o); }
function torus(p,r,tube,c,x,y,z,o){ return add(p,new THREE.TorusGeometry(r,tube,10,24),c,x,y,z,o); }
function newScene(bg){
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  s.fog = new THREE.Fog(bg, 38, 120);
  s.add(new THREE.AmbientLight(0xffffff, .68));
  const sun = new THREE.DirectionalLight(0xfff3d8, .85);
  sun.position.set(14, 26, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  s.add(sun);
  return s;
}
function setCam(px,py,pz, tx,ty,tz){ camPos.set(px,py,pz); camTarget.set(tx,ty,tz); }

/* ---------------- 程序化小猪角色 ---------------- */
function pig(opts){
  opts = opts || {};
  const body = opts.body || 0xffb3d1, dress = opts.dress || 0xf3425c;
  const g = new THREE.Group();
  const legL = cyl(g,.19,.19,.8,body,-.45,.4,0);
  const legR = cyl(g,.19,.19,.8,body,.45,.4,0);
  ball(g,1,body,0,1.25,0,{scale:[.95,1.05,.82]});
  if(dress) cyl(g,.72,1.02,1.15,dress,0,1.05,0);
  const armL = cyl(g,.15,.15,.9,body,-1.02,1.55,0,{rot:[0,0,.45]});
  const armR = cyl(g,.15,.15,.9,body,1.02,1.55,0,{rot:[0,0,-.45]});
  cyl(g,.09,.09,.45,body,0,1.95,-.8,{rot:[.7,0,0]});
  ball(g,.9,body,0,2.85,0);
  cone(g,.24,.46,body,-.46,3.68,0); cone(g,.24,.46,body,.46,3.68,0);
  cyl(g,.42,.42,.34,0xffc6dd,0,2.66,.86,{rot:[Math.PI/2,0,0]});
  ball(g,.065,0xc9678b,-.16,2.66,1.05,{cast:false});
  ball(g,.065,0xc9678b,.16,2.66,1.05,{cast:false});
  ball(g,.16,0xffffff,-.32,3.05,.72,{cast:false});
  ball(g,.16,0xffffff,.32,3.05,.72,{cast:false});
  ball(g,.08,0x3c3034,-.32,3.05,.86,{cast:false});
  ball(g,.08,0x3c3034,.32,3.05,.86,{cast:false});
  ball(g,.14,0xff8fb6,-.58,2.7,.66,{cast:false});
  ball(g,.14,0xff8fb6,.58,2.7,.66,{cast:false});
  if(opts.glasses){ torus(g,.24,.045,0x4b3a3c,-.32,3.05,.78); torus(g,.24,.045,0x4b3a3c,.32,3.05,.78); }
  if(opts.lashes){
    box(g,.05,.28,.05,0x4b3a3c,-.5,3.24,.72,{rot:[0,0,.5],cast:false});
    box(g,.05,.28,.05,0x4b3a3c,.5,3.24,.72,{rot:[0,0,-.5],cast:false});
  }
  g.scale.setScalar(opts.scale || 1);
  g.userData = { armL, armR, legL, legR, phase: Math.random()*6, baseY:0 };
  return g;
}
function animatePig(g, energy){
  const u = g.userData, e = energy || 1;
  g.position.y = u.baseY + Math.sin(t*3.4+u.phase)*.05*e;
  u.armL.rotation.x = Math.sin(t*5+u.phase)*.18*e;
  u.armR.rotation.x = -Math.sin(t*5+u.phase)*.18*e;
}

/* ---------------- 场景素材 ---------------- */
function ground(s, color){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(240,240), mat(color||0x83d45f));
  m.rotation.x = -Math.PI/2; m.receiveShadow = true; s.add(m); return m;
}
function hill(s,x,z,r,c){ ball(s,r,c,x,-r*.62,z,{scale:[1,.62,.8],cast:false}); }
function cloud(s,x,y,z,scale){
  const g = new THREE.Group();
  ball(g,1,0xffffff,-1,0,0,{scale:[1.2,.8,1],cast:false});
  ball(g,1,0xffffff,0,.4,0,{scale:[1.5,1.05,1],cast:false});
  ball(g,1,0xffffff,1.2,0,0,{scale:[1.1,.8,1],cast:false});
  g.position.set(x,y,z); g.scale.setScalar(scale||1); s.add(g); return g;
}
function tree(s,x,z,scale){
  const g = new THREE.Group();
  cyl(g,.22,.3,2.2,0xa46b45,0,1.1,0);
  ball(g,1.35,0x5fbf57,0,2.8,0,{scale:[1,.9,1]});
  ball(g,1.05,0x74d268,-.7,2.3,.2); ball(g,1.05,0x69c95e,.75,2.4,-.1);
  g.position.set(x,0,z); g.scale.setScalar(scale||1); s.add(g); return g;
}
function bush(s,x,z,scale){
  const b=ball(s,1,0x62c255,x,.6,z,{scale:[1.3,.6,1]});
  if(scale) b.scale.multiplyScalar(scale);
}
function house(s,x,z,roofColor){
  const g = new THREE.Group();
  box(g,4,3,3.4,0xfff7e6,0,1.5,0);
  cone(g,3.1,2.2,roofColor||0xe9546d,0,4.1,0,{rot:[0,Math.PI/4,0]});
  box(g,1,1.6,.1,0x9ad9f4,0,1.5,1.72,{cast:false});
  box(g,.8,.8,.1,0xbdeaff,1.3,2.1,1.72,{cast:false});
  g.position.set(x,0,z); s.add(g); return g;
}
function flower(s,x,z,c){ cyl(s,.04,.04,.5,0x4fae46,x,.25,z,{cast:false}); ball(s,.18,c||0xff7f9e,x,.58,z,{cast:false}); }
function starMesh(s,x,y,z,r){
  const shape = new THREE.Shape();
  for(let i=0;i<10;i++){
    const a = -Math.PI/2 + i*Math.PI/5, q = i%2 ? r*.45 : r;
    const px = Math.cos(a)*q, py = Math.sin(a)*q;
    i ? shape.lineTo(px,py) : shape.moveTo(px,py);
  }
  shape.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}), mat(0xffd447));
  m.position.set(x,y,z); s.add(m); return m;
}
function confetti(s, x,y,z){
  const colors=[0xffd447,0xf3425c,0x5fb9e8,0x6ac46a,0xff9d5c];
  for(let i=0;i<40;i++){
    const p = box(s,.18,.18,.06,colors[i%5],x+(Math.random()-.5)*3,y+Math.random()*2,z+(Math.random()-.5)*3,{cast:false});
    p.userData.v = new THREE.Vector3((Math.random()-.5)*5,3+Math.random()*4,(Math.random()-.5)*5);
  }
}

/* ---------------- 音效 ---------------- */
let audioCtx=null, soundOn=localStorage.getItem('peppa3d_sound')!=='0';
function ensureAudio(){
  if(!soundOn) return;
  try{ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
  catch(e){ soundOn=false; }
}
function tone(f,d,type,v,delay){
  if(!soundOn||!audioCtx) return;
  const t0=audioCtx.currentTime+(delay||0), o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t0);
  g.gain.setValueAtTime(.0001,t0); g.gain.exponentialRampToValueAtTime(v||.06,t0+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0+d+.02);
}
function sfx(n){
  if(n==='tap') tone(660,.08,'sine',.05);
  if(n==='pop'){ tone(520,.08,'triangle',.07); tone(780,.12,'sine',.05,.06); }
  if(n==='yay') [523,659,784,1047].forEach((f,i)=>tone(f,.24,'sine',.07,i*.09));
  if(n==='splash'){ tone(220,.16,'triangle',.07); tone(170,.2,'sine',.05,.08); }
  if(n==='boing'){ tone(180,.18,'sine',.08); tone(420,.2,'triangle',.05,.09); }
  if(n==='star') [880,1109,1319].forEach((f,i)=>tone(f,.16,'sine',.06,i*.07));
}

/* ---------------- DOM 界面 ---------------- */
const $ = id => document.getElementById(id);
const screens = ['screen-title','screen-result'];
function show(id){ screens.forEach(s=>$(s).classList.toggle('hidden',s!==id)); }
function hideScreens(){ screens.forEach(s=>$(s).classList.add('hidden')); }
let best={}; try{ best=JSON.parse(localStorage.getItem('peppa3d_best')||'{}')||{}; }catch(e){ best={}; }
const GAMES=[
  {id:'fish',name:'快乐钓鱼',color:'#52b6e8'},
  {id:'tug',name:'大力拔河',color:'#f39a3d'},
  {id:'slide',name:'滑滑梯',color:'#ee5b85'},
  {id:'skate',name:'溜冰场',color:'#8c7bea'},
  {id:'mush',name:'采蘑菇',color:'#e7654f'}
];
function totalStars(){ return GAMES.reduce((a,g)=>a+(best[g.id]||0),0); }
function refreshStars(){ $('hud-stars').textContent = '× '+totalStars(); }
function setHud(title,extra){
  $('hud').classList.remove('hidden');
  $('hud-title').textContent=title; $('hud-extra').innerHTML=extra||''; refreshStars();
}
function setPrompt(text){
  const p=$('prompt');
  if(text){ $('btn-action').textContent=text; p.classList.remove('hidden'); }
  else p.classList.add('hidden');
}
function finish(id,stars,count){
  best[id]=Math.max(best[id]||0,stars);
  localStorage.setItem('peppa3d_best',JSON.stringify(best));
  resultGame=id; resultStars=stars; resultCount=count;
  sfx('yay'); $('result-stars').innerHTML=[0,1,2].map(i=>
    '<span class="rs '+(i<stars?'on':'')+'">★</span>').join('');
  $('result-title').textContent=(GAMES.find(g=>g.id===id)||{name:'游戏'}).name+'  完成！';
  $('result-sub').textContent=count>0?('这次得分：'+count):'再来一次会更好哦！';
  show('screen-result'); $('hud').classList.add('hidden'); setPrompt(null);
}
let resultGame='fish', resultStars=0, resultCount=0;
$('btn-start').addEventListener('click',()=>{ ensureAudio(); sfx('yay'); setState('hub'); });
$('btn-again').addEventListener('click',()=>{ sfx('tap'); setState(resultGame); });
$('btn-home').addEventListener('click',()=>{ sfx('tap'); setState('hub'); });
$('btn-back').addEventListener('click',()=>{ sfx('tap'); setState('hub'); });
$('btn-sound').addEventListener('click',()=>{
  soundOn=!soundOn; localStorage.setItem('peppa3d_sound',soundOn?'1':'0');
  $('btn-sound').textContent=soundOn?'声音 开':'声音 关';
  if(soundOn){ ensureAudio(); sfx('pop'); }
});
$('btn-sound').textContent=soundOn?'声音 开':'声音 关';

/* ---------------- 场景构建器 ---------------- */
function buildTitle(){
  const s=newScene(0x8fd8ff); ground(s);
  hill(s,-18,-20,14,0xb9e878); hill(s,14,-24,16,0xaee16e); hill(s,34,-18,12,0xbce986);
  for(let i=0;i<7;i++) cloud(s,-30+i*11,9+Math.random()*5,-22-Math.random()*14,.8+Math.random()*.6);
  tree(s,-11,-6,1.1); tree(s,12,-8,.95); house(s,-16,-14,0xe9546d); house(s,17,-16,0x5fb9e8);
  const peppa=pig({scale:1.15}); peppa.position.set(-2.4,0,2); peppa.rotation.y=.3; s.add(peppa);
  const george=pig({dress:0x4e9ce8,scale:.85}); george.position.set(1.8,0,2.4); george.rotation.y=-.3; s.add(george);
  setCam(0,4.5,15, 0,2,0);
  return {s, update(){ animatePig(peppa); animatePig(george); }, tap(){ setState('hub'); }};
}

let labelEls=[], pickTargets=[];
function buildHub(){
  const s=newScene(0x8fd8ff); ground(s);
  hill(s,0,-42,26,0xb9e878);
  for(let i=0;i<6;i++) cloud(s,-34+i*14,11,-30-Math.random()*10,.9);
  tree(s,-19,-6,1.1); tree(s,19,-6,1.1);
  labelEls=[]; pickTargets=[];
  const props={
    fish:g=>{ const w=cyl(g,3,3,.25,0x5fc2ee,0,.15,0,{receive:true}); torus(g,2.2,.08,0xbdeaff,0,.3,0,{rot:[Math.PI/2,0,0],cast:false}); },
    tug:g=>{ cyl(g,.12,.12,3.4,0xb87b4d,0,1.7,0,{rot:[0,0,Math.PI/2]}); box(g,.4,1.6,.1,0xf3425c,0,1.9,.2); },
    slide:g=>{ const r=box(g,1.8,.2,6,0x5fb9e8,0,2.2,0,{rot:[.5,0,0]}); return r; },
    skate:g=>{ torus(g,1.2,.16,0xffffff,0,1.6,0,{rot:[Math.PI/2,0,0]}); ball(g,.5,0xffb3d1,0,1.6,0); },
    mush:g=>{ cyl(g,.25,.25,.8,0xfff5e0,0,.5,0); ball(g,1.1,0xe75b52,0,1,0,{scale:[1,.6,1]}); ball(g,.16,0xffffff,-.35,1.15,.5,{cast:false}); }
  };
  GAMES.forEach((g,i)=>{
    const x=(i-2)*6.2, z=(i%2)*1.6-2;
    const station=new THREE.Group(); station.position.set(x,0,z); s.add(station);
    cyl(station,2.4,2.5,.4,g.color.replace('#','0x')|0,0,.2,0,{receive:true});
    const p=new THREE.Group(); station.add(p); props[g.icon||g.id](p);
    // 点击热区
    const hit=cyl(station,2.5,2.5,4,0xffffff,0,2,0,{cast:false});
    hit.material=hit.material.clone(); hit.material.transparent=true; hit.material.opacity=0; hit.userData.gameId=g.id;
    pickTargets.push(hit);
    const el=document.createElement('div'); el.className='station-label';
    el.innerHTML='<b>'+g.name+'</b><span>'+'★'.repeat(best[g.id]||0)+'☆'.repeat(3-(best[g.id]||0))+'</span>';
    $('labels').appendChild(el); labelEls.push({el,pos:new THREE.Vector3(x,4.6,z)});
  });
  setCam(0,10,25, 0,1,-2);
  return {
    s,
    update(){
      labelEls.forEach(o=>{
        const v=o.pos.clone().project(camera);
        o.el.style.left=((v.x*.5+.5)*window.innerWidth)+'px';
        o.el.style.top=((-v.y*.5+.5)*window.innerHeight)+'px';
      });
      pickTargets.forEach(h=>{ h.parent.rotation.y=Math.sin(t*1.2+h.parent.position.x)*.05; });
    },
    tap(x,y){
      mouse.set(x/window.innerWidth*2-1, -(y/window.innerHeight*2-1));
      raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(pickTargets,false);
      if(hits.length){ sfx('pop'); setState(hits[0].object.userData.gameId); }
    },
    clear(){ labelEls.forEach(o=>o.el.remove()); labelEls=[]; pickTargets=[]; }
  };
}

/* ---------------- 3D 粒子 ---------------- */
let particles=[];
function burst3(s,x,y,z,color,n){
  const colors=Array.isArray(color)?color:[color];
  for(let i=0;i<(n||12);i++){
    const p=box(s,.14,.14,.14,colors[i%colors.length],x,y,z,{cast:false});
    p.userData.v=new THREE.Vector3((Math.random()-.5)*7,2+Math.random()*5,(Math.random()-.5)*7);
    p.userData.life=.7+Math.random()*.6; particles.push(p);
  }
}
function updateParticles(dt){
  particles.forEach(p=>{
    p.userData.v.y-=13*dt; p.position.addScaledVector(p.userData.v,dt);
    p.userData.life-=dt; p.rotation.x+=dt*6; p.rotation.z+=dt*4;
  });
  const dead=particles.filter(p=>p.userData.life<=0);
  dead.forEach(p=>{ if(p.parent) p.parent.remove(p); });
  particles=particles.filter(p=>p.userData.life>0);
}

/* ---------------- 1. 快乐钓鱼 ---------------- */
function makeFish(color){
  const g=new THREE.Group();
  ball(g,.8,color,0,0,0,{scale:[1.3,.7,.65]});
  cone(g,.45,.9,color,-1.35,0,0,{rot:[0,0,Math.PI/2]});
  ball(g,.12,0xffffff,.55,.22,.38,{cast:false});
  ball(g,.06,0x3c3034,.6,.22,.5,{cast:false});
  return g;
}
function buildFish(){
  const s=newScene(0x8fd8ff); ground(s);
  hill(s,-20,-24,16,0xb9e878); hill(s,22,-28,18,0xaee16e);
  for(let i=0;i<4;i++) cloud(s,-24+i*15,10,-26-i*3,1);
  tree(s,-15,-10,1); tree(s,16,-12,.9);
  cyl(s,9,9,.3,0x5fc2ee,0,.16,-3,{receive:true});
  cyl(s,8.2,8.2,.32,0x79d4f4,0,.2,-3,{receive:true,cast:false});
  torus(s,8.7,.08,0xbdeaff,0,.34,-3,{rot:[Math.PI/2,0,0],cast:false});
  box(s,5,.4,7,0xc98b5e,-8,.6,3);
  for(let i=0;i<3;i++) cyl(s,.22,.22,1.3,0xa96f48,-9.7+i*1.8,-.05,0,{cast:false});
  const peppa=pig({scale:1.05}); peppa.position.set(-8,.8,2); peppa.rotation.y=1.2; s.add(peppa);
  cyl(s,.07,.07,6,0x8b5b3f,-6.6,2.9,0,{rot:[0,0,Math.PI/3]});
  const tip=new THREE.Vector3(-3.6,5.4,-1);
  const bob=new THREE.Group();
  ball(bob,.26,0xff5b5b,0,.16,0); ball(bob,.26,0xffffff,0,-.12,0);
  cyl(bob,.04,.04,.6,0xffffff,0,.45,0,{cast:false});
  bob.position.set(tip.x,5,tip.z); s.add(bob);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([tip,bob.position.clone()]),
    new THREE.LineBasicMaterial({color:0xffffff}));
  s.add(line);
  const fish=makeFish(0xff9d5c); fish.visible=false; s.add(fish);
  let F={phase:'ready',timer:0,caught:0,target:5,bx:0,bz:-3,dir:1,fishX:0,jumpT:0};
  const hud=()=>{ $('hud-extra').innerHTML='钓到小鱼：'+F.caught+' / '+F.target; };
  setHud('快乐钓鱼',''); hud(); setPrompt('抛竿！');
  setCam(0,8,19, 0,1,-3);
  return {
    s,
    update(dt){
      animatePig(peppa);
      F.fishX+=F.dir*3.2*dt; if(F.fishX<-6||F.fishX>6) F.dir*=-1;
      if(F.phase==='wait'||F.phase==='bite'){ fish.visible=true; fish.position.set(F.fishX,.45,F.bz-.3); fish.rotation.y=F.dir>0?0:Math.PI; }
      if(F.phase==='cast'){
        F.timer-=dt; bob.position.y-=5*dt;
        if(bob.position.y<=.55){ bob.position.set(F.bx,.55,F.bz); F.phase='wait'; F.timer=1.2+Math.random()*1.6; sfx('splash'); burst3(s,F.bx,.6,F.bz,0xbdeaff,8); }
      } else if(F.phase==='wait'){
        F.timer-=dt; bob.position.y=.55+Math.sin(t*2.5)*.07;
        if(F.timer<=0){ F.phase='bite'; F.timer=1.7; sfx('splash'); burst3(s,F.bx,.6,F.bz,0xffffff,10); setPrompt('快拉！'); }
      } else if(F.phase==='bite'){
        F.timer-=dt; bob.position.y=.55+Math.abs(Math.sin(t*20))*.5;
        if(F.timer<=0){ F.phase='wait'; F.timer=1+Math.random(); setPrompt(null); }
      } else if(F.phase==='catch'){
        F.jumpT+=dt; const u=F.jumpT/.9;
        fish.visible=true; fish.position.set(F.bx,.5+Math.sin(u*Math.PI)*3.2,F.bz);
        if(u>=1){ fish.visible=false; F.phase=F.caught>=F.target?'done':'ready';
          if(F.phase==='done') finish('fish',Math.min(3,1+Math.floor(F.caught/2)),F.caught);
          else setPrompt('抛竿！'); }
      }
      if(F.phase==='ready') bob.position.set(tip.x,5,tip.z);
      line.geometry.setFromPoints([tip,bob.position.clone()]);
    },
    tap(){
      if(F.phase==='ready'){ F.phase='cast'; F.bx=F.fishX; bob.position.set(tip.x,5,tip.z); setPrompt(null); sfx('boing'); }
      else if(F.phase==='bite'){
        F.caught++; hud(); sfx('star'); burst3(s,F.bx,1.5,F.bz,[0xffd447,0xffffff],16);
        F.phase='catch'; F.jumpT=0; setPrompt(null);
      }
    }
  };
}

/* ---------------- 2. 大力拔河 ---------------- */
function buildTug(){
  const s=newScene(0x8fd8ff); ground(s);
  hill(s,0,-34,30,0xb9e878);
  for(let i=0;i<5;i++) cloud(s,-28+i*14,10,-28,1);
  tree(s,-18,-8,.9); tree(s,18,-8,.9);
  const daddy=pig({dress:0x4f8fc9,glasses:true,scale:1.3}); daddy.position.set(-7,0,0); daddy.rotation.y=Math.PI/2; s.add(daddy);
  const peppa=pig({scale:1.1}); peppa.position.set(7,0,0); peppa.rotation.y=-Math.PI/2; s.add(peppa);
  const rope=box(s,13,.16,.16,0xb87b4d,0,2.2,0);
  const marker=new THREE.Group();
  box(marker,.25,1.6,.25,0xf3425c,0,0,0);
  const flag=box(marker,1.1,.7,.06,0xffffff,.6,.45,0);
  s.add(marker);
  box(s,.14,3,.14,0xffffff,0,1.5,-1.6,{cast:false});
  let U={phase:'ready',timer:2.2,pos:.5,pull:0,time:0,hits:0};
  setHud('大力拔河',''); setPrompt('拉！'); setCam(0,6,20, 0,2,0);
  const hud=()=>{ $('hud-extra').innerHTML='力量：'+Math.round(U.pull*100)+'%　小旗：'+Math.round(U.pos*100)+'%'; };
  return {
    s,
    update(dt){
      animatePig(peppa); animatePig(daddy);
      if(U.phase==='ready'){
        U.timer-=dt;
        if(U.timer<=0){ U.phase='play'; setPrompt('拉！拉！拉！'); }
      } else if(U.phase==='play'){
        U.pull=Math.max(0,U.pull-.45*dt); U.time+=dt;
        const opp=.32+Math.min(.16,U.time*.004);
        U.pos=Math.max(.06,Math.min(.94,U.pos+(U.pull-opp)*.7*dt));
        peppa.rotation.z=-U.pull*.28; daddy.rotation.z=U.pull*.2;
        marker.position.set(-6.5+13*U.pos,2.2+Math.sin(t*9)*.05,0);
        rope.rotation.z=(U.pull-opp)*.02;
        hud();
        if(U.pos>=.93){ U.phase='win'; U.timer=1.4;
          burst3(s,0,3,0,[0xffd447,0xf3425c,0x5fb9e8],40); sfx('yay'); setPrompt(null); }
      } else if(U.phase==='win'){ U.timer-=dt; if(U.timer<=0) finish('tug',Math.min(3,1+Math.floor(U.hits/18)),U.hits); }
    },
    tap(){
      if(U.phase!=='play') return;
      U.pull=Math.min(1.5,U.pull+.25); U.hits++;
      if(U.hits%3===0) sfx('pop');
    }
  };
}

/* ---------------- 3. 滑滑梯 ---------------- */
function buildSlide(){
  const s=newScene(0x8fd8ff); ground(s);
  hill(s,-22,-20,15,0xb9e878); hill(s,24,-24,17,0xaee16e);
  for(let i=0;i<4;i++) cloud(s,-20+i*14,10,-25,1);
  tree(s,-13,-8,1); tree(s,14,-9,.9);
  const angle=Math.atan2(5.2,16);
  box(s,2.8,.3,17.2,0x4f9fd8,0,3.4,0,{rot:[angle,0,0],receive:true});
  box(s,2.4,.12,17.2,0xbfeaff,0,3.62,0,{rot:[angle,0,0],cast:false,receive:true});
  [-1.3,1.3].forEach(x=>box(s,.18,.5,17.2,0xf4a15c,x,3.7,0,{rot:[angle,0,0]}));
  for(let i=0;i<6;i++) box(s,1.6,.25,1.5,0xe58b56,-3.6, .55+i*1.05, 5-i*2.5);
  box(s,3.4,.3,3,0xf4a15c,-2.2,6.1,-8.5);
  box(s,.35,6, .35,0xc58050,-1,3,-8.6); box(s,.35,6,.35,0xc58050,1,3,-8.6);
  bush(s,1.8,10,1.2); bush(s,4,11,.9);
  const peppa=pig({scale:.9}); s.add(peppa);
  const stars=[.18,.38,.58,.78,.93].map(p=>{
    const m=starMesh(s,0,6-5.2*p+1.6,-8+16*p,.55); m.userData.p=p; return m;
  });
  let S={phase:'climb',climb:0,p:0,jump:0,vy:0,got:0};
  setHud('滑滑梯',''); setPrompt('点一下，往上爬！'); setCam(12,9,19, 0,3,0);
  const hud=()=>{ $('hud-extra').innerHTML='小星星：'+S.got+' / 5'; };
  return {
    s,
    update(dt){
      if(S.phase==='climb'){
        const u=S.climb;
        peppa.position.set(-3.6, .8+u*5.1, 5-u*13);
        peppa.rotation.y=Math.PI;
        animatePig(peppa,1.6);
        if(S.climb>=1){ S.phase='slide'; S.p=0; setPrompt('跳起来收星星！'); sfx('boing'); }
      } else if(S.phase==='slide'){
        S.p+=dt*(.18+.22*S.p);
        if(S.vy||S.jump){ S.vy-=18*dt; S.jump+=S.vy*dt; if(S.jump<=0){ S.jump=0; S.vy=0; } }
        const p=Math.min(1,S.p);
        peppa.position.set(0,6-5.2*p+1+S.jump,-8+16*p);
        peppa.rotation.set(-.3,0,0);
        stars.forEach(m=>{
          if(m.visible){
            m.rotation.z+=dt*2; m.position.y=6-5.2*m.userData.p+1.6+Math.sin(t*4)*.15;
            if(Math.abs(S.p-m.userData.p)<.075 && S.jump>-.8){
              m.visible=false; S.got++; sfx('star');
              burst3(s,m.position.x,m.position.y,m.position.z,0xffd447,10); hud();
            }
          }
        });
        if(S.p>=1){ S.phase='land'; S.land=1; burst3(s,0,1,9,[0xa4e06a,0xffffff],30); sfx('splash'); setPrompt(null); }
      } else if(S.phase==='land'){
        S.land-=dt; if(S.land<=0) finish('slide',Math.max(1,Math.min(3,Math.round(S.got/2))),S.got);
      }
    },
    tap(){
      if(S.phase==='climb'){ S.climb=Math.min(1,S.climb+.1); sfx('tap'); hud(); }
      else if(S.phase==='slide' && S.jump===0){ S.vy=5.6; sfx('boing'); }
    }
  };
}

/* ---------------- 4. 溜冰场 ---------------- */
function buildSkate(){
  const s=newScene(0xcdeeff); ground(s,0xeaf7ff);
  hill(s,-24,-26,18,0xffffff); hill(s,26,-30,20,0xe4f4ff);
  for(let i=0;i<5;i++) cloud(s,-26+i*13,11,-30,1.1);
  const rink=new THREE.Mesh(new THREE.PlaneGeometry(60,80),mat(0xd9f2ff));
  rink.rotation.x=-Math.PI/2; rink.position.y=.02; rink.receiveShadow=true; s.add(rink);
  [-16,16].forEach(x=>{ for(let i=0;i<5;i++) tree(s,x,-28+i*14,.85); });
  const peppa=pig({scale:1}); peppa.position.set(0,0,7); peppa.rotation.y=Math.PI; s.add(peppa);
  let K={time:30,jump:0,vy:0,got:0,hits:0,invul:0,speed:11,items:[],obs:[]};
  function spawn(){
    K.items.push({type:'flake',x:(Math.random()-.5)*9,z:-32,mesh:makeFlake(s),got:false});
    K.obs.push({type:Math.random()<.5?'snow':'cone',x:(Math.random()-.5)*10,z:-52,mesh:makeObstacle(s,Math.random()<.5?'snow':'cone')});
  }
  function makeFlake(ss){
    const g=new THREE.Group();
    for(let i=0;i<3;i++) cyl(g,.04,.04,1.2,0xffffff,0,0,0,{rot:[0,i*Math.PI/3,Math.PI/2],cast:false});
    g.position.y=1.7; ss.add(g); return g;
  }
  function makeObstacle(ss,type){
    const g=new THREE.Group();
    if(type==='snow'){
      ball(g,1.1,0xffffff,0,.9,0); ball(g,.8,0xffffff,0,2.2,0);
      cone(g,.25,.7,0xff9d3c,0,2.2,.8,{rot:[Math.PI/2,0,0],cast:false});
      cyl(g,.4,.4,.15,0xe35b6e,0,2.85,0,{cast:false});
    } else {
      cone(g,.9,2.4,0xff884f,0,1.2,0);
      box(g,2,.2,2,0xe26b4f,0,.1,0);
    }
    ss.add(g); return g;
  }
  spawn(); spawn();
  setHud('溜冰场',''); setPrompt('点一下，跳！'); setCam(10,8,19, 0,1,0);
  const hud=()=>{ $('hud-extra').innerHTML='雪花：'+K.got+'　剩余：'+Math.max(0,Math.ceil(K.time))+' 秒'; };
  return {
    s,
    update(dt){
      K.time-=dt; K.invul=Math.max(0,K.invul-dt); hud();
      if(K.vy||K.jump){ K.vy-=17*dt; K.jump+=K.vy*dt; if(K.jump<=0){ K.jump=0; K.vy=0; } }
      peppa.position.y=K.jump;
     [K.items,K.obs].forEach(arr=>arr.forEach(o=>{
        o.z+=K.speed*dt; o.mesh.position.z=o.z; o.mesh.position.x=o.x;
      }));
      K.items.forEach(o=>{
        o.mesh.rotation.z+=dt*3;
        if(!o.got && Math.abs(o.z-7)<1.2 && Math.abs(o.x)<1.3 && K.jump>-1.1){
          o.got=true; o.mesh.visible=false; K.got++; sfx('star'); burst3(s,o.x,1.8,7,0xffffff,10);
        }
      });
      K.obs.forEach(o=>{
        if(!o.hit && Math.abs(o.z-7)<1.2 && Math.abs(o.x)<1.5 && K.jump>-.65 && K.invul<=0){
          o.hit=true; K.hits++; K.invul=1; sfx('boing'); burst3(s,o.x,1,7,0xfff7d0,12);
        }
      });
      K.items=K.items.filter(o=>!o.got && o.z<12);
      K.obs=K.obs.filter(o=>o.z<12);
      while(K.items.length<5) K.items.push({type:'flake',x:(Math.random()-.5)*9,z:-32-Math.random()*20,mesh:makeFlake(s),got:false});
      while(K.obs.length<4) K.obs.push({type:Math.random()<.5?'snow':'cone',x:(Math.random()-.5)*10,z:-52-Math.random()*20,mesh:makeObstacle(s,Math.random()<.5?'snow':'cone')});
      if(K.time<=0){ setPrompt(null); finish('skate',K.got>=8?3:K.got>=4?2:1,K.got); }
    },
    tap(){ if(K.jump===0){ K.vy=6.5; sfx('boing'); } }
  };
}

/* ---------------- 5. 采蘑菇 ---------------- */
function buildMush(){
  const s=newScene(0x8fd8ff); ground(s);
  hill(s,0,-35,32,0xb9e878);
  for(let i=0;i<5;i++) cloud(s,-28+i*14,11,-30,1);
  for(let i=0;i<6;i++) tree(s,-20+i*8,-14-(i%2)*3,.9);
  for(let i=0;i<8;i++) bush(s,-22+i*6,12,.8);
  const spots=[[-8,-4],[-3,1],[2,-5],[7,0],[-5,7],[5,8]];
  const mushGroups=spots.map(([x,z])=>{
    const g=new THREE.Group(); g.position.set(x,0,z); g.visible=false;
    cyl(g,.28,.28,.9,0xfff5e0,0,.45,0);
    ball(g,1.05,0xe75b52,0,1.05,0,{scale:[1,.58,1]});
    ball(g,.16,0xffffff,-.38,1.35,.35,{cast:false});
    ball(g,.16,0xffffff,.32,1.42,.28,{cast:false});
    s.add(g); g.userData.spot=[x,z]; return g;
  });
  let M={time:45,spawn:0,got:0,active:[]};
  setHud('采蘑菇',''); setPrompt(null); setCam(0,14,19, 0,0,-1);
  const hud=()=>{ $('hud-extra').innerHTML='蘑菇：'+M.got+'　剩余：'+Math.max(0,Math.ceil(M.time))+' 秒'; };
  hud();
  return {
    s,
    update(dt){
      M.time-=dt; M.spawn-=dt; hud();
      if(M.spawn<=0 && M.active.length<3){
        const free=mushGroups.filter(g=>!M.active.some(a=>a.g===g));
        if(free.length){
          const g=free[Math.floor(Math.random()*free.length)], golden=Math.random()<.22;
          g.visible=true; g.scale.setScalar(.01);
          g.children[1].material=mat(golden?0xffd447:0xe75b52);
          M.active.push({g,life:1.8,age:0,golden,hit:false});
        }
        M.spawn=.7+Math.random()*.7;
      }
      M.active.forEach(a=>{
        a.life-=dt; a.age+=dt;
        const grow=Math.min(1,a.age*6)*(a.life<.4?a.life/.4:1);
        a.g.scale.setScalar(Math.max(.01,grow));
      });
      const gone=M.active.filter(a=>a.life<=0);
      gone.forEach(a=>a.g.visible=false);
      M.active=M.active.filter(a=>a.life>0);
      if(M.time<=0){ finish('mush',M.got>=12?3:M.got>=7?2:1,M.got); }
    },
    tap(x,y){
      mouse.set(x/window.innerWidth*2-1,-(y/window.innerHeight*2-1));
      raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(mushGroups.filter(g=>g.visible),true);
      if(!hits.length) return;
      let obj=hits[0].object; while(obj.parent && !obj.userData.spot) obj=obj.parent;
      const a=M.active.find(v=>v.g===obj);
      if(a && a.age>.1 && !a.hit){
        a.hit=true; M.got+=a.golden?2:1; sfx('star');
        burst3(s,obj.position.x,1.4,obj.position.z,a.golden?[0xffd447,0xffffff]:[0xff8d84,0xffffff],14);
        obj.visible=false; M.active=M.active.filter(v=>v!==a); hud();
      }
    }
  };
}

/* ---------------- 状态机 / 输入 / 主循环 ---------------- */
const builders={ fish:buildFish, tug:buildTug, slide:buildSlide, skate:buildSkate, mush:buildMush };
let currentGame=null;
function setState(id){
  if(currentGame && currentGame.clear) currentGame.clear();
  particles.forEach(p=>{ if(p.parent) p.parent.remove(p); }); particles=[];
  hideScreens(); $('hud').classList.add('hidden'); setPrompt(null);
  if(id==='title'){
    currentGame=buildTitle(); show('screen-title');
  } else if(id==='hub'){
    currentGame=buildHub();
  } else {
    currentGame=(builders[id]||buildTitle)();
  }
  scene=currentGame.s;
}
renderer.domElement.addEventListener('pointerdown', e=>{
  e.preventDefault(); ensureAudio();
  if(currentGame && currentGame.tap) currentGame.tap(e.clientX,e.clientY);
});
$('btn-action').addEventListener('pointerdown', e=>{
  e.preventDefault(); ensureAudio();
  if(currentGame && currentGame.tap) currentGame.tap();
});
window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.code==='Space'||e.code==='Enter'){
    e.preventDefault(); ensureAudio();
    if(currentGame && currentGame.tap) currentGame.tap(window.innerWidth/2,window.innerHeight/2);
  }
});
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,clock.getDelta()||0); t+=dt;
  camera.position.lerp(camPos,.12); camera.lookAt(camTarget); camera.updateMatrixWorld();
  try {
    if(currentGame && currentGame.update) currentGame.update(dt);
    updateParticles(dt);
    renderer.render(scene,camera);
  } catch(err){
    const f=$('fatal'); f.style.display='block'; f.textContent='出错了：'+(err&&err.stack||err);
    console.error(err);
  }
}
setState('title');
requestAnimationFrame(frame);
})();

