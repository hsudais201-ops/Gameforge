import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js";
(() => {
"use strict";
const $=id=>document.getElementById(id),canvas=$("world3d");
let renderer,scene,camera,player,clock,paused=false,toastTimer=0,saveTimer=0,walkTime=0,cameraYaw=0,cameraPitch=.42,dragging=false,lastPointer=null,sunLight;
const keys={up:false,down:false,left:false,right:false};
const world={size:500,objects:[],bag:{wood:0,stone:0,berries:0},hp:100,hunger:100,thirst:100,day:1,time:.3,fire:false};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const terrainHeight=(x,z)=>Math.sin(x*.022)*1.8+Math.cos(z*.019)*1.5+Math.sin((x+z)*.012)*1.2;
function mat(color,rough=.9){return new THREE.MeshStandardMaterial({color,roughness:rough});}
const materials={grass:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),darkGrass:mat(0x365b34),bark:mat(0x65452d),leaf:mat(0x285b37),leaf2:mat(0x397348),stone:mat(0x737e73),rock:mat(0x929b8b),water:new THREE.MeshStandardMaterial({color:0x3d8e9a,roughness:.25,metalness:.15,transparent:true,opacity:.82}),skin:mat(0xd8b58b),cloth:mat(0x78915a),wolf:mat(0x626d65)};
function show(message){const t=$("toast");t.textContent=message;t.classList.add("show");toastTimer=2.2;}
function makeTree(x,z){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28,.48,4.8,8),materials.bark);trunk.position.y=2.4;g.add(trunk);const branchMat=materials.bark;for(let j=0;j<3;j++){const branch=new THREE.Mesh(new THREE.CylinderGeometry(.09,.16,1.7,6),branchMat);branch.position.set(j%2?.45:-.4,2.7+j*.45,.1);branch.rotation.z=j%2?-.75:.75;g.add(branch);}for(let i=0;i<4;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry(2.7-i*.42,4.1,8),i%2?materials.leaf2:materials.leaf);crown.position.y=4.1+i*1.35;crown.rotation.y=i*.73;g.add(crown);}g.position.set(x,terrainHeight(x,z),z);scene.add(g);world.objects.push({kind:"tree",x,z,mesh:g,alive:true});}
function makeRock(x,z){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1.35,0),materials.rock);m.position.set(x,terrainHeight(x,z)+.8,z);m.scale.set(1.3,.8,1);m.rotation.set(.2,Math.random()*3,.3);scene.add(m);world.objects.push({kind:"rock",x,z,mesh:m,alive:true});}
function makeBerry(x,z){const g=new THREE.Group();const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.75,1),materials.leaf2);shrub.position.y=.6;g.add(shrub);for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),mat(0x8b4e86));b.position.set(Math.cos(i*1.25)*.45,.8+Math.sin(i*1.25)*.25,Math.sin(i*1.25)*.45);g.add(b);}g.position.set(x,terrainHeight(x,z),z);scene.add(g);world.objects.push({kind:"berry",x,z,mesh:g,alive:true});}
function makePond(x,z){const m=new THREE.Mesh(new THREE.CircleGeometry(9+Math.random()*5,32),materials.water);m.rotation.x=-Math.PI/2;m.position.set(x,terrainHeight(x,z)+.12,z);m.scale.y=.7;scene.add(m);world.objects.push({kind:"pond",x,z,mesh:m,alive:true});}
function makeWolf(x,z){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,.9,.9),materials.wolf);body.position.y=1;g.add(body);const head=new THREE.Mesh(new THREE.BoxGeometry(.75,.7,.72),materials.wolf);head.position.set(1.05,1.25,0);g.add(head);for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.75,6),materials.wolf);leg.position.set(side*.65,.42,side*.25);g.add(leg);}g.position.set(x,terrainHeight(x,z),z);scene.add(g);world.objects.push({kind:"wolf",x,z,mesh:g,alive:true,angle:Math.random()*6.28});}
function buildWorld(){
scene=new THREE.Scene();scene.background=new THREE.Color(0xa9c9ca);scene.fog=new THREE.Fog(0xa9c9ca,95,310);
camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,600);
renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"low-power"});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
scene.add(new THREE.HemisphereLight(0xd8edff,0x39452c,1.65));sunLight=new THREE.DirectionalLight(0xffe4b5,2.5);sunLight.position.set(-70,110,40);scene.add(sunLight);const fill=new THREE.DirectionalLight(0xc3d9ff,.45);fill.position.set(60,35,-80);scene.add(fill);
const geo=new THREE.PlaneGeometry(world.size,world.size,64,64);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;const colors=[];const cLow=new THREE.Color(0x526b3c),cHigh=new THREE.Color(0x849064),cPeak=new THREE.Color(0x9a9b80);for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=terrainHeight(x,z);pos.setY(i,h);const n=(Math.sin(x*.11+z*.07)+Math.cos(z*.13-x*.05))*.035;const c=cLow.clone().lerp(cHigh,clamp((h+3)/9+n,0,1));if(h>2)c.lerp(cPeak,clamp((h-2)/5,0,.55));colors.push(c.r,c.g,c.b);}geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const ground=new THREE.Mesh(geo,materials.grass);ground.receiveShadow=true;scene.add(ground);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),mat(0x263c2a));floor.rotation.x=-Math.PI/2;floor.position.y=-2;scene.add(floor);
for(let i=0;i<95;i++){const x=(Math.random()-.5)*world.size*.9,z=(Math.random()-.5)*world.size*.9;if(Math.hypot(x,z)<17)continue;makeTree(x,z);}
for(let i=0;i<34;i++){const x=(Math.random()-.5)*world.size*.85,z=(Math.random()-.5)*world.size*.85;if(Math.hypot(x,z)>18)makeRock(x,z);}
for(let i=0;i<24;i++){const x=(Math.random()-.5)*world.size*.8,z=(Math.random()-.5)*world.size*.8;if(Math.hypot(x,z)>16)makeBerry(x,z);}
for(let i=0;i<4;i++)makePond((Math.random()-.5)*280,(Math.random()-.5)*280);
for(let i=0;i<6;i++)makeWolf((Math.random()-.5)*150,(Math.random()-.5)*150);
// Detailed third-person wilderness explorer character
player=new THREE.Group();
player.userData.limbs=[];
const explorerMat={
 jacket:mat(0x465b3e), jacketLight:mat(0x64764c), jacketDark:mat(0x293a2d),
 shirt:mat(0xb9ad8e), pants:mat(0x343d3a), pantsLight:mat(0x4b5550),
 leather:mat(0x59402c), leatherLight:mat(0x8a6844), metal:mat(0x9a9b87,.48),
 skin:mat(0xc9926c), skinLight:mat(0xdca984), hair:mat(0x30251f),
 boot:mat(0x292a25), sole:mat(0x171b18), eye:mat(0x241b17),
};
const part=(geo,material,x,y,z,group=player)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
const capsule=(r,len,material,x,y,z,group=player)=>part(new THREE.CapsuleGeometry(r,len,4,8),material,x,y,z,group);
const box=(w,h,d,material,x,y,z,group=player)=>part(new THREE.BoxGeometry(w,h,d),material,x,y,z,group);
// Torso, layered field jacket and undershirt
capsule(.53,.88,explorerMat.jacket,0,1.43,0);
part(new THREE.BoxGeometry(.82,.72,.12),explorerMat.shirt,0,1.48,.49);
const jacketL=part(new THREE.BoxGeometry(.31,.91,.19),explorerMat.jacketLight,-.22,1.46,.48);jacketL.rotation.z=-.08;
const jacketR=part(new THREE.BoxGeometry(.31,.91,.19),explorerMat.jacketLight,.22,1.46,.48);jacketR.rotation.z=.08;
box(.11,.78,.08,explorerMat.jacketDark,0,1.47,.57);
for(let y=1.22;y<1.78;y+=.18)part(new THREE.SphereGeometry(.035,7,6),explorerMat.metal,.015,y,.625);
// Shoulder seams and padded shoulders
for(const side of [-1,1]){
 const pad=part(new THREE.SphereGeometry(.28,9,7),explorerMat.jacketDark,side*.57,1.76,0);pad.scale.set(1,.62,1);
 const seam=part(new THREE.BoxGeometry(.13,.56,.08),explorerMat.jacketLight,side*.58,1.46,.13);seam.rotation.z=side*.08;
}
// Neck and detailed head
capsule(.17,.19,explorerMat.skin,0,2.08,.02);
const face=part(new THREE.SphereGeometry(.34,16,14),explorerMat.skin,0,2.39,.09);face.scale.set(.88,1.12,.9);
const jaw=part(new THREE.SphereGeometry(.27,12,10),explorerMat.skinLight,0,2.22,.12);jaw.scale.set(.92,.62,.82);
for(const side of [-1,1]){
 const ear=part(new THREE.SphereGeometry(.085,8,7),explorerMat.skin,side*.32,2.39,.04);ear.scale.set(.65,1,.7);
 const eye=part(new THREE.SphereGeometry(.035,8,6),explorerMat.eye,side*.125,2.43,.385);eye.scale.set(1,.7,.5);
 const brow=box(.12,.035,.045,explorerMat.hair,side*.125,2.49,.38);brow.rotation.z=side*-.08;
}
const nose=part(new THREE.ConeGeometry(.065,.15,6),explorerMat.skinLight,0,2.34,.42);nose.rotation.x=Math.PI/2;
const hairCap=part(new THREE.SphereGeometry(.355,14,9,0,Math.PI*2,0,Math.PI*.57),explorerMat.hair,0,2.58,.02);hairCap.scale.set(1,.86,1);
const fringe=part(new THREE.SphereGeometry(.22,10,7),explorerMat.hair,0,2.55,.28);fringe.scale.set(1.2,.45,.7);
// Neck scarf and high collar
const scarf=part(new THREE.TorusGeometry(.205,.075,7,14),explorerMat.leatherLight,0,2.12,.02);scarf.rotation.x=Math.PI/2;
box(.12,.29,.1,explorerMat.leatherLight,.18,1.97,.2);
// Belt, buckle, field pouches and utility knife sheath
box(1.02,.13,.72,explorerMat.leather,0,1.02,0);
box(.17,.15,.055,explorerMat.metal,0,1.02,.385);
for(const side of [-1,1]){
 box(.22,.24,.2,explorerMat.leatherLight,side*.39,.91,.12);
 box(.15,.1,.035,explorerMat.leather,side*.39,.91,.23);
}
const sheath=box(.12,.48,.13,explorerMat.leather,-.55,.73,-.08);sheath.rotation.z=-.18;
// Backpack with rolled bedroll, seams and straps
box(.66,.84,.36,explorerMat.leather,0,1.48,-.53);
box(.58,.28,.4,explorerMat.leatherLight,0,1.93,-.54);
for(const side of [-1,1]){
 const strap=box(.105,.93,.075,explorerMat.leatherLight,side*.34,1.48,.19);strap.rotation.z=side*.16;
 box(.13,.18,.1,explorerMat.leather,side*.39,1.17,-.48);
}
const bedroll=part(new THREE.CylinderGeometry(.16,.16,.78,9),explorerMat.jacketLight,0,2.05,-.56);bedroll.rotation.z=Math.PI/2;
for(let x=-.24;x<=.24;x+=.48)box(.07,.25,.42,explorerMat.leatherLight,x,2.05,-.56);
// Articulated arms with sleeves, forearms and gloves
for(const side of [-1,1]){
 const arm=new THREE.Group();arm.position.set(side*.63,1.76,0);player.add(arm);
 const sleeve=part(new THREE.CylinderGeometry(.18,.22,.55,9),explorerMat.jacket,0,-.27,0,arm);sleeve.rotation.z=side*-.1;
 const cuff=part(new THREE.CylinderGeometry(.17,.18,.13,9),explorerMat.jacketDark,0,-.55,0,arm);
 const fore=part(new THREE.CylinderGeometry(.13,.16,.38,8),explorerMat.skinLight,0,-.78,.015,arm);fore.rotation.z=side*.04;
 const glove=part(new THREE.SphereGeometry(.145,9,7),explorerMat.leather,0,-1.01,.045,arm);glove.scale.set(.9,.75,1);
 const knuckle=part(new THREE.BoxGeometry(.17,.06,.12),explorerMat.leatherLight,0,-1.06,.12,arm);
 player.userData.limbs.push(arm);
}
// Two-piece trousers, knees, boots and visible soles
for(const side of [-1,1]){
 const leg=new THREE.Group();leg.position.set(side*.25,.96,0);player.add(leg);
 const thigh=part(new THREE.CylinderGeometry(.19,.17,.48,9),explorerMat.pants,0,-.25,0,leg);
 const knee=part(new THREE.SphereGeometry(.18,9,7),explorerMat.pantsLight,0,-.5,.025,leg);
 const shin=part(new THREE.CylinderGeometry(.14,.17,.42,9),explorerMat.pants,0,-.72,0,leg);
 const boot=part(new THREE.BoxGeometry(.32,.22,.48),explorerMat.boot,0,-.99,.1,leg);
 box(.33,.055,.49,explorerMat.sole,0,-1.105,.11,leg);
 box(.29,.07,.13,explorerMat.leatherLight,0,-.91,.3,leg);
 player.userData.limbs.push(leg);
}
// Small fabric details make the silhouette readable at game camera distance
const chestPatch=box(.18,.14,.035,explorerMat.jacketDark,-.3,1.62,.59);chestPatch.rotation.z=-.12;
box(.08,.08,.045,explorerMat.metal,-.3,1.62,.615);
const shoulderRoll=part(new THREE.CylinderGeometry(.08,.08,.5,7),explorerMat.leatherLight,.65,1.85,-.08);shoulderRoll.rotation.z=Math.PI/2;
player.position.set(0,terrainHeight(0,0),0);scene.add(player);
clock=new THREE.Clock();window.addEventListener("resize",resize);resize();
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function nearest(){let best=null,d=9;for(const o of world.objects){if(!o.alive||!["tree","rock","berry","pond"].includes(o.kind))continue;const n=Math.hypot(o.x-player.position.x,o.z-player.position.z);if(n<d){best=o;d=n;}}return best;}
function interact(){const o=nearest();if(!o){show("Move closer to a resource.");return;}if(o.kind==="tree"){world.bag.wood+=2;show("+2 wood");}else if(o.kind==="rock"){world.bag.stone+=2;show("+2 stone");}else if(o.kind==="berry"){world.bag.berries+=2;show("+2 berries");}else if(o.kind==="pond"){world.thirst=100;show("Fresh water · thirst restored");hud();return;}o.alive=false;scene.remove(o.mesh);hud();}
function eat(){if(!world.bag.berries){show("No berries. Find a berry bush.");return;}world.bag.berries--;world.hunger=Math.min(100,world.hunger+30);show("Wild berries eaten.");hud();}
function buildFire(){if(world.fire){show("Campfire already built.");return;}if(world.bag.wood<5||world.bag.stone<3){show("Need 5 wood and 3 stone.");return;}world.bag.wood-=5;world.bag.stone-=3;world.fire=true;const f=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.5,.35,8),mat(0x574b3b));base.position.y=.2;f.add(base);const flame=new THREE.Mesh(new THREE.ConeGeometry(.8,2.3,7),new THREE.MeshBasicMaterial({color:0xffa53c}));flame.position.y=1.35;f.add(flame);f.position.set(player.position.x+3,terrainHeight(player.position.x+3,player.position.z),player.position.z);scene.add(f);show("Campfire crafted!");hud();}
function hud(){for(const [k,v] of [["hp",world.hp],["food",world.hunger],["water",world.thirst]]){$(k+"text").textContent=Math.round(v);$(k+"bar").style.width=v+"%";}$("wood").textContent=world.bag.wood;$("stone").textContent=world.bag.stone;$("berries").textContent=world.bag.berries;$("day").textContent="DAY "+world.day+" · "+(world.time<.5?"MORNING":"EVENING");$("mission").textContent=world.fire?"Explore the wilds · your campfire is built":"Gather 5 wood and 3 stone to build a campfire";}
function move(dt){const x=(keys.right?1:0)-(keys.left?1:0),z=(keys.down?1:0)-(keys.up?1:0);if(!x&&!z)return;const v=new THREE.Vector3(x,0,z).normalize();const speed=dt*12;walkTime+=dt*9;player.position.x=clamp(player.position.x+v.x*speed,-world.size/2+5,world.size/2-5);player.position.z=clamp(player.position.z+v.z*speed,-world.size/2+5,world.size/2-5);player.position.y=terrainHeight(player.position.x,player.position.z);player.rotation.y=Math.atan2(v.x,v.z);player.userData.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(walkTime+(i%2)*Math.PI)*.48);}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(!paused){move(dt);world.time+=dt/260;if(world.time>=1){world.time=0;world.day++;}world.hunger=Math.max(0,world.hunger-dt*.08);world.thirst=Math.max(0,world.thirst-dt*.12);if(world.hunger===0||world.thirst===0)world.hp=Math.max(0,world.hp-dt*.5);
for(const o of world.objects){if(o.kind==="wolf"&&o.alive){const dx=player.position.x-o.x,dz=player.position.z-o.z,d=Math.hypot(dx,dz);if(d<25){o.x+=dx/(d||1)*dt*2.2;o.z+=dz/(d||1)*dt*2.2;o.mesh.position.set(o.x,terrainHeight(o.x,o.z),o.z);if(d<2.2)world.hp=Math.max(0,world.hp-dt*8);}else{o.angle+=Math.sin(performance.now()*.0003+o.x)*dt*.2;o.x+=Math.sin(o.angle)*dt*.6;o.z+=Math.cos(o.angle)*dt*.6;o.mesh.position.set(o.x,terrainHeight(o.x,o.z),o.z);}}}
const dist=18,offset=new THREE.Vector3(Math.sin(cameraYaw)*Math.cos(cameraPitch)*dist,Math.sin(cameraPitch)*dist+4,Math.cos(cameraYaw)*Math.cos(cameraPitch)*dist);camera.position.lerp(new THREE.Vector3(player.position.x+offset.x,player.position.y+offset.y,player.position.z+offset.z),1-Math.pow(.001,dt));camera.lookAt(player.position.x,player.position.y+1.25,player.position.z);const daylight=clamp((Math.sin(world.time*Math.PI*2)+.15)*.7+.45,.12,1);sunLight.intensity=.35+daylight*2.1;sunLight.position.set(Math.cos(world.time*Math.PI*2)*100,Math.max(12,Math.sin(world.time*Math.PI*2)*110),40);const night=daylight<.28;const sky=night?new THREE.Color(0x172638):new THREE.Color(0xa9c9ca).lerp(new THREE.Color(0xe7b98d),1-daylight);scene.fog.color.copy(sky);scene.background.copy(sky);hud();if(world.hp<=0){paused=true;show("You were lost in the wild. Reload to start again.");}}
if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$("toast").classList.remove("show");}renderer.render(scene,camera);}
function key(e,on){const k=e.key.toLowerCase(),map={w:"up",arrowup:"up",s:"down",arrowdown:"down",a:"left",arrowleft:"left",d:"right",arrowright:"right"};if(map[k]){keys[map[k]]=on;e.preventDefault();}if(on){if(k==="e")interact();if(k==="q")eat();if(k==="f")buildFire();if(k==="r"){world.thirst=100;show("Thirst restored.");}}}
window.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")cameraYaw+=.08;if(e.key==="ArrowRight")cameraYaw-=.08;key(e,true);});window.addEventListener("keyup",e=>key(e,false));canvas.addEventListener("pointerdown",e=>{dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener("pointermove",e=>{if(!dragging||!lastPointer)return;const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;cameraYaw-=dx*.006;cameraPitch=clamp(cameraPitch+dy*.004,.12,.85);lastPointer={x:e.clientX,y:e.clientY};});canvas.addEventListener("pointerup",()=>{dragging=false;lastPointer=null;});canvas.addEventListener("pointercancel",()=>{dragging=false;lastPointer=null;});window.addEventListener("blur",()=>Object.keys(keys).forEach(k=>keys[k]=false));
document.querySelectorAll("[data-move]").forEach(b=>{const k=b.dataset.move;b.addEventListener("pointerdown",e=>{e.preventDefault();keys[k]=true;});["pointerup","pointerleave","pointercancel"].forEach(t=>b.addEventListener(t,()=>keys[k]=false));});
document.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click",()=>({gather:interact,eat,build:buildFire}[b.dataset.act])()));
$("pause").onclick=()=>{$("pause-screen").classList.remove("hidden");paused=true;};$("resume").onclick=()=>{$("pause-screen").classList.add("hidden");paused=false;};
try{buildWorld();$("loading").classList.add("hidden");hud();show("Welcome to WILDEARTH. Explore your 3D world.");animate();}catch(err){console.error(err);$("loading").classList.add("hidden");$("error").classList.remove("hidden");}
})();