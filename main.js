// Portafolio de Neavy: animaciones sin dependencias.
// El avance del viaje (--p, de 0 a 1) mueve el cielo, el sol y el indicador lateral.
(() => {
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth <= 820;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- Titulares partidos en palabras ---- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part.trim()) { frag.append(part); return; }
            const w = document.createElement('span'); w.className = 'word';
            const inner = document.createElement('span'); inner.style.setProperty('--i', i++);
            inner.textContent = part; w.append(inner); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(el);
  });

  /* ---- Entradas al aparecer en pantalla ---- */
  const seen = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(count);
      seen.unobserve(e.target);
    });
  }, { threshold: .2 });
  $$('.reveal, [data-split]').forEach((el, i) => {
    if (el.parentElement.matches('.offers, .method, .hero__actions')) el.style.setProperty('--d', `${(i % 5) * 90}ms`);
    seen.observe(el);
  });

  function count(el) {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (calm) { el.textContent = pre + end + suf; return; }
    const t0 = performance.now(), dur = 1500;
    const step = t => {
      const k = clamp((t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + Math.round(end * eased) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---- Ruta de la travesía: se dibuja con el avance ---- */
  const route = $('#route'), svg = $('#routeSvg'), base = $('#routeBase'), line = $('#routeLine'), dot = $('#routeDot');
  let routeLen = 0;
  function buildRoute() {
    const h = route.offsetHeight, w = svg.clientWidth, cx = w / 2, amp = small() ? 0 : w * .42;
    const turns = Math.max(4, Math.round(h / 300));
    let d = `M ${cx} 0`;
    for (let i = 0; i < turns; i++) {
      const y0 = (h / turns) * i, y1 = (h / turns) * (i + 1), x = cx + (i % 2 ? -amp : amp);
      d += ` C ${x} ${y0 + (y1 - y0) * .35}, ${x} ${y0 + (y1 - y0) * .65}, ${cx} ${y1}`;
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    base.setAttribute('d', d); line.setAttribute('d', d);
    routeLen = line.getTotalLength();
    line.style.strokeDasharray = routeLen;
  }
  function paintRoute() {
    const r = route.getBoundingClientRect();
    const k = clamp((innerHeight * .6 - r.top) / r.height);
    line.style.strokeDashoffset = routeLen * (1 - k);
    const pt = line.getPointAtLength(routeLen * k);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
  }

  /* ---- Proyectos: desplazamiento horizontal anclado ---- */
  const sec = $('#proyectos'), pin = $('#pin'), track = $('#track');
  let travel = 0;
  function sizePin() {
    if (small() || calm) { sec.style.height = ''; track.style.transform = ''; travel = 0; return; }
    travel = Math.max(0, track.scrollWidth - innerWidth);
    sec.style.height = `${innerHeight + travel}px`;
  }
  function paintPin() {
    if (!travel) return;
    const k = clamp(-sec.getBoundingClientRect().top / travel);
    track.style.transform = `translate3d(${-k * travel}px,0,0)`;
  }

  /* ---- Bucle de desplazamiento ---- */
  const labels = ['Noche', 'Madrugada', 'Primera luz', 'Amanecer'];
  const odoLabel = $('#odoLabel'), odoKm = $('#odoKm');
  let ticking = false;
  function frame() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(scrollY / max) : 0;
    root.style.setProperty('--p', p.toFixed(4));
    odoKm.textContent = Math.round(p * 100);
    odoLabel.textContent = labels[Math.min(3, Math.floor(p * 4))];
    paintRoute(); paintPin();
  }
  const ask = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', ask, { passive: true });
  const relayout = () => { buildRoute(); sizePin(); frame(); };
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  document.fonts && document.fonts.ready.then(relayout);
  relayout();

  /* ---- Estrellas: titilan y forman constelaciones cerca del cursor ---- */
  const cv = $('#stars'), ctx = cv.getContext('2d');
  let stars = [], mouse = { x: -999, y: -999 }, W = 0, H = 0;
  function seed() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({
      x: Math.random() * W, y: Math.random() * H * .85, r: Math.random() * 1.3 + .3,
      a: Math.random() * Math.PI * 2, s: Math.random() * .02 + .005,
      c: Math.random() < .12 ? '#FFC145' : Math.random() < .12 ? '#2EC4B6' : '#F4EFE6'
    }));
  }
  let shoot = null;
  function sky(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.a += s.s;
      ctx.globalAlpha = .35 + Math.sin(s.a) * .35 + .3;
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      const dx = s.x - mouse.x, dy = s.y - mouse.y, dist = Math.hypot(dx, dy);
      if (dist < 130) {
        ctx.globalAlpha = (1 - dist / 130) * .5; ctx.strokeStyle = '#2EC4B6'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    if (!shoot && Math.random() < .004) shoot = { x: Math.random() * W, y: Math.random() * H * .3, l: 0 };
    if (shoot) {
      shoot.x += 9; shoot.y += 4; shoot.l++;
      const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - 90, shoot.y - 40);
      g.addColorStop(0, '#FFE9A8'); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 1 - shoot.l / 50; ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - 90, shoot.y - 40); ctx.stroke();
      if (shoot.l > 50) shoot = null;
    }
    ctx.globalAlpha = 1;
    if (!calm) requestAnimationFrame(sky);
  }
  seed(); sky();
  addEventListener('resize', () => { seed(); if (calm) sky(); });

  /* ---- Cursor: brillo, botones magnéticos e inclinación ---- */
  const glow = $('#glow');
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    glow.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
  }, { passive: true });
  if (!calm && matchMedia('(hover: hover)').matches) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    $$('.tilt').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transition = 'transform .1s';
        c.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateZ(8px)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transition = 'transform .6s'; c.style.transform = ''; });
    });
  }

  /* ---- Muestras de los proyectos ---- */
  // Onda de voz
  const wave = $('.wave');
  for (let i = 0; i < 34; i++) {
    const b = document.createElement('i');
    b.style.setProperty('--i', i); b.style.setProperty('--s', (.25 + Math.abs(Math.sin(i * .7)) * .75).toFixed(2));
    wave.append(b);
  }
  // Consola de MiIA
  const term = $('#termBody');
  const script = ['> klk', '', 'Hola, Neavy.', 'Urgente  · 1 tarjeta rechazada', 'Hoy      · reunión 9:00', 'Siguiente· probar en staging', '', 'Listo. Aquí estoy.'];
  const fullText = script.join('\n');
  if (calm) term.textContent = fullText;
  else {
    let n = 0, timer = null, live = false;
    const type = () => {
      term.textContent = fullText.slice(0, n++);
      if (n > fullText.length) { n = 0; timer = setTimeout(type, 3200); return; }
      timer = setTimeout(type, fullText[n - 2] === '\n' ? 260 : 34);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !live) { live = true; type(); }
      else if (!e.isIntersecting && live) { live = false; clearTimeout(timer); }
    }).observe(term);
    // Marcador
    const a = $('#scoreA'), b = $('#scoreB'); let turn = 0;
    setInterval(() => {
      const el = turn++ % 3 === 2 ? b : a;
      const v = (+el.textContent + 1) % 5; el.textContent = v;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    }, 2600);
  }
})();
