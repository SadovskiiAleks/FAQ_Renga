const DATA = window.RENGA_FAQ_DATA || [];
const state = {
  query: '',
  section: '',
  answer: '',
  sort: 'default',
  view: localStorage.getItem('rengaFaqView') || 'tile',
  selectedId: null,
};

const byId = (id) => document.getElementById(id);
const unique = (values) => [...new Set(values.filter(Boolean))];
const isAnswered = (x) => String(x['Ответ АСКОН'] || '').trim().length > 0;
const answerStatus = (x) => isAnswered(x) ? 'Есть ответ' : 'Нет ответа';
const safe = (text) => String(text || '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'ru', { sensitivity: 'base', numeric: true });

function sectionIcon(section) {
  const s = String(section || '').toLowerCase();
  if (!section) return '⌂';
  if (s.includes('установка') || s.includes('лиценз')) return '⚙';
  if (s.includes('интерфейс')) return '◈';
  if (s.includes('модел')) return '⬡';
  if (s.includes('инженер')) return '⌇';
  if (s.includes('документа')) return '▤';
  if (s.includes('импорт')) return '⇅';
  if (s.includes('совмест')) return '◎';
  if (s.includes('формул')) return 'ƒ';
  if (s.includes('ошиб')) return '△';
  if (s.includes('предлож')) return '✦';
  return '•';
}

function linkify(text) {
  const escaped = safe(text);
  return escaped.replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function getFileUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value;
}

function initFilters() {
  const sections = unique(DATA.map(x => x['Раздел']));
  byId('totalCount').textContent = DATA.length;
  byId('answerCount').textContent = DATA.filter(isAnswered).length;
  byId('noAnswerCount').textContent = DATA.filter(x => !isAnswered(x)).length;

  const sectionSelect = byId('sectionFilter');
  for (const section of sections) {
    sectionSelect.insertAdjacentHTML('beforeend', `<option value="${safe(section)}">${safe(section)}</option>`);
  }
  renderSections(sections);
  setView(state.view);
}

function renderSections(sections) {
  const counts = Object.fromEntries(sections.map(s => [s, DATA.filter(x => x['Раздел'] === s).length]));
  const total = DATA.length;
  const rows = [
    `<div class="section-btn active" data-section=""><span class="section-icon">${sectionIcon('')}</span><span class="section-name">Все вопросы</span><span class="count">${total}</span></div>`
  ];
  for (const section of sections) {
    rows.push(`<div class="section-btn" data-section="${safe(section)}"><span class="section-icon">${sectionIcon(section)}</span><span class="section-name">${safe(section)}</span><span class="count">${counts[section]}</span></div>`);
  }
  byId('sectionList').innerHTML = rows.join('');
  document.querySelectorAll('.section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.section = btn.dataset.section;
      byId('sectionFilter').value = state.section;
      render();
    });
  });
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  return DATA.filter(x => {
    const status = answerStatus(x);
    const blob = [x['ID'], x['Раздел'], x['Содержание вопроса'], x['Ответ АСКОН'], x['Ключевые слова'], x['Файл-пример'], status].join(' ').toLowerCase();
    return (!q || blob.includes(q)) &&
      (!state.section || x['Раздел'] === state.section) &&
      (!state.answer || status === state.answer);
  });
}

function sortRows(rows) {
  const arr = [...rows];
  switch (state.sort) {
    case 'question': return arr.sort((a,b) => cmp(a['Содержание вопроса'], b['Содержание вопроса']));
    case 'section': return arr.sort((a,b) => cmp(a['Раздел'], b['Раздел']) || cmp(a['Содержание вопроса'], b['Содержание вопроса']));
    case 'status': return arr.sort((a,b) => cmp(answerStatus(a), answerStatus(b)) || cmp(a['Содержание вопроса'], b['Содержание вопроса']));
    default: return arr;
  }
}

function setView(view) {
  state.view = view === 'list' ? 'list' : 'tile';
  localStorage.setItem('rengaFaqView', state.view);
  byId('tileViewBtn').classList.toggle('active', state.view === 'tile');
  byId('listViewBtn').classList.toggle('active', state.view === 'list');
  const cards = byId('cards');
  cards.classList.toggle('cards-tile', state.view === 'tile');
  cards.classList.toggle('cards-list', state.view === 'list');
}

