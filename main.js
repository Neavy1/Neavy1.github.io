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

  /* ---- 3D: tarjetas de proyecto que giran hacia el cursor ---- */
  if (!calm && matchMedia('(hover: hover)').matches) {
    $$('.card').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.transition = 'transform .12s, border-color .4s';
        c.style.transform = `translateY(-8px) rotateY(${(x - .5) * 12}deg) rotateX(${(.5 - y) * 10}deg)`;
        c.style.setProperty('--gx', `${x * 100}%`); c.style.setProperty('--gy', `${y * 100}%`);
        c.classList.add('lit');
      });
      c.addEventListener('pointerleave', () => { c.style.transition = ''; c.style.transform = ''; c.classList.remove('lit'); });
    });
  }

  /* ---- 3D: globo del inicio (lienzo 2D con proyección propia, sin librerías) ---- */
  const globe = $('#globe');
  if (globe) {
    const g = globe.getContext('2d');
    const RAD = Math.PI / 180;
    // Tierra aproximada por franjas de 10° de latitud: [latitud central, [lon inicial, lon final]...]
    const LAND = [
      [75, [-120, -80], [-60, -20], [80, 110]],
      [65, [-165, -60], [-52, -38], [-23, -14], [5, 180]],
      [55, [-132, -60], [-9, 1], [8, 160]],
      [45, [-124, -64], [-5, 140]],
      [35, [-121, -76], [-6, 11], [27, 120], [135, 141]],
      [25, [-112, -98], [-15, 35], [38, 58], [67, 91], [98, 120]],
      [15, [-104, -84], [-17, 40], [43, 51], [74, 82], [95, 108], [120, 124]],
      [5, [-78, -52], [-9, 46], [98, 104], [110, 118]],
      [-5, [-80, -36], [10, 40], [100, 105], [110, 120], [133, 150]],
      [-15, [-76, -39], [12, 40], [45, 50], [125, 145]],
      [-25, [-70, -42], [15, 35], [44, 47], [114, 152]],
      [-35, [-72, -55], [18, 27], [116, 123], [135, 150]],
      [-45, [-74, -66], [168, 174]],
      [-55, [-72, -66]]
    ];
    const isLand = (lat, lon) => {
      const band = LAND.find(b => Math.abs(lat - b[0]) <= 5);
      return !!band && band.slice(1).some(([a, b]) => lon >= a && lon <= b);
    };
    const vec = (lat, lon) => {
      const f = lat * RAD, l = lon * RAD;
      return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)];
    };
    // Puntos repartidos de forma pareja sobre la esfera (espiral de Fibonacci)
    const N = 5200, pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const land = isLand(Math.asin(y) / RAD, Math.atan2(x, z) / RAD);
      if (land || i % 7 === 0) pts.push([x, y, z, land]);
    }
    const HOME = vec(3.9, -76.3); // Buga
    const DEST = [[40.4, -3.7], [40.7, -74], [52.5, 13.4], [19.4, -99.1], [37.8, -122.4], [-33.4, -70.6]].map(([la, lo]) => vec(la, lo));
    const ARCS = DEST.map((b, k) => {
      const w = Math.acos(clamp(HOME[0] * b[0] + HOME[1] * b[1] + HOME[2] * b[2], -1, 1)), s = Math.sin(w), path = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s, lift = 1 + .22 * Math.sin(Math.PI * t) * Math.min(1, w);
        path.push([(HOME[0] * ka + b[0] * kb) * lift, (HOME[1] * ka + b[1] * kb) * lift, (HOME[2] * ka + b[2] * kb) * lift]);
      }
      return { path, off: k * .37 };
    });
    let size = 0, R = 0, rot = 76.3 * RAD - .35, tilt = .32, vel = 0, drag = null, visible = true, t0 = performance.now();
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      size = globe.clientWidth; R = size * .4;
      globe.width = globe.height = Math.round(size * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const proj = p => {
      const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
      const x = p[0] * cr + p[2] * sr, z = p[2] * cr - p[0] * sr;
      return [size / 2 + x * R, size / 2 - (p[1] * ct - z * st) * R, p[1] * st + z * ct];
    };
    function draw(now) {
      const time = (now - t0) / 1000, c = size / 2;
      g.clearRect(0, 0, size, size);
      const halo = g.createRadialGradient(c, c, R * .7, c, c, R * 1.28);
      halo.addColorStop(0, 'rgba(46,196,182,.16)'); halo.addColorStop(1, 'rgba(46,196,182,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(c, c, R * 1.28, 0, 6.283); g.fill();
      const body = g.createRadialGradient(c - R * .35, c - R * .4, R * .1, c, c, R);
      body.addColorStop(0, 'rgba(27,31,75,.85)'); body.addColorStop(1, 'rgba(7,10,22,.85)');
      g.fillStyle = body; g.beginPath(); g.arc(c, c, R, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(46,196,182,.35)'; g.lineWidth = 1; g.stroke();
      for (const p of pts) {
        const [x, y, z] = proj(p);
        if (z <= 0) continue;
        g.globalAlpha = p[3] ? .25 + z * .75 : .1 + z * .12;
        g.fillStyle = p[3] ? '#F4EFE6' : '#2EC4B6';
        const s = p[3] ? .7 + z * .9 : .6;
        g.fillRect(x - s / 2, y - s / 2, s, s);
      }
      // Rutas desde Buga: una estela que viaja por cada arco
      g.lineCap = 'round';
      for (const a of ARCS) {
        const head = (time * .22 + a.off) % 1.5;
        let prev = proj(a.path[0]);
        for (let i = 1; i < a.path.length; i++) {
          const cur = proj(a.path[i]), t = i / (a.path.length - 1);
          if (cur[2] > -.05 && prev[2] > -.05) {
            const trail = t <= head ? Math.max(0, 1 - (head - t) * 2.4) : 0;
            g.globalAlpha = .13 + trail * .85;
            g.strokeStyle = trail > .02 ? '#FFC145' : '#2EC4B6';
            g.lineWidth = 1 + trail * 1.6;
            g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(cur[0], cur[1]); g.stroke();
          }
          prev = cur;
        }
        const end = proj(a.path[a.path.length - 1]);
        if (end[2] > 0) {
          const arrive = clamp(1 - Math.abs(head - 1) * 3);
          g.globalAlpha = .5 + arrive * .5; g.fillStyle = '#FFC145';
          g.beginPath(); g.arc(end[0], end[1], 2 + arrive * 2.5, 0, 6.283); g.fill();
        }
      }
      // Buga: el punto de partida
      const h = proj(HOME);
      if (h[2] > 0) {
        const pulse = (time * .8) % 1;
        g.globalAlpha = (1 - pulse) * .8; g.strokeStyle = '#FF6B57'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(h[0], h[1], 4 + pulse * 16, 0, 6.283); g.stroke();
        g.globalAlpha = 1; g.fillStyle = '#FF6B57';
        g.beginPath(); g.arc(h[0], h[1], 4, 0, 6.283); g.fill();
        g.font = '600 11px "JetBrains Mono", monospace'; g.fillStyle = '#F4EFE6';
        g.fillText('Buga', h[0] + 10, h[1] - 8);
      }
      g.globalAlpha = 1;
    }
    function spin(now) {
      if (visible) {
        if (!drag) { rot += .0016 + vel; vel *= .94; }
        draw(now);
      }
      requestAnimationFrame(spin);
    }
    globe.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; vel = 0; globe.classList.add('dragging'); globe.setPointerCapture(e.pointerId); });
    globe.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      rot += dx * .006; vel = dx * .0012; tilt = clamp(tilt + dy * .004, -.5, .9);
      drag = { x: e.clientX, y: e.clientY };
      if (calm) draw(performance.now());
    });
    const drop = () => { drag = null; globe.classList.remove('dragging'); };
    globe.addEventListener('pointerup', drop); globe.addEventListener('pointercancel', drop);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(globe);
    addEventListener('resize', () => { fit(); draw(performance.now()); });
    fit();
    if (calm) draw(t0); else requestAnimationFrame(spin);
  }

  /* ---- 3D: armador de proyectos (bloques en CSS 3D) ---- */
  const scene = $('#scene'), stage = $('#stage');
  if (scene) {
    const PIECES = {
      ui: ['Interfaz web', 'pantallas rápidas y claras, en celular y computador'],
      auto: ['Automatización', 'lo repetitivo hecho solo, con avisos cuando algo cambia'],
      ia: ['Asistente con IA', 'un asistente que conoce tu trabajo y ejecuta con tus decisiones'],
      data: ['Datos y reportes', 'números claros para decidir sin suposiciones']
    };
    const opts = $$('.opt'), out = $('#builderOut'), cta = $('#builderCta');
    const slab = (label, tone, cls = '') => {
      const s = document.createElement('div'); s.className = `slab ${cls}`;
      if (tone) s.style.setProperty('--tone', tone);
      for (let i = 0; i < 6; i++) { const f = document.createElement('i'); if (i < 4) f.textContent = label; s.append(f); }
      scene.append(s); return s;
    };
    slab('tu contexto', '', 'slab--base');
    const slabs = Object.fromEntries(opts.map(o => [o.dataset.piece, slab(PIECES[o.dataset.piece][0], getComputedStyle(o).getPropertyValue('--tone'), 'off')]));
    const refresh = () => {
      const on = opts.filter(o => o.getAttribute('aria-pressed') === 'true').map(o => o.dataset.piece);
      opts.forEach(o => {
        const s = slabs[o.dataset.piece], i = on.indexOf(o.dataset.piece);
        s.classList.toggle('off', i < 0);
        if (i >= 0) s.style.setProperty('--y', i + 1);
      });
      scene.style.setProperty('--n', on.length);
      const names = on.map(k => PIECES[k][0]);
      out.innerHTML = '';
      if (!on.length) {
        out.textContent = 'Elige al menos una pieza para ver tu proyecto.';
        cta.href = 'mailto:neabyop@gmail.com?subject=' + encodeURIComponent('Hablemos de un proyecto');
        return;
      }
      const b = document.createElement('strong'); b.textContent = 'Tu proyecto: ' + names.join(' + ') + '.';
      const sm = document.createElement('small'); sm.textContent = 'Incluye ' + on.map(k => PIECES[k][1]).join('; ') + '. Empieza con una entrevista corta para entender tu contexto.';
      out.append(b, sm);
      cta.href = 'mailto:neabyop@gmail.com?subject=' + encodeURIComponent('Proyecto: ' + names.join(' + ')) +
        '&body=' + encodeURIComponent('Hola, Neavy. Me interesa un proyecto con: ' + names.join(', ') + '.\n\nMi contexto: ');
    };
    opts.forEach(o => o.addEventListener('click', () => {
      o.setAttribute('aria-pressed', o.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); refresh();
    }));
    refresh();
    let ry = 35, sv = 0, sd = null, seenStage = false;
    const turn = () => scene.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    stage.addEventListener('pointerdown', e => { sd = e.clientX; sv = 0; stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => { if (sd === null) return; const dx = e.clientX - sd; ry += dx * .5; sv = dx * .1; sd = e.clientX; turn(); });
    const sdrop = () => { sd = null; stage.classList.remove('dragging'); };
    stage.addEventListener('pointerup', sdrop); stage.addEventListener('pointercancel', sdrop);
    new IntersectionObserver(([e]) => { seenStage = e.isIntersecting; }).observe(stage);
    turn();
    if (!calm) (function loop() {
      if (seenStage && sd === null) { ry += .18 + sv; sv *= .94; turn(); }
      requestAnimationFrame(loop);
    })();
  }
})();
