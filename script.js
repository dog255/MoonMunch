"use strict";
const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const SAVE_KEY = "moonMunchSaveV1";
const defaults = () => ({coins:0, world:1, wins:0, upgrade:0, character:"🐻"});
function loadSave() {
  try { return {...defaults(), ...JSON.parse(localStorage.getItem(SAVE_KEY))}; }
  catch { return defaults(); }
}
let save = loadSave();
function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  updateUI();
}
function updateUI() {
  $("coins").textContent = save.coins;
  $("world").textContent = save.world;
  $("health").textContent = Math.max(0, player.health);
  $("character").value = save.character;
}
const player = {x:450,y:300,radius:20,speed:3,health:100,invulnerable:0};
let running=false, bossMode=false, night=0, boss=null;
let enemies=[], fruits=[], shots=[], enemyShots=[], keys={};
let lastShot=0,lastAttack=0,lastSpawn=0, frame=null;
const random=(a,b)=>Math.random()*(b-a)+a;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function message(t) { $("message").textContent=t; }
function spawnFruit() {
  fruits.push({x:random(30,870),y:random(70,570),type:["🍎","🍓","🍊","🍇"][Math.floor(Math.random()*4)]});
}
function spawnEnemy() {
  const side=Math.floor(Math.random()*4);
  let x=random(20,880),y=random(70,580);
  if(side===0)y=65;
  if(side===1)x=20;
  if(side===2)x=880;
  if(side===3)y=580;
  enemies.push({x,y,radius:18,speed:random(.65,1.1)+save.world*.12});
}
function startGame() {
  save.character=$("character").value; persist();
  player.x=450; player.y=300; player.health=100; player.invulnerable=0;
  enemies=[]; fruits=[]; shots=[]; enemyShots=[]; night=0; bossMode=false; boss=null;
  running=true;
  for(let i=0;i<5;i++)spawnEnemy();
  for(let i=0;i<7;i++)spawnFruit();
  $("bossInfo").classList.add("hidden");
  $("menu").classList.add("hidden");
  message("Collect fruit and survive!");
  if(frame)cancelAnimationFrame(frame);
  loop();
}
function startBoss() {
  bossMode=true; enemies=[]; shots=[]; enemyShots=[];
  const hp=[3000,3500,6500][Math.min(save.world-1,2)]+Math.max(0,save.world-3)*1000;
  boss={x:450,y:135,radius:45,health:hp,maxHealth:hp,speed:1.2+save.world*.2,direction:1};
  $("bossInfo").classList.remove("hidden");
  $("bossName").textContent="Boss "+save.world;
  message("Boss battle! Press SPACE or SHOOT!");
}
function shoot() {
  if(!running||!bossMode||!boss)return;
  const now=Date.now();
  if(now-lastShot<Math.max(130,450-save.upgrade*25))return;
  lastShot=now;
  const dx=boss.x-player.x,dy=boss.y-player.y,len=Math.hypot(dx,dy)||1;
  shots.push({x:player.x,y:player.y,vx:dx/len*8,vy:dy/len*8,damage:50+save.upgrade*10});
}
function damagePlayer(n) {
  if(player.invulnerable>0)return;
  player.health-=n;player.invulnerable=50;updateUI();
  if(player.health<=0) {
    running=false;message("You were caught! Try again.");
    $("menu").classList.remove("hidden");
  }
}
function defeatBoss() {
  bossMode=false;boss=null;save.coins+=100+save.world*50;save.wins++;save.world++;
  player.health=100;persist();
  message("Boss defeated! World "+save.world+" unlocked!");
  $("bossInfo").classList.add("hidden");
  $("menu").classList.remove("hidden");running=false;
}
function update() {
  if(!running)return;
  if(keys.ArrowLeft||keys.a)player.x-=player.speed;
  if(keys.ArrowRight||keys.d)player.x+=player.speed;
  if(keys.ArrowUp||keys.w)player.y-=player.speed;
  if(keys.ArrowDown||keys.s)player.y+=player.speed;
  player.x=Math.max(20,Math.min(880,player.x));
  player.y=Math.max(55,Math.min(580,player.y));
  if(player.invulnerable>0)player.invulnerable--;
  const now=Date.now();
  if(!bossMode) {
    if(now-lastSpawn>9000) {
      lastSpawn=now;night++;
      if(night%3===0){startBoss();return;}
      spawnEnemy();spawnFruit();
    }
    for(const e of enemies) {
      const dx=player.x-e.x,dy=player.y-e.y,len=Math.hypot(dx,dy)||1;
      e.x+=dx/len*e.speed;e.y+=dy/len*e.speed;
      if(distance(player,e)<player.radius+e.radius)damagePlayer(.35);
    }
    fruits=fruits.filter(f=>{
      if(distance(player,f)<32){save.coins+=5;persist();return false;}
      return true;
    });
  } else if(boss&&now-lastAttack>1000) {
    lastAttack=now;
    const dx=player.x-boss.x,dy=player.y-boss.y,len=Math.hypot(dx,dy)||1;
    enemyShots.push({x:boss.x,y:boss.y,vx:dx/len*3,vy:dy/len*3,radius:9});
  }
  shots=shots.filter(s=>{
    s.x+=s.vx;s.y+=s.vy;
    if(boss&&distance(s,boss)<boss.radius+8) {
      boss.health-=s.damage;
      $("bossBar").style.width=Math.max(0,boss.health/boss.maxHealth*100)+"%";
      if(boss.health<=0)defeatBoss();
      return false;
    }
    return s.x>0&&s.x<900&&s.y>0&&s.y<600;
  });
  enemyShots=enemyShots.filter(s=>{
    s.x+=s.vx;s.y+=s.vy;
    if(distance(s,player)<player.radius+s.radius){damagePlayer(10);return false;}
    return s.x>0&&s.x<900&&s.y>0&&s.y<600;
  });
  if(boss) {
    boss.x+=boss.speed*boss.direction;
    if(boss.x<boss.radius||boss.x>900-boss.radius)boss.direction*=-1;
  }
}
function draw() {
  ctx.fillStyle="#15172d";ctx.fillRect(0,0,900,600);
  ctx.strokeStyle="#292c4b";
  for(let x=0;x<900;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
  for(let y=0;y<600;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="27px system-ui";
  ctx.fillText("🌙",850,40);
  for(const f of fruits)ctx.fillText(f.type,f.x,f.y);
  for(const e of enemies)ctx.fillText("👾",e.x,e.y);
  for(const s of shots){ctx.fillStyle="#d9ff6b";ctx.beginPath();ctx.arc(s.x,s.y,6,0,Math.PI*2);ctx.fill();}
  for(const s of enemyShots){ctx.fillStyle="#ff76c8";ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.fill();}
  if(boss){ctx.font="70px system-ui";ctx.fillText("👹",boss.x,boss.y);}
  ctx.globalAlpha=player.invulnerable>0&&Math.floor(player.invulnerable/5)%2?.4:1;
  ctx.font="43px system-ui";ctx.fillText(save.character,player.x,player.y);
  ctx.globalAlpha=1;
}
function loop() {
  update();draw();
  if(running)frame=requestAnimationFrame(loop);
}
document.addEventListener("keydown",e=>{
  keys[e.key]=true;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
  if(e.code==="Space")shoot();
});
document.addEventListener("keyup",e=>keys[e.key]=false);
function bindMove(id,key) {
  const b=$(id);
  const down=e=>{e.preventDefault();keys[key]=true;};
  const up=e=>{e.preventDefault();keys[key]=false;};
  b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);
  b.addEventListener("pointerleave",up);b.addEventListener("pointercancel",up);
}
bindMove("left","ArrowLeft");bindMove("right","ArrowRight");
bindMove("up","ArrowUp");bindMove("down","ArrowDown");
$("shoot").addEventListener("pointerdown",e=>{e.preventDefault();shoot();});
$("play").addEventListener("click",startGame);
$("character").addEventListener("change",()=>{save.character=$("character").value;persist();});
$("upgrade").addEventListener("click",()=>{
  if(save.coins<25){message("You need 25 coins to upgrade!");return;}
  save.coins-=25;save.upgrade++;persist();message("Upgrade purchased!");
});
$("reset").addEventListener("click",()=>{
  if(!confirm("Reset all progress?"))return;
  localStorage.removeItem(SAVE_KEY);save=defaults();player.health=100;
  running=false;updateUI();draw();message("Save reset.");
});
updateUI();draw();