function updateHead(rows) {
  byId('visibleCount').textContent = rows.length;
  document.querySelectorAll('.section-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.section === state.section));
  const title = state.section || 'Все вопросы';
  byId('contentTitle').textContent = title;
  if (state.query) {
    byId('contentSub').textContent = `Результаты поиска по запросу: «${state.query}»`;
  } else if (state.answer) {
    byId('contentSub').textContent = `Фильтр по статусу ответа: ${state.answer}`;
  } else if (state.section) {
    byId('contentSub').textContent = `Выбран раздел: ${state.section}`;
  } else {
    byId('contentSub').textContent = 'Выберите интересующий вопрос из списка или воспользуйтесь строкой поиска.';
  }
}

function render() {
  const rows = sortRows(filtered());
  updateHead(rows);
  const cards = byId('cards');
  if (!rows.length) {
    cards.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте изменить запрос или сбросить фильтры.</div>';
    renderDetails(null);
    return;
  }

  if (!state.selectedId || !rows.some(x => x['ID'] === state.selectedId)) {
    state.selectedId = rows[0]['ID'];
  }

  cards.innerHTML = rows.map(x => cardHTML(x)).join('');
  document.querySelectorAll('.qa-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedId = card.dataset.id;
      renderDetails(DATA.find(x => x['ID'] === state.selectedId));
      document.querySelectorAll('.qa-card').forEach(c => c.classList.toggle('selected', c.dataset.id === state.selectedId));
    });
  });
  document.querySelectorAll('.more-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedId = btn.dataset.id;
      renderDetails(DATA.find(x => x['ID'] === state.selectedId));
      document.querySelectorAll('.qa-card').forEach(c => c.classList.toggle('selected', c.dataset.id === state.selectedId));
    });
  });
  renderDetails(DATA.find(x => x['ID'] === state.selectedId));
}

function cardHTML(x) {
  const status = answerStatus(x);
  const ok = status === 'Есть ответ';
  const selected = state.selectedId === x['ID'];
  const keywords = String(x['Ключевые слова'] || '').trim();
  return `<article class="qa-card ${selected ? 'selected' : ''} ${ok ? '' : 'no-answer'}" data-id="${safe(x['ID'])}">
    <span class="bookmark" title="Карточка вопроса">♡</span>
    <h3>${safe(x['Содержание вопроса'])}</h3>
    <div class="meta">
      <span class="tag"><span class="label">Раздел:</span> ${safe(x['Раздел'])}</span>
      <span class="tag ${ok ? 'ok' : 'wait'}">${ok ? '✓ Есть ответ' : 'Нет ответа'}</span>
    </div>
    <p class="keywords"><strong>Ключевые слова:</strong> ${keywords ? safe(keywords) : 'не указаны'}</p>
    <div class="card-footer">
      <span class="card-id">${safe(x['ID'])}</span>
      <button type="button" class="more-btn" data-id="${safe(x['ID'])}">Подробнее</button>
    </div>
  </article>`;
}

function renderDetails(x) {
  const panel = byId('detailsPanel');
  if (!x) {
    panel.innerHTML = `<div class="details-empty"><div class="empty-icon">i</div><h2>Выберите вопрос</h2><p>Нажмите на карточку или кнопку «Подробнее», чтобы открыть полный ответ АСКОН.</p></div>`;
    return;
  }
  const status = answerStatus(x);
  const ok = status === 'Есть ответ';
  const answer = String(x['Ответ АСКОН'] || '').trim();
  const file = getFileUrl(x['Файл-пример']);
  const keywords = String(x['Ключевые слова'] || '').split(',').map(s => s.trim()).filter(Boolean);
  panel.innerHTML = `<div class="detail-inner">
    <div class="detail-top">
      <h2>${safe(x['Содержание вопроса'])}</h2>
      <button type="button" class="panel-close" title="Закрыть">×</button>
    </div>
    <div class="detail-meta">
      <span class="tag"><span class="label">ID:</span> ${safe(x['ID'])}</span>
      <span class="tag"><span class="label">Раздел:</span> ${safe(x['Раздел'])}</span>
      <span class="tag ${ok ? 'ok' : 'wait'}">${ok ? '✓ Есть ответ' : 'Нет ответа'}</span>
    </div>

    <section class="detail-section">
      <h3>Ответ АСКОН</h3>
      <div class="answer-box ${ok ? '' : 'no-answer'}">${ok ? linkify(answer) : 'Ответ пока не добавлен'}</div>
    </section>

    <section class="detail-section">
      <h3>Ключевые слова</h3>
      <div class="keyword-cloud">${keywords.length ? keywords.slice(0, 40).map(k => `<span class="keyword-chip">${safe(k)}</span>`).join('') : '<span class="muted">Ключевые слова не указаны</span>'}</div>
    </section>

    <section class="detail-section">
      <h3>Файл-пример</h3>
      ${file ? fileHTML(file) : '<div class="muted">Файл-пример не добавлен</div>'}
    </section>

    <section class="detail-section">
      <h3>Связанные вопросы</h3>
      ${relatedHTML(x)}
    </section>
  </div>`;
  const close = panel.querySelector('.panel-close');
  if (close) close.addEventListener('click', () => renderDetails(null));
}

