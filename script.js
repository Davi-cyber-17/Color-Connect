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

function resize(){
  const dpr=Math.min(window.devicePixelRatio||1,3),w=cv.clientWidth;if(!w)return;
  cv.width=cv.height=Math.round(w*dpr);S=cv.width;draw();
}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,150));
if(window.ResizeObserver)new ResizeObserver(resize).observe(document.getElementById('board'));

function draw(){
  const cs=S/n,ch=cs*.14;ctx.clearRect(0,0,S,S);ctx.shadowBlur=0;ctx.globalAlpha=1;
  for(let i=0;i<n*n;i++){
    const x=(i%n)*cs+cs*.05,y=Math.floor(i/n)*cs+cs*.05,w=cs*.9;
    ctx.beginPath();ctx.moveTo(x+ch,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+w-ch);ctx.lineTo(x+w-ch,y+w);ctx.lineTo(x,y+w);ctx.lineTo(x,y+ch);ctx.closePath();
    ctx.fillStyle='rgba(0,229,255,.05)';ctx.fill();
    ctx.strokeStyle='rgba(0,229,255,.28)';ctx.lineWidth=Math.max(1,cs*.02);ctx.stroke();
  }
  const ctr=c=>[(c%n+.5)*cs,(Math.floor(c/n)+.5)*cs];
  const line=p=>{ctx.beginPath();p.forEach((c,j)=>{const [x,y]=ctr(c);j?ctx.lineTo(x,y):ctx.moveTo(x,y)})};
  paths.forEach((p,i)=>{
    if(p.length<1)return;
    line(p);ctx.lineCap=ctx.lineJoin='round';
    ctx.lineWidth=cs*.4;ctx.strokeStyle=COLORS[i];ctx.globalAlpha=.35;ctx.shadowColor=COLORS[i];ctx.shadowBlur=cs*.35;ctx.stroke();
    ctx.globalAlpha=1;ctx.lineWidth=cs*.2;ctx.shadowBlur=cs*.15;ctx.stroke();
    ctx.lineWidth=cs*.06;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.shadowBlur=0;ctx.stroke();
  });
  if(hintC>=0){
    line(sol[hintC]);ctx.setLineDash([cs*.12,cs*.14]);ctx.lineWidth=cs*.1;ctx.strokeStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=12;ctx.stroke();ctx.setLineDash([]);
  }
  dots.forEach((d,i)=>d.forEach(c=>{
    const [x,y]=ctr(c);ctx.shadowColor=COLORS[i];ctx.shadowBlur=cs*.3;
    ctx.beginPath();ctx.arc(x,y,cs*.27,0,7);ctx.fillStyle=COLORS[i];ctx.fill();
    ctx.shadowBlur=0;ctx.beginPath();ctx.arc(x,y,cs*.33,0,7);ctx.strokeStyle=COLORS[i];ctx.lineWidth=cs*.04;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,cs*.1,0,7);ctx.fillStyle='rgba(255,255,255,.85)';ctx.fill();
  }));
  ctx.shadowBlur=0;
  const f=owner.filter(o=>o>=0).length,pc=Math.round(f/(n*n)*100);
  document.getElementById('pct').textContent=pc+'%';document.getElementById('bar').style.width=pc+'%';
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
  rebuildOwner();draw();
});
cv.addEventListener('pointermove',e=>{
  if(active<0||won)return;
  const t=cellAt(e);if(t<0)return;
  let guard=n*2;
  while(guard-->0){
    const p=paths[active],last=p[p.length-1];if(last===t)break;
    const lr=Math.floor(last/n),lc=last%n,tr=Math.floor(t/n),tc=t%n;
    const dr=tr-lr,dc=tc-lc;let nx;
    if(Math.abs(dr)>=Math.abs(dc))nx=last+Math.sign(dr)*n;else nx=last+Math.sign(dc);
    if(!step(nx)){break}
    rebuildOwner();
  }
  rebuildOwner();draw();
});
function end(){
  if(active<0)return;active=-1;
  // trecho sem ligação não fica: se só tem o ponto inicial, remove
  paths.forEach((p,i)=>{if(p.length<2&&!complete(i))paths[i]=[]});
  rebuildOwner();draw();check();
}
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);

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
  hintC=open[rnd(open.length)];draw();
  setTimeout(()=>{hintC=-1;draw()},1600);
};
document.getElementById('next').onclick=()=>{level++;start()};
start();
