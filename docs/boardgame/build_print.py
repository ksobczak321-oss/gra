#!/usr/bin/env python3
"""Rebuild a standalone tabletop print kit. No network, account or game integration."""
from pathlib import Path
import json, math, hashlib, zipfile, html
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, A3, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.graphics.barcode.qrencoder import QRCode
from PIL import Image

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'druk'; OUT.mkdir(exist_ok=True)
DATA=json.loads((ROOT/'scenariusz.json').read_text())
ART=ROOT/'art/latarnia-okladka.png'
FONT=Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('HL',str(FONT/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('HL-Bold',str(FONT/'DejaVuSans-Bold.ttf')))
NAVY='#102f40'; TEAL='#245365'; GOLD='#c99d42'; PAPER='#f8f3e6'; PALE='#e7efeb'; MUTED='#607578'
COLORS=[r['color'] for r in DATA['roles']]
def color(c,x):c.setFillColor(colors.HexColor(x))
def stroke(c,x):c.setStrokeColor(colors.HexColor(x))
def text(c,x,y,s,size=10,bold=False,fill=NAVY,anchor='left'):
 color(c,fill);c.setFont('HL-Bold' if bold else 'HL',size/mm)
 getattr(c,{'left':'drawString','center':'drawCentredString','right':'drawRightString'}[anchor])(x,y,str(s))
def wrap(c,s,x,y,w,size=10,line=None,fill=NAVY,bold=False):
 line=line or size*1.35/mm;words=s.split();lines=[];row='';font='HL-Bold' if bold else 'HL'
 for word in words:
  candidate=(row+' '+word).strip()
  if row and pdfmetrics.stringWidth(candidate,font,size/mm)>w:lines.append(row);row=word
  else:row=candidate
 if row:lines.append(row)
 for row in lines:text(c,x,y,row,size,bold,fill);y-=line
 return y

def new(name,size=A4):
 c=canvas.Canvas(str(OUT/name),pagesize=size,pageCompression=1)
 c.setTitle('HARBORLIGHT — '+name.replace('.pdf',''))
 c.setAuthor('HARBORLIGHT · prototyp gry przy stole')
 c.scale(mm,mm);return c

def page(c,size=A4):c.showPage();c.scale(mm,mm)
def header(c,title,sub='Drukuj 100% / rzeczywisty rozmiar. Bez dopasowania do strony.',w=210,h=297):
 text(c,10,h-12,'HARBORLIGHT · OSTATNI REJS PRZED ŚWITEM',8,True)
 text(c,10,h-22,title,15,True);wrap(c,sub,10,h-29,w-20,8)
def footer(c,label,w=210):text(c,10,7,label,7,fill=MUTED)
def image(c,x,y,w,h):c.drawImage(str(ART),x,y,w,h,mask='auto',preserveAspectRatio=False)
def rounded(c,x,y,w,h,fill=PAPER,edge=GOLD,r=3):color(c,fill);stroke(c,edge);c.setLineWidth(.35);c.roundRect(x,y,w,h,r,fill=1,stroke=1)
def arrow(c,x1,y1,x2,y2,size=2,fill=GOLD):
 stroke(c,fill);color(c,fill);c.setLineWidth(.6);c.line(x1,y1,x2,y2);a=math.atan2(y2-y1,x2-x1);p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-size*math.cos(a-.5),y2-size*math.sin(a-.5));p.lineTo(x2-size*math.cos(a+.5),y2-size*math.sin(a+.5));p.close();c.drawPath(p,fill=1,stroke=0)
def beacon(c,x,y,size=10,fill=GOLD):
 color(c,fill);p=c.beginPath();p.moveTo(x-size*.25,y-size*.4);p.lineTo(x+size*.25,y-size*.4);p.lineTo(x+size*.13,y+size*.34);p.lineTo(x-size*.13,y+size*.34);p.close();c.drawPath(p,fill=1,stroke=0);c.rect(x-size*.2,y+size*.34,size*.4,size*.2,fill=1,stroke=0);p=c.beginPath();p.moveTo(x-size*.27,y+size*.54);p.lineTo(x,y+size*.76);p.lineTo(x+size*.27,y+size*.54);p.close();c.drawPath(p,fill=1,stroke=0)

