'use strict';
const VERSION='v0.34';
const c=document.querySelector('#game'),x=c.getContext('2d'),W=1280,H=720;
const ui={score:q('#score'),status:q('#status'),mode:q('#modeLabel'),setup:q('#setup'),slots:q('#slots'),result:q('#result'),rt:q('#resultTitle'),rr:q('#resultText'),L:q('#leftHand'),R:q('#rightHand'),E:q('#enter'),S:q('#skill'),home:q('#homeSetup'),homeSlots:q('#homeSlots'),practiceHud:q('#practiceHud'),practiceScore:q('#practiceScore')};
function q(s){return document.querySelector(s)}
const versionEl=q('#version');if(versionEl)versionEl.textContent=VERSION;const versionBadge=q('#versionBadge');if(versionBadge)versionBadge.textContent=`Prototype ${VERSION}`;
const SKILLS={
  spinSlash:{name:'回転斬り',owner:'sword'},
  doubleThrust:{name:'二連突き',owner:'spear'},
  dashSlash:{name:'踏込斬り',owner:'dagger'},
  shieldCharge:{name:'シールドチャージ',owner:'doubleShield'},
  guardedLunge:{name:'護衛突進',owner:'sword'},
  whirlwindAdvance:{name:'旋風突進',owner:'spear'},
  fiveSlash:{name:'五連斬り',owner:'dagger'},
  katanaCounter:{name:'流し斬り',owner:'katana'},
  halberdDoubleSweep:{name:'返し薙ぎ',owner:'halberd'},
  rapierCounter:{name:'幻影抜け',owner:'rapier'}
};
const TYPES={
  sword:{name:'剣＋盾',r:'sword',l:'shield',speed:180,weight:4,defaultSkill:'spinSlash'},
  spear:{name:'両手槍',r:'spear',l:'spearGuard',speed:165,weight:5,defaultSkill:'doubleThrust'},
  dagger:{name:'短剣二刀流',r:'daggerAttack',l:'daggerGuard',speed:240,weight:1,defaultSkill:'dashSlash'},
  doubleShield:{name:'双盾',r:'dualShield',l:'dualShield',speed:130,weight:8,defaultSkill:'shieldCharge'},
  katana:{name:'刀',r:'katana',l:'katanaParry',speed:188,weight:3,defaultSkill:'katanaCounter'},
  halberd:{name:'ハルバード',r:'halberd',l:'spearGuard',speed:158,weight:6,defaultSkill:'halberdDoubleSweep'},
  rapier:{name:'レイピア',r:'rapier',l:'rapierParry',speed:218,weight:2,defaultSkill:'rapierCounter'},
  greatsword:{name:'両手剣',r:'greatsword',l:'greatswordGuard',speed:138,weight:7,defaultSkill:'spinSlash'}
};
let formation=['sword','spear','dagger'],formationSkills=['spinSlash','doubleThrust','dashSlash'],formationTactics=['balanced','support','flank'],mode='field',blue=0,red=0,roundOver=0,last=performance.now(),keys={},joy={id:null,dx:0,dy:0},actors=[],effects=[],practiceHits=[0,0],enemyTeam=null;
const SAVE_KEY='kbs_team_v020',PROGRESS_KEY='kbs_progress_v020';
let tournament=null,bossBattle=null;
const RANKS=[
 {id:'rookie',name:'ルーキー大会',label:'RANK C'},
 {id:'regular',name:'レギュラー大会',label:'RANK B'},
 {id:'master',name:'マスター大会',label:'RANK A'}
];
let progress={unlocked:0,titles:[],unlockedSkills:[],pendingBoss:null,defeatedBosses:[]};
function loadSavedTeam(){try{let d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(d){if(Array.isArray(d.formation)&&d.formation.length===3)formation=d.formation.map(v=>TYPES[v]?v:'sword');if(Array.isArray(d.tactics)&&d.tactics.length===3)formationTactics=d.tactics.map(v=>TACTICS[v]?v:'balanced');formationSkills=formation.map((v,i)=>d.skills?.[i]&&SKILLS[d.skills[i]]?d.skills[i]:TYPES[v].defaultSkill)}}catch(e){}try{let d=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');if(d&&Number.isInteger(d.unlocked))progress={unlocked:Math.max(0,Math.min(RANKS.length-1,d.unlocked)),titles:Array.isArray(d.titles)?d.titles:[],unlockedSkills:Array.isArray(d.unlockedSkills)?d.unlockedSkills:[],pendingBoss:Number.isInteger(d.pendingBoss)?d.pendingBoss:null,defeatedBosses:Array.isArray(d.defeatedBosses)?d.defeatedBosses:[]}}catch(e){}}
function saveTeam(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({formation:[...formation],tactics:[...formationTactics],skills:[...formationSkills]}));ui.status.textContent='ホーム編成をセーブしました'}catch(e){ui.status.textContent='編成を保存できませんでした'}}
function saveProgress(){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress))}catch(e){}}

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
const fieldPlayer={x:300,y:220,r:22,speed:235};
const homeGate={x:250,y:175,r:92},arenaGate={x:690,y:300,r:82},trainingGate={x:1035,y:145,r:88},trialGate={x:1010,y:535,r:86};
const TACTICS={balanced:'バランス',support:'味方と行動',flank:'回り込み',defense:'守備',attack:'攻撃重視'};
const ENEMY_TEAMS=[
 // RANK C：基本武器で役割が分かりやすい3チーム
 {rank:0,style:'速攻',name:'サンセット・フォックス',colors:['#d85d45','#f2a33a','#fff1c9'],formation:['dagger','sword','spear'],tactics:['flank','balanced','attack']},
 {rank:0,style:'槍陣',name:'バイオレット・ラビッツ',colors:['#7257b7','#d39adf','#f2d56b'],formation:['spear','spear','sword'],tactics:['defense','support','balanced']},
 {rank:0,style:'堅守',name:'モス・フロッグス',colors:['#3d8a66','#83b94c','#f0d465'],formation:['doubleShield','dagger','sword'],tactics:['defense','flank','support']},
 // RANK B：刀・レイピアを混ぜ、受けと差し返しを覚えたチーム
 {rank:1,style:'カウンター',name:'クリムゾン・クレインズ',colors:['#a92d38','#efc4b7','#ffe9d9'],formation:['katana','rapier','sword'],tactics:['defense','flank','support']},
 {rank:1,style:'高速包囲',name:'アズール・リンクス',colors:['#2467a8','#61c7e8','#e7fbff'],formation:['rapier','dagger','rapier'],tactics:['flank','attack','flank']},
 {rank:1,style:'中央制圧',name:'アンバー・ボアーズ',colors:['#8a5426','#d99537','#f5e0a7'],formation:['halberd','spear','doubleShield'],tactics:['balanced','support','defense']},
 // RANK A：上位互換ではなく、武器特性を組み合わせる完成形チーム
 {rank:2,style:'受け流し',name:'スカーレット・ブレイズ',colors:['#b31f35','#f15b55','#292532'],formation:['katana','katana','rapier'],tactics:['balanced','defense','flank']},
 {rank:2,style:'長柄制圧',name:'ジェイド・ドラゴンズ',colors:['#166c50','#47b87b','#e9d86f'],formation:['halberd','halberd','spear'],tactics:['attack','support','defense']},
 {rank:2,style:'変則万能',name:'ミッドナイト・スターズ',colors:['#343469','#8b70c5','#d6d0ff'],formation:['rapier','greatsword','doubleShield'],tactics:['flank','balanced','support']}
];
function teamsForRank(rankIndex){return ENEMY_TEAMS.filter(t=>t.rank===rankIndex)}

