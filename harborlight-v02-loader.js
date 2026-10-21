(function(){
  const art = document.querySelector('.world-art');
  if(!art) return;
  art.innerHTML = `
  <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;display:block">
    <defs>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#56d8ef"/><stop offset="1" stop-color="#1687b9"/></linearGradient>
      <linearGradient id="grass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#89d34c"/><stop offset="1" stop-color="#4d9c34"/></linearGradient>
      <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7ac94c"/><stop offset="1" stop-color="#397f35"/></linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity=".28"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#sea)"/>
    <g opacity=".25" stroke="#d8fbff" stroke-width="4" fill="none">
      <path d="M0 160 Q180 120 360 160 T720 160 T1080 160 T1440 160 T1800 160"/>
      <path d="M0 700 Q180 660 360 700 T720 700 T1080 700 T1440 700 T1800 700"/>
    </g>
    <path d="M180 640 C120 500 165 340 300 245 C420 160 560 170 680 220 C820 145 995 160 1110 250 C1260 275 1380 390 1360 545 C1335 700 1170 770 980 755 C790 825 560 780 410 720 C300 725 220 700 180 640Z" fill="#d9bb70" opacity=".85" filter="url(#shadow)"/>
    <path d="M215 610 C175 485 220 365 330 285 C445 205 570 220 690 265 C825 195 965 205 1080 285 C1215 305 1315 405 1290 525 C1260 645 1120 695 950 680 C780 750 590 710 445 660 C330 675 250 660 215 610Z" fill="url(#grass)"/>
    <path d="M330 585 Q470 470 610 555 T900 540 T1180 520" stroke="#d8c38d" stroke-width="28" fill="none" stroke-linecap="round"/>
    <path d="M360 595 Q505 485 635 565 T925 548 T1175 528" stroke="#efe0b7" stroke-width="14" fill="none" stroke-linecap="round"/>
    <g fill="#2f7d33"><ellipse cx="390" cy="330" rx="120" ry="70"/><ellipse cx="520" cy="300" rx="100" ry="60"/><ellipse cx="1160" cy="360" rx="105" ry="75"/></g>
    <g fill="#194f2d" opacity=".9">
      <circle cx="340" cy="315" r="28"/><circle cx="385" cy="295" r="34"/><circle cx="430" cy="320" r="30"/><circle cx="505" cy="282" r="31"/><circle cx="548" cy="310" r="27"/>
      <circle cx="1120" cy="330" r="33"/><circle cx="1170" cy="350" r="31"/><circle cx="1210" cy="315" r="29"/>
    </g>
    <g fill="#f5d6a0" stroke="#784d31" stroke-width="5">
      <rect x="690" y="450" width="110" height="80" rx="8"/><polygon points="675,455 745,405 815,455" fill="#d65b3e"/>
      <rect x="820" y="500" width="100" height="70" rx="8"/><polygon points="805,505 870,462 935,505" fill="#bd4a37"/>
      <rect x="585" y="500" width="95" height="68" rx="8"/><polygon points="570,505 633,465 695,505" fill="#c54f38"/>
      <rect x="1030" y="475" width="120" height="78" rx="8"/><polygon points="1015,480 1090,430 1165,480" fill="#c9593f"/>
    </g>
    <g fill="#8d5b35" stroke="#5e3a22" stroke-width="4">
      <rect x="455" y="520" width="115" height="72" rx="8"/><polygon points="440,525 512,480 585,525" fill="#8a3f2e"/>
      <rect x="1240" y="495" width="110" height="70" rx="8"/><polygon points="1225,500 1295,455 1365,500" fill="#8f4932"/>
    </g>
    <g>
      <rect x="960" y="250" width="42" height="170" rx="12" fill="#f3f1df" stroke="#6e6759" stroke-width="5"/>
      <polygon points="945,255 981,205 1017,255" fill="#d6533d" stroke="#7d342a" stroke-width="5"/>
      <rect x="951" y="270" width="60" height="34" rx="8" fill="#7bc7db" stroke="#6e6759" stroke-width="5"/>
      <path d="M981 208 L981 170" stroke="#5f4d43" stroke-width="8"/>
    </g>
    <g fill="#f7d65d"><circle cx="760" cy="595" r="10"/><circle cx="790" cy="610" r="9"/><circle cx="810" cy="585" r="8"/><circle cx="850" cy="600" r="9"/></g>
    <g fill="#f08bb2"><circle cx="900" cy="615" r="8"/><circle cx="930" cy="600" r="9"/><circle cx="950" cy="620" r="8"/></g>
    <g stroke="#75512f" stroke-width="7"><path d="M540 590 v70"/><path d="M560 585 v75"/><path d="M580 580 v80"/></g>
    <g fill="#ffffff" opacity=".9"><path d="M250 185 q18 -18 36 0 q-18 -8 -36 0Z"/><path d="M290 170 q20 -18 40 0 q-20 -8 -40 0Z"/></g>
    <g fill="#444"><circle cx="705" cy="555" r="8"/><circle cx="735" cy="575" r="8"/><circle cx="1085" cy="585" r="8"/></g>
  </svg>`;
})();