def board(c):
 color(c,PAPER);c.rect(0,0,297,420,fill=1,stroke=0)
 text(c,148.5,402,'HARBORLIGHT',26,True,anchor='center');text(c,148.5,391,'OSTATNI REJS PRZED ŚWITEM',12,True,anchor='center')
 text(c,148.5,382,'2–6 osób · 8 rund · 45–60 minut · jedna wspólna historia',9,anchor='center')
 cx,cy=148.5,233
 c.saveState();p=c.beginPath();p.circle(cx,cy,86);c.clipPath(p,stroke=0,fill=0);image(c,cx-91,cy-91,182,182);c.restoreState()
 stroke(c,GOLD);c.setLineWidth(1);c.circle(cx,cy,87,stroke=1,fill=0)
 rounded(c,cx-31,cy-14,62,26,NAVY,GOLD,4);beacon(c,cx-21,cy-3,12)
 text(c,cx+7,cy+2,'LATARNIA',13,True,GOLD,anchor='center');text(c,cx+7,cy-6,'13 · wejście +3',9,fill=PAPER,anchor='center')
 coords=[]
 for i,name in enumerate(DATA['route'][:12]):
  a=math.radians(-90-30*i);x=cx+110*math.cos(a);y=cy+130*math.sin(a);coords.append((x,y))
 for i,(x,y) in enumerate(coords):
  nx,ny=coords[(i+1)%12];dx,dy=nx-x,ny-y;norm=math.hypot(dx,dy);arrow(c,x+dx/norm*23,y+dy/norm*15,nx-dx/norm*23,ny-dy/norm*15,2.3,TEAL)
 for i,(name,(x,y)) in enumerate(zip(DATA['route'][:12],coords)):
  rounded(c,x-22,y-12,44,24,PALE if name not in DATA['deck'] else '#f3e5bc',TEAL,4)
  text(c,x,y+3,('0 / 12' if i==0 else str(i))+' · '+name,8.7,True,anchor='center')
  text(c,x,y-6,'START / POWRÓT' if i==0 else ('pole szlaku' if i==11 else 'budynek'),6.8,anchor='center')
 arrow(c,cx,cy-116,cx,cy-21,2.5,GOLD)
 text(c,cx+3,cy-94,'po obwodzie',7);text(c,cx+3,cy-99,'Port 12 → Latarnia 13',7)
 text(c,148.5,82,'KARTA: 1 pole = 2 pkt · 2 pola = 1 pkt · zgodny budynek = +1 pkt',10,True,anchor='center')
 text(c,148.5,75,'Udana scena: +1 każdemu. W Latarni nie ma dalszych punktów marszu.',8.5,anchor='center')
 text(c,18,63,'SŁAWA WYPRAWY',9,True)
 for n in range(41):
  row=0 if n<=20 else 1;col=n if row==0 else n-21;x=18+13.1*col;y=51-13*row
  color(c,'#ffffff' if n%5 else '#e8cf8d');stroke(c,TEAL);c.circle(x,y,4.2,fill=1,stroke=1);text(c,x,y-1.1,n,7.8,n%5==0,anchor='center')
 text(c,18,22,'ZAŁOGA: ≥1 sukces w rundach 1–2   MECHANIZM: ≥2 w 3–6   KOD: ≥1 w 7–8',8.3,True)
 text(c,18,15,'Pełne światło: 3 części i ≥ połowa pionków w Latarni (w górę). 2 części + 1 pionek: częściowy finał.',7.8)

c=new('HARBORLIGHT-plansza-A3.pdf',A3);board(c);c.save()
c=new('HARBORLIGHT-plansza-A4-kafelki.pdf',A4)
# Four overlapping true-size tiles. Cut to the marked rectangle, overlap 10 mm.
for tile,(sx,sy) in enumerate([(0,205),(143.5,205),(0,0),(143.5,0)]):
 header(c,f'Plansza A3 · kafelek {tile+1}/4',f'Wytnij prostokąt. Ułóż 1–2 nad 3–4, nakładając wspólny obraz na 10 mm.')
 c.saveState();p=c.beginPath();p.rect(28,40,153.5,215);c.clipPath(p,fill=0,stroke=0);c.translate(28-sx,40-sy);board(c);c.restoreState()
 stroke(c,NAVY);c.setLineWidth(.25);c.rect(28,40,153.5,215,fill=0,stroke=1)
 text(c,28,30,'Kontrola: ten odcinek ma dokładnie 50 mm.',8);c.line(28,25,78,25);c.line(28,23,28,27);c.line(78,23,78,27)
 footer(c,f'Kafelek {tile+1}/4 · 100% · nie przycinaj przed sprawdzeniem skali')
 if tile<3:page(c)
c.save()

