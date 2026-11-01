const COLORS=['#2f7bff','#ffb52e','#ff5a6e','#2ecc4f','#b55cff','#22d3ee','#ff8a3d','#e84fb4'];
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let level=1,n=4,dots=[],sol=[],paths=[],owner=[],active=-1,won=false,hintC=-1,S=0;
try{level=parseInt(localStorage.getItem('mcf_level'))||1}catch(e){}

const rnd=a=>Math.floor(Math.random()*a);
const nbrs=(i)=>{const r=Math.floor(i/n),c=i%n,o=[];if(r>0)o.push(i-n);if(r<n-1)o.push(i+n);if(c>0)o.push(i-1);if(c<n-1)o.push(i+1);return o};

function genLevel(L){
  n=Math.min(4+Math.floor((L-1)/3),8);
  const k=Math.min(8,n-1+((L-1)%3)),N=n*n;
  // caminho em cobra + movimentos "backbite" para embaralhar
  let p=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)p.push(r*n+(r%2?n-1-c:c));
  for(let t=0;t<N*60;t++){
    if(Math.random()<.5)p.reverse();
    const head=p[N-1],list=nbrs(head),nb=list[rnd(list.length)],idx=p.indexOf(nb);
    if(idx===N-2)continue;
    p=p.slice(0,idx+1).concat(p.slice(idx+1).reverse());
  }
  // divide em k trechos com no mínimo 2 células
  const len=Array(k).fill(2);let rest=N-2*k;while(rest-->0)len[rnd(k)]++;
  sol=[];dots=[];let pos=0;
  len.forEach(l=>{const seg=p.slice(pos,pos+l);pos+=l;sol.push(seg);dots.push([seg[0],seg[l-1]])});
}

function rebuildOwner(){owner=Array(n*n).fill(-1);paths.forEach((p,i)=>p.forEach(c=>owner[c]=i))}
function isDot(c){for(let i=0;i<dots.length;i++)if(dots[i][0]===c||dots[i][1]===c)return i;return -1}
function complete(i){const p=paths[i];return p.length>1&&p[p.length-1]===(dots[i][0]===p[0]?dots[i][1]:dots[i][0])}

function start(){
  genLevel(level);
  paths=dots.map(()=>[]);rebuildOwner();won=false;active=-1;hintC=-1;
  document.getElementById('lvl').textContent=String(level).padStart(2,'0');
  document.getElementById('win').classList.remove('show');
  resize();
}
function restart(){paths=dots.map(()=>[]);rebuildOwner();active=-1;won=false;hintC=-1;draw()}

let gridCache=null,dotSprites=[],cacheKey='',raf=0,lastPct=-1,lastT=-1,hintTimer=0;

function buildCaches(){
  const cs=S/n,ch=cs*.14;
  // grade estática (desenhada uma vez, depois só copiada)
  gridCache=document.createElement('canvas');gridCache.width=gridCache.height=S;
  const g=gridCache.getContext('2d');
  g.fillStyle='rgba(0,229,255,.05)';g.strokeStyle='rgba(0,229,255,.28)';g.lineWidth=Math.max(1,cs*.02);
  for(let i=0;i<n*n;i++){
    const x=(i%n)*cs+cs*.05,y=Math.floor(i/n)*cs+cs*.05,w=cs*.9;
    g.beginPath();g.moveTo(x+ch,y);g.lineTo(x+w,y);g.lineTo(x+w,y+w-ch);g.lineTo(x+w-ch,y+w);g.lineTo(x,y+w);g.lineTo(x,y+ch);g.closePath();
    g.fill();g.stroke();
  }
  // sprites dos pontos (brilho por gradiente, sem shadowBlur)
  const sz=Math.ceil(cs*1.4),h=sz/2;
  dotSprites=COLORS.map(col=>{
    const o=document.createElement('canvas');o.width=o.height=sz;const d=o.getContext('2d');
    const gr=d.createRadialGradient(h,h,cs*.2,h,h,cs*.68);
    gr.addColorStop(0,col+'aa');gr.addColorStop(1,col+'00');
    d.fillStyle=gr;d.beginPath();d.arc(h,h,cs*.68,0,7);d.fill();
    d.beginPath();d.arc(h,h,cs*.27,0,7);d.fillStyle=col;d.fill();
    d.beginPath();d.arc(h,h,cs*.33,0,7);d.strokeStyle=col;d.lineWidth=cs*.04;d.stroke();
    d.beginPath();d.arc(h,h,cs*.1,0,7);d.fillStyle='rgba(255,255,255,.85)';d.fill();
    return o;
  });
}

function resize(){
  const dpr=Math.min(window.devicePixelRatio||1,2),w=cv.clientWidth;if(!w)return;
  const size=Math.round(w*dpr),key=size+'x'+n;
  if(key!==cacheKey||cv.width!==size){
    cv.width=cv.height=size;S=size;cacheKey=key;buildCaches();
  }
  draw();
}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,150));
if(window.ResizeObserver)new ResizeObserver(resize).observe(document.getElementById('board'));

