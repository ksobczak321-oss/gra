fetch('harborlight-island-v02-small.b64?v=hl02')
  .then(r => {
    if (!r.ok) throw new Error('island art not available');
    return r.text();
  })
  .then(b64 => {
    const art = document.querySelector('.world-art');
    if (art) art.style.backgroundImage = `url(data:image/jpeg;base64,${b64.trim()})`;
  })
  .catch(() => {
    const art = document.querySelector('.world-art');
    if (art) art.style.background = 'linear-gradient(145deg,#44a76d,#1499c4)';
  });
