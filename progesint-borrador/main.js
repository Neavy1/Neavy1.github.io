// Progesint · página de insolvencia (fase 1). Sin dependencias y sin guardar datos.
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const WHATSAPP = '573150682528';

  /* ---- Entradas ---- */
  const seen = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.reveal').forEach((el, i) => {
    if (el.parentElement.matches('.signs__grid, .flips, .steps')) el.style.setProperty('--d', `${(i % 5) * 80}ms`);
    seen.observe(el);
  });
  const nav = $('#nav');
  const onScroll = () => { nav.classList.toggle('scrolled', scrollY > 10); paintSteps(); };

  /* ---- Escena 3D: deudas sueltas que se ordenan en un solo acuerdo ---- */
  const scene = $('#scene'), stage = $('#stage');
  const DEBTS = [
    ['Tarjeta de crédito', true, -150, -120, 40, 24, -38, 14],
    ['Crédito de consumo', false, 120, -60, -90, -18, 30, -10],
    ['Cobro judicial', true, -40, 30, 120, 12, 52, 8],
    ['Préstamo', false, 150, 110, 20, -26, -22, -16],
    ['Intereses de mora', true, -140, 130, -70, 30, 18, 20]
  ];
  const box = (label, i, cls = '') => {
    const d = document.createElement('div'); d.className = `debt ${cls}`; d.style.setProperty('--i', i);
    const bob = document.createElement('div'); bob.className = 'debt__bob';
    for (let f = 0; f < 6; f++) { const face = document.createElement('i'); if (f < 2) face.textContent = label; bob.append(face); }
    d.append(bob); scene.append(d); return d;
  };
  DEBTS.forEach(([label, warn, x, y, z, rx, ry, rz], i) => {
    const d = box(label, i, warn ? 'warn' : '');
    const set = (k, v) => d.style.setProperty(k, v);
    set('--cx', x + 'px'); set('--cy', y + 'px'); set('--cz', z + 'px');
    set('--crx', rx + 'deg'); set('--cry', ry + 'deg'); set('--crz', rz + 'deg');
    set('--oy', (130 - i * 52) + 'px');
  });
  const seal = box('Un solo acuerdo', DEBTS.length, 'debt--seal');
  ['--cx', '--cz'].forEach(k => seal.style.setProperty(k, '0px'));
  seal.style.setProperty('--cy', '-260px');
  ['--crx', '--cry', '--crz'].forEach(k => seal.style.setProperty(k, '0deg'));
  seal.style.setProperty('--oy', (130 - DEBTS.length * 52) + 'px');

  const swB = $('#swBefore'), swA = $('#swAfter');
  let touched = false;
  const order = on => {
    scene.classList.toggle('ordered', on);
    swA.classList.toggle('on', on); swB.classList.toggle('on', !on);
  };
  swB.addEventListener('click', () => { touched = true; order(false); });
  swA.addEventListener('click', () => { touched = true; order(true); });
  if (calm) order(true);
  else {
    setTimeout(() => { if (!touched) order(true); }, 2200);
    // Mientras nadie toque el interruptor, alterna para mostrar el antes y el después
    setInterval(() => { if (!touched && stageSeen) order(!scene.classList.contains('ordered')); }, 6500);
  }
  let ry = -28, rx = -18, vel = 0, drag = null, stageSeen = true;
  const turn = () => { scene.style.setProperty('--ry', ry.toFixed(2) + 'deg'); scene.style.setProperty('--rx', rx.toFixed(2) + 'deg'); };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY }; vel = 0; stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    ry += dx * .45; rx = clamp(rx - dy * .25, -50, 10); vel = dx * .08; drag = { x: e.clientX, y: e.clientY }; turn();
  });
  const drop = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', drop); stage.addEventListener('pointercancel', drop);
  new IntersectionObserver(([e]) => { stageSeen = e.isIntersecting; }).observe(stage);
  turn();
  if (!calm) (function loop() {
    if (stageSeen && !drag) { ry += .12 + vel; vel *= .94; turn(); }
    requestAnimationFrame(loop);
  })();

  /* ---- Tarjetas que se inclinan ---- */
  if (!calm && matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transition = 'transform .1s';
        c.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(10px)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transition = 'transform .6s'; c.style.transform = ''; });
    });
  }
  // En pantallas táctiles las tarjetas de servicios giran al tocarlas
  $$('.flip').forEach(f => {
    f.addEventListener('click', e => { if (!e.target.closest('a')) f.classList.toggle('open'); });
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('open'); } });
  });

  /* ---- Pasos: la línea avanza con el desplazamiento ---- */
  const steps = $('#steps'), stepEls = $$('.step');
  function paintSteps() {
    const r = steps.getBoundingClientRect();
    const k = clamp((innerHeight * .62 - r.top) / r.height);
    steps.style.setProperty('--k', k.toFixed(3));
    stepEls.forEach((s, i) => s.classList.toggle('on', k >= i / (stepEls.length - 1) - .02));
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', paintSteps);
  onScroll();

  /* ---- Revisión orientativa (no guarda nada) ---- */
  const money = el => +el.value.replace(/\D/g, '') || 0;
  $$('#total, #mora').forEach(el => el.addEventListener('input', () => {
    const n = el.value.replace(/\D/g, '').slice(0, 13);
    el.value = n ? Number(n).toLocaleString('es-CO') : '';
  }));
  const form = $('#checkForm'), result = $('#result'), ring = $('#ring'), ringN = $('#ringN');
  $('.gauge__core span').textContent = 'de 3 requisitos';
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form), total = money($('#total')), mora = money($('#mora'));
    result.hidden = false; result.className = 'result'; result.innerHTML = '';
    const say = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; result.append(n); return n; };
    if (!d.get('natural') || !d.get('acreedores') || !d.get('procesos') || !total) {
      result.classList.add('no'); say('h3', 'Faltan respuestas'); say('p', 'Responde las preguntas 1 a 4 para ver el resultado.');
      return;
    }
    if (mora > total) { result.classList.add('no'); say('h3', 'Revisa los valores'); say('p', 'Lo que está en mora no puede ser mayor que el total de tus deudas.'); return; }
    const checks = [
      [d.get('natural') === 'si', 'Las deudas están a tu nombre como persona natural'],
      [d.get('acreedores') === '2' || d.get('procesos') === '2', 'Dos o más acreedores con más de 90 días de mora, o dos o más procesos de cobro'],
      [mora / total >= .3, `Lo que está en mora es al menos el 30 % de tus deudas (hoy: ${Math.round(mora / total * 100)} %)`]
    ];
    const ok = checks.filter(c => c[0]).length;
    ring.style.setProperty('--v', ok / 3); ringN.textContent = ok;
    if (ok < 3) result.classList.add('no');
    say('h3', ok === 3 ? 'Tu caso podría cumplir los requisitos básicos' : 'Con lo que respondiste, faltaría algún requisito');
    const ul = document.createElement('ul');
    checks.forEach(([good, text]) => { const li = document.createElement('li'); li.textContent = text; if (!good) li.className = 'x'; ul.append(li); });
    result.append(ul);
    say('small', 'Resultado orientativo. La ley pide más condiciones y cada caso es distinto: un abogado debe revisarlo antes de tomar cualquier decisión.');
    const a = say('a', ok === 3 ? 'Agenda tu primera consulta' : 'Cuéntanos tu caso de todos modos', 'btn btn--main');
    a.href = '#consulta';
  });

  /* ---- Contacto: arma el mensaje y abre WhatsApp (el sitio no guarda datos) ---- */
  const lead = $('#leadForm'), err = $('#formError');
  lead.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(lead), nombre = (d.get('nombre') || '').trim(), ciudad = (d.get('ciudad') || '').trim();
    err.hidden = true;
    if (!nombre || !ciudad) { err.textContent = 'Escribe tu nombre y tu ciudad.'; err.hidden = false; return; }
    if (!d.get('acepto')) { err.textContent = 'Para contactarte necesitamos tu autorización de tratamiento de datos.'; err.hidden = false; return; }
    const texto = `Hola, Progesint. Soy ${nombre}, de ${ciudad}. Quiero una consulta sobre: ${d.get('tema')}.` +
      ((d.get('mensaje') || '').trim() ? `\n\n${d.get('mensaje').trim()}` : '');
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  });
})();
