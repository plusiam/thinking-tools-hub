/* 사고가시화 도구 모음 · 도구 페이지 공통 코드 (2026-11-11)
   도구 페이지(mindmap.html 등)는 <body data-tool="이름">만 두고, 화면은 이 파일이 그립니다.
   쓴 내용은 이 기기(브라우저)에만 저장합니다. 서버로 보내지 않습니다. */
(function () {
  'use strict';

  const PREFIX = 'thinking-tools-hub:';
  const id = document.body.getAttribute('data-tool') || '';

  /* ---------- 작은 도우미 ---------- */
  function add(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(x => add(n, x));
    else n.append(c);
  }
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    add(n, kids);
    return n;
  }
  const store = {
    get(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { /* 저장을 못 쓰는 기기 */ } }
  };

  /* ---------- 쓴 내용 ---------- */
  const hadSaved = store.get(id) != null;
  let state = load();
  function blank() { return { info: {}, f: {} }; }
  function load() {
    try {
      const s = JSON.parse(store.get(id) || 'null');
      if (s && typeof s === 'object' && s.f && typeof s.f === 'object' && !Array.isArray(s.f)) {
        if (!s.info || typeof s.info !== 'object') s.info = {};
        return s;
      }
    } catch (e) { /* 깨진 기록은 새로 시작 */ }
    return blank();
  }
  let timer = 0, dirty = false, statusEl = null;
  function clock() { return new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }); }
  function save() { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 350); }
  function flush() {
    clearTimeout(timer);
    if (!dirty) return;
    dirty = false;
    const ok = store.set(id, JSON.stringify(state));
    if (statusEl) statusEl.textContent = ok ? '이 기기에 저장했어요 · ' + clock() : '이 기기에는 저장할 수 없어요. 인쇄로 남겨 주세요.';
  }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  function str(k) { if (typeof state.f[k] !== 'string') state.f[k] = ''; return state.f[k]; }
  function strs(k, n) {
    let a = state.f[k];
    if (!Array.isArray(a) || !a.every(x => typeof x === 'string')) a = state.f[k] = [];
    while (a.length < n) a.push('');
    return a;
  }
  function objs(k, n, make) {
    let a = state.f[k];
    if (!Array.isArray(a) || !a.every(x => x && typeof x === 'object' && !Array.isArray(x))) a = state.f[k] = [];
    while (a.length < n) a.push(make(a.length));
    return a;
  }

  /* ---------- 입력 칸 ---------- */
  function fit(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + t.offsetHeight - t.clientHeight) + 'px'; }
  function fitAll(root) { requestAnimationFrame(() => (root || document).querySelectorAll('textarea').forEach(fit)); }
  // 여러 줄 칸. 인쇄할 때는 아래 .tt-pv(같은 글)가 대신 찍혀서 글이 잘리지 않습니다.
  function ta(o) {
    const t = el('textarea', { rows: o.rows || 1, 'aria-label': o.label, placeholder: o.ph });
    t.value = o.value || '';
    const pv = el('div', { class: 'tt-pv', 'aria-hidden': 'true' });
    pv.textContent = t.value;
    t.addEventListener('input', () => { fit(t); pv.textContent = t.value; o.on(t.value); });
    return el('div', { class: 'tt-ta' }, t, pv);
  }
  function inp(o) {
    const i = el('input', { class: 'tt-in' + (o.cls ? ' ' + o.cls : ''), type: 'text', 'aria-label': o.label, placeholder: o.ph, maxlength: o.max || 60, autocomplete: 'off' });
    i.value = o.value || '';
    i.addEventListener('input', () => o.on(i.value));
    return i;
  }
  function ex(text) { return el('p', { class: 'tt-ex' }, el('b', {}, '예)'), ' ' + text); }
  function box(o, ...kids) {
    return el('section', { class: 'tt-box' + (o.cls ? ' ' + o.cls : ''), style: o.c ? '--c:var(--' + o.c + ')' : null },
      el('h3', {}, o.tag ? el('span', { class: 'tag', 'aria-hidden': 'true' }, o.tag) : null, o.title),
      o.q ? el('p', { class: 'q' }, o.q) : null,
      o.ex ? ex(o.ex) : null,
      kids);
  }
  function topic(label, exText) {
    return el('div', { class: 'tt-field' }, el('span', { class: 'tt-label' }, label),
      ta({ value: str('topic'), label: label, on: v => { state.f.topic = v; save(); } }), exText ? ex(exText) : null);
  }
  function closing(k, title, exText, c) {
    return el('div', { class: 'tt-after' }, box({ c: c || 'c5', title: title, ex: exText },
      ta({ value: str(k), label: title, rows: 2, on: v => { state.f[k] = v; save(); } })));
  }
  function delBtn(label, has, go) {
    return el('button', { class: 'tt-del', type: 'button', 'aria-label': label + ' 지우기', title: label + ' 지우기',
      onclick: () => { if (has() && !confirm(label + '에 쓴 내용을 지울까요?')) return; go(); } }, '×');
  }

  // 한 줄씩 쓰는 목록
  function list(arr, o) {
    const wrap = el('div', { class: 'tt-listwrap' });
    const min = o.min || 1, max = o.max || 10;
    function draw(focusLast) {
      const ul = el('ul', { class: 'tt-list' });
      arr.forEach((v, i) => {
        const name = o.label + ' ' + (i + 1);
        const li = el('li', {}, ta({ value: v, label: name, ph: o.ph, on: val => { arr[i] = val; save(); } }));
        if (arr.length > min) li.append(delBtn(name, () => arr[i].trim(), () => { arr.splice(i, 1); save(); draw(); }));
        ul.append(li);
      });
      wrap.replaceChildren(ul);
      if (arr.length < max) wrap.append(el('button', { class: 'tt-add', type: 'button', onclick: () => { arr.push(''); save(); draw(true); } }, '+ ' + (o.add || '칸 더하기')));
      fitAll(wrap);
      if (focusLast) { const all = wrap.querySelectorAll('textarea'); all[all.length - 1].focus(); }
    }
    draw();
    return wrap;
  }

  // 여러 칸이 한 줄을 이루는 표 모양 목록
  function rows(arr, o) {
    const wrap = el('div', { class: 'tt-rowswrap ' + (o.cls || '') });
    const min = o.min || 1, max = o.max || 12;
    const tpl = 'grid-template-columns:' + (o.tpl || ((o.num ? '30px ' : '') + o.cols.map(c => c.w || 'minmax(0,1fr)').join(' ') + (o.move ? ' auto' : '') + ' 36px'));
    const hasText = r => o.cols.some(c => c.kind !== 'sel' && String(r[c.k] || '').trim());
    function swap(a, b) { const t = arr[a]; arr[a] = arr[b]; arr[b] = t; save(); draw(); }
    function draw(focusLast) {
      const ol = el('ol', { class: 'tt-rows' });
      if (o.head) ol.append(el('li', { class: 'tt-row tt-row-head', 'aria-hidden': 'true', style: tpl },
        o.num ? el('span') : null, o.cols.map(c => el('span', {}, c.label)), o.move ? el('span') : null, el('span')));
      arr.forEach((r, i) => {
        const name = o.label + ' ' + (i + 1);
        const li = el('li', { class: 'tt-row' + (o.rowClass ? ' ' + o.rowClass(r) : ''), style: tpl });
        if (o.num) li.append(el('span', { class: 'tt-num', 'aria-hidden': 'true' }, String(i + 1)));
        o.cols.forEach(c => {
          const lab = name + ' ' + c.label;
          let ctl;
          if (c.kind === 'sel') {
            const cur = c.opts.some(x => x[0] === r[c.k]) ? r[c.k] : c.opts[0][0];
            ctl = el('select', { class: 'tt-sel', 'aria-label': lab, onchange: e => { r[c.k] = e.target.value; save(); draw(); } },
              c.opts.map(x => { const op = el('option', { value: x[0] }, x[1]); op.selected = x[0] === cur; return op; }));
          } else if (c.kind === 'in') {
            ctl = inp({ value: r[c.k], label: lab, ph: c.ph, on: v => { r[c.k] = v; save(); } });
          } else {
            ctl = ta({ value: r[c.k], label: lab, ph: c.ph, on: v => { r[c.k] = v; save(); } });
          }
          li.append(el('div', { class: 'tt-cell' + (c.cls ? ' ' + c.cls : '') }, el('span', { class: 'tt-cell-lab', 'aria-hidden': 'true' }, c.label), ctl));
        });
        if (o.move) li.append(el('span', { class: 'tt-move' },
          el('button', { class: 'tt-mini', type: 'button', 'aria-label': name + ' 위로 옮기기', title: '위로', disabled: i === 0, onclick: () => swap(i, i - 1) }, '▲'),
          el('button', { class: 'tt-mini', type: 'button', 'aria-label': name + ' 아래로 옮기기', title: '아래로', disabled: i === arr.length - 1, onclick: () => swap(i, i + 1) }, '▼')));
        li.append(arr.length > min ? delBtn(name, () => hasText(r), () => { arr.splice(i, 1); save(); draw(); }) : el('span'));
        ol.append(li);
      });
      wrap.replaceChildren(ol);
      if (arr.length < max) wrap.append(el('button', { class: 'tt-add', type: 'button', onclick: () => { arr.push(o.make(arr.length)); save(); draw(true); } }, '+ ' + o.add));
      fitAll(wrap);
      if (focusLast) { const f = ol.lastElementChild.querySelector('input,textarea'); if (f) f.focus(); }
    }
    draw();
    return wrap;
  }

  // 이름 + 목록으로 된 묶음 하나(마인드맵 가지, 피시본 갈래)
  function group(g, i, o, onDelete) {
    if (typeof g.t !== 'string') g.t = '';
    if (!Array.isArray(g.items) || !g.items.every(x => typeof x === 'string') || !g.items.length) g.items = ['', ''];
    const name = o.label + ' ' + (i + 1);
    return el('section', { class: 'tt-box tt-group', style: '--c:var(--c' + (i % 8 + 1) + ')' },
      el('div', { class: 'tt-group-head' },
        inp({ value: g.t, label: name + ' 이름', ph: o.tph, cls: 'tt-group-title', max: 30, on: v => { g.t = v; save(); } }),
        onDelete ? delBtn(name, () => g.t.trim() || g.items.some(x => x.trim()), onDelete) : null),
      list(g.items, { label: name + ' ' + o.item, min: 1, max: 6, add: o.itemAdd }));
  }
  function groups(k, o, place) {
    const mk = () => ({ t: '', items: ['', ''] });
    const arr = objs(k, o.start, mk);
    const holder = el('div', {});
    const addBtn = el('button', { class: 'tt-add', type: 'button', onclick: () => { arr.push(mk()); save(); draw(); } }, '+ ' + o.add);
    function draw() {
      const nodes = arr.map((g, i) => group(g, i, o, arr.length > o.min ? () => { arr.splice(i, 1); save(); draw(); } : null));
      holder.replaceChildren(place(nodes), addBtn);
      addBtn.hidden = arr.length >= o.max;
      fitAll(holder);
    }
    draw();
    return holder;
  }

  /* ---------- 도구별 화면 ---------- */
  function buildMindmap() {
    const center = el('div', { class: 'mm-center' }, el('span', { class: 'mm-center-lab' }, '가운데 주제'),
      ta({ value: str('topic'), label: '가운데 주제', on: v => { state.f.topic = v; save(); } }));
    return [
      ex('가운데 주제: 우리 고장 · 가지 이름: 자연환경 · 가지에 쓸 생각: 산, 강, 날씨'),
      groups('branches', { label: '가지', item: '생각', tph: '가지 이름', add: '가지 더하기', itemAdd: '생각 더하기', start: 4, min: 2, max: 8 }, nodes => {
        const L = el('div', { class: 'mm-side mm-left' }), R = el('div', { class: 'mm-side mm-right' });
        nodes.forEach((n, i) => (i % 2 ? R : L).append(n));
        return el('div', { class: 'mm' }, L, center, R);
      })
    ];
  }

  function buildKwl() {
    return [
      topic('주제', '화산'),
      el('div', { class: 'tt-cols c3' },
        box({ c: 'c1', tag: 'K', title: '알고 있는 것', q: '이 주제에 대해 이미 알고 있는 것을 써요.', ex: '화산에서는 용암이 나온다.' }, list(strs('k', 3), { label: '알고 있는 것' })),
        box({ c: 'c3', tag: 'W', title: '알고 싶은 것', q: '궁금한 것을 질문으로 써요.', ex: '화산은 왜 폭발할까?' }, list(strs('w', 3), { label: '알고 싶은 것' })),
        box({ c: 'c2', tag: 'L', title: '배운 것', q: '공부한 뒤에 새로 알게 된 것을 써요.', ex: '땅속의 마그마가 땅 위로 나오면서 화산이 폭발한다.' }, list(strs('l', 3), { label: '배운 것' })))
    ];
  }

  function buildConceptMap() {
    return [
      topic('주제', '물의 순환'),
      box({ c: 'c5', tag: '1', title: '개념 모으기', q: '주제와 관련된 중요한 낱말(개념)을 모아요.', ex: '물, 수증기, 구름, 비' },
        list(strs('concepts', 4), { label: '개념', max: 12, add: '개념 더하기' })),
      el('div', { class: 'tt-gap' }, box({ c: 'c1', tag: '2', title: '개념 잇기', q: '개념 두 개를 고르고, 둘이 어떤 관계인지 「연결하는 말」로 이어요.', ex: '물 → (증발하면) → 수증기' },
        rows(objs('links', 3, () => ({})), { cls: 'cm', label: '잇기', head: true, min: 1, max: 12, add: '잇기 더하기', make: () => ({}),
          cols: [{ k: 'a', label: '개념', kind: 'in' }, { k: 'rel', label: '연결하는 말', kind: 'in', cls: 'rel', w: 'minmax(0,1.2fr)' }, { k: 'b', label: '개념', kind: 'in' }] }))),
      closing('sum', '이은 것을 보고 한두 문장으로 정리하기', '물은 증발해 수증기가 되고, 구름이 되었다가 비로 내려 다시 물이 된다.', 'c2')
    ];
  }

  function buildFishbone() {
    const head = el('div', { class: 'fb-head' }, el('span', { class: 'fb-head-lab' }, '문제(결과)'),
      ta({ value: str('topic'), label: '문제(결과)', on: v => { state.f.topic = v; save(); } }));
    return [
      ex('문제: 교실 바닥에 쓰레기가 많다 · 갈래 이름: 사람, 물건, 방법, 환경 · 원인: 쓰레기통이 교실 뒤쪽에만 있다.'),
      groups('causes', { label: '갈래', item: '원인', tph: '갈래 이름', add: '갈래 더하기', itemAdd: '원인 더하기', start: 4, min: 2, max: 6 }, nodes => {
        const top = el('div', { class: 'fb-row fb-top' }), bot = el('div', { class: 'fb-row fb-bot' });
        nodes.forEach((n, i) => (i % 2 ? bot : top).append(n));
        return el('div', { class: 'fb' }, el('div', { class: 'fb-bones' }, top, el('div', { class: 'fb-spine', 'aria-hidden': 'true' }), bot), head);
      }),
      closing('sum', '가장 큰 원인과 해결 방법', '쓰레기통이 멀어서 그렇다. 교실 앞쪽에도 쓰레기통을 하나 더 둔다.', 'c8')
    ];
  }

  function buildRubric() {
    return [
      topic('과제(활동) 이름', '모둠 발표하기'),
      ex('평가 요소: 내용 · 잘하고 있어요: 조사한 내용을 빠짐없이 정확하게 설명한다. · 발전하고 있어요: 조사한 내용을 대체로 설명한다. · 힘을 내요: 도움을 받아 조사한 내용을 설명한다.'),
      el('div', { class: 'tt-gap' }, rows(objs('items', 3, () => ({})), { cls: 'rb', label: '평가 요소', head: true, min: 1, max: 6, add: '평가 요소 더하기', make: () => ({}),
        cols: [{ k: 'crit', label: '평가 요소', w: 'minmax(0,.7fr)' }, { k: 'a', label: '잘하고 있어요' }, { k: 'b', label: '발전하고 있어요' }, { k: 'c', label: '힘을 내요' }] }))
    ];
  }

  function buildPmi() {
    return [
      topic('생각해 볼 것', '교실에서 반려 식물 키우기'),
      el('div', { class: 'tt-cols c3' },
        box({ c: 'c2', tag: 'P', title: '좋은 점', q: 'Plus: 좋은 점, 도움이 되는 점을 써요.', ex: '교실 분위기가 밝아진다.' }, list(strs('p', 3), { label: '좋은 점' })),
        box({ c: 'c4', tag: 'M', title: '아쉬운 점', q: 'Minus: 아쉬운 점, 걱정되는 점을 써요.', ex: '방학 동안 돌볼 사람이 없다.' }, list(strs('m', 3), { label: '아쉬운 점' })),
        box({ c: 'c1', tag: 'I', title: '흥미로운 점', q: 'Interesting: 좋고 나쁨을 떠나 눈에 띄는 점을 써요.', ex: '식물마다 물을 주는 때가 다르다.' }, list(strs('i', 3), { label: '흥미로운 점' }))),
      closing('sum', '그래서 내 생각은', '당번을 정해서 돌보면 교실에서 키워도 좋겠다.')
    ];
  }

  function buildVenn() {
    const name = (k, label, e) => el('div', { class: 'tt-field' }, el('span', { class: 'tt-label' }, label),
      inp({ value: str(k), label: label, max: 30, on: v => { state.f[k] = v; save(); } }), ex(e));
    return [
      el('div', { class: 'vn-names' }, name('na', 'A: 비교할 것', '고래'), name('nb', 'B: 비교할 것', '상어')),
      el('div', { class: 'vn' },
        box({ c: 'c1', cls: 'vn-a', tag: 'A', title: 'A에만 있는 것', ex: '허파로 숨을 쉰다.' }, list(strs('a', 2), { label: 'A에만 있는 것', max: 8 })),
        box({ c: 'c5', cls: 'vn-ab', tag: 'A·B', title: '둘 다 있는 것', ex: '바다에서 산다.' }, list(strs('ab', 2), { label: '둘 다 있는 것', max: 8 })),
        box({ c: 'c6', cls: 'vn-b', tag: 'B', title: 'B에만 있는 것', ex: '아가미로 숨을 쉰다.' }, list(strs('b', 2), { label: 'B에만 있는 것', max: 8 }))),
      closing('sum', '비교해 보고 알게 된 점', '고래와 상어는 사는 곳은 같지만 숨 쉬는 방법이 다르다.')
    ];
  }

  function buildGallery() {
    return [
      topic('무엇을 둘러보나요?', '우리 고장 소개 포스터'),
      ex('작품(모둠): 2모둠 포스터 · 좋았던 점: 그림으로 순서를 보여 줘서 이해하기 쉬웠어요. · 궁금한 점: 자료는 어디에서 찾았나요? · 더 좋아지려면: 글씨를 조금 더 크게 쓰면 좋겠어요.'),
      el('div', { class: 'tt-gap' }, rows(objs('notes', 2, () => ({})), { cls: 'gw always-lab', label: '작품', min: 1, max: 8, add: '작품 더하기', make: () => ({}),
        tpl: 'repeat(3,minmax(0,1fr)) 36px',
        cols: [{ k: 'who', label: '작품(모둠) 이름', kind: 'in', cls: 'who' }, { k: 'good', label: '좋았던 점' }, { k: 'ask', label: '궁금한 점' }, { k: 'idea', label: '더 좋아지려면' }] })),
      closing('sum', '둘러보고 나서 우리 작품에 더하고 싶은 것', '우리 포스터에도 그림 설명을 넣고 싶다.', 'c3')
    ];
  }

  function buildFlow() {
    const first = ['s', 'p', 'p', 'p', 's'];
    return [
      topic('무엇의 순서인가요?', '손 씻기'),
      ex('① 시작·끝: 시작 → ② 하는 일: 손에 물을 묻힌다 → ③ 하는 일: 비누로 문지른다 → ④ 판단: 30초가 지났나요? (아니요면 ③으로) → ⑤ 하는 일: 물로 헹군다 → ⑥ 시작·끝: 끝'),
      el('div', { class: 'tt-gap' }, rows(objs('steps', 5, i => ({ type: first[i] || 'p', text: '' })), { cls: 'fl', label: '단계', head: true, num: true, move: true, min: 2, max: 14, add: '단계 더하기',
        make: () => ({ type: 'p', text: '' }), rowClass: r => 'is-' + (['s', 'p', 'd'].includes(r.type) ? r.type : 'p'),
        cols: [{ k: 'type', label: '모양', kind: 'sel', w: 'minmax(104px,.32fr)', opts: [['p', '하는 일'], ['s', '시작·끝'], ['d', '판단(예/아니요)']] }, { k: 'text', label: '내용' }] }))
    ];
  }

  function buildSwot() {
    return [
      topic('살펴볼 것', '우리 모둠의 발표 준비'),
      el('div', { class: 'tt-cols c2' },
        box({ c: 'c2', tag: 'S', title: '강점', q: 'Strength: 우리가 잘하는 것, 가진 것을 써요.', ex: '그림을 잘 그리는 친구가 있다.' }, list(strs('s', 2), { label: '강점' })),
        box({ c: 'c4', tag: 'W', title: '약점', q: 'Weakness: 우리에게 부족한 것을 써요.', ex: '발표 연습 시간이 모자란다.' }, list(strs('w', 2), { label: '약점' })),
        box({ c: 'c1', tag: 'O', title: '기회', q: 'Opportunity: 밖에서 도움이 되는 것을 써요.', ex: '도서관에서 자료를 빌릴 수 있다.' }, list(strs('o', 2), { label: '기회' })),
        box({ c: 'c3', tag: 'T', title: '위협', q: 'Threat: 밖에서 어렵게 만드는 것을 써요.', ex: '발표 날이 현장 체험 학습 바로 다음 날이다.' }, list(strs('t', 2), { label: '위협' }))),
      closing('sum', '그래서 우리가 할 일', '쉬는 시간에 모여 발표 연습을 두 번 한다.')
    ];
  }

  function buildTimeline() {
    return [
      topic('무엇의 흐름인가요?', '강낭콩 기르기'),
      ex('때: 1일째 · 일어난 일: 화분에 씨앗을 심었다.'),
      el('div', { class: 'tt-gap' }, rows(objs('events', 4, () => ({})), { cls: 'tl', label: '일', head: true, num: true, move: true, min: 2, max: 14, add: '일 더하기', make: () => ({}),
        cols: [{ k: 'when', label: '때', kind: 'in', w: 'minmax(96px,.4fr)' }, { k: 'what', label: '일어난 일' }] })),
      closing('sum', '흐름을 보고 알게 된 점', '싹이 튼 뒤로 잎이 빠르게 자랐다.', 'c7')
    ];
  }

  const TOOLS = {
    'mindmap': { ko: '마인드맵', en: 'Mind Map', lead: '가운데에 주제를 쓰고, 떠오르는 생각을 가지로 뻗어 가며 정리해요.', build: buildMindmap },
    'kwl-chart': { ko: 'KWL 차트', en: 'KWL Chart', lead: '알고 있는 것, 알고 싶은 것, 배운 것을 차례로 정리해요.', build: buildKwl },
    'concept-map': { ko: '개념도', en: 'Concept Map', lead: '중요한 개념을 모으고, 개념과 개념이 어떤 관계인지 이어 보아요.', build: buildConceptMap },
    'fishbone': { ko: '피시본 다이어그램', en: 'Fishbone Diagram', lead: '문제를 물고기 머리에 쓰고, 뼈마다 원인을 갈래별로 찾아보아요.', build: buildFishbone },
    'rubric': { ko: '루브릭', en: 'Rubric', lead: '무엇을 보고 평가할지(평가 요소)와 수준별 모습을 표로 만들어요.', build: buildRubric },
    'pmi-chart': { ko: 'PMI 차트', en: 'PMI Chart', lead: '좋은 점, 아쉬운 점, 흥미로운 점을 나누어 생각하고 내 생각을 정해요.', build: buildPmi },
    'venn-diagram': { ko: '벤다이어그램', en: 'Venn Diagram', lead: '두 가지를 견주어 같은 점과 다른 점을 찾아요.', build: buildVenn },
    'gallery-walk': { ko: '갤러리 워크', en: 'Gallery Walk', lead: '친구들의 작품을 둘러보며 좋았던 점, 궁금한 점, 제안을 남겨요.', build: buildGallery },
    'flowchart': { ko: '플로우차트', en: 'Flowchart', lead: '일의 순서를 한 단계씩 차례로 나타내요.', build: buildFlow },
    'swot': { ko: 'SWOT 분석', en: 'SWOT Analysis', lead: '강점, 약점, 기회, 위협을 살펴보고 할 일을 정해요.', build: buildSwot },
    'timeline': { ko: '타임라인', en: 'Timeline', lead: '일어난 일을 시간 순서대로 늘어놓아요.', build: buildTimeline }
  };

  /* ---------- 화면 그리기 ---------- */
  const tool = TOOLS[id];
  if (!tool) {
    document.body.append(el('p', { style: 'padding:24px' }, '도구를 찾을 수 없어요. ', el('a', { href: './' }, '사고가시화 도구 모음으로 돌아가기')));
    return;
  }

  function info() {
    const one = (k, text, before, cls) => {
      const i = el('input', { type: 'text', 'aria-label': text, maxlength: k === 'name' ? 12 : 3, autocomplete: 'off', inputmode: k === 'name' ? null : 'numeric' });
      i.value = state.info[k] || '';
      i.addEventListener('input', () => { state.info[k] = i.value; save(); });
      return el('label', { class: cls }, before ? text : null, i, before ? null : text);
    };
    return el('div', { class: 'tt-info' }, one('grade', '학년'), one('cls', '반'), one('num', '번'), one('name', '이름', true, 'nm'));
  }

  const main = el('main', { class: 'tt-wrap' });
  function render() {
    main.replaceChildren(el('article', { class: 'tt-sheet' }, el('h2', { class: 'tt-print-title' }, tool.ko), info(), tool.build()));
    fitAll(main);
  }

  statusEl = el('span', { class: 'tt-status', role: 'status' }, hadSaved ? '이 기기에 저장해 둔 내용을 불러왔어요.' : '쓰면 이 기기에 자동으로 저장돼요.');
  const exOn = store.get('ex') !== '0';
  document.body.classList.toggle('no-ex', !exOn);
  const exBtn = el('button', { class: 'tt-btn', type: 'button', 'aria-pressed': String(exOn), onclick: () => {
    const on = exBtn.getAttribute('aria-pressed') !== 'true';
    exBtn.setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('no-ex', !on);
    store.set('ex', on ? '1' : '0');
  } }, '예) 보기');

  document.body.append(
    el('header', { class: 'tt-top' }, el('div', { class: 'tt-wrap' },
      el('a', { class: 'tt-back', href: './' }, '← 사고가시화 도구 모음'),
      el('h1', {}, tool.ko, el('small', {}, tool.en)),
      el('p', { class: 'tt-lead' }, tool.lead))),
    el('div', { class: 'tt-bar' }, el('div', { class: 'tt-wrap' }, statusEl, exBtn,
      el('button', { class: 'tt-btn primary', type: 'button', onclick: () => { flush(); window.print(); } }, '인쇄'),
      el('button', { class: 'tt-btn', type: 'button', onclick: () => {
        if (!confirm('이 학습지에 쓴 내용을 모두 지울까요? 지우면 되돌릴 수 없어요.')) return;
        clearTimeout(timer); dirty = false; store.del(id); state = blank(); render();
        statusEl.textContent = '모두 지웠어요.'; window.scrollTo(0, 0);
      } }, '다시 쓰기'))),
    main,
    el('footer', { class: 'tt-foot tt-wrap' },
      el('p', {}, '쓴 내용은 이 기기(브라우저)에만 저장되고 밖으로 보내지 않아요. 여럿이 같이 쓰는 기기에서는 끝난 뒤 「다시 쓰기」로 지워 주세요.'),
      el('p', {}, '기획·제작 · 룰루랄라 한기쌤(여한기)')));
  render();
  window.addEventListener('resize', () => fitAll(main));
  window.addEventListener('load', () => fitAll(main));
})();
