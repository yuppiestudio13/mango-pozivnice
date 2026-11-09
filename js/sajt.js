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

  /* ---- prijava za novosti (futer): mejl stiže na adresu Manga preko FormSubmit-a, za buduće akcije ---- */
  const NEWS_EMAIL='mango.pozivnice@gmail.com';   // promeniti kad bude domen (isto kao ORDER.email u stampa.html)
  document.querySelectorAll('form.news').forEach(f=>{
    f.removeAttribute('onsubmit'); f.onsubmit=null;
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      const inp=f.querySelector('input'), btn=f.querySelector('button'), old=btn.textContent;
      btn.disabled=true; btn.textContent='Šaljem…';
      try{
        const r=await fetch('https://formsubmit.co/ajax/'+NEWS_EMAIL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
          body:JSON.stringify({email:inp.value,_subject:'Mango: nova prijava za novosti',_template:'table',_captcha:'false',strana:location.pathname})});
        if(!r.ok) throw 0;
        inp.value=''; btn.textContent='Hvala ✓';
      }catch{ btn.textContent=old; btn.disabled=false; inp.setCustomValidity('Prijava nije uspela, pokušajte ponovo.'); inp.reportValidity(); setTimeout(()=>inp.setCustomValidity(''),3000); return; }
    });
  });

  /* ---- galerija pozivnica ---- */
  const grid=document.getElementById('gGrid');
  if(!grid||!window.FOTO) return;
  const povod=document.body.dataset.povod||'';
  const uPovodu=(f,id)=>{const p=POVODI.find(x=>x.id===id);return f[2].split(' ').some(g=>(p&&p.obuhvata||[id]).includes(g));};
  const list=FOTO.filter(f=>!povod||uPovodu(f,povod));
  const napravi=n=>!n?'':n[0]==='#'?['radionica.html'+n,'Slični dizajni']:['editor.html?s='+encodeURIComponent(n),'Napravi sličnu'];
  grid.innerHTML=list.map(([f,a,,n])=>{const g=napravi(n);return `<figure><button type="button" class="g-open" aria-label="Uvećaj: ${a}"><img src="slike/${f}.jpg" alt="${a}" loading="lazy"></button><figcaption>${a}</figcaption>${g?`<a class="g-make" href="${g[0]}">${g[1]} <span>→</span></a>`:''}</figure>`}).join('');
  const cnt=document.getElementById('gCount'); if(cnt){const n=list.length; cnt.textContent=n+(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?' fotografije':' fotografija');}
  const tiles=document.getElementById('gTiles');
  if(tiles) tiles.innerHTML=POVODI.map(p=>{const n=FOTO.filter(f=>uPovodu(f,p.id)).length;
    return `<a class="cat" href="${p.strana}"><div class="ph tile"><img src="slike/${p.cover}.jpg" alt="${p.naziv}" loading="lazy"></div><h3>${p.naziv}</h3><p>${n} ${n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'fotografije':'fotografija'}</p></a>`}).join('');

  const lb=document.getElementById('lb'); if(!lb) return;
  const img=document.getElementById('lbImg'), cap=document.getElementById('lbCap'), figs=[...grid.querySelectorAll('figure')];
  let cur=0;
  let go=document.getElementById('lbGo'); if(!go){go=document.createElement('a');go.id='lbGo';go.className='btn lb-go';cap.after(go);}
  const show=i=>{cur=(i+figs.length)%figs.length; const s=figs[cur].querySelector('img'), m=figs[cur].querySelector('.g-make'); img.src=s.src; img.alt=s.alt; cap.textContent=s.alt;
    go.hidden=!m; if(m){go.href=m.getAttribute('href');go.textContent=m.firstChild.textContent.trim();}};
  grid.addEventListener('click',e=>{const b=e.target.closest('.g-open'); if(!b) return; show(figs.indexOf(b.closest('figure'))); lb.showModal();});
  lb.querySelector('.lb-x').onclick=()=>lb.close();
  lb.querySelector('.lb-prev').onclick=()=>show(cur-1);
  lb.querySelector('.lb-next').onclick=()=>show(cur+1);
  lb.addEventListener('click',e=>{if(e.target===lb) lb.close();});
  lb.addEventListener('keydown',e=>{if(e.key==='ArrowLeft') show(cur-1); if(e.key==='ArrowRight') show(cur+1);});
})();