# Actual standards-size deck: nine cells per sheet, fronts/backs interleaved.
c=new('HARBORLIGHT-karty-24-dupleks-A4.pdf',A4)
deck=[(name,n+1) for name in DATA['deck'] for n in range(4)]
def draw_card(c,x,y,name,number,back=False):
 rounded(c,x,y,63,88,NAVY if back else PAPER,GOLD,3)
 if back:
  c.saveState();p=c.beginPath();p.roundRect(x+3,y+3,57,82,2);c.clipPath(p,fill=0,stroke=0);image(c,x+3,y+3,57,82);c.restoreState()
  rounded(c,x+5,y+36,53,19,NAVY,GOLD,2);text(c,x+31.5,y+47,'HARBORLIGHT',10,True,GOLD,anchor='center');text(c,x+31.5,y+40,'SZLAK',9,True,PAPER,anchor='center')
 else:
  rounded(c,x+3,y+59,57,26,TEAL,GOLD,2);beacon(c,x+31.5,y+68,14)
  text(c,x+31.5,y+52,name.upper(),12,True,anchor='center');text(c,x+31.5,y+45,f'Specjalność · karta {number}/4',7.5,anchor='center')
  rounded(c,x+5,y+27,53,13,'#e7efeb',TEAL,2);text(c,x+31.5,y+32,'1 POLE  →  2 PUNKTY',8.2,True,anchor='center')
  rounded(c,x+5,y+12,53,13,'#f3e5bc',GOLD,2);text(c,x+31.5,y+17,'2 POLA  →  1 PUNKT',8.2,True,anchor='center')
  text(c,x+31.5,y+5,'Koniec na tym budynku: +1 pkt',7.2,anchor='center')
for sheet in range(3):
 for back in [False,True]:
  for local in range(9):
   idx=sheet*9+local
   if idx>=24:continue
   col=local%3;row=local//3
   if back:col=2-col
   x=8.5+65*col;y=17+90*(2-row)
   draw_card(c,x,y,*deck[idx],back=back)
  text(c,8.5,290,f'Szlak · arkusz {sheet+1}/3 · {"REWERS (lustrzane kolumny)" if back else "AWERS"}',8,True)
  footer(c,'63 × 88 mm · dupleks: odwracanie po długiej krawędzi · najpierw próbny arkusz')
  if not(sheet==2 and back):page(c)
c.save()

c=new('HARBORLIGHT-pionki-i-zetony-A4.pdf',A4)
header(c,'Sześć pionków i znaczniki','Pionki: wytnij obrys, zagnij kreskowane linie, sklej dolne zakładki w podstawę namiotu.')
for i,r in enumerate(DATA['roles']):
 col=i%3;row=i//3;x=22+64*col;y=146-96*row
 color(c,'#ffffff');stroke(c,NAVY);c.rect(x,y,36,86,fill=1,stroke=1)
 color(c,'#e0e7e5');c.rect(x,y,36,12,fill=1,stroke=0);c.rect(x,y+74,36,12,fill=1,stroke=0)
 for sy in [12,43,74]:stroke(c,TEAL);c.setDash(1.8,1);c.line(x,y+sy,x+36,y+sy);c.setDash()
 for side in [0,1]:
  c.saveState()
  if side:c.translate(x+36,y+86);c.rotate(180);xx,yy=0,12
  else:xx,yy=x,y+12
  color(c,r['color']);c.rect(xx+1,yy+1,34,29,fill=1,stroke=0);beacon(c,xx+18,yy+12,15,PAPER)
  text(c,xx+18,yy+3,r['name'],8.4,True,PAPER,anchor='center');text(c,xx+18,yy+25,r['shape'],7,True,PAPER,anchor='center');c.restoreState()
 text(c,x+18,y+4,'KLEJ',7,anchor='center');text(c,x+18,y+79,'PODSTAWA',7,anchor='center')
footer(c,'Pionki 36 × 86 mm przed złożeniem · wydruk A4 100% · gramatura 200–250 g/m²')
page(c);header(c,'Żetony wyprawy','Podklej kartonem. Kolory mają również etykiety, aby nie polegać wyłącznie na barwie.')
for i,r in enumerate(DATA['roles']):
 x=22+i*32;color(c,r['color']);stroke(c,NAVY);c.circle(x,239,8,fill=1,stroke=1);text(c,x,237,str(i+1),10,True,PAPER,anchor='center');text(c,x,224,r['name'].split()[0],6.4,anchor='center')
