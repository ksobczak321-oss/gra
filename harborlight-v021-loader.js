(async function loadHarborlightIsland(){
  const art = document.querySelector('.world-art');
  if(!art) return;

  // Never fail silently again: show a clear placeholder until the island is ready.
  art.style.background = 'linear-gradient(145deg,#3d9f6d 0%,#1a8fb6 45%,#0d5f8c 100%)';
  art.style.overflow = 'hidden';

  const status = document.createElement('div');
  status.textContent = 'Ładowanie wyspy…';
  Object.assign(status.style,{
    position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
    zIndex:'2',padding:'10px 16px',borderRadius:'14px',background:'rgba(9,38,55,.82)',
    color:'#fff',fontWeight:'800',fontSize:'13px',letterSpacing:'.04em',pointerEvents:'none'
  });
  art.appendChild(status);

  try{
    const response = await fetch('harborlight-island-v02-small.b64?v=hl021',{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);

    const base64 = (await response.text()).replace(/\s+/g,'');
    if(!base64 || base64.length < 1000) throw new Error('empty island asset');

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes],{type:'image/jpeg'});
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.alt = '';
    img.setAttribute('aria-hidden','true');
    Object.assign(img.style,{
      position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',
      objectPosition:'center center',display:'block',zIndex:'1',transform:'scale(1.015)'
    });

    img.onload = () => {
      status.remove();
      art.dataset.ready = 'true';
      document.documentElement.classList.add('island-ready');
    };
    img.onerror = () => { throw new Error('decoded island image failed'); };
    img.src = url;
    art.appendChild(img);
  }catch(error){
    console.error('HARBORLIGHT island load failed',error);
    status.textContent = '⚠ Nie udało się załadować wyspy — odśwież stronę';
    status.style.background = 'rgba(108,31,31,.92)';
    art.dataset.ready = 'false';
  }
})();
