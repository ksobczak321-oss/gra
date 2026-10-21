(() => {
  const host = document.querySelector('.world-art');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1600 900');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  Object.assign(svg.style, { position:'absolute', inset:'0', width:'100%', height:'100%', display:'block' });
  host.replaceChildren(svg);

  const el = (tag, attrs={}, parent=svg) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k, String(v)));
    parent.appendChild(n);
    return n;
  };
  const path = (d, attrs={}, p=svg) => el('path', {d, ...attrs}, p);
  const group = (attrs={}) => el('g', attrs);
  const use = (href,x,y,w,h,p=svg) => el('use',{href,x,y,width:w,height:h},p);

  const defs = el('defs');
  defs.innerHTML = `
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2dcced"/><stop offset=".52" stop-color="#16a2d1"/><stop offset="1" stop-color="#087caf"/></linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#a5e962"/><stop offset=".55" stop-color="#72cd49"/><stop offset="1" stop-color="#4ca03a"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#082d3e" flood-opacity=".36"/></filter>
    <symbol id="tree" viewBox="-20 -40 40 70"><rect x="-4" y="6" width="8" height="24" rx="3" fill="#704326"/><path d="M0-38L-18-10h8L-20 4h40L10-10h8z" fill="#1f7440" stroke="#13572f" stroke-width="2"/><path d="M0-30L-14-8h28z" fill="#319653"/></symbol>
    <symbol id="rock" viewBox="-20 -15 40 30"><path d="M-18 10L-12-7L2-14L16-5L19 10Z" fill="#8f9da0" stroke="#607174" stroke-width="3"/><path d="M-10-3L1-10L9-4L3 5Z" fill="#c0c8c9" opacity=".7"/></symbol>
    <symbol id="flower" viewBox="-8 -8 16 16"><circle r="3" fill="#ffd24c"/><circle cy="-5" r="3" fill="#fff"/><circle cx="5" r="3" fill="#ff83ad"/><circle cy="5" r="3" fill="#fff"/><circle cx="-5" r="3" fill="#ff83ad"/></symbol>
    <symbol id="lamp" viewBox="-10 -35 20 45"><rect x="-2" y="-12" width="4" height="22" fill="#54351f"/><rect x="-6" y="-26" width="12" height="14" rx="3" fill="#303030"/><circle cy="-19" r="5" fill="#ffda4b"/><circle cy="-19" r="9" fill="#ffda4b" opacity=".24"/></symbol>`;

  el('rect',{width:1600,height:900,fill:'url(#sea)'});
  for(let y=80;y<900;y+=100){ let d=`M-60 ${y}`; for(let x=-60;x<1700;x+=100)d+=` q25 -12 50 0 q25 12 50 0`; path(d,{fill:'none',stroke:'#c5f7ff','stroke-width':3,opacity:.18}); }

  path('M130 620C80 470 165 285 330 205C470 135 640 160 770 205C900 145 1090 165 1250 265C1390 350 1470 515 1405 650C1340 785 1160 815 980 780C830 855 625 835 470 770C300 785 170 730 130 620Z',{fill:'#76533d',opacity:.88,filter:'url(#shadow)'});
  path('M160 580C120 455 195 315 345 240C475 175 625 195 760 235C900 180 1065 200 1205 285C1330 360 1400 495 1345 610C1290 725 1140 755 970 725C825 795 650 775 500 720C345 735 210 690 160 580Z',{fill:'url(#grass)',stroke:'#e5bd72','stroke-width':18});

  path('M675 300C735 265 820 265 875 305C915 337 905 395 855 420C800 450 720 445 670 405C630 370 630 325 675 300Z',{fill:'#2dbadf',stroke:'#d7f8ff','stroke-width':7});
  path('M760 412C780 475 750 520 700 565C665 598 650 640 665 705',{fill:'none',stroke:'#35bfe3','stroke-width':42,'stroke-linecap':'round'});
  path('M760 414C780 475 750 520 700 565C665 598 650 640 665 705',{fill:'none',stroke:'#c3f7ff','stroke-width':6,'stroke-linecap':'round',opacity:.7});

  ['M255 585C390 520 480 500 585 510C690 520 790 545 910 520C1010 500 1110 460 1250 480','M470 510C500 420 575 365 660 330','M905 520C930 430 985 365 1085 315','M760 550C810 615 915 650 1080 640'].forEach(d=>{path(d,{fill:'none',stroke:'#d4ad70','stroke-width':34,'stroke-linecap':'round'});path(d,{fill:'none',stroke:'#f2e0b5','stroke-width':16,'stroke-linecap':'round'});});

  const rng = (()=>{let s=928371; return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296)})();
  const trees=[];
  [[350,310,155,85,55],[1130,350,145,90,42],[380,655,130,65,32],[1210,650,100,55,25],[560,255,85,45,18]].forEach(([cx,cy,rx,ry,n])=>{for(let i=0;i<n;i++){const a=rng()*Math.PI*2,r=Math.sqrt(rng()),x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r,s=28+rng()*18;trees.push([x,y,s]);}});
  trees.sort((a,b)=>a[1]-b[1]).forEach(([x,y,s])=>use('#tree',x-s/2,y-s,s,s*1.75));
  for(let i=0;i<45;i++){const x=180+rng()*1200,y=240+rng()*480;if(x>610&&x<920&&y>250&&y<455)continue;const s=18+rng()*16;use('#rock',x-s/2,y-s/2,s,s*.75);}

  const fence=(x1,y1,x2,y2)=>{el('line',{x1,y1,x2,y2,stroke:'#76472a','stroke-width':8});for(let i=0;i<7;i++){const t=i/6,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;el('line',{x1:x,y1:y-10,x2:x,y2:y+10,stroke:'#603820','stroke-width':6});}};
  fence(220,390,410,390);fence(220,520,410,520);fence(1120,505,1325,505);fence(1120,650,1325,650);

  const farm=group({filter:'url(#shadow)'}); el('rect',{x:235,y:405,width:160,height:100,rx:15,fill:'#9b6e2f',stroke:'#6c4a23','stroke-width':5},farm); for(const y of [425,445,465,485])el('line',{x1:250,y1:y,x2:380,y2:y,stroke:'#dfc25c','stroke-width':7},farm);

  const house=(x,y,w=105,h=75,roof='#df5337',wall='#f0d7a4')=>{const g=group({transform:`translate(${x} ${y})`,filter:'url(#shadow)'});el('rect',{x:0,y:24,width:w,height:h,rx:8,fill:wall,stroke:'#795035','stroke-width':5},g);el('polygon',{points:`-8,28 ${w/2},-14 ${w+8},28`,fill:roof,stroke:'#823a2c','stroke-width':5},g);el('rect',{x:w*.42,y:24+h-34,width:w*.18,height:34,fill:'#815236'},g);el('rect',{x:w*.12,y:42,width:22,height:20,fill:'#7fcbe1',stroke:'#725036','stroke-width':4},g);el('rect',{x:w*.68,y:42,width:22,height:20,fill:'#7fcbe1',stroke:'#725036','stroke-width':4},g);};
  house(480,505,105,72,'#36527e','#d8bc8f');house(720,480,112,78);house(1185,520,118,80,'#e8a83c');

  const saw=group({filter:'url(#shadow)'});el('circle',{cx:620,cy:585,r:30,fill:'#c7d0d1',stroke:'#657277','stroke-width':6},saw);el('circle',{cx:620,cy:585,r:8,fill:'#6e7476'},saw);el('rect',{x:430,y:610,width:150,height:16,rx:8,fill:'#8b552f'},saw);[446,478,510].forEach(x=>el('circle',{cx:x,cy:618,r:8,fill:'#c18148'},saw));

  const barn=group({transform:'translate(1050 550)',filter:'url(#shadow)'});el('rect',{x:0,y:25,width:135,height:85,rx:8,fill:'#b65339',stroke:'#7a392a','stroke-width':5},barn);el('polygon',{points:'-8,30 67,-18 143,30',fill:'#6e3a2d',stroke:'#6b3328','stroke-width':5},barn);el('rect',{x:48,y:55,width:42,height:55,fill:'#70412e'},barn);path('M48 82h42M69 55v55',{stroke:'#c88a5b','stroke-width':4},barn);

  const lh=group({transform:'translate(915 345)',filter:'url(#shadow)'});path('M32 145L48 20H92L108 145Z',{fill:'#f7f3de',stroke:'#755f51','stroke-width':5},lh);el('rect',{x:43,y:60,width:54,height:25,fill:'#e44f3e'},lh);el('rect',{x:38,y:112,width:64,height:24,fill:'#e44f3e'},lh);el('rect',{x:44,y:6,width:52,height:28,rx:8,fill:'#7fc8df',stroke:'#755f51','stroke-width':5},lh);el('polygon',{points:'38,8 70,-20 102,8',fill:'#d74735',stroke:'#7a342a','stroke-width':5},lh);el('circle',{cx:70,cy:20,r:7,fill:'#ffd75e'},lh);

  const mine=group({filter:'url(#shadow)'});path('M1210 250L1285 130L1360 250Z',{fill:'#96563b',stroke:'#6a402f','stroke-width':6},mine);path('M1265 166Q1285 145 1305 166L1295 205H1275Z',{fill:'#4d2a24'},mine);path('M1250 220Q1285 195 1320 220',{fill:'none',stroke:'#f26b2d','stroke-width':8},mine);el('rect',{x:1230,y:285,width:120,height:75,rx:14,fill:'#62564d',stroke:'#453a34','stroke-width':6},mine);path('M1260 360V315Q1290 280 1320 315V360',{fill:'#252626',stroke:'#7b6a59','stroke-width':6},mine);

  const dock=group({filter:'url(#shadow)'});el('rect',{x:720,y:705,width:315,height:38,rx:8,fill:'#9b5e32',stroke:'#6e3d24','stroke-width':6},dock);el('rect',{x:825,y:735,width:45,height:95,fill:'#9b5e32',stroke:'#6e3d24','stroke-width':6},dock);el('rect',{x:900,y:735,width:45,height:80,fill:'#9b5e32',stroke:'#6e3d24','stroke-width':6},dock);path('M770 790q55 35 110 0l-12 55h-86Z',{fill:'#f5f3e4',stroke:'#5f5b56','stroke-width':5},dock);path('M825 790v-70l48 45h-48Z',{fill:'#f55f45'},dock);

  for(let i=0;i<110;i++){const x=180+rng()*1200,y=250+rng()*460;if(rng()<.62&&x>620&&x<920&&y>260&&y<450)continue;const s=10+rng()*7;use('#flower',x-s/2,y-s/2,s,s);}
  [[540,520],[650,530],[760,555],[880,530],[1020,500],[1110,465],[795,680],[945,660]].forEach(([x,y])=>use('#lamp',x-10,y-35,20,45));

  [[510,545,'#f7c04a'],[610,505,'#f06c4f'],[740,520,'#54a8e8'],[850,565,'#8b5ad6'],[1000,505,'#e55c74'],[1210,570,'#f2a443']].forEach(([x,y,c])=>{const g=group({transform:`translate(${x} ${y})`});el('circle',{cx:0,cy:-12,r:7,fill:'#f0bd8d'},g);el('rect',{x:-6,y:-5,width:12,height:17,rx:4,fill:c},g);el('line',{x1:-4,y1:12,x2:-7,y2:23,stroke:'#3b4b5c','stroke-width':4},g);el('line',{x1:4,y1:12,x2:7,y2:23,stroke:'#3b4b5c','stroke-width':4},g);});
  [[1250,600],[1285,615],[1160,620]].forEach(([x,y])=>{const g=group({transform:`translate(${x} ${y})`});el('ellipse',{rx:18,ry:11,fill:'#f6f3e7',stroke:'#7c766d','stroke-width':3},g);el('circle',{cx:17,cy:-2,r:7,fill:'#6b625b'},g);});

  const birds=group({fill:'none',stroke:'#fff','stroke-width':5,'stroke-linecap':'round',opacity:.9});['M300 150q12-12 24 0q12-12 24 0','M1040 150q10-10 20 0q10-10 20 0','M850 790q14-14 28 0q14-14 28 0'].forEach(d=>path(d,{},birds));
})();