const PLAYER_TEAM_NAME='スノー・フォックス';
const BLUE_UNIFORM=['#ffffff','#2f7fd3','#9fe8ff'];
function skillFits(type,id,sk){if(sk.owner===type)return true;if((type==='katana'||type==='greatsword')&&id==='spinSlash')return true;if(type==='halberd'&&(id==='doubleThrust'||id==='whirlwindAdvance'))return true;if(type==='rapier'&&id==='dashSlash')return true;return false}
function compatibleSkills(type){return Object.entries(SKILLS).filter(([id,sk])=>skillFits(type,id,sk)&&(id===TYPES[type].defaultSkill||id==='spinSlash'&&(type==='katana'||type==='greatsword')||id==='doubleThrust'&&type==='halberd'||id==='dashSlash'&&type==='rapier'||progress.unlockedSkills.includes(id)))}
function buildSlots(container,home=false){
  container.innerHTML='';
  for(let i=0;i<3;i++){let d=document.createElement('div');d.className='slot';let skills=compatibleSkills(formation[i]);if(!skills.some(([id])=>id===formationSkills[i]))formationSkills[i]=TYPES[formation[i]].defaultSkill;d.innerHTML=`<b>選手 ${i+1}${i===0?'（自分）':''}</b><div class="slotControls"><select data-kind="weapon" data-i="${i}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${formation[i]===k?'selected':''}>${v.name}</option>`).join('')}</select><select data-kind="tactic" data-i="${i}">${Object.entries(TACTICS).map(([k,v])=>`<option value="${k}" ${formationTactics[i]===k?'selected':''}>戦術：${v}</option>`).join('')}</select><select data-kind="skill" data-i="${i}">${skills.map(([k,v])=>`<option value="${k}" ${formationSkills[i]===k?'selected':''}>スキル：${v.name}</option>`).join('')}</select></div>`;container.append(d)}
}
loadSavedTeam();buildSlots(ui.slots);buildSlots(ui.homeSlots,true);
function slotChange(e){if(e.target.dataset.i==null)return;let i=+e.target.dataset.i;if(e.target.dataset.kind==='weapon'){formation[i]=e.target.value;formationSkills[i]=TYPES[formation[i]].defaultSkill}else if(e.target.dataset.kind==='tactic')formationTactics[i]=e.target.value;else if(e.target.dataset.kind==='skill'&&SKILLS[e.target.value])formationSkills[i]=e.target.value;buildSlots(ui.slots);buildSlots(ui.homeSlots,true)}
ui.slots.onchange=slotChange;ui.homeSlots.onchange=slotChange;
q('#start').onclick=()=>{ui.setup.classList.add('hidden');startMatch()};q('#back').onclick=()=>{ui.setup.classList.add('hidden');mode='field';syncModeButtons()};q('#homeClose').onclick=()=>{saveTeam();ui.home.classList.add('hidden');mode='field';syncModeButtons()};q('#rematch').onclick=()=>{if(tournament)nextTournamentStep();else if(bossBattle){let won=bossBattle.resultWon;if(won)leaveBoss();else{ui.result.classList.add('hidden');startBoss()}}else{ui.result.classList.add('hidden');startMatch()}};q('#fieldBack').onclick=()=>{if(tournament){abortTournament();return}if(bossBattle){leaveBoss();return}ui.result.classList.add('hidden');mode='field';ui.mode.textContent='FIELD';ui.status.textContent='スティックで競技場まで歩こう';syncModeButtons()};
function unit(team,i,type,skillId=null){
  // 壁から十分離した固定スポーン。開始直後に壁へ埋まらないよう3レーン中央へ配置。
  const ys=[155,360,565], bx=team===0?155:1125;
  return {team,i,type,skillId:skillId||TYPES[type].defaultSkill,tactic:team?((enemyTeam?.tactics||[])[i]||'balanced'):(formationTactics[i]||'balanced'),x:bx,y:ys[i],r:38,alive:true,face:team?Math.PI:0,cd:0,stun:0,shield:false,shieldA:0,spearGuard:0,spearGuardCd:0,daggerGuard:false,greatswordGuard:false,greatswordGuardA:0,ai:team===1||i>0,species:team?(i%3):(i===0?'snowFox':i===1?'frog':'rabbit'),counterT:0,parryT:0,parryCd:0,parryKind:null,handAnimL:0,handAnimR:0,attackPose:null,skillCd:0,invuln:0,stepT:0,stepVX:0,stepVY:0,stepCd:0,spearAdvanceT:0,spearAdvanceVX:0,spearAdvanceVY:0}
}
function resetRound(){actors=[];formation.forEach((t,i)=>actors.push(unit(0,i,t,formationSkills[i])));(enemyTeam?.formation||['sword','spear','dagger']).forEach((t,i)=>actors.push(unit(1,i,t)));roundOver=0;effects=[];syncButtons()}
function pickEnemyTeam(){let pool=ENEMY_TEAMS.filter(t=>t.rank<=progress.unlocked);enemyTeam=pool[Math.floor(Math.random()*pool.length)]}
function startMatch(){mode='match';blue=red=0;if(!tournament)pickEnemyTeam();ui.mode.textContent=tournament?'TOURNAMENT':'MATCH';ui.score.textContent='0 - 0';resetRound();ui.status.textContent=`${PLAYER_TEAM_NAME} VS ${enemyTeam.name}${enemyTeam.style?'［'+enemyTeam.style+'型］':''}　敵拠点を取るか全員OUTで勝利`;syncModeButtons()}
function controlled(){return actors.find(a=>a.team===0&&a.alive&&!a.ai)||null}
function transfer(){let n=actors.find(a=>a.team===0&&a.alive);if(n){actors.filter(a=>a.team===0).forEach(a=>a.ai=true);n.ai=false;syncButtons()}}
function syncModeButtons(){if(mode==='field'){ui.S.innerHTML='A<small>情報</small>';ui.E.innerHTML='B<small>入る</small>'}else if(mode==='practice'){syncButtons();ui.E.innerHTML='B<small>練習終わる</small>'}else syncButtons()}
function syncButtons(){let a=controlled();if(!a)return;let t=TYPES[a.type],sk=SKILLS[a.skillId]||SKILLS[t.defaultSkill];ui.R.innerHTML=`R<small>${label(t.r)}</small>`;ui.L.innerHTML=`L<small>${label(t.l)}</small>`;let cd=Math.max(0,a.skillCd||0);ui.S.innerHTML=`A<small>${cd>0?`${cd.toFixed(1)}秒`:(sk?.name||'スキル')}</small>`;ui.E.innerHTML='B<small>キャラ交代</small>'}
function label(v){return ({sword:'剣',spear:'突き',spearGuard:'回転防御',shield:'盾',daggerAttack:'連続斬り',daggerGuard:'二刀防御',dualShield:'両盾',katana:'斬り',katanaParry:'受け流し',halberd:'薙ぎ',rapier:'斬り→突き',rapierParry:'パリィ',greatsword:'大剣薙ぎ',greatswordGuard:'大剣防御',none:'—'})[v]||v}
function nearestEnemy(a){let es=actors.filter(b=>b.alive&&b.team!==a.team);return es.sort((p,q)=>dist(a,p)-dist(a,q))[0]}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)} function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function norm(v){while(v>Math.PI)v-=Math.PI*2;while(v<-Math.PI)v+=Math.PI*2;return v}
function stepProfile(type){
  // 軽い装備ほど遠く・速く。重い装備は短く・ゆっくり。
  return ({
    dagger:{distance:82,duration:.105},
    sword:{distance:62,duration:.135},
    spear:{distance:54,duration:.155},
    doubleShield:{distance:38,duration:.19},
    katana:{distance:64,duration:.13},halberd:{distance:50,duration:.16},rapier:{distance:74,duration:.115},greatsword:{distance:30,duration:.22}
  })[type]||{distance:58,duration:.14};
}
function triggerStep(a,vx,vy){
  if((mode!=='match'&&mode!=='practice'&&mode!=='boss')||!a||!a.alive||a.stun>0||a.cd>0||a.stepCd>0)return false;
  let m=Math.hypot(vx,vy);if(m<.35)return false;vx/=m;vy/=m;
  const p=stepProfile(a.type),speed=p.distance/p.duration;
  a.stepT=p.duration;a.stepCd=.24;a.stepVX=vx*speed;a.stepVY=vy*speed;
  effects.push({kind:'stepDust',owner:a,x:a.x,y:a.y,t:p.duration+.12,max:p.duration+.12});
  return true;
}
function updateStep(a,dt){
  if(!a||a.stepT<=0)return false;
  const use=Math.min(dt,a.stepT);a.stepT=Math.max(0,a.stepT-dt);
  // ステップも壁を抜けず、通常移動と同じ衝突処理を通す。
  let nx=Math.max(court.x+30,Math.min(court.x+court.w-30,a.x+a.stepVX*use));
  if(!collides(nx,a.y,a.r))a.x=nx;
  let ny=Math.max(court.y+30,Math.min(court.y+court.h-30,a.y+a.stepVY*use));
  if(!collides(a.x,ny,a.r))a.y=ny;
  return a.stepT>0;
}
function dirBucket(vx,vy){
  let m=Math.hypot(vx,vy);if(m<.55)return null;
  let a=Math.atan2(vy,vx);return (Math.round(a/(Math.PI/4))+8)%8;
}
let tapState={dir:null,time:0};
function registerDirectionTap(vx,vy){
  const d=dirBucket(vx,vy);if(d==null)return;
  const now=performance.now();
  if(tapState.dir===d&&now-tapState.time<=330){
    let a=controlled();if(a)triggerStep(a,vx,vy);
    tapState.dir=null;tapState.time=0;
  }else{tapState.dir=d;tapState.time=now}
}

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
  if(mode!=='match'&&mode!=='boss')return;let alive=actors.filter(a=>a.team===0&&a.alive);if(alive.length<2)return;
  let cur=controlled(),idx=Math.max(0,alive.indexOf(cur)),next=alive[(idx+1)%alive.length];actors.filter(a=>a.team===0).forEach(a=>a.ai=true);next.ai=false;syncButtons();ui.status.textContent=`操作交代：${TYPES[next.type].name}`;
}
function useSkill(a){
  if((mode!=='match'&&mode!=='practice'&&mode!=='boss')||!a||!a.alive||a.stun>0||a.skillCd>0)return;
  let e=nearestEnemy(a);if(e)a.face=angle(a,e);
  const skill=a.skillId||TYPES[a.type].defaultSkill;
  if(skill==='spinSlash'){
    if(a.type==='greatsword'){
      a.skillCd=5.8;a.stun=Math.max(a.stun,.22);effects.push({kind:'spinSkill',owner:a,t:.92,max:.92,windup:.30,active:.24,recovery:.38,resolved:false,weapon:'greatsword',range:150,knockback:68});a.cd=Math.max(a.cd,.92);
    }else{
      a.skillCd=5.0;a.stun=Math.max(a.stun,.16);effects.push({kind:'spinSkill',owner:a,t:.72,max:.72,windup:.20,active:.22,recovery:.30,resolved:false,weapon:a.type==='katana'?'katana':'sword',range:126,knockback:0});a.cd=Math.max(a.cd,.72);
    }
  }else if(skill==='doubleThrust'){
    a.skillCd=5.4;
    const mk=(delay,second)=>({kind:'thrust',weapon:'spear',skill:true,second,side:'r',x:a.x,y:a.y,a:a.face,range:second?220:190,arc:.13,t:.66,max:.66,windup:.18,active:.12,recovery:.36,delay,team:a.team,owner:a,resolved:false,parry:false,recoveryApplied:false,knockback:second?42:0});
    effects.push(mk(0,false),mk(.20,true));a.cd=Math.max(a.cd,1.05);a.attackPose=effects[effects.length-1];
  }else if(skill==='whirlwindAdvance'){
    // 旋風突進：槍を中央で回して正面を守りながら前進し、最後に一本の槍で突く。
    a.skillCd=5.8;a.spearGuard=.52;a.spearGuardCd=Math.max(a.spearGuardCd,.75);
    a.spearAdvanceT=.34;a.spearAdvanceVX=Math.cos(a.face)*285;a.spearAdvanceVY=Math.sin(a.face)*285;
    effects.push({kind:'spearGuard',owner:a,x:a.x,y:a.y,t:.48,max:.48,team:a.team});
    let th={kind:'thrust',weapon:'spear',skill:true,side:'r',x:a.x,y:a.y,a:a.face,range:225,arc:.12,t:.66,max:.66,windup:.12,active:.12,recovery:.34,delay:.32,team:a.team,owner:a,resolved:false,parry:false,recoveryApplied:false,knockback:34};
    effects.push(th);a.attackPose=th;a.cd=Math.max(a.cd,1.02);
  }else if(skill==='dashSlash'){
    a.skillCd=4.8;a.invuln=.20;
    // 踏込斬り：片方の短剣を内側に構えながら最初から前へ踏み込む。
    // 踏み込みのごく短い間だけ無敵になり、その直後にもう一本で高速斬り。
    safePush(a,Math.cos(a.face)*58,Math.sin(a.face)*58);
    a.daggerSkillGuard=.20;
    effects.push({kind:'dashGuard',owner:a,x:a.x,y:a.y,t:.20,max:.20});
    let sw={kind:'swing',weapon:'daggerAttack',skill:true,side:'r',x:a.x,y:a.y,a:a.face,range:112,arc:1.18,t:.46,max:.46,windup:.08,active:.12,recovery:.26,delay:.08,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false,lunge:34,lungeApplied:false};
    effects.push(sw);a.attackPose=sw;a.cd=Math.max(a.cd,.62);
  }else if(skill==='fiveSlash'){
    // 五連斬り：その場で左右の短剣を5回連続で振る。
    // 各斬撃の直前に最も近い敵へ向き直るため、複数方向から来られても近い相手を優先して迎撃できる。
    a.skillCd=5.4;a.cd=Math.max(a.cd,1.05);
    const sides=['r','l','r','l','r'];
    for(let i=0;i<5;i++){
      let sw={kind:'swing',weapon:'daggerAttack',skill:true,fiveSlash:true,retarget:true,retargeted:false,side:sides[i],x:a.x,y:a.y,a:a.face,range:104,arc:1.12,t:.27,max:.27,windup:.025,active:.105,recovery:.14,delay:i*.14,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false};
      effects.push(sw);if(i===0)a.attackPose=sw;
    }
  }else if(skill==='shieldCharge'){
    a.skillCd=5.8;a.shield=true;a.invuln=Math.max(a.invuln,.10);a.skillCharge=.44;a.skillChargeVX=Math.cos(a.face)*520;a.skillChargeVY=Math.sin(a.face)*520;a.cd=Math.max(a.cd,.62);effects.push({kind:'shieldCharge',owner:a,t:.44,max:.44});
  }else if(skill==='guardedLunge'){
    a.skillCd=5.2;a.shield=true;a.shieldA=a.face;a.invuln=Math.max(a.invuln,.12);safePush(a,Math.cos(a.face)*52,Math.sin(a.face)*52);
    let th={kind:'thrust',weapon:'sword',skill:true,side:'r',x:a.x,y:a.y,a:a.face,range:145,arc:.22,t:.62,max:.62,windup:.16,active:.13,recovery:.33,delay:.08,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false,knockback:24};effects.push(th);a.attackPose=th;a.cd=Math.max(a.cd,.72);setTimeout(()=>{if(a)a.shield=false},260);
   }else if(skill==='katanaCounter'){
    a.skillCd=5.0;a.counterT=.80;a.cd=Math.max(a.cd,.18);effects.push({kind:'guardBurst',owner:a,t:.30,max:.30});
  }else if(skill==='halberdDoubleSweep'){
    a.skillCd=5.6;a.cd=Math.max(a.cd,1.15);
    let sw1={kind:'swing',weapon:'halberd',skill:true,side:'r',x:a.x,y:a.y,a:a.face,range:178,arc:Math.PI,t:.46,max:.46,windup:.10,active:.14,recovery:.22,delay:0,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false};
    let sw2={kind:'swing',weapon:'halberd',skill:true,side:'l',x:a.x,y:a.y,a:a.face,range:182,arc:Math.PI,t:.48,max:.48,windup:.10,active:.14,recovery:.24,delay:.30,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false,lunge:26,lungeApplied:false};effects.push(sw1,sw2);a.attackPose=sw1;
  }else if(skill==='rapierCounter'){
    a.skillCd=5.0;a.counterT=.78;a.cd=Math.max(a.cd,.16);effects.push({kind:'dashGuard',owner:a,t:.30,max:.30});
  }
  syncButtons();
}
function hand(a,side,down=true){
  if((mode!=='match'&&mode!=='practice'&&mode!=='boss')||!a||!a.alive||a.stun>0)return;
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
      effects.push({kind:'spearGuard',owner:a,weapon:a.type,x:a.x,y:a.y,t:.72,max:.72,team:a.team});
    }
    return;
  }
  // 短剣の左ボタンは二刀を体の内側へ寄せる防御。押している間だけ有効。
  if(kind==='daggerGuard'){
    a.daggerGuard=down;
    if(down){let e=nearestEnemy(a);if(e)a.face=angle(a,e)}
    return;
  }
  // 大剣は刀身そのものを正面に構えて受ける。押している間は維持できるが、移動が大きく遅くなる。
  if(kind==='greatswordGuard'){
    a.greatswordGuard=down;
    if(down){let e=nearestEnemy(a);if(e){a.face=angle(a,e);a.greatswordGuardA=a.face}}
    return;
  }
  // 刀とレイピアは長押し防御ではなく、押した直後だけ有効な受け流し／パリィ。
  if(kind==='katanaParry'||kind==='rapierParry'){
    if(down&&a.parryCd<=0){
      let e=nearestEnemy(a);if(e)a.face=angle(a,e);
      a.parryT=kind==='katanaParry'?.34:.26;
      a.parryCd=kind==='katanaParry'?.72:.58;
      a.parryKind=kind;
      a.cd=Math.max(a.cd,kind==='katanaParry'?.12:.08);
      effects.push({kind:'parryFlash',owner:a,t:a.parryT,max:a.parryT,weapon:a.type});
    }
    return;
  }
  if(kind==='none')return;
  if(!down||a.cd>0)return;
  let e=nearestEnemy(a);if(e)a.face=angle(a,e);
  if(kind==='daggerAttack'){
    a.handAnimL=a.handAnimR=.32;
    daggerCombo(a);
    a.cd=.58;
    return;
  }
  if(side==='l')a.handAnimL=.42;else a.handAnimR=.42;
  if(kind==='rapier'){
    rapierCombo(a);
    a.cd=.76;
    return;
  }
  attack(a,kind,side);
  // 剣は見てから反応できるよう少し遅め、槍は溜めが長い。
  a.cd=kind==='spear'?1.02:kind==='halberd'?1.00:kind==='greatsword'?1.22:kind==='katana'?.94:.92;
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

function rapierCombo(a){
  // レイピア通常攻撃：近距離を横斬りで触ってから、すぐ細い突きへ繋ぐ二連撃。
  const sw={kind:'swing',weapon:'rapier',side:'r',x:a.x,y:a.y,a:a.face,range:98,arc:.82,t:.34,max:.34,windup:.055,active:.12,recovery:.165,delay:0,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false};
  const th={kind:'thrust',weapon:'rapier',side:'r',x:a.x,y:a.y,a:a.face,range:142,arc:.14,t:.39,max:.39,windup:.07,active:.13,recovery:.19,delay:.16,team:a.team,owner:a,resolved:false,parry:true,recoveryApplied:false,lunge:34,lungeApplied:false,retarget:true,retargeted:false};
  effects.push(sw,th);a.attackPose=sw;
}

function attack(a,kind,side){
  let cfg={
    spear:{kind:'thrust',range:205,arc:.11,windup:.34,active:.16,recovery:.32},
    sword:{kind:'swing',range:104,arc:1.52,windup:.30,active:.17,recovery:.30},
    katana:{kind:'swing',range:132,arc:1.02,windup:.34,active:.17,recovery:.32},
    halberd:{kind:'swing',range:172,arc:Math.PI/2,windup:.36,active:.18,recovery:.36},
    rapier:{kind:'thrust',range:140,arc:.15,windup:.20,active:.15,recovery:.25},
    greatsword:{kind:'swing',range:150,arc:1.86,windup:.44,active:.21,recovery:.43}
  }[kind]||{kind:'swing',range:104,arc:1.52,windup:.30,active:.17,recovery:.30};
  let total=cfg.windup+cfg.active+cfg.recovery;
  let e={kind:cfg.kind,weapon:kind,side,x:a.x,y:a.y,a:a.face,range:cfg.range,arc:cfg.arc,t:total,max:total,windup:cfg.windup,active:cfg.active,recovery:cfg.recovery,team:a.team,owner:a,resolved:false,parry:false,recoveryApplied:false};
  a.attackPose=e;effects.push(e);
}
function activeObstacles(){return mode==='boss'?[]:obstacles}
function segmentHitsWall(x1,y1,x2,y2,pad=0){
  const steps=Math.max(4,Math.ceil(Math.hypot(x2-x1,y2-y1)/8));
  for(let i=1;i<=steps;i++){
    let u=i/steps,px=x1+(x2-x1)*u,py=y1+(y2-y1)*u;
    if(activeObstacles().some(o=>px>o.x-pad&&px<o.x+o.w+pad&&py>o.y-pad&&py<o.y+o.h+pad))return {x:px,y:py,u};
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
  let lock=e.weapon==='spear'?.16:e.weapon==='halberd'?.17:e.weapon==='greatsword'?.22:e.weapon==='katana'?.13:e.weapon==='rapier'?.09:e.weapon&&e.weapon.startsWith('dagger')?.075:.12;
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
      let ew=weaponWeight(e.weapon),fw=weaponWeight(f.weapon),diff=ew-fw;let pushE=Math.max(10,24-diff*5),pushF=Math.max(10,24+diff*5);e.owner.stun=Math.max(e.owner.stun,.30+Math.max(0,-diff)*.025);f.owner.stun=Math.max(f.owner.stun,.30+Math.max(0,diff)*.025);knockApart(e.owner,f.owner,pushE,pushF);
      let mx=(e.owner.x+f.owner.x)/2,my=(e.owner.y+f.owner.y)/2;
      effects.push({kind:'clash',x:mx,y:my,t:.30});
      return true;
    }
  }
  return false;
}
function pointSegDist(px,py,x1,y1,x2,y2){let vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,c=vx*vx+vy*vy;if(c<=.0001)return Math.hypot(px-x1,py-y1);let t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/c)),qx=x1+t*vx,qy=y1+t*vy;return Math.hypot(px-qx,py-qy)}
function resolveAttack(e){
  let a=e.owner;if(!a||!a.alive)return;
  if(parryAttacks(e))return;
  let effectiveRange=e.range;
  if(e.weapon==='spear'||e.weapon==='rapier'){
    let sx=a.x+Math.cos(e.a)*26,sy=a.y+Math.sin(e.a)*26;
    let ex=a.x+Math.cos(e.a)*e.range,ey=a.y+Math.sin(e.a)*e.range;
    let wall=segmentHitsWall(sx,sy,ex,ey,3);
    if(wall){effectiveRange=Math.max(34,e.range*wall.u);e.range=effectiveRange}
  }
  let hit=[];
  for(let b of actors){
    if(!b.alive||b.team===a.team||b.invuln>0)continue;
    let d=Math.hypot(b.x-a.x,b.y-a.y),da=Math.abs(norm(Math.atan2(b.y-a.y,b.x-a.x)-e.a));
    if(e.kind==='thrust'){let sx=a.x+Math.cos(e.a)*24,sy=a.y+Math.sin(e.a)*24,ex=a.x+Math.cos(e.a)*effectiveRange,ey=a.y+Math.sin(e.a)*effectiveRange;if(pointSegDist(b.x,b.y,sx,sy,ex,ey)>b.r+12)continue;}
    else if(d>effectiveRange+b.r||da>e.arc/2)continue;
    if(segmentHitsWall(a.x,a.y,b.x,b.y,1))continue;
    hit.push(b);
  }
  for(let b of hit){
    if(blocked(b,a,e)){if(e.knockback)knockApart(a,b,e.knockback,12);continue}
    combatHit(b,a,e);
  }
}
function blocked(def,atk,source=null){
  let ok=false;
  if(def.parryT>0){
    // 通常の受け流し／パリィは成功時に明確な有利を作る。
    // 攻撃は完全無効、守備側は弾かれず、攻撃側だけ長めに硬直。さらに自動の小反撃を出す。
    def.parryT=0;def.invuln=Math.max(def.invuln,.22);
    atk.stun=Math.max(atk.stun,def.type==='katana'?.62:.52);
    safePush(atk,Math.cos(angle(def,atk))*18,Math.sin(angle(def,atk))*18);
    effects.push({kind:'parry',x:(def.x+atk.x)/2,y:(def.y+atk.y)/2,t:.38});
    if(def.type==='katana'){
      let sw={kind:'swing',weapon:'katana',parryRiposte:true,side:'r',x:def.x,y:def.y,a:angle(def,atk),range:138,arc:.92,t:.32,max:.32,windup:.025,active:.13,recovery:.165,delay:.025,team:def.team,owner:def,resolved:false,parry:true,recoveryApplied:false,specialHit:'受け流し反撃！'};
      effects.push(sw);def.attackPose=sw;def.cd=Math.max(def.cd,.30);ui.status.textContent='受け流し成功！ 反撃';
    }else{
      let aa=angle(def,atk),side=Math.random()<.5?-1:1;safePush(def,Math.cos(aa+side*Math.PI/2)*24,Math.sin(aa+side*Math.PI/2)*24);
      let th={kind:'thrust',weapon:'rapier',parryRiposte:true,side:'r',x:def.x,y:def.y,a:angle(def,atk),range:160,arc:.14,t:.31,max:.31,windup:.02,active:.13,recovery:.16,delay:.02,team:def.team,owner:def,resolved:false,parry:true,recoveryApplied:false,specialHit:'パリィ反撃！'};
      effects.push(th);def.attackPose=th;def.cd=Math.max(def.cd,.28);ui.status.textContent='PARRY成功！ 反撃';
    }
    return true;
  }
  if(def.counterT>0){def.counterT=0;def.invuln=Math.max(def.invuln,.24);atk.stun=Math.max(atk.stun,.18);effects.push({kind:'block',x:(def.x+atk.x)/2,y:(def.y+atk.y)/2,t:.30});
    if(def.type==='katana'){let sw={kind:'swing',weapon:'katana',skill:true,side:'r',x:def.x,y:def.y,a:angle(def,atk),range:142,arc:1.10,t:.38,max:.38,windup:.05,active:.14,recovery:.19,delay:.04,team:def.team,owner:def,resolved:false,parry:true,recoveryApplied:false,specialHit:'流し斬り HIT!'};effects.push(sw);def.attackPose=sw;}
    else if(def.type==='rapier'){let aa=angle(def,atk)+Math.PI/2*(Math.random()<.5?-1:1);safePush(def,Math.cos(aa)*58,Math.sin(aa)*58);def.face=angle(def,atk);let th={kind:'thrust',weapon:'rapier',skill:true,side:'r',x:def.x,y:def.y,a:def.face,range:185,arc:.16,t:.42,max:.42,windup:.04,active:.15,recovery:.23,delay:.03,team:def.team,owner:def,resolved:false,parry:true,recoveryApplied:false,lunge:64,lungeApplied:false,specialHit:'幻影斬り HIT!'};effects.push(th);def.attackPose=th;}return true;}
  if(def.spearGuard>0||def.daggerGuard)ok=true;
  else if(def.greatswordGuard){ok=Math.abs(norm(angle(def,atk)-def.greatswordGuardA))<1.08}
  else if(def.shield){let dual=TYPES[def.type].r==='dualShield';ok=dual||Math.abs(norm(angle(def,atk)-def.shieldA))<1.18}
  if(ok){
    // 防御成功でも双方が少し離れる。攻撃側の方が大きく弾かれる。
    let aw=weaponWeight(source?.weapon||TYPES[atk.type]?.r),heavyPush=Math.max(8,(aw-3)*8);knockApart(atk,def,34,heavyPush);atk.stun=Math.max(atk.stun,.48);def.stun=Math.max(def.stun,.07+Math.max(0,aw-4)*.025);
    effects.push({kind:'block',x:(def.x+atk.x)/2,y:(def.y+atk.y)/2,t:.34});
  }
  return ok;
}

function combatHit(target,attacker,source){
  if(source&&source.specialHit){effects.push({kind:'skillHit',x:target.x,y:target.y,text:source.specialHit,t:.68,max:.68});ui.status.textContent=source.specialHit;}
  if(mode==='practice'){practiceHit(target,attacker,source);return}
  if(mode==='boss'&&target.boss){target.hp=Math.max(0,(target.hp||3)-1);target.invuln=.55;target.stun=Math.max(target.stun,.34);knockApart(attacker,target,12,22);effects.push({kind:'practiceHit',x:target.x,y:target.y,t:.42});ui.score.textContent=`BOSS HP ${target.hp}/3`;ui.status.textContent=`ボスにHIT！ 残り ${target.hp}`;if(target.hp<=0){target.alive=false;setTimeout(()=>finishBoss(true),450)}return}
  target.alive=false;effects.push({kind:'out',x:target.x,y:target.y,t:.55});if(!target.ai)transfer();
}
function resolveSpin(e){
  let a=e.owner;if(!a||!a.alive)return;
  const rr=e.range||126;
  for(let b of actors){
    if(!b.alive||b.team===a.team||b.invuln>0)continue;
    if(dist(a,b)>rr+b.r||segmentHitsWall(a.x,a.y,b.x,b.y,1))continue;
    if(blocked(b,a,e)){if(e.knockback)knockApart(a,b,8,e.knockback);continue}
    if(e.knockback)knockApart(a,b,8,e.knockback);
    combatHit(b,a,e);
  }
}
function collides(nx,ny,r){return activeObstacles().some(o=>nx+r>o.x&&nx-r<o.x+o.w&&ny+r>o.y&&ny-r<o.y+o.h)}
function rescueFromWall(a){
  // 万一位置が壁内になった場合も、最短方向へ押し出して停止状態を防ぐ。
  for(let o of activeObstacles()){
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
  let sp=TYPES[a.type].speed*(a.shield?(a.type==='doubleShield'?.42:.62):a.greatswordGuard?.48:a.daggerGuard?.72:1);
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
  const outnumbered=nearEnemies>nearAllies+1;const tactic=a.tactic||'balanced';

  // 練習相手はカウンター練習用。攻撃はするが、連打せず『構える→1回攻撃→間を置く』。
  if(mode==='practice'&&a.practiceAggro){
    a.face=angle(a,e);
    a.practiceAttackWait=Math.max(0,(a.practiceAttackWait||0)-dt);
    a.practiceAttackHold=Math.max(0,(a.practiceAttackHold||0)-dt);
    a.practiceRetreat=Math.max(0,(a.practiceRetreat||0)-dt);

    // 攻撃を出したあとは、剣の発生～有効時間が終わるまでその場で構える。
    // 以前は振り始めた瞬間に後退してしまい、届かない位置で空振りしやすかった。
    if(a.practiceAttackHold>0)return;

    if(a.practiceRetreat>0){
      let side=((Math.floor(a.aiClock*1.1)%2)?1:-1);
      let ang=a.face+Math.PI+side*.18;
      move(a,Math.cos(ang)*.36,Math.sin(ang)*.36,dt);return;
    }

    // 剣の実ヒット距離に入ってから振る。密着しすぎたら少しだけ間合いを作る。
    const sweetMin=102,sweetMax=128;
    if(d>=sweetMin&&d<=sweetMax&&a.cd<=0&&a.stun<=0&&a.practiceAttackWait<=0){
      hand(a,'r',true);
      a.practiceAttackHold=.78;
      a.practiceAttackWait=1.05+Math.random()*.45;
      a.practiceRetreat=.20+Math.random()*.10;
      return;
    }
    if(d>sweetMax){move(a,Math.cos(a.face)*.42,Math.sin(a.face)*.42,dt);return;}
    if(d<sweetMin){let ang=a.face+Math.PI;move(a,Math.cos(ang)*.22,Math.sin(ang)*.22,dt);return;}
    return;
  }

  // 防御系も棒立ちにはしないが、以前ほど頻繁に防御し続けない。
  if((t.l==='shield'||t.l==='dualShield')&&d<150){
    if(!a.shield&&Math.random()<.035){a.shield=true;a.shieldA=angle(a,e)}
  }else if(d>175)a.shield=false;
  if(t.l==='spearGuard'&&d<132&&a.spearGuardCd<=0&&Math.random()<.025)hand(a,'l',true);
  if(a.type==='dagger'&&d<105&&Math.random()<.035)a.daggerGuard=true;
  else if(a.type==='dagger'&&d>132)a.daggerGuard=false;
  // 刀・レイピアCPUは相手が攻撃できる間合いに入った時、戦術に応じてタイミング防御を狙う。
  // 完璧な反応にはせず、上位ランクほど『受けるチーム』らしい動きが出る程度。
  if(a.type==='greatsword'&&d<150){if(!a.greatswordGuard&&Math.random()<.030){hand(a,'l',true)}else if(d>165)a.greatswordGuard=false}
  if((a.type==='katana'||a.type==='rapier')&&d<145&&a.parryCd<=0&&a.cd<=0){
    const chance=tactic==='defense'?.075:tactic==='balanced'?.045:.028;
    if(Math.random()<chance){hand(a,'l',true);return}
  }
  const defending=a.shield||a.daggerGuard||a.greatswordGuard||a.spearGuard>0||a.parryT>0;

  // スキルは通常攻撃より低頻度。武器と戦術に合う距離でだけ使用。
  if(a.skillCd<=0&&!defending&&!outnumbered&&Math.random()<(tactic==='attack'?.011:.007)){
    const skillRange=a.type==='spear'?200:a.type==='halberd'?185:a.type==='greatsword'?165:a.type==='rapier'?155:a.type==='katana'?145:a.type==='dagger'?135:130;
    if(d<skillRange){useSkill(a);return}
  }

  // 攻撃可能距離なら攻撃。ただし人数不利では「当たる寸前」以外は無理に振らない。
  const attackDist=a.type==='spear'?158:a.type==='halberd'?150:a.type==='greatsword'?142:a.type==='rapier'?132:a.type==='katana'?122:a.type==='dagger'?108:116;
  if(d<attackDist&&a.cd<=0&&!a.shield&&!a.daggerGuard&&!a.greatswordGuard&&a.spearGuard<=0&&(!outnumbered||d<attackDist*.72)&&(tactic!=='defense'||d<attackDist*.82)){
    a.face=angle(a,e);hand(a,'r',true);return;
  }

  let target=routePoint(a);
  let ang=angle(a,target);

  if(outnumbered||tactic==='support'&&nearAllies===0&&d<240){
    // 最寄り味方がいればそこへ寄り、いなければ自陣側へ少し退く。
    const mate=allies.slice().sort((p,q)=>dist(a,p)-dist(a,q))[0];
    target=mate&&dist(a,mate)>90?mate:ownBase;
    ang=angle(a,target);
  }else if(d<(tactic==='attack'?250:tactic==='defense'?170:210)){
    // 敵を見つけても直線突撃はしない。武器ごとの得意間合いを保ちながら横へ回る。
    a.face=angle(a,e);
    const desired=a.type==='spear'?172:a.type==='halberd'?162:a.type==='greatsword'?154:a.type==='rapier'?140:a.type==='katana'?132:a.type==='dagger'?112:138;
    const side=tactic==='flank'?((a.i+a.team)%2?1:-1):((a.i+a.team)%2?1:-1);
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
    moveField(vx,vy,dt);let fac=nearestFacility();
    ui.status.textContent=fac?`${fac.name}の近くです。B「入る」`:'ホームで編成・競技場で大会・練習場で1対1・修練の地で強敵戦';return;
  }
  if((mode!=='match'&&mode!=='practice'&&mode!=='boss')||roundOver)return;
  for(let a of actors){
    if(!a.alive)continue;rescueFromWall(a);a.cd=Math.max(0,a.cd-dt);a.stun=Math.max(0,a.stun-dt);a.skillCd=Math.max(0,(a.skillCd||0)-dt);a.invuln=Math.max(0,(a.invuln||0)-dt);a.counterT=Math.max(0,(a.counterT||0)-dt);a.parryT=Math.max(0,(a.parryT||0)-dt);a.parryCd=Math.max(0,(a.parryCd||0)-dt);a.daggerSkillGuard=Math.max(0,(a.daggerSkillGuard||0)-dt);a.spearGuard=Math.max(0,(a.spearGuard||0)-dt);a.spearGuardCd=Math.max(0,(a.spearGuardCd||0)-dt);a.stepCd=Math.max(0,(a.stepCd||0)-dt);a.handAnimL=Math.max(0,(a.handAnimL||0)-dt);a.handAnimR=Math.max(0,(a.handAnimR||0)-dt);if(a.spearAdvanceT>0){let use=Math.min(dt,a.spearAdvanceT);a.spearAdvanceT=Math.max(0,a.spearAdvanceT-dt);safePush(a,a.spearAdvanceVX*use,a.spearAdvanceVY*use);}if(a.skillCharge>0){let use=Math.min(dt,a.skillCharge);a.skillCharge=Math.max(0,a.skillCharge-dt);safePush(a,a.skillChargeVX*use,a.skillChargeVY*use);for(let b of actors){if(!b.alive||b.team===a.team)continue;if(dist(a,b)<a.r+b.r+18){knockApart(a,b,10,68);b.stun=Math.max(b.stun,.48);effects.push({kind:'block',x:(a.x+b.x)/2,y:(a.y+b.y)/2,t:.34})}}}if(a.attackPose&&a.attackPose.t<=0)a.attackPose=null;if(a.stepT>0){updateStep(a,dt)}else if(a.ai&&a.stun<=0)ai(a,dt)
  }
  let p=controlled();if(p&&p.stun<=0&&p.stepT<=0)move(p,vx,vy,dt);
  separateActors();
  let ba=actors.filter(a=>a.team===0&&a.alive),ra=actors.filter(a=>a.team===1&&a.alive);
  if(mode==='match'){
    if(!ra.length)winRound(0,'敵チーム全員OUT');else if(!ba.length)winRound(1,'味方チーム全員OUT');else{
      if(ba.some(a=>Math.hypot(a.x-1150,a.y-360)<45))winRound(0,'敵拠点を奪取');
      if(ra.some(a=>Math.hypot(a.x-130,a.y-360)<45))winRound(1,'自陣拠点を奪取された')
    }
  }
  if(mode==='boss'&&!ba.length&&!roundOver){roundOver=1;setTimeout(()=>finishBoss(false),350)}
  effects.forEach(e=>{
    if((e.delay||0)>0){
      e.delay=Math.max(0,e.delay-dt);
      if(e.delay<=0&&e.owner?.alive&&(e.kind==='swing'||e.kind==='thrust'))e.owner.attackPose=e;
      if(e.delay<=0&&e.retarget&&!e.retargeted&&e.owner?.alive){let t=nearestEnemy(e.owner);if(t){e.owner.face=angle(e.owner,t);e.a=e.owner.face}e.retargeted=true}
      return;
    }
    if(e.retarget&&!e.retargeted&&e.owner?.alive){let t=nearestEnemy(e.owner);if(t){e.owner.face=angle(e.owner,t);e.a=e.owner.face}e.retargeted=true}
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

function startPractice(){
  mode='practice';roundOver=0;practiceHits=[0,0];enemyTeam={name:'練習パートナー',colors:['#7a8397','#c7cfdd','#f3d38a'],formation:['sword'],tactics:['balanced']};actors=[];let p=unit(0,0,formation[0],formationSkills[0]);p.x=470;p.y=360;p.ai=false;p.tactic='balanced';let e=unit(1,0,'sword','spinSlash');e.x=810;e.y=360;e.ai=true;e.tactic='attack';e.practiceAggro=true;e.practiceAttackWait=.8;e.practiceAttackHold=0;e.practiceRetreat=0;actors=[p,e];effects=[];ui.mode.textContent='PRACTICE';ui.score.textContent='0 - 0';ui.status.textContent='1対1練習：OUTなし・ヒット数だけ記録';syncModeButtons();updatePracticeHud();
}
function updatePracticeHud(){if(ui.practiceScore)ui.practiceScore.textContent=`あなた ${practiceHits[0]} - ${practiceHits[1]} 相手`}
function practiceHit(target,attacker,source){practiceHits[attacker.team]++;target.invuln=.45;target.stun=Math.max(target.stun,.28);knockApart(attacker,target,10,30);effects.push({kind:'practiceHit',x:target.x,y:target.y,t:.42});updatePracticeHud();ui.score.textContent=`${practiceHits[0]} - ${practiceHits[1]}`}
function endPractice(){mode='field';actors=[];effects=[];ui.mode.textContent='FIELD';ui.score.textContent='0 - 0';ui.status.textContent='練習終了。ホーム・競技場・練習場へ移動できます';syncModeButtons()}
function winRound(team,why){if(roundOver)return;roundOver=1;team===0?blue++:red++;ui.score.textContent=`${blue} - ${red}`;ui.status.textContent=(team===0?PLAYER_TEAM_NAME+' ':'相手チーム ')+why;if(blue>=2||red>=2)setTimeout(()=>finishMatch(blue>red,why),700);else setTimeout(resetRound,850)}
function finishMatch(won,why){
  if(tournament){
    tournament.results.push({enemy:enemyTeam.name,won});
    tournament.index++;
    renderTournamentStandings();
    ui.rt.textContent=won?'大会戦 勝利！':'大会戦 敗北';
    const wins=tournament.results.filter(r=>r.won).length;
    ui.rr.textContent=`${blue} - ${red}　${why}｜現在 ${wins}勝${tournament.results.length-wins}敗`;
    q('#rematch').textContent=tournament.index<3?'次の試合':'大会結果へ';
    q('#fieldBack').textContent='大会を中断して戻る';
    ui.result.classList.remove('hidden');
  }else{
    ui.rt.textContent=won?'勝利！':'敗北';ui.rr.textContent=`${blue} - ${red}　${why}`;q('#rematch').textContent='再戦';q('#fieldBack').textContent='フィールドへ';ui.result.classList.remove('hidden');
  }
}
function simulateCpuLeague(rankIndex){
  // 敵同士の3試合を簡易シミュレート。上位ランクほど拮抗しやすい。
  let pts=[0,0,0];for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){let win=Math.random()<.5?i:j;pts[win]++}return pts;
}
function renderTournamentStandings(){if(!tournament)return;let box=q('#tournamentStandings');if(!box)return;let userWins=tournament.results.filter(r=>r.won).length;let cpu=tournament.cpuWins||[0,0,0];let pool=tournament.teams||teamsForRank(tournament.rankIndex);let rows=[{name:`${PLAYER_TEAM_NAME}（あなた）`,w:userWins,p:tournament.results.length},...pool.map((e,i)=>({name:e.name,w:cpu[i]+(tournament.results[i]?.won===false?1:0),p:2+(tournament.results[i]?1:0)}))];rows.sort((a,b)=>b.w-a.w);box.innerHTML=rows.map((r,i)=>`<div class="standingRow"><b>${i+1}. ${r.name}</b><span>${r.w}勝</span></div>`).join('')}
function openTournament(){renderTournamentMenu();q('#tournament').classList.remove('hidden');mode='menu';syncModeButtons()}
function renderTournamentMenu(){let list=q('#rankList');if(!list)return;list.innerHTML=RANKS.map((r,i)=>`<button class="rankBtn" data-rank="${i}" ${i>progress.unlocked?'disabled':''}><b>${r.label}　${r.name}</b><small>${i>progress.unlocked?'未解放':'3チーム総当たり・優勝で次ランク解放'}</small></button>`).join('');q('#tournamentStandings').innerHTML='<p class="note">大会を選ぶと3チームと順番に対戦します。</p>';list.querySelectorAll('button:not([disabled])').forEach(b=>b.onclick=()=>startTournament(+b.dataset.rank))}
function startTournament(rankIndex){
  let pool=teamsForRank(rankIndex);tournament={rankIndex,index:0,results:[],cpuWins:simulateCpuLeague(rankIndex),teams:pool};q('#tournament').classList.add('hidden');enemyTeam=pool[0];startMatch();
}
function nextTournamentStep(){
  ui.result.classList.add('hidden');
  if(!tournament)return;
  if(tournament.index<3){enemyTeam=tournament.teams[tournament.index];startMatch();return}
  const wins=tournament.results.filter(r=>r.won).length;
  // 3戦中2勝以上を優勝条件にする。短い大会でも手応えが出る。
  const champion=wins>=2;
  const rank=RANKS[tournament.rankIndex];
  q('#tournament').classList.remove('hidden');mode='menu';renderTournamentMenu();renderTournamentStandings();
  q('#tournamentTitle').textContent=champion?`${rank.name} 優勝！`:`${rank.name} 大会終了`;
  q('#tournamentMessage').textContent=champion?`${wins}勝${3-wins}敗。優勝です！`:`${wins}勝${3-wins}敗。優勝には2勝以上が必要です。`;if(progress.pendingBoss===null&&!progress.defeatedBosses.includes(tournament.rankIndex)){progress.pendingBoss=tournament.rankIndex;saveProgress();q('#tournamentMessage').textContent+=' フィールドの「修練の地」に強敵が現れました。';}
  if(champion&&tournament.rankIndex< RANKS.length-1&&progress.unlocked<tournament.rankIndex+1){progress.unlocked=tournament.rankIndex+1;saveProgress();q('#tournamentMessage').textContent+=' 次のランクの大会が解放されました。'}
  tournament=null;
}
function abortTournament(){tournament=null;ui.result.classList.add('hidden');q('#tournament').classList.add('hidden');mode='field';ui.mode.textContent='FIELD';ui.status.textContent='大会を中断しました';syncModeButtons()}


const BOSSES=[
 {name:'盾剣道場・師範ガマ',type:'sword',skill:'guardedLunge',reward:'guardedLunge',rewardName:'護衛突進'},
 {name:'森の荒武者',type:'spear',skill:'whirlwindAdvance',reward:'whirlwindAdvance',rewardName:'旋風突進'},
 {name:'流浪の双刃使い',type:'dagger',skill:'fiveSlash',reward:'fiveSlash',rewardName:'五連斬り'}
];
function startBoss(){if(progress.pendingBoss===null){ui.status.textContent='今は静かです。大会を1つ終えると強敵が現れます';return}let bi=Math.min(progress.pendingBoss,BOSSES.length-1),b=BOSSES[bi];bossBattle={index:bi,boss:b};enemyTeam={name:b.name,colors:['#743c2f','#d9a54c','#f4e2ad'],formation:[b.type],tactics:['balanced']};mode='boss';roundOver=0;actors=[];formation.forEach((t,i)=>actors.push(unit(0,i,t,formationSkills[i])));let e=unit(1,0,b.type,b.skill);e.x=1000;e.y=360;e.ai=true;e.boss=true;e.hp=3;e.r=46;actors.push(e);effects=[];blue=red=0;ui.mode.textContent='BOSS';ui.score.textContent='BOSS HP 3/3';ui.status.textContent=`${b.name}：障害物・拠点なしの決闘。こちらは一撃OUT、強敵は3HITで撃破`;syncModeButtons()}
function finishBoss(won){if(!bossBattle)return;roundOver=1;let b=bossBattle.boss;if(won){let idx=bossBattle.index;if(!progress.defeatedBosses.includes(idx))progress.defeatedBosses.push(idx);if(b.reward&&!progress.unlockedSkills.includes(b.reward))progress.unlockedSkills.push(b.reward);progress.pendingBoss=null;saveProgress();buildSlots(ui.homeSlots,true);ui.rt.textContent='強敵撃破！';ui.rr.textContent=b.reward?`新スキル「${b.rewardName}」を獲得！ ホームで対応武器に装備できます。`:`${b.name}を撃破しました。報酬スキル枠は次版で追加予定です。`}else{ui.rt.textContent='修練失敗';ui.rr.textContent='強敵はその場に残っています。編成を整えて再挑戦できます。'}q('#rematch').textContent=won?'フィールドへ':'再挑戦';q('#fieldBack').textContent='フィールドへ';ui.result.classList.remove('hidden');bossBattle.resultWon=won}
function leaveBoss(){bossBattle=null;ui.result.classList.add('hidden');mode='field';actors=[];effects=[];ui.mode.textContent='FIELD';ui.score.textContent='0 - 0';ui.status.textContent='修練の地から戻りました';syncModeButtons()}

function draw(){x.clearRect(0,0,W,H);if(mode==='field')drawField();else drawMatch()}
function drawField(){x.fillStyle='#a7d28d';x.fillRect(0,0,W,H);x.fillStyle='#d9cc9e';x.lineWidth=95;x.lineCap='round';x.beginPath();x.moveTo(120,610);x.bezierCurveTo(280,500,480,420,650,360);x.bezierCurveTo(820,300,980,220,1150,120);x.strokeStyle='#d9cc9e';x.stroke();x.lineCap='butt';place(homeGate.x,homeGate.y,'ホーム','🏠');place(arenaGate.x,arenaGate.y,'競技場','🏟');place(trainingGate.x,trainingGate.y,'練習場','🌳');place(trialGate.x,trialGate.y,progress.pendingBoss===null?'修練の地':'強敵出現！','⛩️');x.fillStyle='#24483b';x.font='bold 28px sans-serif';x.fillText('けもの競技村',55,65);x.font='18px sans-serif';x.fillText('ホームで編成、練習場で1対1',55,94);for(let g of [homeGate,arenaGate,trainingGate,trialGate]){x.strokeStyle='#ffffffaa';x.lineWidth=3;x.setLineDash([8,8]);x.beginPath();x.arc(g.x,g.y,g.r,0,Math.PI*2);x.stroke()}x.setLineDash([]);drawCuteFieldFox(fieldPlayer.x,fieldPlayer.y);x.fillStyle='#24483b';x.font='bold 16px sans-serif';x.textAlign='center';x.fillText('あなた',fieldPlayer.x,fieldPlayer.y+44);x.textAlign='start'}
function nearestFacility(){let fs=[{name:'ホーム',gate:homeGate,id:'home'},{name:'競技場',gate:arenaGate,id:'arena'},{name:'練習場',gate:trainingGate,id:'training'},{name:progress.pendingBoss===null?'修練の地':'強敵の気配',gate:trialGate,id:'trial'}].map(f=>({...f,d:Math.hypot(fieldPlayer.x-f.gate.x,fieldPlayer.y-f.gate.y)})).filter(f=>f.d<f.gate.r);return fs.sort((a,b)=>a.d-b.d)[0]||null}
function place(px,py,n,ico){x.font='70px sans-serif';x.fillText(ico,px,py);x.font='bold 20px sans-serif';x.fillStyle='#26493d';x.fillText(n,px-10,py+34)}
function drawCuteFieldFox(px,py){x.save();x.translate(px,py);x.shadowBlur=8;x.shadowColor='#5aa8c8';
// 白い顔と水色の耳・頬・しっぽを持つ主人公キツネ
x.fillStyle='#f7fcff';x.beginPath();x.arc(0,2,22,0,Math.PI*2);x.fill();
x.fillStyle='#8ee6f4';x.beginPath();x.moveTo(-19,-13);x.lineTo(-10,-37);x.lineTo(-2,-18);x.fill();x.beginPath();x.moveTo(19,-13);x.lineTo(10,-37);x.lineTo(2,-18);x.fill();
x.fillStyle='#bff4fb';x.beginPath();x.ellipse(-14,4,8,11,-.4,0,Math.PI*2);x.ellipse(14,4,8,11,.4,0,Math.PI*2);x.fill();
x.fillStyle='#ffffff';x.beginPath();x.ellipse(0,10,10,8,0,0,Math.PI*2);x.fill();
x.fillStyle='#224354';x.beginPath();x.arc(-7,-5,3,0,Math.PI*2);x.arc(7,-5,3,0,Math.PI*2);x.fill();x.beginPath();x.arc(0,7,3,0,Math.PI*2);x.fill();
// 白＋青ストライプのスノー・フォックス用ユニフォーム
x.fillStyle='#ffffff';roundRect(-18,18,36,17,5);x.fill();x.fillStyle='#2f7fd3';roundRect(-13,18,7,17,2);x.fill();roundRect(5,18,7,17,2);x.fill();
x.fillStyle='#f7fcff';x.beginPath();x.ellipse(-13,40,7,14,.3,0,Math.PI*2);x.ellipse(13,40,7,14,-.3,0,Math.PI*2);x.fill();
x.shadowBlur=0;x.restore()}
function drawCuteFieldAnimal(px,py){x.save();x.translate(px,py);x.shadowBlur=8;x.shadowColor='#356b45';x.fillStyle='#62c95b';x.beginPath();x.arc(0,4,21,0,Math.PI*2);x.fill();
// 前作風に目玉を頭の上へしっかり飛び出させる
x.beginPath();x.arc(-13,-18,10,0,Math.PI*2);x.arc(13,-18,10,0,Math.PI*2);x.fill();x.fillStyle='#fffbe7';x.beginPath();x.arc(-13,-19,7,0,Math.PI*2);x.arc(13,-19,7,0,Math.PI*2);x.fill();x.fillStyle='#24392f';x.beginPath();x.arc(-12,-19,3,0,Math.PI*2);x.arc(12,-19,3,0,Math.PI*2);x.fill();x.strokeStyle='#234632';x.lineWidth=2.5;x.beginPath();x.arc(0,5,10,.2,2.9);x.stroke();x.fillStyle='#355a76';roundRect(-18,14,36,13,5);x.fill();x.fillStyle='#62c95b';x.beginPath();x.ellipse(-14,31,7,14,.35,0,Math.PI*2);x.ellipse(14,31,7,14,-.35,0,Math.PI*2);x.fill();x.shadowBlur=0;x.restore()}
function drawMatch(){x.fillStyle='#688ca1';x.fillRect(0,0,W,H);x.fillStyle='#a9d0ef';x.fillRect(court.x,court.y,court.w,court.h);x.strokeStyle='#fff7d8';x.lineWidth=5;x.strokeRect(court.x,court.y,court.w,court.h);x.setLineDash([10,11]);x.beginPath();x.moveTo(640,court.y);x.lineTo(640,court.y+court.h);x.stroke();x.setLineDash([]);for(let o of obstacles){let rr=o.oval?Math.min(o.w,o.h)*.42:13;x.fillStyle='#eef0e7';roundRect(o.x,o.y,o.w,o.h,rr);x.fill();x.fillStyle='#d6ddd6';roundRect(o.x+7,o.y+7,o.w-14,o.h-14,Math.max(8,rr-7));x.fill()}base(130,360,'#4d83dc');base(1150,360,'#e26368');for(let a of actors)drawActor(a);for(let e of effects)drawEffect(e)}
function roundRect(px,py,w,h,r){x.beginPath();x.roundRect(px,py,w,h,r)}
function base(px,py,col){x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.arc(px,py,35,0,Math.PI*2);x.stroke();x.globalAlpha=.22;x.fillStyle=col;x.fill();x.globalAlpha=1}
function drawActor(a){if(!a.alive)return;x.save();x.translate(a.x,a.y);x.scale(1.6,1.6);
let enemyCol=a.team?(enemyTeam?.colors?.[a.i%enemyTeam.colors.length]||'#e56f74'):null;
let species=a.species;
if(species===0)species='frog';else if(species===1)species='rabbit';else if(species===2)species='fox';
let fur=species==='frog'?'#65bf58':species==='rabbit'?'#eee8dc':species==='snowFox'?'#f7fcff':'#df9a55';
// ユニフォーム：自チームは白地＋青の縦ストライプ。敵はチーム固有2〜3色。
if(a.team){x.fillStyle=enemyCol;roundRect(-19,4,38,30,10);x.fill();x.fillStyle=enemyTeam?.colors?.[(a.i+1)%(enemyTeam?.colors?.length||1)]||'#fff';roundRect(-19,17,38,7,3);x.fill();}
else{x.fillStyle='#ffffff';roundRect(-19,4,38,30,10);x.fill();x.fillStyle='#2f7fd3';roundRect(-14,4,7,30,2);x.fill();roundRect(4,4,7,30,2);x.fill();x.fillStyle='#9fe8ff';roundRect(-19,28,38,5,2);x.fill();}
// 頭は常に上向き。
x.fillStyle=fur;x.beginPath();x.arc(0,-6,22,0,Math.PI*2);x.fill();
if(species==='frog'){
  x.beginPath();x.arc(-13,-24,10,0,Math.PI*2);x.arc(13,-24,10,0,Math.PI*2);x.fill();
  x.fillStyle='#fffbe7';x.beginPath();x.arc(-13,-25,7,0,Math.PI*2);x.arc(13,-25,7,0,Math.PI*2);x.fill();
  x.fillStyle='#27362f';x.beginPath();x.arc(-12,-25,3,0,Math.PI*2);x.arc(12,-25,3,0,Math.PI*2);x.fill();
}else if(species==='rabbit'){
  x.beginPath();x.ellipse(-10,-29,6,18,-.12,0,Math.PI*2);x.ellipse(10,-29,6,18,.12,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';x.beginPath();x.arc(-7,-9,5,0,Math.PI*2);x.arc(7,-9,5,0,Math.PI*2);x.fill();x.fillStyle='#27362f';x.beginPath();x.arc(-6,-9,2,0,Math.PI*2);x.arc(6,-9,2,0,Math.PI*2);x.fill();
}else{
  // キツネ。主人公だけ白＋水色の配色。
  if(species==='snowFox'){x.fillStyle='#8ee6f4';}
  x.beginPath();x.moveTo(-18,-17);x.lineTo(-8,-35);x.lineTo(-1,-18);x.fill();x.beginPath();x.moveTo(18,-17);x.lineTo(8,-35);x.lineTo(1,-18);x.fill();
  if(species==='snowFox'){x.fillStyle='#bff4fb';x.beginPath();x.ellipse(-14,0,7,9,-.35,0,Math.PI*2);x.ellipse(14,0,7,9,.35,0,Math.PI*2);x.fill();}
  x.fillStyle='#fff';x.beginPath();x.arc(-7,-9,5,0,Math.PI*2);x.arc(7,-9,5,0,Math.PI*2);x.fill();x.fillStyle='#27362f';x.beginPath();x.arc(-6,-9,2,0,Math.PI*2);x.arc(6,-9,2,0,Math.PI*2);x.fill();
}
x.strokeStyle='#3f493f';x.lineWidth=2;x.beginPath();x.arc(0,-2,7,.3,2.8);x.stroke();
// 武器だけターゲット方向へ向ける
x.save();x.rotate(a.face);let t=TYPES[a.type];drawWeapon.owner=a;let spinning=effects.some(e=>e.kind==='spinSkill'&&e.owner===a&&e.t>0);if(!spinning&&!(a.type==='spear'&&a.spearGuard>0)){drawWeapon(t.r,1,a.shield,a.handAnimR||0);drawWeapon(t.l,-1,a.shield,a.handAnimL||0)}drawWeapon.owner=null;x.restore();
if(a===controlled()){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(0,2,34,0,Math.PI*2);x.stroke()}x.restore();x.fillStyle='#17382f';x.font='11px sans-serif';x.textAlign='center';x.fillText(TYPES[a.type].name,a.x,a.y+67);x.textAlign='start'}
const WEIGHT_COLORS={1:'#536dff',2:'#36a9ff',3:'#28d7c0',4:'#55df69',5:'#f2dc45',6:'#ff9b3d',7:'#ff4d4d'};
function weaponWeight(k){
  if(k&&k.startsWith('dagger'))return 1;
  if(k==='rapier'||k==='rapierParry')return 2;
  if(k==='katana'||k==='katanaParry')return 3;
  if(k==='sword'||k==='shield')return 4;
  if(k==='spear'||k==='spearGuard')return 5;
  if(k==='halberd')return 6;
  if(k==='greatsword'||k==='greatswordGuard')return 7;
  return 4;
}
function weaponColor(k){return WEIGHT_COLORS[weaponWeight(k)]||WEIGHT_COLORS[4]}
function drawWeapon(k,side,active,anim=0){
 if(k==='none'||k==='katanaParry'||k==='rapierParry'||k==='greatswordGuard')return;
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
   let col=weaponColor(k),len=k==='spear'?92:k==='halberd'?112:k==='greatsword'?104:k==='katana'?74:k==='rapier'?70:k.startsWith('dagger')?50:58;
   let owner=drawWeapon.owner,guarding=owner&&owner.daggerGuard&&k==='daggerAttack';
   if(owner&&owner.spearGuard>0&&(k==='spear'||k==='halberd')){x.restore();return;}
   let baseY=side*(k.startsWith('dagger')?(guarding?12:30):14),tipY=side*(k.startsWith('dagger')?(guarding?7:42):20);
   if(k==='spear'||k==='halberd'||k==='rapier'||k==='greatsword'){baseY=0;tipY=0;}
   if(k.startsWith('dagger')&&anim>0){let p=Math.min(1,anim/.24);let swing=Math.sin((1-p)*Math.PI)*22;tipY-=side*swing;baseY+=side*4}
   // 攻撃中は「持っている一本そのもの」が動く。別武器は描かない。
   let pose=owner&&owner.attackPose&&owner.attackPose.weapon===k?owner.attackPose:null;
   if(pose){let ph=attackPhase(pose),el=pose.max-pose.t;if(k==='spear'||(k==='rapier'&&pose.kind==='thrust')){
     let pr=ph==='windup'?Math.max(.65,1-el/pose.windup*.35):ph==='active'?1.65:Math.max(1,1.65-(el-pose.windup-pose.active)/pose.recovery*.65);
     len*=pr;
   }else if((k==='halberd'||k==='greatsword')&&pose.kind==='swing'){
     let q=Math.max(0,Math.min(1,(el-pose.windup*.35)/(pose.windup+pose.active)));
     x.rotate((k==='greatsword'?-0.95:-.75)+q*(k==='greatsword'?1.9:1.5));
   }else if(k==='sword'){
     let pr=ph==='windup'?Math.min(1,el/pose.windup):1;tipY+=side*(1-pr)*22;
   }}
   if(owner&&owner.greatswordGuard&&k==='greatsword'){x.rotate(-0.12);baseY=0;tipY=0;}
   if(owner&&owner.parryT>0&&(k==='katana'||k==='rapier')){
     x.rotate(k==='katana'?-0.72:-0.48);baseY*=.25;tipY*=.25;
   }
   const drawBlade=(by,ty)=>{
     const pole=(k==='spear'||k==='halberd');
     x.shadowBlur=18;x.shadowColor=col;
     if(k==='greatsword'){
       x.strokeStyle='#5a4c61';x.lineWidth=8;x.beginPath();x.moveTo(0,by);x.lineTo(20,by);x.stroke();
       x.strokeStyle=col;x.lineWidth=15;x.beginPath();x.moveTo(18,by);x.lineTo(len,ty);x.stroke();
       x.shadowBlur=0;x.strokeStyle='#ffffff';x.globalAlpha=.72;x.lineWidth=3;x.beginPath();x.moveTo(22,by);x.lineTo(len-3,ty);x.stroke();x.globalAlpha=1;
     }else if(pole){
       // 槍・ハルバードは柄まで同系色で発光。ハルバードは穂先＋斧刃で重量感を出す。
       x.strokeStyle=col;x.lineWidth=7;x.beginPath();x.moveTo(-20,by);x.lineTo(len,ty);x.stroke();
       x.shadowBlur=0;x.strokeStyle='#ffffff';x.globalAlpha=.72;x.lineWidth=2;x.beginPath();x.moveTo(-17,by);x.lineTo(len-2,ty);x.stroke();x.globalAlpha=1;
       x.strokeStyle='#36545a';x.globalAlpha=.55;x.lineWidth=4;x.beginPath();x.moveTo(-8,by);x.lineTo(10,by);x.stroke();x.globalAlpha=1;
       if(k==='halberd'){
         x.save();x.translate(len-8,ty);x.shadowBlur=16;x.shadowColor=col;x.fillStyle=col;x.strokeStyle='#f7ffff';x.lineWidth=2;
         x.beginPath();x.moveTo(0,0);x.lineTo(19,-19);x.lineTo(16,-4);x.lineTo(4,10);x.lineTo(-2,7);x.closePath();x.fill();x.stroke();
         x.beginPath();x.moveTo(5,0);x.lineTo(24,0);x.lineTo(11,7);x.closePath();x.fill();x.stroke();x.restore();
       }
     }else if(k==='katana'){
       // 刀は直線ではなく、緩やかに反った一本の刀身として描く。
       x.strokeStyle='#6c625b';x.lineWidth=5;x.beginPath();x.moveTo(5,by);x.lineTo(18,by);x.stroke();
       x.shadowBlur=18;x.shadowColor=col;x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.moveTo(16,by);x.quadraticCurveTo(len*.60,ty+11*side,len,ty+5*side);x.stroke();
       x.shadowBlur=0;x.strokeStyle='#ffffff';x.globalAlpha=.82;x.lineWidth=2;x.beginPath();x.moveTo(20,by);x.quadraticCurveTo(len*.60,ty+10*side,len-3,ty+5*side);x.stroke();x.globalAlpha=1;
     }else{
       x.strokeStyle='#6c625b';x.lineWidth=5;x.beginPath();x.moveTo(7,by);x.lineTo(17,by);x.stroke();
       x.strokeStyle=col;x.lineWidth=7;x.beginPath();x.moveTo(16,by);x.lineTo(len,ty);x.stroke();
       x.shadowBlur=0;x.strokeStyle='#ffffff';x.lineWidth=2;x.beginPath();x.moveTo(19,by);x.lineTo(len-2,ty);x.stroke();
     }
   };
   drawBlade(baseY,tipY);
   if(k==='daggerAttack'&&guarding)drawBlade(-baseY,-tipY);
 }
 x.restore();
}
function drawEffect(e){
 x.save();
 if(e.kind==='spinSkill'){
   let a=e.owner;if(a&&a.alive){
     let p=1-e.t/e.max,col=weaponColor(e.weapon||'sword'),rr=e.range||126,ang=p*Math.PI*2*1.35+a.face;
     // 回転斬りは外周リングではなく、柄側から剣先までの円盤状残像。
     // 内側ほど密度と不透明度を上げ、実際に一本の武器を高速回転させている見え方にする。
     let inner=e.weapon==='greatsword'?30:26,steps=e.weapon==='greatsword'?12:10;
     x.shadowColor=col;x.shadowBlur=e.weapon==='greatsword'?24:18;
     for(let i=0;i<steps;i++){
       let t=i/(steps-1),r=inner+(rr-inner)*t;
       x.globalAlpha=.42-(t*.25);x.strokeStyle=col;x.lineWidth=(e.weapon==='greatsword'?20:14)*(1-t*.48)+3;
       x.beginPath();x.arc(a.x,a.y,r,0,Math.PI*2);x.stroke();
     }
     // 数本の「剣そのもの」の残像を入れて回転方向を読めるようにする。
     for(let i=0;i<6;i++){
       let aa=ang-i*.34,fade=1-i/6;
       x.globalAlpha=.16+.38*fade;x.strokeStyle=col;x.lineWidth=e.weapon==='greatsword'?13:8;
       x.beginPath();x.moveTo(a.x+Math.cos(aa)*inner,a.y+Math.sin(aa)*inner);x.lineTo(a.x+Math.cos(aa)*rr,a.y+Math.sin(aa)*rr);x.stroke();
       x.globalAlpha=.10+.26*fade;x.strokeStyle='#fff';x.lineWidth=e.weapon==='greatsword'?3.5:2.5;
       x.beginPath();x.moveTo(a.x+Math.cos(aa)*(inner+4),a.y+Math.sin(aa)*(inner+4));x.lineTo(a.x+Math.cos(aa)*(rr-4),a.y+Math.sin(aa)*(rr-4));x.stroke();
     }
     // 現在位置の刃を最も明るく描く。
     x.globalAlpha=.96;x.strokeStyle=col;x.shadowBlur=30;x.lineWidth=e.weapon==='greatsword'?18:11;
     x.beginPath();x.moveTo(a.x+Math.cos(ang)*inner,a.y+Math.sin(ang)*inner);x.lineTo(a.x+Math.cos(ang)*rr,a.y+Math.sin(ang)*rr);x.stroke();
     x.globalAlpha=.78;x.strokeStyle='#fff';x.shadowBlur=8;x.lineWidth=e.weapon==='greatsword'?4:3;
     x.beginPath();x.moveTo(a.x+Math.cos(ang)*(inner+5),a.y+Math.sin(ang)*(inner+5));x.lineTo(a.x+Math.cos(ang)*(rr-5),a.y+Math.sin(ang)*(rr-5));x.stroke();
   }
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
   let a=e.owner;if(a&&a.alive){
     let p=1-e.t/e.max,w=e.weapon||a.type,col=weaponColor(w),half=w==='halberd'?78:58,mid=w==='halberd'?42:36;
     x.translate(a.x+Math.cos(a.face)*mid,a.y+Math.sin(a.face)*mid);x.rotate(a.face+p*22);x.globalAlpha=.86;x.lineCap='round';x.shadowBlur=18;x.shadowColor=col;
     // 回転中も一本全体を発光させる。中心のグリップだけ薄く残す。
     x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.moveTo(-half,0);x.lineTo(half,0);x.stroke();
     x.shadowBlur=0;x.strokeStyle='#fff';x.globalAlpha=.64;x.lineWidth=2;x.beginPath();x.moveTo(-half+3,0);x.lineTo(half-3,0);x.stroke();
     x.globalAlpha=.55;x.strokeStyle='#36545a';x.lineWidth=4;x.beginPath();x.moveTo(-9,0);x.lineTo(9,0);x.stroke();x.globalAlpha=1;
   }
 }else if(e.kind==='parryFlash'){
   let a=e.owner;if(a&&a.alive){let col=weaponColor(e.weapon);x.globalAlpha=.28;x.strokeStyle=col;x.shadowBlur=16;x.shadowColor=col;x.lineWidth=8;x.beginPath();x.arc(a.x,a.y,50,a.face-.9,a.face+.9);x.stroke();x.shadowBlur=0}
 }else if(e.kind==='parry'){
   x.globalAlpha=Math.min(1,e.t*5);x.strokeStyle='#eaffff';x.shadowBlur=18;x.shadowColor='#7eeaff';x.lineWidth=5;x.beginPath();x.arc(e.x,e.y,28+(1-e.t/.30)*26,0,Math.PI*2);x.stroke();x.shadowBlur=0;x.fillStyle='#fff';x.font='bold 24px sans-serif';x.fillText('PARRY!',e.x-42,e.y-38);
 }else if(e.kind==='skillHit'){let p=1-e.t/e.max;x.globalAlpha=Math.min(1,e.t*5);x.strokeStyle='#fff7a6';x.shadowBlur=22;x.shadowColor='#ffe66d';x.lineWidth=6;x.beginPath();x.arc(e.x,e.y,34+p*38,0,Math.PI*2);x.stroke();x.shadowBlur=0;x.fillStyle='#fff7a6';x.font='bold 25px sans-serif';x.fillText(e.text,e.x-70,e.y-58);
 }else if(e.kind==='practiceHit'){x.globalAlpha=Math.min(1,e.t*4);x.fillStyle='#fff7a6';x.font='bold 28px sans-serif';x.fillText('HIT!',e.x-30,e.y-48);
 }else if(e.kind==='stepDust'){
   let p=1-e.t/e.max;x.globalAlpha=.32*(1-p);x.strokeStyle='#ffffff';x.lineWidth=5;x.beginPath();x.arc(e.x,e.y,18+p*28,0,Math.PI*2);x.stroke();
 }else if(e.kind==='shieldCharge'){
   let a=e.owner;if(a&&a.alive){let p=1-e.t/e.max;x.globalAlpha=.35;x.strokeStyle='#dffcff';x.lineWidth=12;x.beginPath();x.arc(a.x,a.y,52+p*10,a.face-1.0,a.face+1.0);x.stroke()}
 }else{
   x.globalAlpha=Math.min(1,e.t*5);
   if(e.kind==='block'||e.kind==='clash'){
     let p=1-Math.max(0,e.t)/.34,rad=24+p*34;x.strokeStyle=e.kind==='clash'?'#fff7a6':'#dffcff';x.lineWidth=6;x.shadowBlur=18;x.shadowColor=x.strokeStyle;x.beginPath();x.arc(e.x,e.y,rad,0,Math.PI*2);x.stroke();
     x.lineWidth=4;for(let i=0;i<6;i++){let a=i*Math.PI/3+p*.7;x.beginPath();x.moveTo(e.x+Math.cos(a)*16,e.y+Math.sin(a)*16);x.lineTo(e.x+Math.cos(a)*(38+p*20),e.y+Math.sin(a)*(38+p*20));x.stroke()}
   }
   if(e.kind==='block'||e.kind==='clash'||e.kind==='out'){x.shadowBlur=0;x.font='bold 26px sans-serif';x.fillStyle=e.kind==='block'?'#fff':e.kind==='clash'?'#fff7a6':'#3c3028';x.fillText(e.kind==='block'?'BLOCK!':e.kind==='clash'?'CLASH!':'OUT!',e.x-35,e.y-38)}
 }
 x.restore();
}

q('#tournamentClose').onclick=()=>{q('#tournament').classList.add('hidden');mode='field';ui.mode.textContent='FIELD';ui.status.textContent='競技場から出ました';syncModeButtons()};

function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);syncModeButtons();
let keyTap={};
addEventListener('keydown',e=>{
  if(!keys[e.key]){
    const map={ArrowRight:[1,0],d:[1,0],ArrowLeft:[-1,0],a:[-1,0],ArrowDown:[0,1],s:[0,1],ArrowUp:[0,-1],w:[0,-1]};
    if(map[e.key]){let now=performance.now(),prev=keyTap[e.key]||0;if(now-prev<=330)triggerStep(controlled(),...map[e.key]);keyTap[e.key]=now}
  }
  keys[e.key]=true;if(e.key==='j')hand(controlled(),'l',true);if(e.key==='k')hand(controlled(),'r',true);if(e.key==='u')useSkill(controlled());if(e.key==='i')cycleControlled()
});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='j')hand(controlled(),'l',false)});
function bind(btn,side){btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);hand(controlled(),side,true)});btn.addEventListener('pointerup',e=>{e.preventDefault();hand(controlled(),side,false)});btn.addEventListener('pointercancel',()=>hand(controlled(),side,false))}bind(ui.L,'l');bind(ui.R,'r');
ui.E.onclick=()=>{if(mode==='field'){let f=nearestFacility();if(!f){ui.status.textContent='施設の近くまで歩いてください';return}if(f.id==='home'){buildSlots(ui.homeSlots,true);ui.home.classList.remove('hidden');ui.status.textContent='ホーム：装備と戦術を設定'}else if(f.id==='arena'){openTournament();ui.status.textContent='大会受付：参加するランクを選択'}else if(f.id==='training')startPractice();else if(f.id==='trial')startBoss()}else if(mode==='practice')endPractice();else cycleControlled()};ui.S.onclick=()=>{if(mode==='match'||mode==='practice'||mode==='boss')useSkill(controlled());else ui.status.textContent='ホームで編成、練習場でスキル確認ができます'};
const stick=q('#stick'),knob=stick.querySelector('i');
function joyMove(e){let r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.dx=dx;joy.dy=dy;knob.style.transform=`translate(${dx*28}px,${dy*28}px)`}
stick.onpointerdown=e=>{joy.id=e.pointerId;joy.downAt=performance.now();joy.tapDX=joy.tapDY=0;stick.setPointerCapture(e.pointerId);joyMove(e);joy.tapDX=joy.dx;joy.tapDY=joy.dy};
stick.onpointermove=e=>{if(e.pointerId===joy.id){joyMove(e);if(Math.hypot(joy.dx,joy.dy)>.55){joy.tapDX=joy.dx;joy.tapDY=joy.dy}}};
function joyEnd(e){if(joy.id!=null&&performance.now()-(joy.downAt||0)<=300&&Math.hypot(joy.tapDX||0,joy.tapDY||0)>.55)registerDirectionTap(joy.tapDX,joy.tapDY);joy.id=null;joy.dx=joy.dy=0;joy.tapDX=joy.tapDY=0;knob.style.transform=''}
stick.onpointerup=joyEnd;stick.onpointercancel=e=>{joy.id=null;joy.dx=joy.dy=0;joy.tapDX=joy.tapDY=0;knob.style.transform=''};
