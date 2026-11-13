(() => {
  "use strict";
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const WORLD = { width: 2400, height: 1800 };
  const SAVE_KEY = "wildearth-prototype-v1";
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const rand = (a,b) => a + Math.random() * (b-a);
  const input = { up:false,down:false,left:false,right:false };
  const defaults = () => ({
    player:{x:WORLD.width/2,y:WORLD.height/2,hp:100,hunger:100,thirst:100,stamina:100},
    bag:{wood:0,stone:0,berries:0,water:0},day:1,time:0.25,fire:false,
    objects:makeWorld(),note:"The forest is quiet. Find resources before nightfall."
  });
  function makeWorld(){
    const list=[];
    const safe={x:WORLD.width/2,y:WORLD.height/2};
    for(let i=0;i<95;i++){
      let x=rand(70,WORLD.width-70),y=rand(70,WORLD.height-70);
      if(Math.hypot(x-safe.x,y-safe.y)<135){i--;continue;}
      const type=Math.random()<.52?"tree":Math.random()<.5?"rock":"berry";
      list.push({id:"n"+i,type,x,y,r:type==="tree"?25:type==="rock"?18:15,alive:true});
    }
    for(let i=0;i<5;i++)list.push({id:"pond"+i,type:"pond",x:rand(120,WORLD.width-120),y:rand(120,WORLD.height-120),r:rand(52,78),alive:true});
    for(let i=0;i<5;i++)list.push({id:"wolf"+i,type:"wolf",x:rand(100,WORLD.width-100),y:rand(100,WORLD.height-100),r:17,alive:true,dir:rand(0,6.28),cool:0});
    return list;
  }
  let state=load(),last=0,toastTimer=0,paused=false,ended=false,hudTimer=0,autosave=0;
  let player=state.player;
  let camera={x:0,y:0};
  function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.player&&s.objects)return s;}catch{}return defaults();}
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}
  function notify(message){const el=$("toast");el.textContent=message;el.classList.add("show");toastTimer=2.4;}
  function isNight(){return state.time>0.72||state.time<0.18;}
  function phase(){if(state.time<.18)return "DAWN";if(state.time<.48)return "DAY";if(state.time<.72)return "EVENING";return "NIGHT";}
  function updateHud(){
    for(const key of ["health","hunger","thirst","stamina"]){const v=Math.round(player[key==="health"?"hp":key]);$(key+"-value").textContent=v;$(key+"-meter").style.width=v+"%";}
    for(const key of ["wood","stone","berries","water"])$(key+"-count").textContent=state.bag[key];
    const weight=state.bag.wood+state.bag.stone+state.bag.berries+state.bag.water;
    $("weight-label").textContent=weight+" / 30";
    $("day-label").textContent="DAY "+state.day+" · "+phase();
    $("weather-icon").textContent=isNight()?"☾":"☀";
    $("craft-button").disabled=state.fire||state.bag.wood<5||state.bag.stone<3;
    $("craft-button").textContent=state.fire?"BUILT":"BUILD";
    $("progress-text").textContent=state.fire?"1 / 1 campfire built":"0 / 1 campfire built";
    $("progress-meter").style.width=state.fire?"100%":"0%";
    $("objective").textContent=state.fire?"Stay alive and explore the wilds":"Gather 5 wood + 3 stone to build a campfire";
    $("field-note").textContent=state.note;
  }
  function worldPos(){return{x:player.x,y:player.y};}
  function nearby(types,max=58){return state.objects.filter(o=>o.alive&&types.includes(o.type)&&distance(player,o)<max).sort((a,b)=>distance(player,a)-distance(player,b))[0];}
  function interact(){
    if(paused||ended)return;
    const target=nearby(["tree","rock","berry","pond","campfire","wolf"],72);
    if(!target){notify("Nothing close enough. Explore the forest.");return;}
    if(target.type==="tree"){state.bag.wood=Math.min(30,state.bag.wood+2);target.alive=false;state.note="A fallen tree gave you wood. Look for stones and berries.";notify("+2 wood gathered");}
    else if(target.type==="rock"){state.bag.stone=Math.min(30,state.bag.stone+2);target.alive=false;state.note="Stone collected. You are closer to building a campfire.";notify("+2 stone gathered");}
    else if(target.type==="berry"){state.bag.berries=Math.min(30,state.bag.berries+2);target.alive=false;notify("+2 wild berries gathered");}
    else if(target.type==="pond"){state.bag.water=Math.min(30,state.bag.water+3);notify("Filled your water supply · +3");}
    else if(target.type==="campfire"){player.hp=Math.min(100,player.hp+8);player.stamina=100;notify("You rest beside the fire. +8 health");}
    else if(target.type==="wolf"){notify("The wolf snarls. Keep your distance!");}
    updateHud();save();
  }
  function eat(){if(state.bag.berries<1){notify("No berries in your backpack.");return;}state.bag.berries--;player.hunger=Math.min(100,player.hunger+27);notify("You ate wild berries. Hunger restored.");updateHud();save();}
  function drink(){const pond=nearby(["pond"],75);if(pond){player.thirst=100;notify("Fresh water. Thirst fully restored.");}else if(state.bag.water>0){state.bag.water--;player.thirst=Math.min(100,player.thirst+38);notify("You drank stored water.");}else{notify("Find a pond or collect water first.");return;}updateHud();save();}
  function craft(){if(state.fire){notify("Your campfire is already built.");return;}if(state.bag.wood<5||state.bag.stone<3){notify("Need 5 wood and 3 stone to build.");return;}state.bag.wood-=5;state.bag.stone-=3;state.fire=true;state.objects.push({id:"campfire",type:"campfire",x:player.x+35,y:player.y+18,r:18,alive:true});state.note="Your campfire is ready. Rest beside it when the night gets cold.";notify("Campfire built! Your shelter point is ready.");updateHud();save();}
  function setMove(key,on){input[key]=on;}
  function keyDown(e){const k=e.key.toLowerCase();const map={w:"up",arrowup:"up",s:"down",arrowdown:"down",a:"left",arrowleft:"left",d:"right",arrowright:"right"};if(map[k]){e.preventDefault();setMove(map[k],true);}if(k==="e")interact();if(k==="q")eat();if(k==="f")craft();if(k===" "){e.preventDefault();player.stamina=Math.max(0,player.stamina-2);}}
  function keyUp(e){const map={w:"up",arrowup:"up",s:"down",arrowdown:"down",a:"left",arrowleft:"left",d:"right",arrowright:"right"};if(map[e.key.toLowerCase()])setMove(map[e.key.toLowerCase()],false);}
  window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp);window.addEventListener("blur",()=>Object.keys(input).forEach(k=>input[k]=false));
  document.querySelectorAll("[data-move]").forEach(btn=>{const key=btn.dataset.move;btn.addEventListener("pointerdown",e=>{e.preventDefault();setMove(key,true);});["pointerup","pointercancel","pointerleave"].forEach(type=>btn.addEventListener(type,()=>setMove(key,false)));});
  document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>btn.dataset.action==="eat"?eat():interact()));
  $("craft-button").addEventListener("click",craft);
  function pause(){paused=!paused;$("pause-overlay").classList.toggle("hidden",!paused);$("pause-button").textContent=paused?"▶":"Ⅱ";}
  $("pause-button").addEventListener("click",pause);$("resume-button").addEventListener("click",pause);
  $("restart-button").addEventListener("click",()=>{state=defaults();player=state.player;paused=false;ended=false;$("gameover-overlay").classList.add("hidden");updateHud();save();notify("A new journey begins.");});
  function endJourney(){ended=true;$("end-title").textContent="The wild wins this time";$("end-copy").textContent="You survived "+Math.max(1,state.day)+" day(s). Start again and prepare better."; $("gameover-overlay").classList.remove("hidden");}
  function update(dt){
    if(paused||ended)return;
    state.time+=dt/210;
    if(state.time>=1){state.time-=1;state.day++;notify("Day "+state.day+" begins. Keep exploring.");}
    const dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0);
    const moving=dx!==0||dy!==0;
    const speed=player.stamina>0?185:115;
    const len=Math.hypot(dx,dy)||1;
    player.x=clamp(player.x+(dx/len)*speed*dt,24,WORLD.width-24);
    player.y=clamp(player.y+(dy/len)*speed*dt,24,WORLD.height-24);
    player.hunger=Math.max(0,player.hunger-dt*.20);
    player.thirst=Math.max(0,player.thirst-dt*.29);
    player.stamina=clamp(player.stamina+(moving?-dt*3.2:dt*7),0,100);
    if(player.hunger===0||player.thirst===0)player.hp=Math.max(0,player.hp-dt*(player.thirst===0?1.3:.65));
    const fire=state.objects.find(o=>o.type==="campfire"&&o.alive);
    if(fire&&distance(player,fire)<100){player.hp=Math.min(100,player.hp+dt*1.1);player.stamina=Math.min(100,player.stamina+dt*9);}
    for(const wolf of state.objects.filter(o=>o.type==="wolf"&&o.alive)){
      wolf.cool-=dt;const d=distance(player,wolf);
      if(d<190){const angle=Math.atan2(player.y-wolf.y,player.x-wolf.x);wolf.x+=Math.cos(angle)*dt*(d<36?60:45);wolf.y+=Math.sin(angle)*dt*(d<36?60:45);}
      else{wolf.dir+=rand(-.8,.8)*dt;wolf.x+=Math.cos(wolf.dir)*dt*13;wolf.y+=Math.sin(wolf.dir)*dt*13;}
      wolf.x=clamp(wolf.x,20,WORLD.width-20);wolf.y=clamp(wolf.y,20,WORLD.height-20);
      if(d<31&&wolf.cool<=0){player.hp=Math.max(0,player.hp-9);wolf.cool=2.3;notify("A wolf attacked! Escape or keep moving.");}
    }
    if(player.hp<=0)endJourney();
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$("toast").classList.remove("show");}
    hudTimer+=dt;autosave+=dt;if(hudTimer>=.15){updateHud();hudTimer=0;}if(autosave>=8){save();autosave=0;}
  }
  function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function drawTree(x,y,r){ctx.fillStyle="#102a1a";ctx.beginPath();ctx.ellipse(x+3,y+10,r*1.15,r*.62,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#315e37";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4c8048";ctx.beginPath();ctx.arc(x-7,y-8,r*.62,0,Math.PI*2);ctx.fill();ctx.fillStyle="#78a85b";ctx.beginPath();ctx.arc(x-10,y-12,r*.23,0,Math.PI*2);ctx.fill();}
  function drawRock(x,y,r){ctx.fillStyle="#34483c";ctx.beginPath();ctx.moveTo(x-r,y+r*.35);ctx.lineTo(x-r*.6,y-r*.65);ctx.lineTo(x+r*.25,y-r);ctx.lineTo(x+r,y-r*.1);ctx.lineTo(x+r*.7,y+r*.75);ctx.closePath();ctx.fill();ctx.fillStyle="#617467";ctx.beginPath();ctx.moveTo(x-r*.6,y-r*.55);ctx.lineTo(x+r*.2,y-r*.9);ctx.lineTo(x+r*.45,y-r*.1);ctx.lineTo(x-r*.1,y+r*.05);ctx.closePath();ctx.fill();}
  function draw(){
    ctx.clearRect(0,0,W,H);camera.x=clamp(player.x-W/2,0,WORLD.width-W);camera.y=clamp(player.y-H/2,0,WORLD.height-H);
    ctx.save();ctx.translate(-camera.x,-camera.y);
    ctx.fillStyle="#294b32";ctx.fillRect(0,0,WORLD.width,WORLD.height);
    for(let y=0;y<WORLD.height;y+=64)for(let x=0;x<WORLD.width;x+=64){const n=Math.sin(x*12.9898+y*78.233)*43758.5453;const v=n-Math.floor(n);ctx.fillStyle=v>.5?"#31563a":"#2d5135";ctx.globalAlpha=.22;ctx.fillRect(x+v*22,y+v*22,2,2);}ctx.globalAlpha=1;
    for(const o of state.objects){if(!o.alive)continue;const x=o.x,y=o.y;if(x<camera.x-100||x>camera.x+W+100||y<camera.y-100||y>camera.y+H+100)continue;
      if(o.type==="pond"){ctx.fillStyle="#193e4a";ctx.beginPath();ctx.ellipse(x,y,o.r*1.3,o.r*.82,-.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#5b9c9b";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#78b6a7";ctx.globalAlpha=.4;ctx.beginPath();ctx.ellipse(x-12,y-10,o.r*.45,7,-.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      if(o.type==="tree")drawTree(x,y,o.r);if(o.type==="rock")drawRock(x,y,o.r);
      if(o.type==="berry"){ctx.fillStyle="#3d743f";ctx.beginPath();ctx.arc(x,y+4,12,0,Math.PI*2);ctx.fill();for(let i=0;i<4;i++){ctx.fillStyle="#a9c66c";ctx.beginPath();ctx.arc(x-6+i*4,y-4+(i%2)*5,3,0,Math.PI*2);ctx.fill();}}
      if(o.type==="wolf"){ctx.fillStyle="#17221d";ctx.beginPath();ctx.ellipse(x,y,17,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#7c8d79";ctx.beginPath();ctx.arc(x+10,y-5,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e6c978";ctx.fillRect(x+13,y-7,3,2);}
      if(o.type==="campfire"){ctx.fillStyle="#51422b";ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#9d7444";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-12,y+8);ctx.lineTo(x+12,y-7);ctx.moveTo(x-12,y-7);ctx.lineTo(x+12,y+8);ctx.stroke();ctx.fillStyle="#ffad4f";ctx.beginPath();ctx.moveTo(x,y-23);ctx.quadraticCurveTo(x+17,y-3,x,y+5);ctx.quadraticCurveTo(x-16,y-3,x,y-23);ctx.fill();ctx.fillStyle="#ffe48a";ctx.beginPath();ctx.arc(x,y-5,5,0,Math.PI*2);ctx.fill();}
    }
    ctx.fillStyle="#0e1b13";ctx.beginPath();ctx.ellipse(player.x,player.y+17,13,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#d7c59c";ctx.beginPath();ctx.arc(player.x,player.y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#6e9d61";ctx.beginPath();ctx.arc(player.x,player.y+1,7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ead9b4";ctx.beginPath();ctx.arc(player.x,player.y-8,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#26382b";ctx.fillRect(player.x-5,player.y-11,10,3);
    ctx.restore();
    const night=isNight()?0.43:state.time>.62?0.18:0; if(night>0){ctx.fillStyle="rgba(7,15,30,"+night+")";ctx.fillRect(0,0,W,H);}
    if(state.fire){const fire=state.objects.find(o=>o.type==="campfire");if(fire&&distance(player,fire)<100){ctx.fillStyle="rgba(255,174,75,.06)";ctx.fillRect(0,0,W,H);}}
  }
  function frame(t){const dt=Math.min(.04,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(frame);}
  updateHud();if(!state.player||!state.objects)state=defaults();requestAnimationFrame(frame);
  document.addEventListener("visibilitychange",()=>{if(document.hidden){Object.keys(input).forEach(k=>input[k]=false);save();}});
  window.addEventListener("beforeunload",save);
  notify("Welcome to WILDEARTH. Explore, gather, survive.");
})();