// agrupa vários eventos em um único desenho por quadro
function render(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;draw()})}

function draw(){
  if(!S||!gridCache)return;
  const cs=S/n;ctx.clearRect(0,0,S,S);
  ctx.drawImage(gridCache,0,0);
  const ctr=c=>[(c%n+.5)*cs,(Math.floor(c/n)+.5)*cs];
  const line=p=>{ctx.beginPath();p.forEach((c,j)=>{const [x,y]=ctr(c);j?ctx.lineTo(x,y):ctx.moveTo(x,y)})};
  ctx.lineCap=ctx.lineJoin='round';
  paths.forEach((p,i)=>{
    if(p.length<1)return;
    line(p);ctx.strokeStyle=COLORS[i];
    ctx.globalAlpha=.14;ctx.lineWidth=cs*.62;ctx.stroke();
    ctx.globalAlpha=.3;ctx.lineWidth=cs*.4;ctx.stroke();
    ctx.globalAlpha=1;ctx.lineWidth=cs*.2;ctx.stroke();
    ctx.lineWidth=cs*.06;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.stroke();
  });
  ctx.globalAlpha=1;
  if(hintC>=0){
    line(sol[hintC]);ctx.setLineDash([cs*.12,cs*.14]);
    ctx.lineWidth=cs*.18;ctx.strokeStyle='rgba(255,255,255,.25)';ctx.stroke();
    ctx.lineWidth=cs*.1;ctx.strokeStyle='#fff';ctx.stroke();ctx.setLineDash([]);
  }
  dots.forEach((d,i)=>d.forEach(c=>{
    const [x,y]=ctr(c),sp=dotSprites[i],h=sp.width/2;
    ctx.drawImage(sp,x-h,y-h);
  }));
  const f=owner.filter(o=>o>=0).length,pc=Math.round(f/(n*n)*100);
  if(pc!==lastPct){lastPct=pc;document.getElementById('pct').textContent=pc+'%';document.getElementById('bar').style.width=pc+'%'}
}

function cellAt(e){
  const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*n,y=(e.clientY-r.top)/r.height*n;
  if(x<0||y<0||x>=n||y>=n)return -1;return Math.floor(y)*n+Math.floor(x);
}

function step(next){
  const i=active,p=paths[i];
  const last=p[p.length-1];
  if(next===last)return true;
  if(p.length>1&&next===p[p.length-2]){p.pop();return true}
  const own=p.indexOf(next);
  if(own>=0){p.length=own+1;return true}
  if(complete(i))return false;
  const dd=isDot(next);
  if(dd>=0&&dd!==i)return false;
  if(dd===i&&next===p[0])return false;
  const o=owner[next];
  if(o>=0&&o!==i){const q=paths[o],k=q.indexOf(next);q.length=k;if(q.length<2&&q.length===1&&false)q.length=0}
  p.push(next);return true;
}

cv.addEventListener('pointerdown',e=>{
  if(won)return;cv.setPointerCapture(e.pointerId);hintC=-1;
  const c=cellAt(e);if(c<0)return;
  const d=isDot(c);
  if(d>=0){paths[d]=[c];active=d}
  else if(owner[c]>=0){active=owner[c];paths[active].length=paths[active].indexOf(c)+1}
  lastT=-1;rebuildOwner();render();
});
cv.addEventListener('pointermove',e=>{
  if(active<0||won)return;
  const t=cellAt(e);if(t<0||t===lastT)return;lastT=t;
  let guard=n*2;
  while(guard-->0){
    const p=paths[active],last=p[p.length-1];if(last===t)break;
    const lr=Math.floor(last/n),lc=last%n,tr=Math.floor(t/n),tc=t%n;
    const dr=tr-lr,dc=tc-lc;let nx;
    if(Math.abs(dr)>=Math.abs(dc))nx=last+Math.sign(dr)*n;else nx=last+Math.sign(dc);
    if(!step(nx)){break}
    rebuildOwner();
  }
  render();
});
function end(){
  if(active<0)return;active=-1;
  // trecho sem ligação não fica: se só tem o ponto inicial, remove
  paths.forEach((p,i)=>{if(p.length<2&&!complete(i))paths[i]=[]});
  rebuildOwner();draw();check();
}
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('lostpointercapture',end);

function check(){
  if(!dots.every((_,i)=>complete(i)))return;
  if(owner.some(o=>o<0))return;
  won=true;
  try{localStorage.setItem('mcf_level',level+1)}catch(e){}
  setTimeout(()=>document.getElementById('win').classList.add('show'),350);
}

document.getElementById('rst').onclick=restart;
document.getElementById('hnt').onclick=()=>{
  const open=dots.map((_,i)=>i).filter(i=>!complete(i));
  if(!open.length||won)return;
  hintC=open[rnd(open.length)];render();
  clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hintC=-1;render()},1600);
};
document.getElementById('next').onclick=()=>{level++;start()};
start();
