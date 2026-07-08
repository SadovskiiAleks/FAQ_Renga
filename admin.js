const DATA = window.RENGA_FAQ_DATA || [];

const byId = (id) => document.getElementById(id);
const safe = (text) => String(text || '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const clean = (text) => String(text || '').trim();
const normalize = (text) => clean(text).toLowerCase().replace(/ё/g, 'е').replace(/[\s\n\r\t]+/g, ' ');

const fields = {
  id: byId('fieldId'),
  section: byId('fieldSection'),
  customSection: byId('fieldCustomSection'),
  question: byId('fieldQuestion'),
  answer: byId('fieldAnswer'),
  keywords: byId('fieldKeywords'),
  file: byId('fieldFile'),
};

function currentSections() {
  return [...new Set(DATA.map(x => x['Раздел']).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
}

function getNextId() {
  let max = 0;
  DATA.forEach((item) => {
    const id = String(item['ID'] || '');
    const match = id.match(/REN-Q-(\d+)/i);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return `REN-Q-${String(max + 1).padStart(3, '0')}`;
}

function fillSections() {
  const sections = currentSections();
  fields.section.innerHTML = sections.map(s => `<option value="${safe(s)}">${safe(s)}</option>`).join('') + '<option value="__custom__">Добавить новый раздел…</option>';
}

function getSectionValue() {
  return fields.section.value === '__custom__' ? clean(fields.customSection.value) : fields.section.value;
}

function getAnswerStatus() {
  return clean(fields.answer.value) ? 'Есть ответ' : 'Нет ответа';
}

function makeQuestionObject() {
  return {
    'ID': clean(fields.id.value) || getNextId(),
    'Раздел': getSectionValue(),
    'Содержание вопроса': clean(fields.question.value),
    'Ответ АСКОН': clean(fields.answer.value),
    'Ключевые слова': clean(fields.keywords.value),
    'Файл-пример': clean(fields.file.value),
    'Статус ответа': getAnswerStatus(),
  };
}

function formatObject(obj) {
  return JSON.stringify(obj, null, 2);
}

function updateStatus() {
  const status = getAnswerStatus();
  byId('answerStatusPreview').textContent = status;
  byId('answerStatusPreview').className = status === 'Есть ответ' ? 'status-ok' : 'status-wait';
}

function updatePreview() {
  const obj = makeQuestionObject();
  const status = obj['Статус ответа'];
  byId('previewCard').innerHTML = `
    <h3>${safe(obj['Содержание вопроса'] || 'Новый вопрос')}</h3>
    <div class="meta">
      <span class="tag"><span class="label">ID:</span> ${safe(obj['ID'] || '—')}</span>
      <span class="tag"><span class="label">Раздел:</span> ${safe(obj['Раздел'] || '—')}</span>
      <span class="tag ${status === 'Есть ответ' ? 'ok' : 'wait'}">${safe(status)}</span>
    </div>
    <p class="keywords"><strong>Ключевые слова:</strong> ${safe(obj['Ключевые слова'] || '—')}</p>
    ${obj['Файл-пример'] ? `<p class="keywords"><strong>Файл-пример:</strong> ${safe(obj['Файл-пример'])}</p>` : ''}
  `;
  updateStatus();
  showDuplicateWarning();
}

function generateKeywords() {
  const text = `${fields.question.value} ${fields.answer.value}`.toLowerCase().replace(/ё/g, 'е');
  const stop = new Set('и в во на по для как что это или от до при из с со к ко а но не да ли же бы то у о об над под между через либо если где зачем почему нужно можно будет есть нет'.split(' '));
  const words = text
    .replace(/[^a-zа-я0-9\s\-/]+/gi, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 3 && !stop.has(w));
  const preferred = [];
  const patterns = [
    ['ifc', 'IFC'], ['dwg', 'DWG'], ['pdf', 'PDF'], ['renga', 'Renga'], ['ренга', 'Renga'],
    ['штамп', 'штамп'], ['спецификац', 'спецификация'], ['ведомост', 'ведомость'], ['экспорт', 'экспорт'], ['импорт', 'импорт'],
    ['трубопровод', 'трубопровод'], ['лиценз', 'лицензия'], ['сервер', 'сервер'], ['фильтр', 'фильтр'], ['формул', 'формула'],
    ['параметр', 'параметр'], ['чертеж', 'чертеж'], ['лист', 'лист'], ['модел', 'модель'], ['совместн', 'совместная работа']
  ];
  patterns.forEach(([needle, value]) => { if (text.includes(needle) && !preferred.includes(value)) preferred.push(value); });
  const freq = new Map();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const ranked = [...freq.entries()].sort((a,b) => b[1] - a[1]).map(([w]) => w).slice(0, 12);
  const result = [...new Set([...preferred, ...ranked])].slice(0, 16).join(', ');
  fields.keywords.value = result;
  updatePreview();
}

function showDuplicateWarning() {
  const q = normalize(fields.question.value);
  const box = byId('duplicateWarning');
  if (!q || q.length < 8) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  const matches = DATA.filter(item => {
    const existing = normalize(item['Содержание вопроса']);
    return existing === q || existing.includes(q) || q.includes(existing);
  }).slice(0, 5);
  if (!matches.length) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = `<strong>Возможный дубль:</strong><br>${matches.map(m => `${safe(m['ID'])}: ${safe(m['Содержание вопроса'])}`).join('<br>')}`;
}

function generateBlock() {
  const obj = makeQuestionObject();
  const errors = [];
  if (!obj['ID']) errors.push('ID');
  if (!obj['Раздел']) errors.push('Раздел');
  if (!obj['Содержание вопроса']) errors.push('Содержание вопроса');
  if (errors.length) {
    alert(`Заполните обязательные поля: ${errors.join(', ')}`);
    return null;
  }
  const block = formatObject(obj);
  byId('outputBlock').value = block;
  return obj;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Скопировано');
  } catch (e) {
    const ta = byId('outputBlock');
    ta.focus();
    ta.select();
    document.execCommand('copy');
    alert('Скопировано');
  }
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getUpdatedData() {
  const obj = generateBlock();
  if (!obj) return null;
  const data = DATA.filter(x => x['ID'] !== obj['ID']).concat(obj);
  return data;
}

function clearForm() {
  fields.id.value = getNextId();
  fields.section.selectedIndex = 0;
  fields.customSection.value = '';
  byId('customSectionWrap').classList.add('hidden');
  fields.question.value = '';
  fields.answer.value = '';
  fields.keywords.value = '';
  fields.file.value = '';
  byId('outputBlock').value = '';
  updatePreview();
}

function fillExample() {
  fields.id.value = getNextId();
  fields.section.value = currentSections().includes('Моделирование') ? 'Моделирование' : fields.section.options[0]?.value || '';
  fields.question.value = 'Как настроить отображение элемента на виде?';
  fields.answer.value = 'Для настройки отображения элемента используйте параметры видимости и стили отображения. При необходимости создайте отдельный фильтр и задайте нужные правила отображения для выбранной категории объектов.';
  fields.keywords.value = 'отображение, видимость, стиль отображения, фильтр, вид, категория объектов';
  fields.file.value = 'assets/gif/example.gif';
  updatePreview();
  generateBlock();
}

function init() {
  fillSections();
  fields.id.value = getNextId();
  updatePreview();

  Object.values(fields).forEach(el => el.addEventListener('input', updatePreview));
  fields.section.addEventListener('change', () => {
    byId('customSectionWrap').classList.toggle('hidden', fields.section.value !== '__custom__');
    updatePreview();
  });
  byId('nextIdBtn').addEventListener('click', () => { fields.id.value = getNextId(); updatePreview(); });
  byId('generateKeywordsBtn').addEventListener('click', generateKeywords);
  byId('generateBtn').addEventListener('click', generateBlock);
  byId('clearBtn').addEventListener('click', clearForm);
  byId('fillExampleBtn').addEventListener('click', fillExample);
  byId('copyBlockBtn').addEventListener('click', () => {
    const text = byId('outputBlock').value || (generateBlock() && byId('outputBlock').value);
    if (text) copyText(text);
  });
  byId('downloadTxtBtn').addEventListener('click', () => {
    const text = byId('outputBlock').value || (generateBlock() && byId('outputBlock').value);
    if (text) downloadFile(`${fields.id.value || 'new-question'}.txt`, text);
  });
  byId('downloadDataJsBtn').addEventListener('click', () => {
    const data = getUpdatedData();
    if (!data) return;
    downloadFile('data.js', `window.RENGA_FAQ_DATA = ${JSON.stringify(data, null, 2)};\n`, 'application/javascript;charset=utf-8');
  });
  byId('downloadJsonBtn').addEventListener('click', () => {
    const data = getUpdatedData();
    if (!data) return;
    downloadFile('data.json', JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
  });
}

init();