function fileHTML(file) {
  const href = String(file || '').trim();
  const name = href.split('/').pop() || href;
  const lower = href.toLowerCase();

  const isGif = lower.endsWith('.gif');
  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
  const isPdf = lower.endsWith('.pdf');
  const isArchive = lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z');
  const icon = isPdf ? 'PDF' : isArchive ? 'ZIP' : 'FILE';

  if (isGif || isImage) {
    return `<div class="file-card file-card-media-only">
      <div class="media-preview-wrap">
        <img class="media-preview" src="${safe(href)}" alt="Файл-пример">
      </div>
    </div>`;
  }

  return `<div class="file-card">
    <div class="file-info">
      <div class="file-icon">${icon}</div>
      <div>
        <div class="file-name">Файл-пример</div>
      </div>
    </div>
    <a class="file-action" href="${safe(href)}" target="_blank" rel="noopener">${isPdf ? 'Открыть PDF' : 'Открыть файл'}</a>
  </div>`;
}

function relatedHTML(x) {
  const section = x['Раздел'];
  const currentId = x['ID'];
  const currentWords = new Set(String(x['Ключевые слова'] || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));
  let candidates = DATA.filter(i => i['ID'] !== currentId && i['Раздел'] === section && isAnswered(i)).slice(0, 8);
  candidates = candidates.map(item => {
    const words = String(item['Ключевые слова'] || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const score = words.filter(w => currentWords.has(w)).length;
    return [score, item];
  }).sort((a,b) => b[0] - a[0]).slice(0, 2).map(x => x[1]);
  if (!candidates.length) return '<div class="muted">Связанные вопросы не подобраны</div>';
  return `<div class="related-placeholder">${candidates.map(i => `<div role="button" tabindex="0" data-rel="${safe(i['ID'])}"><span>${safe(i['Содержание вопроса'])}</span><span>›</span></div>`).join('')}</div>`;
}

function bindRelatedClicks() {
  document.addEventListener('click', (e) => {
    const rel = e.target.closest('[data-rel]');
    if (!rel) return;
    const id = rel.dataset.rel;
    state.selectedId = id;
    const item = DATA.find(x => x['ID'] === id);
    renderDetails(item);
    document.querySelectorAll('.qa-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
  });
}

byId('search').addEventListener('input', e => { state.query = e.target.value; render(); });
byId('sectionFilter').addEventListener('change', e => { state.section = e.target.value; render(); });
byId('answerFilter').addEventListener('change', e => { state.answer = e.target.value; render(); });
byId('sortFilter').addEventListener('change', e => { state.sort = e.target.value; render(); });
byId('tileViewBtn').addEventListener('click', () => { setView('tile'); render(); });
byId('listViewBtn').addEventListener('click', () => { setView('list'); render(); });
byId('resetBtn').addEventListener('click', () => {
  state.query = ''; state.section = ''; state.answer = ''; state.sort = 'default';
  byId('search').value = ''; byId('sectionFilter').value = ''; byId('answerFilter').value = ''; byId('sortFilter').value = 'default';
  render();
});
byId('aboutBtn').addEventListener('click', () => { byId('aboutModal').style.display = 'block'; });
byId('closeAbout').addEventListener('click', () => { byId('aboutModal').style.display = 'none'; });
byId('aboutModal').addEventListener('click', e => { if (e.target.id === 'aboutModal') byId('aboutModal').style.display = 'none'; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') byId('aboutModal').style.display = 'none'; });

initFilters();
bindRelatedClicks();
render();