for i,label in enumerate(['Załoga','Mechanizm','Kod']):
 x=17+i*63;rounded(c,x,182,54,26,PALE,TEAL);text(c,x+27,197,label.upper(),10,True,anchor='center');text(c,x+27,188,['≥1 / rundy 1–2','≥2 / rundy 3–6','≥1 / rundy 7–8'][i],8,anchor='center')
for i in range(6):
 x=23+i*32;rounded(c,x-11,145,22,22,'#f3e5bc',GOLD);text(c,x,158,'?',15,True,anchor='center');text(c,x,149,'podpowiedź',5.7,anchor='center')
for i in range(8):
 x=16+(i%4)*49;y=100-(i//4)*30;rounded(c,x,y,42,23,PALE,TEAL);text(c,x+21,y+14,f'RUNDA {i+1}',8,True,anchor='center');text(c,x+21,y+5,'SUKCES',7,anchor='center')
text(c,16,45,'Do scen: użyj również 5 papierowych pasków 15 × 60 mm.',9,True)
text(c,16,37,'Żywność / Zboże / Drewno / Deski można zapisać na zwykłej kartce.',8)
footer(c,'Sześć znaczników punktów + trzy części + sześć podpowiedzi + osiem sukcesów')
c.save()

# Real foldable tray/lid dielines in A4 landscape, glue tabs on the side walls.
c=new('HARBORLIGHT-pudelko-A4.pdf',landscape(A4))
def box(c,w,h,t,lid):
 pw,ph=297,210;x=(pw-w)/2;y=(ph-h)/2
 # Draw panels and trapezoid glue tabs. Central lid artwork stays inside creases.
 color(c,PAPER);c.rect(x-t,y-t,w+2*t,h+2*t,fill=1,stroke=0)
 if lid:
  c.saveState();p=c.beginPath();p.rect(x,y,w,h);c.clipPath(p,fill=0,stroke=0);image(c,x,y,w,h);c.restoreState()
  rounded(c,x+13,y+h-39,w-26,29,NAVY,GOLD,2);text(c,x+w/2,y+h-23,'HARBORLIGHT',24,True,GOLD,anchor='center');text(c,x+w/2,y+h-32,'OSTATNI REJS PRZED ŚWITEM',10,True,PAPER,anchor='center')
  rounded(c,x+13,y+10,w-26,19,NAVY,GOLD,2);text(c,x+w/2,y+22,'2–6 OSÓB · 45–60 MINUT · JEDNA TALIA + TELEFON',8.5,True,PAPER,anchor='center');text(c,x+w/2,y+15,'Prototyp do samodzielnego wydruku · bez integracji online',7,fill=PAPER,anchor='center')
 else:
  text(c,x+w/2,y+h/2+8,'DNO PUDEŁKA',16,True,anchor='center');text(c,x+w/2,y+h/2-1,'Planszę A3 złóż na cztery do 148,5 × 210 mm.',9,anchor='center');text(c,x+w/2,y+h/2-9,'Włóż talię, instrukcję, złożone pionki i żetony.',8.5,anchor='center')
 # Cut boundary: bottom/top wall rectangles, outer side walls, and separate tabs.
 stroke(c,NAVY);c.setLineWidth(.35)
 c.line(x,y-t,x+w,y-t);c.line(x,y-t,x,y);c.line(x+w,y-t,x+w,y)
 c.line(x,y+h+t,x+w,y+h+t);c.line(x,y+h,x,y+h+t);c.line(x+w,y+h,x+w,y+h+t)
 c.line(x-t,y,x-t,y+h);c.line(x+w+t,y,x+w+t,y+h)
 for right in [False,True]:
  xx=x+w if right else x-t
  for top in [False,True]:
   yy=y+h if top else y-t
   # Tab connected along side-wall edge at y=0/h; cut three outer sides.
   points=[(xx,yy+t),(xx,yy+t*.18),(xx+t*.18,yy),(xx+t*.82,yy),(xx+t,yy+t*.18),(xx+t,yy+t)] if not top else [(xx,yy),(xx,yy+t*.82),(xx+t*.18,yy+t),(xx+t*.82,yy+t),(xx+t,yy+t*.82),(xx+t,yy)]
   color(c,'#e0e7e5');p=c.beginPath();p.moveTo(*points[0]);
   for pt in points[1:]:p.lineTo(*pt)
   p.close();c.drawPath(p,fill=1,stroke=0);p=c.beginPath();p.moveTo(*points[0]);[p.lineTo(*pt) for pt in points[1:]];c.drawPath(p,fill=0,stroke=1);text(c,xx+t/2,yy+t/2-1,'KLEJ',5.5,anchor='center')
 # Fold lines separate all five panels and attached tabs, never cut across hinges.
 stroke(c,TEAL);c.setDash(1.6,1);c.setLineWidth(.3)
 for a,b in [((x,y),(x+w,y)),((x,y+h),(x+w,y+h)),((x,y),(x,y+h)),((x+w,y),(x+w,y+h)),((x-t,y),(x,y)),((x-t,y+h),(x,y+h)),((x+w,y),(x+w+t,y)),((x+w,y+h),(x+w+t,y+h))]:c.line(*a,*b)
 c.setDash();text(c,148.5,205,('WIECZKO 218 × 158 × 20 mm' if lid else 'DNO 216 × 156 × 18 mm')+' · 100%',7,True,anchor='center');text(c,148.5,2.7,'Linia ciągła: cięcie. Kreskowana: zgięcie. Szare zakładki klej od środka; najpierw próbny wydruk.',6,anchor='center')
box(c,216,156,18,False);page(c,landscape(A4));box(c,218,158,20,True);c.save()

# Genuine QR code, four quiet-zone modules on every edge.
qr=QRCode(None,1);qr.addData(DATA['qrUrl']);qr.make();mat=qr.modules;quiet=4;scale=12;n=len(mat)
qrimage=Image.new('RGB',((n+2*quiet)*scale,)*2,'white');pix=qrimage.load()
for row in range(n):
 for col in range(n):
  if mat[row][col]:
   for dx in range(scale):
    for dy in range(scale):pix[(col+quiet)*scale+dx,(row+quiet)*scale+dy]=(0,0,0)
qrimage.save(OUT/'HARBORLIGHT-QR-instrukcja.png')
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s"><rect width="100%%" height="100%%" fill="white"/>'%((n+8),(n+8))]
for row in range(n):
 for col in range(n):
  if mat[row][col]:svg.append(f'<rect x="{col+4}" y="{row+4}" width="1" height="1"/>')
svg.append('</svg>');(OUT/'HARBORLIGHT-QR-instrukcja.svg').write_text(''.join(svg))
c=new('HARBORLIGHT-etykieta-QR-A4.pdf',A4);header(c,'Etykiety na pudełko i instrukcję','QR otwiera wyłącznie publiczną instrukcję. Nie zawiera konta, kodu nagrody ani potwierdzenia gry.')
for yy in [160,55]:
 rounded(c,18,yy,174,90,PAPER,TEAL);c.drawImage(str(OUT/'HARBORLIGHT-QR-instrukcja.png'),24,yy+26,48,48)
 text(c,81,yy+68,'ZESKANUJ I GRAJ',14,True);wrap(c,'Przewodnik w telefonie: tajne sceny, minutnik, ruch i punkty. Bez logowania.',81,yy+55,103,9)
 wrap(c,'Po publikacji GitHub Pages. Bez internetu: otwórz telefon.html z pobranego pakietu albo użyj instrukcji PDF i minutnika.',26,yy+19,156,8)
 text(c,26,yy+7,DATA['qrUrl'],6.2)
footer(c,'Dwa egzemplarze tej samej etykiety · nie naklejaj kodu na zgięcie')
c.save()

# Phone guide embeds data and pure bookkeeping code: double-clickable offline HTML.
model=(ROOT/'session.mjs').read_text().replace('export ','')
template=(ROOT/'telefon.template.html').read_text();(ROOT/'telefon.html').write_text(template.replace('__MODEL__',model).replace('__SCENARIO_JSON__',json.dumps(DATA,ensure_ascii=False).replace('</','<\\/')))

# Accessible Polish printable rulebook, followed by actor-only secret scene bank.
styles={
 'title':ParagraphStyle('title',fontName='HL-Bold',fontSize=24,leading=30,textColor=colors.HexColor(NAVY),spaceAfter=14),
 'h':ParagraphStyle('h',fontName='HL-Bold',fontSize=15,leading=20,textColor=colors.HexColor(NAVY),spaceBefore=11,spaceAfter=7),
 'sub':ParagraphStyle('sub',fontName='HL-Bold',fontSize=11,leading=15,textColor=colors.HexColor(TEAL),spaceBefore=8,spaceAfter=5),
 'body':ParagraphStyle('body',fontName='HL',fontSize=9.4,leading=13.4,textColor=colors.HexColor(NAVY),spaceAfter=7),
 'small':ParagraphStyle('small',fontName='HL',fontSize=8,leading=11,textColor=colors.HexColor(NAVY),spaceAfter=5)
}
story=[]
def para(s,kind='body'):return Paragraph(html.escape(s),styles[kind])
def add(s,kind='body'):story.append(para(s,kind))
def section(title,paragraphs):add(title,'h');[add(p) for p in paragraphs]
add('HARBORLIGHT','title');add('Ostatni rejs przed świtem','h');add('Gotowy scenariusz prototypu · 2–6 osób · 45–60 minut · jedna talia + jeden telefon')
from reportlab.platypus import Image as PDFImage
story.append(PDFImage(str(ART),width=154*mm,height=154*mm));story.append(Spacer(1,6*mm));add('Samodzielna gra przy stole. Ten pakiet nie łączy się z kontem online i nie przyznaje monet. Materiały są gotowe do próbnego wydruku; nie przeprowadzono jeszcze fizycznego testu partii ani składania pudełka.','small')
story.append(PageBreak());section('1. Przygotowanie — 5 minut',[DATA['opening'],'Rozłóżcie planszę, jedną talię 24 kart Szlaku, 6 żetonów podpowiedzi, 3 części sygnału i 8 żetonów sukcesu. Przydadzą się kartka, ołówek i pięć pasków papieru. Każdy bierze pionek i znacznik sławy; pionki zaczynają w Porcie na pozycji 0, sława wynosi 0.','Potasujcie talię i rozdajcie każdemu po 3 karty. Wspólny stos dobierania i stos odrzuconych to ta sama jedna talia, a nie druga talia zdarzeń. Po wyczerpaniu stosu tasujcie odrzucone karty.','Otwórz telefon.html z pakietu albo zeskanuj QR po opublikowaniu Pages. Wybierz 2–6 osób. Wpisz imiona i rozdziel role. Przy mniej niż sześciu osobach dodatkowe role rozdzielcie możliwie równo — bez osobnych pionków i bez przewagi punktowej.'])
add('Role i zdanie postaci','sub')
for r in DATA['roles']:add(f"{r['name']}: „{r['motto']}”",'small')
add('Każdy wymyśla własną cechę postaci. Można grać na siedząco, bez akcentu, śpiewania, dotykania ludzi czy biegania. Zawsze wolno wybrać dostępny wariant zadania.','small')
section('2. Ruch po wyspie',['Tor: Port 0 → Magazyn 1 → Dom 2 → Gospodarstwo 3 → Młyn 4 → Kaplica 5 → Ratusz 6 → Kamieniołom 7 → Drwale 8 → Tartak 9 → Targ 10 → Przystań 11 → Port 12 → Latarnia 13. Port 0 i 12 to to samo fizyczne pole, przy powrocie pamiętajcie o ukończonym obwodzie. Przystań jest polem trasy, a nie nowym budynkiem gry online.','W każdej rundzie każdy wybiera jedną kartę ze swojej ręki: 1 pole daje 2 punkty marszu; 2 pola dają 1 punkt marszu. Jeśli koniec ruchu jest na budynku wydrukowanym na karcie, dodaj 1 punkt specjalności. Liczy się koniec, nie minięte pola. Nie można zmienić ruchu po poznaniu sekretu.','Do Latarni wchodzi się wyłącznie po pełnym obwodzie przez Port 12. Ruch powyżej 13 kończy się na 13. Pierwsze wejście daje raz 3 punkty, bez wymogu dokładnej liczby. W następnych rundach ta osoba nie zagrywa karty, nie rusza się i nie dostaje dalszych punktów marszu, ale nadal gra wszystkie sceny. Pionki nie blokują ani nie zbijają się.'])
story.append(PageBreak());section('3. Osiem wspólnych rund — po 5 minut',['W każdej rundzie wszyscy poruszają się w tym samym etapie. Nie rozgrywajcie osobnej pełnej tury na każdego gracza. Telefon pomaga liczyć pozycję i sławę; fizyczny tor jest jej widoczną kopią.','45 s: plan, karta, ruch i wpisanie wyborów do telefonu. Następnie 30 s na publiczny cel i sekret, 90 s odegrania sceny, 45 s sprawdzenia, 60 s decyzji i doboru kart oraz do 30 s oddechu. Cel to 300 s na rundę; na pierwszą partię wolno dodać łącznie 10 minut wyjaśnień.','Wykonawca rotuje co rundę. Przy dwóch osobach jedna czyta sekret, druga zgaduje. Przy 3–6 osobach sekret czyta wykonawca oraz następna osoba przy stole, a pozostali zgadują. Najpierw każdy poznaje publiczny cel i jawny warunek sukcesu; dopiero aktorzy poznają sekret. Zasłońcie go przed uruchomieniem minutnika.','Po 90 sekundach zatrzymajcie odpowiedź. Telefon ujawnia rozwiązanie i warunek. Liczy się sens, nie dosłowne słowa. Uczestnicy oceniają scenę — nie robi tego aplikacja. Nierozstrzygnięty spór to „próbowaliśmy”. Sukces daje 1 osobisty punkt każdemu; porażka nie odbiera punktów. Wyniku tej samej sceny nie można naliczyć drugi raz.','Można użyć jednej podpowiedzi w danej scenie: wydaj 1 wspólny żeton. Podpowiedź nie odbiera sukcesu ani punktów. Po rozliczeniu odrzućcie zagraną kartę i dobierzcie do 3.'])
section('4. Trzy części sygnału i historia',['Akt I, rundy 1–2: dwa losowane zadania F01–F04. Za przynajmniej 1 sukces dostajecie Załogę. Po rundzie 2 wybierzcie narratora kroniki: Dom albo Ratusz. To zmienia opowieść, nie warunki sukcesu.','Akt II, rundy 3–6: cztery różne zadania z F05–F10 oraz F13–F16. Za co najmniej 2 sukcesy dostajecie Mechanizm. Po rundzie 4 wybierzcie: pomóc osobie o najniższej pozycji (+1 pole, bez punktów marszu; ewentualne wejście do Latarni nadal daje raz +3) albo dopisać zdania postaci i odzyskać 1 podpowiedź, najwyżej do 6. Remis ostatniej pozycji rozstrzyga kolejność osób od początku listy.','Akt III, rundy 7–8: zawsze F11, potem F12. Co najmniej 1 sukces daje Kod. Przed finałem każdy dopowiada jedno zdanie o jutrze swojej postaci. Pionek nie musi stać przy budynku sceny: wspólne wydarzenie rozgrywa się gdzie indziej niż indywidualna trasa.'])
section('5. Finał',['Po ósmej rundzie możecie naprawić jedną brakującą część: wydajcie 3 niewykorzystane podpowiedzi i poprawnie odtwórzcie wcześniej nieudaną scenę. Ta naprawa nie dodaje sukcesu ani punktów sceny.','Pełne światło: macie 3 części, a w Latarni jest co najmniej połowa pionków, zaokrąglona w górę. Światło do świtu: co najmniej 2 części i przynajmniej 1 pionek w Latarni. Inaczej: Port opowieści — bezpieczny, otwarty finał na następną wyprawę.','Sława = marsz + specjalności + jednorazowe wejście + udane sceny. Najwyższa sława daje tytuł Bohatera wyprawy; remis jest wspólnym zwycięstwem. Osobista wygrana nie zabiera wspólnego finału.'])
story.append(PageBreak());section('6. Druk, składanie i gra bez telefonu',['Plansza A3 ma dokładnie 297 × 420 mm. Wariant A4 to cztery kafelki w skali 100%, po 153,5 × 215 mm; ułóż 1–2 nad 3–4, nakładając wspólny obraz na 10 mm. Sprawdź linijką odcinek 50 mm przed klejeniem.','Karty mają 63 × 88 mm. Plik ma 6 stron: awers 1/rewers 1, awers 2/rewers 2, awers 3/rewers 3. Druk dwustronny z odwracaniem po długiej krawędzi; rewersy mają odwrócone kolumny. Najpierw jeden próbny arkusz. Dla drukarki bez dupleksu wydrukuj awersy i rewersy osobno, wytnij i podklej parami. Zalecany papier kart 200–250 g/m² albo zwykły papier w koszulkach z podkładką.','Pionki: obrys 36 × 86 mm, zagięcia po 12, 43 i 74 mm. Sklej dwie dolne zakładki w podstawę namiotu. Znaczniki punktów podklej kartonem. Każdy kolor ma nazwę/kształt i numer; nie rozróżniaj osób wyłącznie barwą.','Pudełko: dno 216 × 156 × 18 mm, wieczko 218 × 158 × 20 mm. Ciągła linia = cięcie; kreskowana = bigowanie i zgięcie. Szare narożne zakładki przyklej od środka sąsiedniej ścianki. Najpierw złóż próbkę z papieru, potem użyj 250–300 g/m². Planszę A3 złóż na cztery (148,5 × 210 mm). Tolerancje domowego druku i grubość papieru wymagają sprawdzenia na próbce.','QR prowadzi do publicznego telefon.html w GitHub Pages, dopiero po publikacji tej zmiany. Nie jest kodem nagrody. Przed publikacją otwórz lokalny plik z pobranego ZIP. Przewodnik zapisuje wyłącznie tę partię i imiona na własnym urządzeniu; usuń sesję po rozgrywce. Nie wysyła danych i nie łączy się z grą online.','Bez telefonu wybierzcie 2 zadania z aktu I, 4 z aktu II, a potem F11 i F12. Użyjcie zwykłego minutnika. Kolejny aktor czyta sekretną część poniższego banku; pozostali czytają tylko cel i warunek. Zasłońcie rozwiązanie kartką. Prowadzący rotuje i również gra. Potrzebne punkty notujcie na papierze.'])
add('Najkrótsza ściąga','sub');add('Ruch 1 = 2 pkt · ruch 2 = 1 pkt · zgodny budynek +1 · Latarnia raz +3 · każda udana scena +1 każdemu. Osiem rund. Sześć podpowiedzi. Trzy części. Jedna wyspa do uratowania.')
add('Przed testem przy stole','sub');add('Pakiet jest grywalnym prototypem, nie produktem po testach. Odnotujcie czas partii dla 2/4/6 osób, zrozumienie tajnych instrukcji, udział każdego uczestnika, liczbę sukcesów i to, czy chcecie zagrać ponownie. Kontrole plików i arytmetyki nie potwierdzają jeszcze balansu ani jakości domowego składania.','small')
story.append(PageBreak());add('Bank scen — część dla wykonawców','title');add('Uwaga: dalej są tajne instrukcje i rozwiązania. Zgadujący czytają tylko publiczny cel i warunek. Jedna drukowana instrukcja nie jest drugą talią.','body')
for i,s in enumerate(DATA['scenes']):
 group=[para(f"{s['id']} · {s['place']} — {s['title']}",'sub')]
 for label,key in [('CEL PUBLICZNY','public'),('WARUNEK SUKCESU','check'),('SEKRET WYKONAWCY','secret'),('ROZWIĄZANIE','answer'),('PODPOWIEDŹ','hint'),('WARIANT DOSTĘPNY','accessible')]:group.append(para(f'{label}: {s[key]}','small'))
 group.append(Spacer(1,3*mm));story.append(KeepTogether(group))
# Page footer + QR on first rulebook cover.
def manual_footer(c,doc):
 c.saveState();c.setFont('HL',7);c.setFillColor(colors.HexColor(MUTED));c.drawString(16*mm,10*mm,'HARBORLIGHT · prototyp fizyczny 1.0 · bez integracji z kontem online');c.drawRightString(194*mm,10*mm,str(doc.page));c.restoreState()
SimpleDocTemplate(str(OUT/'HARBORLIGHT-instrukcja.pdf'),pagesize=A4,rightMargin=16*mm,leftMargin=16*mm,topMargin=15*mm,bottomMargin=17*mm,title='HARBORLIGHT — Ostatni rejs przed świtem — instrukcja',author='HARBORLIGHT').build(story,onFirstPage=manual_footer,onLaterPages=manual_footer)

manifest={'prototypeVersion':DATA['version'],'onlineIntegration':False,'physicalPlaytested':False,'qrUrl':DATA['qrUrl'],'files':[]}
for f in sorted(OUT.iterdir()):
 if f.is_file():manifest['files'].append({'path':'druk/'+f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
files=[*sorted(OUT.iterdir()),ROOT/'telefon.html',ROOT/'session.mjs',ROOT/'scenariusz.json',ROOT/'manifest.json',ROOT/'build_print.py',ROOT/'telefon.template.html',ROOT/'session.test.mjs',ROOT/'verify_print.py',ROOT/'verify_phone.py',ART]
if (ROOT/'README.md').exists():files.append(ROOT/'README.md')
with zipfile.ZipFile(ROOT/'HARBORLIGHT-do-druku.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in files:
  if f.is_file():z.write(f,f.relative_to(ROOT))
print(json.dumps({'files':len(manifest['files']),'zipBytes':(ROOT/'HARBORLIGHT-do-druku.zip').stat().st_size,'qr':DATA['qrUrl']},ensure_ascii=False))
