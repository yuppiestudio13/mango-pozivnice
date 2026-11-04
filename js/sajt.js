/* Zajednički kod za sve stranice: pokretna traka na vrhu, galerija pozivnica */
(()=>{
  /* ---- traka na vrhu: poruke se smenjuju ---- */
  const bar=document.querySelector('.topbar');
  if(bar){
    const msgs=[...bar.querySelectorAll('.tb-msg')];
    let i=0, paused=false;
    if(msgs.length>1) setInterval(()=>{
      if(paused||document.hidden) return;
      const cur=msgs[i]; i=(i+1)%msgs.length; const nxt=msgs[i];
      cur.classList.remove('on'); cur.classList.add('out');
      nxt.classList.remove('out'); nxt.classList.add('on');
      setTimeout(()=>cur.classList.remove('out'),800);
    },4200);
    bar.addEventListener('mouseenter',()=>paused=true);
    bar.addEventListener('mouseleave',()=>paused=false);
    bar.addEventListener('focusin',()=>paused=true);
    bar.addEventListener('focusout',()=>paused=false);
  }

  /* ---- galerija pozivnica ---- */
  const grid=document.getElementById('gGrid');
  if(!grid||!window.FOTO) return;
  const povod=document.body.dataset.povod||'';
  const list=FOTO.filter(f=>!povod||f[2].split(' ').includes(povod));
  grid.innerHTML=list.map(([f,a])=>`<figure><button type="button" class="g-open" aria-label="Uvećaj: ${a}"><img src="slike/${f}.jpg" alt="${a}" loading="lazy"></button><figcaption>${a}</figcaption></figure>`).join('');
  const cnt=document.getElementById('gCount'); if(cnt){const n=list.length; cnt.textContent=n+(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?' fotografije':' fotografija');}
  const tiles=document.getElementById('gTiles');
  if(tiles) tiles.innerHTML=POVODI.map(p=>{const n=FOTO.filter(f=>f[2].split(' ').includes(p.id)).length;
    return `<a class="cat" href="${p.strana}"><div class="ph tile"><img src="slike/${p.cover}.jpg" alt="${p.naziv}" loading="lazy"></div><h3>${p.naziv}</h3><p>${n} ${n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'fotografije':'fotografija'}</p></a>`}).join('');

  const lb=document.getElementById('lb'); if(!lb) return;
  const img=document.getElementById('lbImg'), cap=document.getElementById('lbCap'), figs=[...grid.querySelectorAll('figure')];
  let cur=0;
  const show=i=>{cur=(i+figs.length)%figs.length; const s=figs[cur].querySelector('img'); img.src=s.src; img.alt=s.alt; cap.textContent=s.alt;};
  grid.addEventListener('click',e=>{const b=e.target.closest('.g-open'); if(!b) return; show(figs.indexOf(b.closest('figure'))); lb.showModal();});
  lb.querySelector('.lb-x').onclick=()=>lb.close();
  lb.querySelector('.lb-prev').onclick=()=>show(cur-1);
  lb.querySelector('.lb-next').onclick=()=>show(cur+1);
  lb.addEventListener('click',e=>{if(e.target===lb) lb.close();});
  lb.addEventListener('keydown',e=>{if(e.key==='ArrowLeft') show(cur-1); if(e.key==='ArrowRight') show(cur+1);});
})();
