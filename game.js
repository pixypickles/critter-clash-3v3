'use strict';
const VERSION='v0.5';
const c=document.querySelector('#game'),x=c.getContext('2d'),W=1280,H=720;
const ui={score:q('#score'),status:q('#status'),mode:q('#modeLabel'),setup:q('#setup'),slots:q('#slots'),result:q('#result'),rt:q('#resultTitle'),rr:q('#resultText'),L:q('#leftHand'),R:q('#rightHand'),E:q('#enter'),S:q('#skill')};
function q(s){return document.querySelector(s)}
const versionEl=q('#version');if(versionEl)versionEl.textContent=VERSION;
const TYPES={sword:{name:'剣＋盾',r:'sword',l:'shield',speed:180},spear:{name:'槍＋盾',r:'spear',l:'shield',speed:165},dagger:{name:'短剣二刀流',r:'daggerR',l:'daggerL',speed:210},doubleShield:{name:'双盾',r:'dualShield',l:'dualShield',speed:130}};
let formation=['sword','spear','dagger'],mode='field',blue=0,red=0,roundOver=0,last=performance.now(),keys={},joy={id:null,dx:0,dy:0},actors=[],effects=[];
const court={x:145,y:86,w:990,h:548};
// 横長の壁で「進行ルート」を上下に分ける。遮蔽物ではなくコース分岐用。
const obstacles=[
 // 薄い横壁を長くずらして配置。上下ルートはあるが、中央ですぐ合流できない。
 {x:255,y:205,w:520,h:24},
 {x:505,y:335,w:520,h:24},
 {x:255,y:465,w:520,h:24},
 // 両端の短い返しで、壁の端を回る判断を作る
 {x:905,y:140,w:150,h:22},
 {x:225,y:545,w:150,h:22}
];
const fieldPlayer={x:545,y:525,r:22,speed:235};
const arenaGate={x:715,y:325,r:82};
for(let i=0;i<3;i++){let d=document.createElement('div');d.className='slot';d.innerHTML=`<b>選手 ${i+1}</b><select data-i="${i}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${formation[i]===k?'selected':''}>${v.name}</option>`).join('')}</select>`;ui.slots.append(d)}
ui.slots.onchange=e=>{if(e.target.dataset.i!=null)formation[+e.target.dataset.i]=e.target.value};
q('#start').onclick=()=>{ui.setup.classList.add('hidden');startMatch()};q('#back').onclick=()=>{ui.setup.classList.add('hidden');mode='field';syncModeButtons()};q('#rematch').onclick=()=>{ui.result.classList.add('hidden');startMatch()};q('#fieldBack').onclick=()=>{ui.result.classList.add('hidden');mode='field';ui.mode.textContent='FIELD';ui.status.textContent='スティックで競技場まで歩こう';syncModeButtons()};
function unit(team,i,type){let bx=team===0?235:1045;return {team,i,type,x:bx+(i%2)*50*(team?-1:1),y:230+i*130,r:27,alive:true,face:team?Math.PI:0,cd:0,stun:0,shield:false,shieldA:0,ai:team===1||i>0,species:(i%3)}}
function resetRound(){actors=[];formation.forEach((t,i)=>actors.push(unit(0,i,t)));['sword','spear','dagger'].forEach((t,i)=>actors.push(unit(1,i,t)));roundOver=0;effects=[];syncButtons()}
function startMatch(){mode='match';blue=red=0;ui.mode.textContent='MATCH';ui.score.textContent='0 - 0';resetRound();ui.status.textContent='敵拠点を取るか、全員OUTで勝利';syncModeButtons()}
function controlled(){return actors.find(a=>a.team===0&&a.alive&&!a.ai)||null}
function transfer(){let n=actors.find(a=>a.team===0&&a.alive);if(n){actors.filter(a=>a.team===0).forEach(a=>a.ai=true);n.ai=false;syncButtons()}}
function syncModeButtons(){if(mode==='field'){ui.S.innerHTML='A<small>スキルA<br>準備中</small>';ui.E.innerHTML='B<small>入る</small>'}else{ui.S.innerHTML='A<small>スキルA<br>準備中</small>';ui.E.innerHTML='B<small>スキルB<br>準備中</small>'}}
function syncButtons(){let a=controlled();if(!a)return;let t=TYPES[a.type];ui.R.innerHTML=`R<small>${label(t.r)}</small>`;ui.L.innerHTML=`L<small>${label(t.l)}</small>`}
function label(v){return ({sword:'剣',spear:'槍',shield:'盾',daggerR:'右短剣',daggerL:'左短剣',dualShield:'両盾'})[v]||v}
function nearestEnemy(a){let es=actors.filter(b=>b.alive&&b.team!==a.team);return es.sort((p,q)=>dist(a,p)-dist(a,q))[0]}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)} function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function norm(v){while(v>Math.PI)v-=Math.PI*2;while(v<-Math.PI)v+=Math.PI*2;return v}
function hand(a,side,down=true){if(mode!=='match'||!a||!a.alive||a.stun>0)return;let kind=TYPES[a.type][side];if(kind==='shield'||kind==='dualShield'){a.shield=down;if(down){let e=nearestEnemy(a);if(e)a.shieldA=angle(a,e)}return}if(!down||a.cd>0)return;let e=nearestEnemy(a);if(e)a.face=angle(a,e);attack(a,kind);a.cd=kind.startsWith('dagger')?.28:kind==='spear'?.62:.5}
function attack(a,kind){let range=kind==='spear'?190:kind.startsWith('dagger')?68:100,arc=kind==='spear'?.12:kind.startsWith('dagger')?.72:1.55;effects.push({kind:kind==='spear'?'thrust':'swing',x:a.x,y:a.y,a:a.face,range,arc,t:kind==='spear'?.20:.16,team:a.team});let hit=[];for(let b of actors){if(!b.alive||b.team===a.team)continue;let d=dist(a,b),da=Math.abs(norm(angle(a,b)-a.face));if(d<=range+b.r&&da<=arc/2)hit.push(b)}for(let b of hit){if(blocked(b,a)){a.stun=.42;effects.push({kind:'block',x:b.x,y:b.y,t:.25});continue}let clash=actors.find(o=>o!==a&&o.team!==a.team&&o.alive&&o.cd>.18&&dist(a,o)<76);if(clash){a.stun=.2;clash.stun=.2;continue}b.alive=false;effects.push({kind:'out',x:b.x,y:b.y,t:.55});if(!b.ai)transfer()}}
function blocked(def,atk){if(!def.shield)return false;let dual=TYPES[def.type].r==='dualShield';if(dual)return true;return Math.abs(norm(angle(def,atk)-def.shieldA))<1.18}
function collides(nx,ny,r){return obstacles.some(o=>nx+r>o.x&&nx-r<o.x+o.w&&ny+r>o.y&&ny-r<o.y+o.h)}
function move(a,vx,vy,dt){
  // 壁に斜めから当たっても完全停止せず、壁沿いに滑る。
  // 長い分岐壁でAIが全員スタックして『フリーズ』したように見えるのを防ぐ。
  let sp=TYPES[a.type].speed*(a.shield?(a.type==='doubleShield'?.42:.62):1);
  let dx=vx*sp*dt,dy=vy*sp*dt;
  let nx=Math.max(court.x+30,Math.min(court.x+court.w-30,a.x+dx));
  if(!collides(nx,a.y,a.r))a.x=nx;
  let ny=Math.max(court.y+30,Math.min(court.y+court.h-30,a.y+dy));
  if(!collides(a.x,ny,a.r))a.y=ny;
}
function moveField(vx,vy,dt){let m=Math.hypot(vx,vy);if(m>1){vx/=m;vy/=m}fieldPlayer.x=Math.max(80,Math.min(1200,fieldPlayer.x+vx*fieldPlayer.speed*dt));fieldPlayer.y=Math.max(110,Math.min(650,fieldPlayer.y+vy*fieldPlayer.speed*dt))}
function ai(a,dt){
  let es=actors.filter(b=>b.alive&&b.team!==a.team),e=es.sort((p,q)=>dist(a,p)-dist(a,q))[0];if(!e)return;
  let enemyBase=a.team?{x:185,y:360}:{x:1095,y:360},target=e;
  let alliesNear=actors.filter(b=>b.alive&&b.team===a.team&&dist(a,b)<180).length;
  if(dist(a,e)>240||alliesNear>1)target=enemyBase;
  let ang=angle(a,target),d=dist(a,e);a.face=angle(a,e);let t=TYPES[a.type];
  if((t.l==='shield'||t.l==='dualShield')&&d<130&&Math.random()<.06){a.shield=true;a.shieldA=angle(a,e)}else if(d>100)a.shield=false;
  if(d<(a.type==='spear'?150:a.type==='dagger'?78:108)&&a.cd<=0&&!a.shield){hand(a,'r',true);return;}
  // 正面が壁なら、近い壁端へ少し進路を曲げる。長い壁でもAIが抜け道へ向かう。
  let probe=26,px=a.x+Math.cos(ang)*probe,py=a.y+Math.sin(ang)*probe;
  if(collides(px,py,a.r)){
    let hit=obstacles.find(o=>px+a.r>o.x&&px-a.r<o.x+o.w&&py+a.r>o.y&&py-a.r<o.y+o.h);
    if(hit){
      let left={x:hit.x-a.r-12,y:a.y},right={x:hit.x+hit.w+a.r+12,y:a.y};
      let wp=dist(a,left)<dist(a,right)?left:right;ang=angle(a,wp);
    }
  }
  move(a,Math.cos(ang),Math.sin(ang),dt);
}
function inputVector(){let vx=joy.dx+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),vy=joy.dy+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let m=Math.hypot(vx,vy);if(m>1){vx/=m;vy/=m}return [vx,vy]}
function update(dt){let [vx,vy]=inputVector();if(mode==='field'){moveField(vx,vy,dt);let near=Math.hypot(fieldPlayer.x-arenaGate.x,fieldPlayer.y-arenaGate.y)<arenaGate.r;ui.status.textContent=near?'競技場の近くです。B「入る」で編成へ':'スティックで競技場まで歩こう';return}if(mode!=='match'||roundOver)return;for(let a of actors){if(!a.alive)continue;a.cd=Math.max(0,a.cd-dt);a.stun=Math.max(0,a.stun-dt);if(a.ai&&a.stun<=0)ai(a,dt)}let p=controlled();if(p&&p.stun<=0)move(p,vx,vy,dt);let ba=actors.filter(a=>a.team===0&&a.alive),ra=actors.filter(a=>a.team===1&&a.alive);if(!ra.length)winRound(0,'敵チーム全員OUT');else if(!ba.length)winRound(1,'味方チーム全員OUT');else{if(ba.some(a=>Math.hypot(a.x-1095,a.y-360)<45))winRound(0,'敵拠点を奪取');if(ra.some(a=>Math.hypot(a.x-185,a.y-360)<45))winRound(1,'自陣拠点を奪取された')}effects.forEach(e=>e.t-=dt);effects=effects.filter(e=>e.t>0)}
function winRound(team,why){if(roundOver)return;roundOver=1;team===0?blue++:red++;ui.score.textContent=`${blue} - ${red}`;ui.status.textContent=(team===0?'BLUE ':'RED ')+why;if(blue>=2||red>=2)setTimeout(()=>{ui.rt.textContent=blue>red?'勝利！':'敗北';ui.rr.textContent=`${blue} - ${red}　${why}`;ui.result.classList.remove('hidden')},700);else setTimeout(resetRound,850)}
function draw(){x.clearRect(0,0,W,H);if(mode==='field')drawField();else drawMatch()}
function drawField(){x.fillStyle='#a7d28d';x.fillRect(0,0,W,H);x.fillStyle='#d9cc9e';x.lineWidth=95;x.lineCap='round';x.beginPath();x.moveTo(130,610);x.bezierCurveTo(300,520,480,430,650,370);x.bezierCurveTo(820,310,970,220,1150,120);x.strokeStyle='#d9cc9e';x.stroke();x.lineCap='butt';place(250,175,'クラブハウス','🏠');place(690,300,'競技場','🏟');place(1035,145,'森の練習路','🌳');x.fillStyle='#24483b';x.font='bold 28px sans-serif';x.fillText('けもの競技村',55,65);x.font='18px sans-serif';x.fillText('スティックで自由に歩けます',55,94);x.strokeStyle='#ffffffaa';x.lineWidth=3;x.setLineDash([8,8]);x.beginPath();x.arc(arenaGate.x,arenaGate.y,arenaGate.r,0,Math.PI*2);x.stroke();x.setLineDash([]);drawCuteFieldAnimal(fieldPlayer.x,fieldPlayer.y);x.fillStyle='#24483b';x.font='bold 16px sans-serif';x.textAlign='center';x.fillText('あなた',fieldPlayer.x,fieldPlayer.y+44);x.textAlign='start'}
function place(px,py,n,ico){x.font='70px sans-serif';x.fillText(ico,px,py);x.font='bold 20px sans-serif';x.fillStyle='#26493d';x.fillText(n,px-10,py+34)}
function drawCuteFieldAnimal(px,py){x.save();x.translate(px,py);x.shadowBlur=8;x.shadowColor='#356b45';x.fillStyle='#62c95b';x.beginPath();x.arc(0,2,20,0,Math.PI*2);x.fill();x.beginPath();x.arc(-12,-12,8,0,Math.PI*2);x.arc(12,-12,8,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(-12,-12,5,0,Math.PI*2);x.arc(12,-12,5,0,Math.PI*2);x.fill();x.fillStyle='#24392f';x.beginPath();x.arc(-11,-12,2,0,Math.PI*2);x.arc(11,-12,2,0,Math.PI*2);x.fill();x.strokeStyle='#234632';x.lineWidth=2;x.beginPath();x.arc(0,5,9,.2,2.9);x.stroke();x.fillStyle='#355a76';roundRect(-17,13,34,12,5);x.fill();x.fillStyle='#62c95b';x.beginPath();x.ellipse(-13,29,7,13,.35,0,Math.PI*2);x.ellipse(13,29,7,13,-.35,0,Math.PI*2);x.fill();x.shadowBlur=0;x.restore()}
function drawMatch(){x.fillStyle='#688ca1';x.fillRect(0,0,W,H);x.fillStyle='#a9d0ef';x.fillRect(court.x,court.y,court.w,court.h);x.strokeStyle='#fff7d8';x.lineWidth=5;x.strokeRect(court.x,court.y,court.w,court.h);x.setLineDash([10,11]);x.beginPath();x.moveTo(640,court.y);x.lineTo(640,court.y+court.h);x.stroke();x.setLineDash([]);for(let o of obstacles){x.fillStyle='#eef0e7';roundRect(o.x,o.y,o.w,o.h,13);x.fill();x.fillStyle='#d6ddd6';roundRect(o.x+8,o.y+8,o.w-16,o.h-16,10);x.fill()}base(185,360,'#4d83dc');base(1095,360,'#e26368');for(let a of actors)drawActor(a);for(let e of effects)drawEffect(e)}
function roundRect(px,py,w,h,r){x.beginPath();x.roundRect(px,py,w,h,r)}
function base(px,py,col){x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.arc(px,py,35,0,Math.PI*2);x.stroke();x.globalAlpha=.22;x.fillStyle=col;x.fill();x.globalAlpha=1}
function drawActor(a){if(!a.alive)return;x.save();x.translate(a.x,a.y);let teamCol=a.team?'#e56f74':'#5a90df',fur=a.species===0?'#65bf58':a.species===1?'#eee8dc':'#df9a55';// 体と頭は常に上向き
x.fillStyle=teamCol;roundRect(-19,4,38,30,10);x.fill();x.fillStyle=fur;x.beginPath();x.arc(0,-6,22,0,Math.PI*2);x.fill();if(a.species===0){x.beginPath();x.arc(-13,-21,8,0,Math.PI*2);x.arc(13,-21,8,0,Math.PI*2);x.fill()}else if(a.species===1){x.beginPath();x.ellipse(-10,-29,6,18,-.12,0,Math.PI*2);x.ellipse(10,-29,6,18,.12,0,Math.PI*2);x.fill()}else{x.beginPath();x.moveTo(-18,-17);x.lineTo(-8,-35);x.lineTo(-1,-18);x.fill();x.beginPath();x.moveTo(18,-17);x.lineTo(8,-35);x.lineTo(1,-18);x.fill()}x.fillStyle='#fff';x.beginPath();x.arc(-7,-9,5,0,Math.PI*2);x.arc(7,-9,5,0,Math.PI*2);x.fill();x.fillStyle='#27362f';x.beginPath();x.arc(-6,-9,2,0,Math.PI*2);x.arc(6,-9,2,0,Math.PI*2);x.fill();x.strokeStyle='#3f493f';x.lineWidth=2;x.beginPath();x.arc(0,-2,7,.3,2.8);x.stroke();// 武器だけターゲット方向へ向ける
x.save();x.rotate(a.face);let t=TYPES[a.type];drawWeapon(t.r,1,a.shield);drawWeapon(t.l,-1,a.shield);x.restore();if(a===controlled()){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(0,2,34,0,Math.PI*2);x.stroke()}x.restore();x.fillStyle='#17382f';x.font='11px sans-serif';x.textAlign='center';x.fillText(TYPES[a.type].name,a.x,a.y+49);x.textAlign='start'}
function drawWeapon(k,side,active){
 x.lineCap='round';
 if(k==='shield'||k==='dualShield'){
   x.shadowBlur=active?18:7;x.shadowColor=active?'#63f6ff':'#b7efff';x.strokeStyle=active?'#8fffff':'#d8fbff';x.lineWidth=9;
   x.beginPath();x.arc(18,side*20,18,-1.1,1.1);x.stroke();x.shadowBlur=0;
 }else{
   let col=k==='spear'?'#7cfff2':k.startsWith('dagger')?'#ff75df':'#ffe66d';
   let len=k==='spear'?82:k.startsWith('dagger')?38:52;
   x.shadowBlur=18;x.shadowColor=col;x.strokeStyle=col;x.lineWidth=k==='spear'?6:7;
   x.beginPath();x.moveTo(15,side*12);x.lineTo(len,side*(k.startsWith('dagger')?17:20));x.stroke();
   x.shadowBlur=0;x.strokeStyle='#ffffff';x.lineWidth=2;x.beginPath();x.moveTo(18,side*12);x.lineTo(len-2,side*(k.startsWith('dagger')?17:20));x.stroke();
 }
}
function drawEffect(e){x.save();x.globalAlpha=Math.min(1,e.t*5);if(e.kind==='swing'){
 let col=e.team?'#ff79d7':'#63f6ff';x.shadowBlur=20;x.shadowColor=col;x.strokeStyle=col;x.lineWidth=10;x.beginPath();x.arc(e.x,e.y,e.range,e.a-e.arc/2,e.a+e.arc/2);x.stroke();x.shadowBlur=0;
 }else if(e.kind==='thrust'){
 let col=e.team?'#ff79d7':'#63f6ff',sx=e.x+Math.cos(e.a)*25,sy=e.y+Math.sin(e.a)*25,ex=e.x+Math.cos(e.a)*e.range,ey=e.y+Math.sin(e.a)*e.range;
 x.shadowBlur=24;x.shadowColor=col;x.strokeStyle=col;x.lineWidth=12;x.beginPath();x.moveTo(sx,sy);x.lineTo(ex,ey);x.stroke();x.shadowBlur=0;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.moveTo(sx,sy);x.lineTo(ex,ey);x.stroke();
 }else{x.font='bold 26px sans-serif';x.fillStyle=e.kind==='block'?'#fff':'#3c3028';x.fillText(e.kind==='block'?'BLOCK!':'OUT!',e.x-28,e.y-38)}x.restore()}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);syncModeButtons();
addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='j')hand(controlled(),'l',true);if(e.key==='k')hand(controlled(),'r',true)});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='j')hand(controlled(),'l',false)});
function bind(btn,side){btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);hand(controlled(),side,true)});btn.addEventListener('pointerup',e=>{e.preventDefault();hand(controlled(),side,false)});btn.addEventListener('pointercancel',()=>hand(controlled(),side,false))}bind(ui.L,'l');bind(ui.R,'r');
ui.E.onclick=()=>{if(mode==='field'){let near=Math.hypot(fieldPlayer.x-arenaGate.x,fieldPlayer.y-arenaGate.y)<arenaGate.r;if(near){ui.setup.classList.remove('hidden');ui.status.textContent='3人の装備を選択'}else ui.status.textContent='競技場の近くまで歩いてください'}else ui.status.textContent='スキルB枠：後で実装予定'};ui.S.onclick=()=>{ui.status.textContent='スキルA枠：後でバランスを見ながら実装予定'};
const stick=q('#stick'),knob=stick.querySelector('i');function joyMove(e){let r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.dx=dx;joy.dy=dy;knob.style.transform=`translate(${dx*28}px,${dy*28}px)`}stick.onpointerdown=e=>{joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);joyMove(e)};stick.onpointermove=e=>{if(e.pointerId===joy.id)joyMove(e)};function joyEnd(){joy.id=null;joy.dx=joy.dy=0;knob.style.transform=''}stick.onpointerup=joyEnd;stick.onpointercancel=joyEnd;
