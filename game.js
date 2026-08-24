'use strict';
const VERSION='v0.9';
const c=document.querySelector('#game'),x=c.getContext('2d'),W=1280,H=720;
const ui={score:q('#score'),status:q('#status'),mode:q('#modeLabel'),setup:q('#setup'),slots:q('#slots'),result:q('#result'),rt:q('#resultTitle'),rr:q('#resultText'),L:q('#leftHand'),R:q('#rightHand'),E:q('#enter'),S:q('#skill')};
function q(s){return document.querySelector(s)}
const versionEl=q('#version');if(versionEl)versionEl.textContent=VERSION;
const TYPES={sword:{name:'剣＋盾',r:'sword',l:'shield',speed:180},spear:{name:'両手槍',r:'spear',l:'spearGuard',speed:165},dagger:{name:'短剣二刀流',r:'daggerAttack',l:'daggerGuard',speed:210},doubleShield:{name:'双盾',r:'dualShield',l:'dualShield',speed:130}};
let formation=['sword','spear','dagger'],mode='field',blue=0,red=0,roundOver=0,last=performance.now(),keys={},joy={id:null,dx:0,dy:0},actors=[],effects=[];
const court={x:145,y:86,w:990,h:548};
// 横長の壁で「進行ルート」を上下に分ける。遮蔽物ではなくコース分岐用。
const obstacles=[
 // 左右対称の薄い横壁。中央で簡単にレーン変更できず、端まで回る必要がある。
 // 上下の長壁で3本の進行コースを作る。
 {x:320,y:235,w:640,h:18},
 {x:320,y:465,w:640,h:18},
 // 中央レーンにも左右対称の短壁を置き、一直線の合流を少しだけ崩す。
 {x:245,y:345,w:250,h:18},
 {x:785,y:345,w:250,h:18}
];
const fieldPlayer={x:545,y:525,r:22,speed:235};
const arenaGate={x:715,y:325,r:82};
for(let i=0;i<3;i++){let d=document.createElement('div');d.className='slot';d.innerHTML=`<b>選手 ${i+1}</b><select data-i="${i}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${formation[i]===k?'selected':''}>${v.name}</option>`).join('')}</select>`;ui.slots.append(d)}
ui.slots.onchange=e=>{if(e.target.dataset.i!=null)formation[+e.target.dataset.i]=e.target.value};
q('#start').onclick=()=>{ui.setup.classList.add('hidden');startMatch()};q('#back').onclick=()=>{ui.setup.classList.add('hidden');mode='field';syncModeButtons()};q('#rematch').onclick=()=>{ui.result.classList.add('hidden');startMatch()};q('#fieldBack').onclick=()=>{ui.result.classList.add('hidden');mode='field';ui.mode.textContent='FIELD';ui.status.textContent='スティックで競技場まで歩こう';syncModeButtons()};
function unit(team,i,type){
  // 壁から十分離した固定スポーン。開始直後に壁へ埋まらないよう3レーン中央へ配置。
  const ys=[165,360,555], bx=team===0?215:1065;
  return {team,i,type,x:bx,y:ys[i],r:27,alive:true,face:team?Math.PI:0,cd:0,stun:0,shield:false,shieldA:0,spearGuard:0,spearGuardCd:0,daggerGuard:false,ai:team===1||i>0,species:(i%3),handAnimL:0,handAnimR:0,attackPose:null}
}
function resetRound(){actors=[];formation.forEach((t,i)=>actors.push(unit(0,i,t)));['sword','spear','dagger'].forEach((t,i)=>actors.push(unit(1,i,t)));roundOver=0;effects=[];syncButtons()}
function startMatch(){mode='match';blue=red=0;ui.mode.textContent='MATCH';ui.score.textContent='0 - 0';resetRound();ui.status.textContent='敵拠点を取るか、全員OUTで勝利';syncModeButtons()}
function controlled(){return actors.find(a=>a.team===0&&a.alive&&!a.ai)||null}
function transfer(){let n=actors.find(a=>a.team===0&&a.alive);if(n){actors.filter(a=>a.team===0).forEach(a=>a.ai=true);n.ai=false;syncButtons()}}
function syncModeButtons(){if(mode==='field'){ui.S.innerHTML='A<small>スキルA<br>準備中</small>';ui.E.innerHTML='B<small>入る</small>'}else{ui.S.innerHTML='A<small>スキルA<br>準備中</small>';ui.E.innerHTML='B<small>スキルB<br>準備中</small>'}}
function syncButtons(){let a=controlled();if(!a)return;let t=TYPES[a.type];ui.R.innerHTML=`R<small>${label(t.r)}</small>`;ui.L.innerHTML=`L<small>${label(t.l)}</small>`}
function label(v){return ({sword:'剣',spear:'突き',spearGuard:'回転防御',shield:'盾',daggerAttack:'連続斬り',daggerGuard:'二刀防御',dualShield:'両盾'})[v]||v}
function nearestEnemy(a){let es=actors.filter(b=>b.alive&&b.team!==a.team);return es.sort((p,q)=>dist(a,p)-dist(a,q))[0]}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)} function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function norm(v){while(v>Math.PI)v-=Math.PI*2;while(v<-Math.PI)v+=Math.PI*2;return v}
function hand(a,side,down=true){
  if(mode!=='match'||!a||!a.alive||a.stun>0)return;
  let kind=TYPES[a.type][side];
  if(kind==='shield'||kind==='dualShield'){
    a.shield=down;
    if(down){let e=nearestEnemy(a);if(e)a.shieldA=angle(a,e)}
    return;
  }
  // 槍の左手は有限時間の「回転防御」。押しっぱなし不可でクールダウンあり。
  if(kind==='spearGuard'){
    if(down&&a.spearGuard<=0&&a.spearGuardCd<=0){
      let e=nearestEnemy(a);if(e)a.face=angle(a,e);
      a.spearGuard=.72;a.spearGuardCd=1.55;a.cd=Math.max(a.cd,.28);
      effects.push({kind:'spearGuard',owner:a,x:a.x,y:a.y,t:.72,max:.72,team:a.team});
    }
    return;
  }
  // 短剣の左ボタンは二刀を体の内側へ寄せる防御。押している間だけ有効。
  if(kind==='daggerGuard'){
    a.daggerGuard=down;
    if(down){let e=nearestEnemy(a);if(e)a.face=angle(a,e)}
    return;
  }
  if(!down||a.cd>0)return;
  let e=nearestEnemy(a);if(e)a.face=angle(a,e);
  if(kind==='daggerAttack'){
    a.handAnimL=a.handAnimR=.32;
    daggerCombo(a);
    a.cd=.58;
    return;
  }
  if(side==='l')a.handAnimL=.42;else a.handAnimR=.42;
  attack(a,kind,side);
  // 剣は見てから反応できるよう少し遅め、槍は溜めが長い。
  a.cd=kind==='spear'?1.02:.92;
}

function daggerCombo(a){
  // 右→左をほぼ間髪入れずに出す二連斬り。両方とも武器衝突時はパリィになる。
  const make=(side,delay,offset)=>{
    let windup=.035,active=.13,recovery=.08,total=windup+active+recovery;
    let e={kind:'swing',weapon:'daggerAttack',side,x:a.x,y:a.y,a:a.face+offset,range:92,arc:1.02,t:total,max:total,windup,active,recovery,delay,team:a.team,owner:a,resolved:false,parry:true};
    effects.push(e);
    return e;
  };
  let first=make('r',0,.20),second=make('l',.14,-.20);
  a.attackPose=first;
}

function attack(a,kind,side){
  let range=kind==='spear'?205:104;
  let arc=kind==='spear'?.11:1.52;
  let windup=kind==='spear'?.34:.28;
  let active=kind==='spear'?.12:.16;
  let recovery=kind==='spear'?.32:.28;
  let total=windup+active+recovery;
  let e={kind:kind==='spear'?'thrust':'swing',weapon:kind,side,x:a.x,y:a.y,a:a.face,range,arc,t:total,max:total,windup,active,recovery,team:a.team,owner:a,resolved:false,parry:false};
  a.attackPose=e;
  effects.push(e);
}
function segmentHitsWall(x1,y1,x2,y2,pad=0){
  const steps=Math.max(4,Math.ceil(Math.hypot(x2-x1,y2-y1)/8));
  for(let i=1;i<=steps;i++){
    let u=i/steps,px=x1+(x2-x1)*u,py=y1+(y2-y1)*u;
    if(obstacles.some(o=>px>o.x-pad&&px<o.x+o.w+pad&&py>o.y-pad&&py<o.y+o.h+pad))return {x:px,y:py,u};
  }
  return null;
}
function attackPhase(e){if((e.delay||0)>0)return 'delay';let elapsed=e.max-e.t;if(elapsed<e.windup)return 'windup';if(elapsed<e.windup+e.active)return 'active';return 'recovery'}
function weaponTip(e,rangeScale=1){
  let r=e.range*rangeScale;
  return {x:e.owner.x+Math.cos(e.a)*r,y:e.owner.y+Math.sin(e.a)*r};
}
function attacksOverlap(e,f){
  if(!e.owner?.alive||!f.owner?.alive||e.owner.team===f.owner.team)return false;
  if(attackPhase(e)!=='active'||attackPhase(f)!=='active')return false;
  let ep=weaponTip(e,e.weapon==='spear'?1:.72),fp=weaponTip(f,f.weapon==='spear'?1:.72);
  // 武器先端どうし、または相手の攻撃軌道付近が接触したら弾き。
  let rr=(e.weapon&&e.weapon.startsWith('dagger')?46:48)+(f.weapon&&f.weapon.startsWith('dagger')?46:48);
  return Math.hypot(ep.x-fp.x,ep.y-fp.y)<rr || Math.hypot(e.owner.x-f.owner.x,e.owner.y-f.owner.y)<105;
}
function parryAttacks(e){
  for(let f of effects){
    if(f===e||!(f.kind==='swing'||f.kind==='thrust')||f.resolved||f.clashed)continue;
    if(attacksOverlap(e,f)){
      e.clashed=f.clashed=true;e.resolved=f.resolved=true;
      e.owner.stun=Math.max(e.owner.stun,.28);f.owner.stun=Math.max(f.owner.stun,.28);
      let mx=(e.owner.x+f.owner.x)/2,my=(e.owner.y+f.owner.y)/2;
      effects.push({kind:'clash',x:mx,y:my,t:.30});
      return true;
    }
  }
  return false;
}
function resolveAttack(e){
  let a=e.owner;if(!a||!a.alive)return;
  if(parryAttacks(e))return;
  let effectiveRange=e.range;
  if(e.weapon==='spear'){
    let sx=a.x+Math.cos(e.a)*26,sy=a.y+Math.sin(e.a)*26;
    let ex=a.x+Math.cos(e.a)*e.range,ey=a.y+Math.sin(e.a)*e.range;
    let wall=segmentHitsWall(sx,sy,ex,ey,3);
    if(wall){effectiveRange=Math.max(34,e.range*wall.u);e.range=effectiveRange}
  }
  let hit=[];
  for(let b of actors){
    if(!b.alive||b.team===a.team)continue;
    let d=Math.hypot(b.x-a.x,b.y-a.y),da=Math.abs(norm(Math.atan2(b.y-a.y,b.x-a.x)-e.a));
    if(d>effectiveRange+b.r||da>e.arc/2)continue;
    if(segmentHitsWall(a.x,a.y,b.x,b.y,1))continue;
    hit.push(b);
  }
  for(let b of hit){
    if(blocked(b,a)){a.stun=Math.max(a.stun,.52);effects.push({kind:'block',x:b.x,y:b.y,t:.28});continue}
    b.alive=false;effects.push({kind:'out',x:b.x,y:b.y,t:.55});if(!b.ai)transfer();
  }
}
function blocked(def,atk){
  // 槍回転防御は短時間だけ全周パリィ。成功すると攻撃側が弾かれる。
  if(def.spearGuard>0){effects.push({kind:'clash',x:(def.x+atk.x)/2,y:(def.y+atk.y)/2,t:.30});return true}
  if(def.daggerGuard){effects.push({kind:'clash',x:(def.x+atk.x)/2,y:(def.y+atk.y)/2,t:.30});return true}
  if(!def.shield)return false;let dual=TYPES[def.type].r==='dualShield';if(dual)return true;return Math.abs(norm(angle(def,atk)-def.shieldA))<1.18
}
function collides(nx,ny,r){return obstacles.some(o=>nx+r>o.x&&nx-r<o.x+o.w&&ny+r>o.y&&ny-r<o.y+o.h)}
function rescueFromWall(a){
  // 万一位置が壁内になった場合も、最短方向へ押し出して停止状態を防ぐ。
  for(let o of obstacles){
    if(!(a.x+a.r>o.x&&a.x-a.r<o.x+o.w&&a.y+a.r>o.y&&a.y-a.r<o.y+o.h))continue;
    const opts=[
      {d:Math.abs((o.x-a.r)-a.x),x:o.x-a.r-2,y:a.y},
      {d:Math.abs((o.x+o.w+a.r)-a.x),x:o.x+o.w+a.r+2,y:a.y},
      {d:Math.abs((o.y-a.r)-a.y),x:a.x,y:o.y-a.r-2},
      {d:Math.abs((o.y+o.h+a.r)-a.y),x:a.x,y:o.y+o.h+a.r+2}
    ].sort((u,v)=>u.d-v.d);
    a.x=Math.max(court.x+30,Math.min(court.x+court.w-30,opts[0].x));
    a.y=Math.max(court.y+30,Math.min(court.y+court.h-30,opts[0].y));
  }
}
function move(a,vx,vy,dt){
  // 壁に斜めから当たっても完全停止せず、壁沿いに滑る。
  // 長い分岐壁でAIが全員スタックして『フリーズ』したように見えるのを防ぐ。
  let sp=TYPES[a.type].speed*(a.shield?(a.type==='doubleShield'?.42:.62):a.daggerGuard?.72:1);
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
  if((t.l==='shield'||t.l==='dualShield')&&d<130&&Math.random()<.06){a.shield=true;a.shieldA=angle(a,e)}else if(d>100)a.shield=false;if(t.l==='spearGuard'&&d<125&&a.spearGuardCd<=0&&Math.random()<.045)hand(a,'l',true);
  if(a.type==='dagger'&&d<105&&Math.random()<.055)a.daggerGuard=true;else if(a.type==='dagger'&&d>125)a.daggerGuard=false;if(d<(a.type==='spear'?150:a.type==='dagger'?92:108)&&a.cd<=0&&!a.shield&&!a.daggerGuard){hand(a,'r',true);return;}
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
function update(dt){let [vx,vy]=inputVector();if(mode==='field'){moveField(vx,vy,dt);let near=Math.hypot(fieldPlayer.x-arenaGate.x,fieldPlayer.y-arenaGate.y)<arenaGate.r;ui.status.textContent=near?'競技場の近くです。B「入る」で編成へ':'スティックで競技場まで歩こう';return}if(mode!=='match'||roundOver)return;for(let a of actors){if(!a.alive)continue;rescueFromWall(a);a.cd=Math.max(0,a.cd-dt);a.stun=Math.max(0,a.stun-dt);a.spearGuard=Math.max(0,(a.spearGuard||0)-dt);a.spearGuardCd=Math.max(0,(a.spearGuardCd||0)-dt);a.handAnimL=Math.max(0,(a.handAnimL||0)-dt);a.handAnimR=Math.max(0,(a.handAnimR||0)-dt);if(a.attackPose&&a.attackPose.t<=0)a.attackPose=null;if(a.ai&&a.stun<=0)ai(a,dt)}let p=controlled();if(p&&p.stun<=0)move(p,vx,vy,dt);let ba=actors.filter(a=>a.team===0&&a.alive),ra=actors.filter(a=>a.team===1&&a.alive);if(!ra.length)winRound(0,'敵チーム全員OUT');else if(!ba.length)winRound(1,'味方チーム全員OUT');else{if(ba.some(a=>Math.hypot(a.x-1095,a.y-360)<45))winRound(0,'敵拠点を奪取');if(ra.some(a=>Math.hypot(a.x-185,a.y-360)<45))winRound(1,'自陣拠点を奪取された')}effects.forEach(e=>{if((e.delay||0)>0){e.delay=Math.max(0,e.delay-dt);return}e.t-=dt;if((e.kind==='swing'||e.kind==='thrust')&&!e.resolved&&attackPhase(e)==='active'){resolveAttack(e);if(!e.clashed)e.resolved=true}});effects=effects.filter(e=>(e.delay||0)>0||e.t>0)}
function winRound(team,why){if(roundOver)return;roundOver=1;team===0?blue++:red++;ui.score.textContent=`${blue} - ${red}`;ui.status.textContent=(team===0?'BLUE ':'RED ')+why;if(blue>=2||red>=2)setTimeout(()=>{ui.rt.textContent=blue>red?'勝利！':'敗北';ui.rr.textContent=`${blue} - ${red}　${why}`;ui.result.classList.remove('hidden')},700);else setTimeout(resetRound,850)}
function draw(){x.clearRect(0,0,W,H);if(mode==='field')drawField();else drawMatch()}
function drawField(){x.fillStyle='#a7d28d';x.fillRect(0,0,W,H);x.fillStyle='#d9cc9e';x.lineWidth=95;x.lineCap='round';x.beginPath();x.moveTo(130,610);x.bezierCurveTo(300,520,480,430,650,370);x.bezierCurveTo(820,310,970,220,1150,120);x.strokeStyle='#d9cc9e';x.stroke();x.lineCap='butt';place(250,175,'クラブハウス','🏠');place(690,300,'競技場','🏟');place(1035,145,'森の練習路','🌳');x.fillStyle='#24483b';x.font='bold 28px sans-serif';x.fillText('けもの競技村',55,65);x.font='18px sans-serif';x.fillText('スティックで自由に歩けます',55,94);x.strokeStyle='#ffffffaa';x.lineWidth=3;x.setLineDash([8,8]);x.beginPath();x.arc(arenaGate.x,arenaGate.y,arenaGate.r,0,Math.PI*2);x.stroke();x.setLineDash([]);drawCuteFieldAnimal(fieldPlayer.x,fieldPlayer.y);x.fillStyle='#24483b';x.font='bold 16px sans-serif';x.textAlign='center';x.fillText('あなた',fieldPlayer.x,fieldPlayer.y+44);x.textAlign='start'}
function place(px,py,n,ico){x.font='70px sans-serif';x.fillText(ico,px,py);x.font='bold 20px sans-serif';x.fillStyle='#26493d';x.fillText(n,px-10,py+34)}
function drawCuteFieldAnimal(px,py){x.save();x.translate(px,py);x.shadowBlur=8;x.shadowColor='#356b45';x.fillStyle='#62c95b';x.beginPath();x.arc(0,4,21,0,Math.PI*2);x.fill();
// 前作風に目玉を頭の上へしっかり飛び出させる
x.beginPath();x.arc(-13,-18,10,0,Math.PI*2);x.arc(13,-18,10,0,Math.PI*2);x.fill();x.fillStyle='#fffbe7';x.beginPath();x.arc(-13,-19,7,0,Math.PI*2);x.arc(13,-19,7,0,Math.PI*2);x.fill();x.fillStyle='#24392f';x.beginPath();x.arc(-12,-19,3,0,Math.PI*2);x.arc(12,-19,3,0,Math.PI*2);x.fill();x.strokeStyle='#234632';x.lineWidth=2.5;x.beginPath();x.arc(0,5,10,.2,2.9);x.stroke();x.fillStyle='#355a76';roundRect(-18,14,36,13,5);x.fill();x.fillStyle='#62c95b';x.beginPath();x.ellipse(-14,31,7,14,.35,0,Math.PI*2);x.ellipse(14,31,7,14,-.35,0,Math.PI*2);x.fill();x.shadowBlur=0;x.restore()}
function drawMatch(){x.fillStyle='#688ca1';x.fillRect(0,0,W,H);x.fillStyle='#a9d0ef';x.fillRect(court.x,court.y,court.w,court.h);x.strokeStyle='#fff7d8';x.lineWidth=5;x.strokeRect(court.x,court.y,court.w,court.h);x.setLineDash([10,11]);x.beginPath();x.moveTo(640,court.y);x.lineTo(640,court.y+court.h);x.stroke();x.setLineDash([]);for(let o of obstacles){x.fillStyle='#eef0e7';roundRect(o.x,o.y,o.w,o.h,13);x.fill();x.fillStyle='#d6ddd6';roundRect(o.x+8,o.y+8,o.w-16,o.h-16,10);x.fill()}base(185,360,'#4d83dc');base(1095,360,'#e26368');for(let a of actors)drawActor(a);for(let e of effects)drawEffect(e)}
function roundRect(px,py,w,h,r){x.beginPath();x.roundRect(px,py,w,h,r)}
function base(px,py,col){x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.arc(px,py,35,0,Math.PI*2);x.stroke();x.globalAlpha=.22;x.fillStyle=col;x.fill();x.globalAlpha=1}
function drawActor(a){if(!a.alive)return;x.save();x.translate(a.x,a.y);let teamCol=a.team?'#e56f74':'#5a90df',fur=a.species===0?'#65bf58':a.species===1?'#eee8dc':'#df9a55';
// 体と頭は常に上向き
x.fillStyle=teamCol;roundRect(-19,4,38,30,10);x.fill();x.fillStyle=fur;x.beginPath();x.arc(0,-6,22,0,Math.PI*2);x.fill();
if(a.species===0){
  // カエルは前作のように、目を頭の上へ大きく飛び出させる
  x.beginPath();x.arc(-13,-24,10,0,Math.PI*2);x.arc(13,-24,10,0,Math.PI*2);x.fill();
  x.fillStyle='#fffbe7';x.beginPath();x.arc(-13,-25,7,0,Math.PI*2);x.arc(13,-25,7,0,Math.PI*2);x.fill();
  x.fillStyle='#27362f';x.beginPath();x.arc(-12,-25,3,0,Math.PI*2);x.arc(12,-25,3,0,Math.PI*2);x.fill();
}else if(a.species===1){
  x.beginPath();x.ellipse(-10,-29,6,18,-.12,0,Math.PI*2);x.ellipse(10,-29,6,18,.12,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';x.beginPath();x.arc(-7,-9,5,0,Math.PI*2);x.arc(7,-9,5,0,Math.PI*2);x.fill();x.fillStyle='#27362f';x.beginPath();x.arc(-6,-9,2,0,Math.PI*2);x.arc(6,-9,2,0,Math.PI*2);x.fill();
}else{
  x.beginPath();x.moveTo(-18,-17);x.lineTo(-8,-35);x.lineTo(-1,-18);x.fill();x.beginPath();x.moveTo(18,-17);x.lineTo(8,-35);x.lineTo(1,-18);x.fill();
  x.fillStyle='#fff';x.beginPath();x.arc(-7,-9,5,0,Math.PI*2);x.arc(7,-9,5,0,Math.PI*2);x.fill();x.fillStyle='#27362f';x.beginPath();x.arc(-6,-9,2,0,Math.PI*2);x.arc(6,-9,2,0,Math.PI*2);x.fill();
}
x.strokeStyle='#3f493f';x.lineWidth=2;x.beginPath();x.arc(0,-2,7,.3,2.8);x.stroke();
// 武器だけターゲット方向へ向ける
x.save();x.rotate(a.face);let t=TYPES[a.type];drawWeapon.owner=a;if(!(a.type==='spear'&&a.spearGuard>0)){drawWeapon(t.r,1,a.shield,a.handAnimR||0);drawWeapon(t.l,-1,a.shield,a.handAnimL||0)}else{ /* 回転槍はdrawEffect側で一本だけ描画 */ }drawWeapon.owner=null;x.restore();if(a===controlled()){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(0,2,34,0,Math.PI*2);x.stroke()}x.restore();x.fillStyle='#17382f';x.font='11px sans-serif';x.textAlign='center';x.fillText(TYPES[a.type].name,a.x,a.y+49);x.textAlign='start'}
function weaponColor(k){return k==='spear'?'#63f6ff':k&&k.startsWith('dagger')?'#ff75df':'#ffe66d'}
function drawWeapon(k,side,active,anim=0){
 x.save();x.lineCap='round';
 if(k==='shield'||k==='dualShield'){
   let cy=side*23;x.translate(21,cy);x.shadowBlur=active?18:7;x.shadowColor=active?'#63f6ff':'#9fdbea';
   x.fillStyle=active?'#7debf2':'#b8dce5';x.strokeStyle='#f7ffff';x.lineWidth=3;
   x.beginPath();x.moveTo(-12,-21);x.quadraticCurveTo(13,-25,22,-8);x.lineTo(17,12);x.quadraticCurveTo(4,27,-12,20);x.quadraticCurveTo(-19,0,-12,-21);x.closePath();x.fill();x.stroke();
   x.shadowBlur=0;x.strokeStyle='#527f8d';x.lineWidth=3;x.beginPath();x.moveTo(-5,-14);x.lineTo(11,-8);x.lineTo(8,10);x.lineTo(-6,14);x.stroke();
 }else if(k==='spearGuard'){
   // 槍は左右別武器ではなく両手で一本。左手側では追加描画しない。
 }else if(k==='daggerGuard'){
   // 左ボタンは追加武器ではなく二刀防御状態。右側描画で二本をまとめて描く。
 }else{
   let col=weaponColor(k),len=k==='spear'?92:k.startsWith('dagger')?50:58;
   let owner=drawWeapon.owner,guarding=owner&&owner.daggerGuard&&k==='daggerAttack';
   let baseY=side*(k.startsWith('dagger')?(guarding?12:30):14),tipY=side*(k.startsWith('dagger')?(guarding?7:42):20);
   if(k==='spear'){baseY=0;tipY=0;}
   if(k.startsWith('dagger')&&anim>0){let p=Math.min(1,anim/.24);let swing=Math.sin((1-p)*Math.PI)*22;tipY-=side*swing;baseY+=side*4}
   // 攻撃中は「持っている一本そのもの」が動く。別武器は描かない。
   let pose=owner&&owner.attackPose&&owner.attackPose.weapon===k?owner.attackPose:null;
   if(pose){let ph=attackPhase(pose),el=pose.max-pose.t;if(k==='spear'){
     let pr=ph==='windup'?Math.max(.65,1-el/pose.windup*.35):ph==='active'?1.65:Math.max(1,1.65-(el-pose.windup-pose.active)/pose.recovery*.65);
     len*=pr;
   }else if(k==='sword'){
     let pr=ph==='windup'?Math.min(1,el/pose.windup):1;tipY+=side*(1-pr)*22;
   }}
   const drawBlade=(by,ty)=>{x.shadowBlur=18;x.shadowColor=col;x.strokeStyle='#6c625b';x.lineWidth=5;x.beginPath();x.moveTo(k==='spear'?-13:7,by);x.lineTo(k==='spear'?18:17,by);x.stroke();x.strokeStyle=col;x.lineWidth=7;x.beginPath();x.moveTo(k==='spear'?16:16,by);x.lineTo(len,ty);x.stroke();x.shadowBlur=0;x.strokeStyle='#ffffff';x.lineWidth=2;x.beginPath();x.moveTo(k==='spear'?20:19,by);x.lineTo(len-2,ty);x.stroke();};
   drawBlade(baseY,tipY);
   if(k==='daggerAttack'&&guarding)drawBlade(-baseY,-tipY);
   if(k==='spear'){x.strokeStyle='#8a6d43';x.lineWidth=4;x.beginPath();x.moveTo(-20,0);x.lineTo(16,0);x.stroke();}
 }
 x.restore();
}
function drawEffect(e){
 x.save();
 if(e.kind==='swing'||e.kind==='thrust'){
   if((e.delay||0)>0){x.restore();return}
   let ph=attackPhase(e),elapsed=e.max-e.t,active=ph==='active';
   // 残像色は必ず実武器色と一致。実体ではなく半透明の軌跡だけを描く。
   let col=weaponColor(e.weapon);x.globalAlpha=active?.52:ph==='recovery'?.22:.10;
   if(e.kind==='swing'){
     x.shadowBlur=active?18:6;x.shadowColor=col;x.strokeStyle=col;x.lineWidth=e.weapon&&e.weapon.startsWith('dagger')?9:11;
     let sideShift=e.weapon&&e.weapon.startsWith('dagger')?(e.side==='l'?-0.28:.28):0;
     let sweep=ph==='windup'?Math.max(.16,e.arc*.18):e.arc;
     x.beginPath();x.arc(e.owner.x,e.owner.y,e.range,e.a+sideShift-sweep/2,e.a+sideShift+sweep/2);x.stroke();
   }else if(active||ph==='recovery'){
     let sx=e.owner.x+Math.cos(e.a)*28,sy=e.owner.y+Math.sin(e.a)*28;
     let ex=e.owner.x+Math.cos(e.a)*e.range,ey=e.owner.y+Math.sin(e.a)*e.range;
     x.shadowBlur=18;x.shadowColor=col;x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.moveTo(sx,sy);x.lineTo(ex,ey);x.stroke();
   }
 }else if(e.kind==='spearGuard'){
   let a=e.owner;if(a&&a.alive){let p=1-e.t/e.max,col=weaponColor('spear'),half=58,mid=36;x.translate(a.x+Math.cos(a.face)*mid,a.y+Math.sin(a.face)*mid);x.rotate(a.face+p*22);x.globalAlpha=.82;x.lineCap='round';x.shadowBlur=18;x.shadowColor=col;x.strokeStyle='#8a6d43';x.lineWidth=5;x.beginPath();x.moveTo(-half,0);x.lineTo(half,0);x.stroke();x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.moveTo(-half+12,0);x.lineTo(half,0);x.stroke();x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(-half+16,0);x.lineTo(half-3,0);x.stroke();}
 }else{
   x.globalAlpha=Math.min(1,e.t*5);x.font='bold 26px sans-serif';x.fillStyle=e.kind==='block'?'#fff':e.kind==='clash'?'#fff7a6':'#3c3028';x.fillText(e.kind==='block'?'BLOCK!':e.kind==='clash'?'CLASH!':'OUT!',e.x-35,e.y-38)
 }
 x.restore();
}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);syncModeButtons();
addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='j')hand(controlled(),'l',true);if(e.key==='k')hand(controlled(),'r',true)});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='j')hand(controlled(),'l',false)});
function bind(btn,side){btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);hand(controlled(),side,true)});btn.addEventListener('pointerup',e=>{e.preventDefault();hand(controlled(),side,false)});btn.addEventListener('pointercancel',()=>hand(controlled(),side,false))}bind(ui.L,'l');bind(ui.R,'r');
ui.E.onclick=()=>{if(mode==='field'){let near=Math.hypot(fieldPlayer.x-arenaGate.x,fieldPlayer.y-arenaGate.y)<arenaGate.r;if(near){ui.setup.classList.remove('hidden');ui.status.textContent='3人の装備を選択'}else ui.status.textContent='競技場の近くまで歩いてください'}else ui.status.textContent='スキルB枠：後で実装予定'};ui.S.onclick=()=>{ui.status.textContent='スキルA枠：後でバランスを見ながら実装予定'};
const stick=q('#stick'),knob=stick.querySelector('i');function joyMove(e){let r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.dx=dx;joy.dy=dy;knob.style.transform=`translate(${dx*28}px,${dy*28}px)`}stick.onpointerdown=e=>{joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);joyMove(e)};stick.onpointermove=e=>{if(e.pointerId===joy.id)joyMove(e)};function joyEnd(){joy.id=null;joy.dx=joy.dy=0;knob.style.transform=''}stick.onpointerup=joyEnd;stick.onpointercancel=joyEnd;
