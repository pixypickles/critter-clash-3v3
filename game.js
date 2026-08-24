'use strict';
const VERSION='v0.17';
const c=document.querySelector('#game'),x=c.getContext('2d'),W=1280,H=720;
const ui={score:q('#score'),status:q('#status'),mode:q('#modeLabel'),setup:q('#setup'),slots:q('#slots'),result:q('#result'),rt:q('#resultTitle'),rr:q('#resultText'),L:q('#leftHand'),R:q('#rightHand'),E:q('#enter'),S:q('#skill')};
function q(s){return document.querySelector(s)}
const versionEl=q('#version');if(versionEl)versionEl.textContent=VERSION;const versionBadge=q('#versionBadge');if(versionBadge)versionBadge.textContent=`Prototype ${VERSION}`;
const TYPES={sword:{name:'剣＋盾',r:'sword',l:'shield',speed:180,skill:'回転斬り'},spear:{name:'両手槍',r:'spear',l:'spearGuard',speed:165,skill:'二連突き'},dagger:{name:'短剣二刀流',r:'daggerAttack',l:'daggerGuard',speed:240,skill:'踏込斬り'},doubleShield:{name:'双盾',r:'dualShield',l:'dualShield',speed:130,skill:'準備中'} };
let formation=['sword','spear','dagger'],mode='field',blue=0,red=0,roundOver=0,last=performance.now(),keys={},joy={id:null,dx:0,dy:0},actors=[],effects=[];
const court={x:35,y:82,w:1210,h:556};
// v0.15: 左右を広げ、中央の主戦場を広めにした二股→合流→二股。
// 斜め壁は使わず、段差状の矩形を組み合わせてルートを絞る。
// 左右の大きな島で上下二股、中央は上下から張り出す段差壁で一本に合流。
// 中央通路は以前より広く、複数人が戦える主戦場。さらに中央壁の間に細い1人用の抜け道を残す。
const obstacles=[
 // v0.16: キャラを大きくした分、障害物はさらに小型化して通路幅を確保。
 // 二股→中央合流→二股の骨格は残しつつ、圧迫感を減らす。
 {x:292,y:255,w:116,h:210,oval:true},
 {x:872,y:255,w:116,h:210,oval:true},
 {x:585,y:82,w:110,h:48,oval:true},
 {x:603,y:130,w:74,h:34,oval:true},
 {x:620,y:164,w:40,h:24,oval:true},
 {x:585,y:590,w:110,h:48,oval:true},
 {x:603,y:556,w:74,h:34,oval:true},
 {x:620,y:532,w:40,h:24,oval:true}
];
const fieldPlayer={x:545,y:525,r:22,speed:235};
const arenaGate={x:715,y:325,r:82};
for(let i=0;i<3;i++){let d=document.createElement('div');d.className='slot';d.innerHTML=`<b>選手 ${i+1}</b><select data-i="${i}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${formation[i]===k?'selected':''}>${v.name}</option>`).join('')}</select>`;ui.slots.append(d)}
ui.slots.onchange=e=>{if(e.target.dataset.i!=null)formation[+e.target.dataset.i]=e.target.value};
q('#start').onclick=()=>{ui.setup.classList.add('hidden');startMatch()};q('#back').onclick=()=>{ui.setup.classList.add('hidden');mode='field';syncModeButtons()};q('#rematch').onclick=()=>{ui.result.classList.add('hidden');startMatch()};q('#fieldBack').onclick=()=>{ui.result.classList.add('hidden');mode='field';ui.mode.textContent='FIELD';ui.status.textContent='スティックで競技場まで歩こう';syncModeButtons()};
function unit(team,i,type){
  // 壁から十分離した固定スポーン。開始直後に壁へ埋まらないよう3レーン中央へ配置。
  const ys=[155,360,565], bx=team===0?155:1125;
  return {team,i,type,x:bx,y:ys[i],r:38,alive:true,face:team?Math.PI:0,cd:0,stun:0,shield:false,shieldA:0,spearGuard:0,spearGuardCd:0,daggerGuard:false,ai:team===1||i>0,species:(i%3),handAnimL:0,handAnimR:0,attackPose:null,skillCd:0,invuln:0}
}
function resetRound(){actors=[];formation.forEach((t,i)=>actors.push(unit(0,i,t)));['sword','spear','dagger'].forEach((t,i)=>actors.push(unit(1,i,t)));roundOver=0;effects=[];syncButtons()}
function startMatch(){mode='match';blue=red=0;ui.mode.textContent='MATCH';ui.score.textContent='0 - 0';resetRound();ui.status.textContent='敵拠点を取るか、全員OUTで勝利';syncModeButtons()}
function controlled(){return actors.find(a=>a.team===0&&a.alive&&!a.ai)||null}
function transfer(){let n=actors.find(a=>a.team===0&&a.alive);if(n){actors.filter(a=>a.team===0).forEach(a=>a.ai=true);n.ai=false;syncButtons()}}
function syncModeButtons(){if(mode==='field'){ui.S.innerHTML='A<small>スキル</small>';ui.E.innerHTML='B<small>入る</small>'}else syncButtons()}
function syncButtons(){let a=controlled();if(!a)return;let t=TYPES[a.type];ui.R.innerHTML=`R<small>${label(t.r)}</small>`;ui.L.innerHTML=`L<small>${label(t.l)}</small>`;let cd=Math.max(0,a.skillCd||0);ui.S.innerHTML=`A<small>${cd>0?`${cd.toFixed(1)}秒`:(t.skill||'スキル')}</small>`;ui.E.innerHTML='B<small>キャラ交代</small>'}
function label(v){return ({sword:'剣',spear:'突き',spearGuard:'回転防御',shield:'盾',daggerAttack:'連続斬り',daggerGuard:'二刀防御',dualShield:'両盾'})[v]||v}
function nearestEnemy(a){let es=actors.filter(b=>b.alive&&b.team!==a.team);return es.sort((p,q)=>dist(a,p)-dist(a,q))[0]}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)} function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function norm(v){while(v>Math.PI)v-=Math.PI*2;while(v<-Math.PI)v+=Math.PI*2;return v}

function safePush(a,dx,dy){
  if(!a||!a.alive)return;
  let nx=Math.max(court.x+a.r,Math.min(court.x+court.w-a.r,a.x+dx));
  if(!collides(nx,a.y,a.r))a.x=nx;
  let ny=Math.max(court.y+a.r,Math.min(court.y+court.h-a.r,a.y+dy));
  if(!collides(a.x,ny,a.r))a.y=ny;
}
function knockApart(a,b,amountA=18,amountB=18){
  if(!a||!b)return;let ang=angle(b,a);safePush(a,Math.cos(ang)*amountA,Math.sin(ang)*amountA);safePush(b,-Math.cos(ang)*amountB,-Math.sin(ang)*amountB);
}
function cycleControlled(){
  if(mode!=='match')return;let alive=actors.filter(a=>a.team===0&&a.alive);if(alive.length<2)return;
  let cur=controlled(),idx=Math.max(0,alive.indexOf(cur)),next=alive[(idx+1)%alive.length];actors.filter(a=>a.team===0).forEach(a=>a.ai=true);next.ai=false;syncButtons();ui.status.textContent=`操作交代：${TYPES[next.type].name}`;
}
function useSkill(a){
  if(mode!=='match'||!a||!a.alive||a.stun>0||a.skillCd>0)return;
  let e=nearestEnemy(a);if(e)a.face=angle(a,e);
  if(a.type==='sword'){
    a.skillCd=5.0;a.stun=Math.max(a.stun,.16);effects.push({kind:'spinSkill',owner:a,t:.72,max:.72,windup:.20,active:.22,recovery:.30,resolved:false});a.cd=Math.max(a.cd,.72);
  }else if(a.type==='spear'){
    a.skillCd=5.4;
    const mk=(delay,second)=>({kind:'thrust',weapon:'spear',skill:true,second,side:'r',x:a.x,y:a.y,a:a.face,range:second?220:190,arc:.13,t:.66,max:.66,windup:.18,active:.12,recovery:.36,delay,team:a.team,owner:a,resolved:false,parry:false,recoveryApplied:false,knockback:second?42:0});
    effects.push(mk(0,false),mk(.20,true));a.cd=Math.max(a.cd,1.05);a.attackPose=effects[effects.length-1];
  }else if(a.type==='dagger'){
    a.skillCd=4.8;a.invuln=.20;
    // 踏込斬り：片方の短剣を内側に構えながら最初から前へ踏み込む。
    // 踏み込みのごく短い間だけ無敵になり、その直後にもう一本で高速斬り。
    safePush(a,Math.cos(a.face)*58,Math.sin(a.face)*58);
    a.daggerSkillGuard=.20;
    effects.push({kind:'dashGuard',owner:a,x:a.x,y:a.y,t:.20,max:.20});
    let sw={kind:'swing',weapon:'daggerAttack',skill:true,side:'r',x:a.x,y:a.y,a:a.face,range:112,arc:1.18,t:.46,max:.46,windup:.08,active:.12,recovery:.26,delay:.08,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false,lunge:34,lungeApplied:false};
    effects.push(sw);a.attackPose=sw;a.cd=Math.max(a.cd,.62);
  }else if(a.type==='doubleShield'){
    ui.status.textContent='双盾スキルは後で調整予定';return;
  }
  syncButtons();
}
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
    let e={kind:'swing',weapon:'daggerAttack',side,x:a.x,y:a.y,a:a.face+offset,range:92,arc:1.02,t:total,max:total,windup,active,recovery,delay,team:a.team,owner:a,resolved:false,parry:true,lunge:18,lungeApplied:false,recoveryApplied:false};
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
  let e={kind:kind==='spear'?'thrust':'swing',weapon:kind,side,x:a.x,y:a.y,a:a.face,range,arc,t:total,max:total,windup,active,recovery,team:a.team,owner:a,resolved:false,parry:false,recoveryApplied:false};
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
function attackLunge(e){
  if(!e.lunge||e.lungeApplied||!e.owner?.alive)return;
  e.lungeApplied=true;
  // 短剣は各斬撃の発生と同時に少しだけ踏み込む。壁はすり抜けない。
  let a=e.owner,dx=Math.cos(a.face)*e.lunge,dy=Math.sin(a.face)*e.lunge;
  let nx=Math.max(court.x+30,Math.min(court.x+court.w-30,a.x+dx));
  if(!collides(nx,a.y,a.r))a.x=nx;
  let ny=Math.max(court.y+30,Math.min(court.y+court.h-30,a.y+dy));
  if(!collides(a.x,ny,a.r))a.y=ny;
}
function applyAttackRecovery(e){
  if(e.recoveryApplied||!e.owner?.alive)return;
  e.recoveryApplied=true;
  // 全武器共通のごく短い攻撃後硬直。短剣は軽く、槍はやや重い。
  let lock=e.weapon==='spear'?.16:e.weapon&&e.weapon.startsWith('dagger')?.075:.12;
  e.owner.stun=Math.max(e.owner.stun,lock);
}
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
      e.owner.stun=Math.max(e.owner.stun,.30);f.owner.stun=Math.max(f.owner.stun,.30);knockApart(e.owner,f.owner,24,24);
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
    if(!b.alive||b.team===a.team||b.invuln>0)continue;
    let d=Math.hypot(b.x-a.x,b.y-a.y),da=Math.abs(norm(Math.atan2(b.y-a.y,b.x-a.x)-e.a));
    if(d>effectiveRange+b.r||da>e.arc/2)continue;
    if(segmentHitsWall(a.x,a.y,b.x,b.y,1))continue;
    hit.push(b);
  }
  for(let b of hit){
    if(blocked(b,a)){if(e.knockback)knockApart(a,b,e.knockback,12);continue}
    b.alive=false;effects.push({kind:'out',x:b.x,y:b.y,t:.55});if(!b.ai)transfer();
  }
}
function blocked(def,atk){
  let ok=false;
  if(def.spearGuard>0||def.daggerGuard)ok=true;
  else if(def.shield){let dual=TYPES[def.type].r==='dualShield';ok=dual||Math.abs(norm(angle(def,atk)-def.shieldA))<1.18}
  if(ok){
    // 防御成功でも双方が少し離れる。攻撃側の方が大きく弾かれる。
    knockApart(atk,def,34,8);atk.stun=Math.max(atk.stun,.48);def.stun=Math.max(def.stun,.07);
    effects.push({kind:'block',x:(def.x+atk.x)/2,y:(def.y+atk.y)/2,t:.34});
  }
  return ok;
}

function resolveSpin(e){
  let a=e.owner;if(!a||!a.alive)return;
  for(let b of actors){
    if(!b.alive||b.team===a.team||b.invuln>0)continue;
    if(dist(a,b)>128+b.r||segmentHitsWall(a.x,a.y,b.x,b.y,1))continue;
    if(blocked(b,a))continue;
    b.alive=false;effects.push({kind:'out',x:b.x,y:b.y,t:.55});if(!b.ai)transfer();
  }
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

function separateActors(){
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){
    let a=actors[i],b=actors[j];if(!a.alive||!b.alive)continue;
    let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r+3;
    if(d>=min)continue;if(d<.01){dx=1;dy=0;d=1}
    let overlap=min-d,nx=dx/d,ny=dy/d;
    safePush(a,-nx*overlap*.5,-ny*overlap*.5);safePush(b,nx*overlap*.5,ny*overlap*.5);
  }
}
function moveField(vx,vy,dt){let m=Math.hypot(vx,vy);if(m>1){vx/=m;vy/=m}fieldPlayer.x=Math.max(80,Math.min(1200,fieldPlayer.x+vx*fieldPlayer.speed*dt));fieldPlayer.y=Math.max(110,Math.min(650,fieldPlayer.y+vy*fieldPlayer.speed*dt))}
function routePoint(a){
  // 二股 → 中央ゲートで一本化 → 二股。
  // 3人は最初に上下へ散り、中央では必ず y=360 付近の細道を通る。
  const dir=a.team?-1:1;
  const lane=((a.i+(a.team?1:0))%2===0)?155:565;
  const x=a.x;
  if(dir>0){
    // 左チーム: 左アイランドを上下から回る
    if(x<500)return {x:515,y:lane};
    // 中央の一本通路へ合流
    if(x<710)return {x:700,y:360+(a.i-1)*18};
    // 右アイランドで再び上下へ分岐
    if(x<1000)return {x:1005,y:lane};
    return {x:1150,y:360+(a.i-1)*28};
  }else{
    // 右チームは完全な鏡写し
    if(x>780)return {x:765,y:lane};
    if(x>570)return {x:580,y:360+(a.i-1)*18};
    if(x>280)return {x:275,y:lane};
    return {x:130,y:360+(a.i-1)*28};
  }
}
function ai(a,dt){
  const es=actors.filter(b=>b.alive&&b.team!==a.team);
  if(!es.length)return;
  const e=es.slice().sort((p,q)=>dist(a,p)-dist(a,q))[0];
  const d=dist(a,e), t=TYPES[a.type];
  const enemyBase=a.team?{x:130,y:360}:{x:1150,y:360};
  const ownBase=a.team?{x:1150,y:360}:{x:130,y:360};
  a.aiClock=(a.aiClock||0)+dt;

  // 周囲の人数を見る。1対2以上なら無謀に突っ込まず、味方へ寄る/少し引く。
  const nearEnemies=es.filter(b=>dist(a,b)<205).length;
  const allies=actors.filter(b=>b.alive&&b.team===a.team&&b!==a);
  const nearAllies=allies.filter(b=>dist(a,b)<205).length;
  const outnumbered=nearEnemies>nearAllies+1;

  // 防御系も棒立ちにはしないが、以前ほど頻繁に防御し続けない。
  if((t.l==='shield'||t.l==='dualShield')&&d<150){
    if(!a.shield&&Math.random()<.035){a.shield=true;a.shieldA=angle(a,e)}
  }else if(d>175)a.shield=false;
  if(t.l==='spearGuard'&&d<132&&a.spearGuardCd<=0&&Math.random()<.025)hand(a,'l',true);
  if(a.type==='dagger'&&d<105&&Math.random()<.035)a.daggerGuard=true;
  else if(a.type==='dagger'&&d>132)a.daggerGuard=false;
  const defending=a.shield||a.daggerGuard||a.spearGuard>0;

  // スキルは通常攻撃より低頻度。状況が合う時だけ使う。
  if(a.skillCd<=0&&!defending&&!outnumbered&&Math.random()<.008){if((a.type==='sword'&&d<125)||(a.type==='spear'&&d<190)||(a.type==='dagger'&&d<130)){useSkill(a);return}}

  // 攻撃可能距離なら攻撃。ただし人数不利では「当たる寸前」以外は無理に振らない。
  const attackDist=a.type==='spear'?158:a.type==='dagger'?108:116;
  if(d<attackDist&&a.cd<=0&&!a.shield&&!a.daggerGuard&&a.spearGuard<=0&&(!outnumbered||d<attackDist*.72)){
    a.face=angle(a,e);hand(a,'r',true);return;
  }

  let target=routePoint(a);
  let ang=angle(a,target);

  if(outnumbered){
    // 最寄り味方がいればそこへ寄り、いなければ自陣側へ少し退く。
    const mate=allies.slice().sort((p,q)=>dist(a,p)-dist(a,q))[0];
    target=mate&&dist(a,mate)>90?mate:ownBase;
    ang=angle(a,target);
  }else if(d<210){
    // 敵を見つけても直線突撃はしない。武器ごとの得意間合いを保ちながら横へ回る。
    a.face=angle(a,e);
    const desired=a.type==='spear'?172:a.type==='dagger'?112:138;
    const side=((a.i+a.team)%2?1:-1);
    if(d>desired+24) ang=angle(a,e)+side*.10;
    else if(d<desired-20) ang=angle(a,e)+Math.PI+side*.16;
    else ang=angle(a,e)+side*Math.PI/2;
  }else if(Math.hypot(a.x-enemyBase.x,a.y-enemyBase.y)<245){
    // 敵陣深くでは拠点へ進む。ただし3人が完全に一点へ重ならないよう少し上下に散らす。
    target={x:enemyBase.x,y:enemyBase.y+(a.i-1)*34};
    ang=angle(a,target);
  }

  // 防御中もじわっと横移動。止まり続けるだけにはしない。
  if(defending&&d<190){
    const side=((a.i+a.team)%2?1:-1);
    ang=angle(a,e)+side*Math.PI/2 + Math.sin(a.aiClock*1.7)*.12;
  }

  // 進行先に障害物がある時は、最寄りの上下端へ迂回する。
  const probe=42,px=a.x+Math.cos(ang)*probe,py=a.y+Math.sin(ang)*probe;
  if(collides(px,py,a.r)){
    const hit=obstacles.find(o=>px+a.r>o.x&&px-a.r<o.x+o.w&&py+a.r>o.y&&py-a.r<o.y+o.h);
    if(hit){
      const margin=a.r+20;
      const pts=[
        {x:hit.x-margin,y:hit.y-margin},
        {x:hit.x+hit.w+margin,y:hit.y-margin},
        {x:hit.x-margin,y:hit.y+hit.h+margin},
        {x:hit.x+hit.w+margin,y:hit.y+hit.h+margin}
      ].filter(p=>p.x>court.x+35&&p.x<court.x+court.w-35&&p.y>court.y+35&&p.y<court.y+court.h-35);
      pts.sort((p,q)=>(dist(a,p)+Math.hypot(p.x-target.x,p.y-target.y))-(dist(a,q)+Math.hypot(q.x-target.x,q.y-target.y)));
      if(pts[0])ang=angle(a,pts[0]);
    }
  }
  move(a,Math.cos(ang),Math.sin(ang),dt);
}
function inputVector(){let vx=joy.dx+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),vy=joy.dy+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let m=Math.hypot(vx,vy);if(m>1){vx/=m;vy/=m}return [vx,vy]}
function update(dt){
  let [vx,vy]=inputVector();
  if(mode==='field'){
    moveField(vx,vy,dt);let near=Math.hypot(fieldPlayer.x-arenaGate.x,fieldPlayer.y-arenaGate.y)<arenaGate.r;
    ui.status.textContent=near?'競技場の近くです。B「入る」で編成へ':'スティックで競技場まで歩こう';return;
  }
  if(mode!=='match'||roundOver)return;
  for(let a of actors){
    if(!a.alive)continue;rescueFromWall(a);a.cd=Math.max(0,a.cd-dt);a.stun=Math.max(0,a.stun-dt);a.skillCd=Math.max(0,(a.skillCd||0)-dt);a.invuln=Math.max(0,(a.invuln||0)-dt);a.daggerSkillGuard=Math.max(0,(a.daggerSkillGuard||0)-dt);a.spearGuard=Math.max(0,(a.spearGuard||0)-dt);a.spearGuardCd=Math.max(0,(a.spearGuardCd||0)-dt);a.handAnimL=Math.max(0,(a.handAnimL||0)-dt);a.handAnimR=Math.max(0,(a.handAnimR||0)-dt);if(a.attackPose&&a.attackPose.t<=0)a.attackPose=null;if(a.ai&&a.stun<=0)ai(a,dt)
  }
  let p=controlled();if(p&&p.stun<=0)move(p,vx,vy,dt);
  separateActors();
  let ba=actors.filter(a=>a.team===0&&a.alive),ra=actors.filter(a=>a.team===1&&a.alive);
  if(!ra.length)winRound(0,'敵チーム全員OUT');else if(!ba.length)winRound(1,'味方チーム全員OUT');else{
    if(ba.some(a=>Math.hypot(a.x-1150,a.y-360)<45))winRound(0,'敵拠点を奪取');
    if(ra.some(a=>Math.hypot(a.x-130,a.y-360)<45))winRound(1,'自陣拠点を奪取された')
  }
  effects.forEach(e=>{
    if((e.delay||0)>0){e.delay=Math.max(0,e.delay-dt);return}
    e.t-=dt;
    if(e.kind==='swing'||e.kind==='thrust'){
      let ph=attackPhase(e);if(ph==='active'){attackLunge(e);if(!e.resolved){resolveAttack(e);if(!e.clashed)e.resolved=true}}if(ph==='recovery')applyAttackRecovery(e)
    }else if(e.kind==='spinSkill'){
      let elapsed=e.max-e.t,ph=elapsed<e.windup?'windup':elapsed<e.windup+e.active?'active':'recovery';
      if(ph==='active'&&!e.resolved){resolveSpin(e);e.resolved=true}
    }
  });
  effects=effects.filter(e=>(e.delay||0)>0||e.t>0);
  if((Math.floor(performance.now()/120)%2)===0)syncButtons();
}
function winRound(team,why){if(roundOver)return;roundOver=1;team===0?blue++:red++;ui.score.textContent=`${blue} - ${red}`;ui.status.textContent=(team===0?'BLUE ':'RED ')+why;if(blue>=2||red>=2)setTimeout(()=>{ui.rt.textContent=blue>red?'勝利！':'敗北';ui.rr.textContent=`${blue} - ${red}　${why}`;ui.result.classList.remove('hidden')},700);else setTimeout(resetRound,850)}
function draw(){x.clearRect(0,0,W,H);if(mode==='field')drawField();else drawMatch()}
function drawField(){x.fillStyle='#a7d28d';x.fillRect(0,0,W,H);x.fillStyle='#d9cc9e';x.lineWidth=95;x.lineCap='round';x.beginPath();x.moveTo(130,610);x.bezierCurveTo(300,520,480,430,650,370);x.bezierCurveTo(820,310,970,220,1150,120);x.strokeStyle='#d9cc9e';x.stroke();x.lineCap='butt';place(250,175,'クラブハウス','🏠');place(690,300,'競技場','🏟');place(1035,145,'森の練習路','🌳');x.fillStyle='#24483b';x.font='bold 28px sans-serif';x.fillText('けもの競技村',55,65);x.font='18px sans-serif';x.fillText('スティックで自由に歩けます',55,94);x.strokeStyle='#ffffffaa';x.lineWidth=3;x.setLineDash([8,8]);x.beginPath();x.arc(arenaGate.x,arenaGate.y,arenaGate.r,0,Math.PI*2);x.stroke();x.setLineDash([]);drawCuteFieldAnimal(fieldPlayer.x,fieldPlayer.y);x.fillStyle='#24483b';x.font='bold 16px sans-serif';x.textAlign='center';x.fillText('あなた',fieldPlayer.x,fieldPlayer.y+44);x.textAlign='start'}
function place(px,py,n,ico){x.font='70px sans-serif';x.fillText(ico,px,py);x.font='bold 20px sans-serif';x.fillStyle='#26493d';x.fillText(n,px-10,py+34)}
function drawCuteFieldAnimal(px,py){x.save();x.translate(px,py);x.shadowBlur=8;x.shadowColor='#356b45';x.fillStyle='#62c95b';x.beginPath();x.arc(0,4,21,0,Math.PI*2);x.fill();
// 前作風に目玉を頭の上へしっかり飛び出させる
x.beginPath();x.arc(-13,-18,10,0,Math.PI*2);x.arc(13,-18,10,0,Math.PI*2);x.fill();x.fillStyle='#fffbe7';x.beginPath();x.arc(-13,-19,7,0,Math.PI*2);x.arc(13,-19,7,0,Math.PI*2);x.fill();x.fillStyle='#24392f';x.beginPath();x.arc(-12,-19,3,0,Math.PI*2);x.arc(12,-19,3,0,Math.PI*2);x.fill();x.strokeStyle='#234632';x.lineWidth=2.5;x.beginPath();x.arc(0,5,10,.2,2.9);x.stroke();x.fillStyle='#355a76';roundRect(-18,14,36,13,5);x.fill();x.fillStyle='#62c95b';x.beginPath();x.ellipse(-14,31,7,14,.35,0,Math.PI*2);x.ellipse(14,31,7,14,-.35,0,Math.PI*2);x.fill();x.shadowBlur=0;x.restore()}
function drawMatch(){x.fillStyle='#688ca1';x.fillRect(0,0,W,H);x.fillStyle='#a9d0ef';x.fillRect(court.x,court.y,court.w,court.h);x.strokeStyle='#fff7d8';x.lineWidth=5;x.strokeRect(court.x,court.y,court.w,court.h);x.setLineDash([10,11]);x.beginPath();x.moveTo(640,court.y);x.lineTo(640,court.y+court.h);x.stroke();x.setLineDash([]);for(let o of obstacles){let rr=o.oval?Math.min(o.w,o.h)*.42:13;x.fillStyle='#eef0e7';roundRect(o.x,o.y,o.w,o.h,rr);x.fill();x.fillStyle='#d6ddd6';roundRect(o.x+7,o.y+7,o.w-14,o.h-14,Math.max(8,rr-7));x.fill()}base(130,360,'#4d83dc');base(1150,360,'#e26368');for(let a of actors)drawActor(a);for(let e of effects)drawEffect(e)}
function roundRect(px,py,w,h,r){x.beginPath();x.roundRect(px,py,w,h,r)}
function base(px,py,col){x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.arc(px,py,35,0,Math.PI*2);x.stroke();x.globalAlpha=.22;x.fillStyle=col;x.fill();x.globalAlpha=1}
function drawActor(a){if(!a.alive)return;x.save();x.translate(a.x,a.y);x.scale(1.6,1.6);let teamCol=a.team?'#e56f74':'#5a90df',fur=a.species===0?'#65bf58':a.species===1?'#eee8dc':'#df9a55';
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
x.save();x.rotate(a.face);let t=TYPES[a.type];drawWeapon.owner=a;if(!(a.type==='spear'&&a.spearGuard>0)){drawWeapon(t.r,1,a.shield,a.handAnimR||0);drawWeapon(t.l,-1,a.shield,a.handAnimL||0)}else{ /* 回転槍はdrawEffect側で一本だけ描画 */ }drawWeapon.owner=null;x.restore();if(a===controlled()){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(0,2,34,0,Math.PI*2);x.stroke()}x.restore();x.fillStyle='#17382f';x.font='11px sans-serif';x.textAlign='center';x.fillText(TYPES[a.type].name,a.x,a.y+67);x.textAlign='start'}
function weaponColor(k){return k==='spear'?'#63f6ff':k&&k.startsWith('dagger')?'#ff75df':'#ffe66d'}
function drawWeapon(k,side,active,anim=0){
 x.save();x.lineCap='round';
 if(k==='shield'||k==='dualShield'){
   let cy=side*23;x.translate(22,cy);x.shadowBlur=active?18:7;x.shadowColor=active?'#63f6ff':'#9fdbea';
   x.fillStyle=active?'#7debf2':'#b8dce5';x.strokeStyle='#f7ffff';x.lineWidth=3.5;
   x.beginPath();x.arc(0,0,21,0,Math.PI*2);x.fill();x.stroke();
   x.shadowBlur=0;x.strokeStyle='#527f8d';x.lineWidth=4;x.beginPath();x.arc(0,0,13,0,Math.PI*2);x.stroke();x.fillStyle='#efffff';x.beginPath();x.arc(0,0,5,0,Math.PI*2);x.fill();
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
 if(e.kind==='spinSkill'){
   let a=e.owner;if(a&&a.alive){let p=1-e.t/e.max,col=weaponColor('sword');x.globalAlpha=.55;x.strokeStyle=col;x.shadowBlur=20;x.shadowColor=col;x.lineWidth=12;x.beginPath();x.arc(a.x,a.y,126,0,Math.PI*2);x.stroke();x.globalAlpha=.18;x.lineWidth=28;x.beginPath();x.arc(a.x,a.y,106+p*18,0,Math.PI*2);x.stroke()}
 }else if(e.kind==='dashGuard'){
   let a=e.owner;if(a&&a.alive){let col=weaponColor('daggerAttack');x.globalAlpha=.32;x.strokeStyle=col;x.shadowBlur=18;x.shadowColor=col;x.lineWidth=10;x.beginPath();x.arc(a.x,a.y,48,a.face-1.0,a.face+1.0);x.stroke();x.shadowBlur=0}
 }else if(e.kind==='guardBurst'){
   let a=e.owner;if(a&&a.alive){x.globalAlpha=.30;x.strokeStyle='#9ffaff';x.lineWidth=12;x.beginPath();x.arc(a.x,a.y,62,0,Math.PI*2);x.stroke()}
 }else if(e.kind==='swing'||e.kind==='thrust'){
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
   x.globalAlpha=Math.min(1,e.t*5);
   if(e.kind==='block'||e.kind==='clash'){
     let p=1-Math.max(0,e.t)/.34,rad=24+p*34;x.strokeStyle=e.kind==='clash'?'#fff7a6':'#dffcff';x.lineWidth=6;x.shadowBlur=18;x.shadowColor=x.strokeStyle;x.beginPath();x.arc(e.x,e.y,rad,0,Math.PI*2);x.stroke();
     x.lineWidth=4;for(let i=0;i<6;i++){let a=i*Math.PI/3+p*.7;x.beginPath();x.moveTo(e.x+Math.cos(a)*16,e.y+Math.sin(a)*16);x.lineTo(e.x+Math.cos(a)*(38+p*20),e.y+Math.sin(a)*(38+p*20));x.stroke()}
   }
   x.shadowBlur=0;x.font='bold 26px sans-serif';x.fillStyle=e.kind==='block'?'#fff':e.kind==='clash'?'#fff7a6':'#3c3028';x.fillText(e.kind==='block'?'BLOCK!':e.kind==='clash'?'CLASH!':'OUT!',e.x-35,e.y-38)
 }
 x.restore();
}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);syncModeButtons();
addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='j')hand(controlled(),'l',true);if(e.key==='k')hand(controlled(),'r',true);if(e.key==='u')useSkill(controlled());if(e.key==='i')cycleControlled()});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='j')hand(controlled(),'l',false)});
function bind(btn,side){btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);hand(controlled(),side,true)});btn.addEventListener('pointerup',e=>{e.preventDefault();hand(controlled(),side,false)});btn.addEventListener('pointercancel',()=>hand(controlled(),side,false))}bind(ui.L,'l');bind(ui.R,'r');
ui.E.onclick=()=>{if(mode==='field'){let near=Math.hypot(fieldPlayer.x-arenaGate.x,fieldPlayer.y-arenaGate.y)<arenaGate.r;if(near){ui.setup.classList.remove('hidden');ui.status.textContent='3人の装備を選択'}else ui.status.textContent='競技場の近くまで歩いてください'}else cycleControlled()};ui.S.onclick=()=>{if(mode==='match')useSkill(controlled());else ui.status.textContent='試合中に武器ごとのスキルを使用できます'};
const stick=q('#stick'),knob=stick.querySelector('i');function joyMove(e){let r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.dx=dx;joy.dy=dy;knob.style.transform=`translate(${dx*28}px,${dy*28}px)`}stick.onpointerdown=e=>{joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);joyMove(e)};stick.onpointermove=e=>{if(e.pointerId===joy.id)joyMove(e)};function joyEnd(){joy.id=null;joy.dx=joy.dy=0;knob.style.transform=''}stick.onpointerup=joyEnd;stick.onpointercancel=joyEnd;
