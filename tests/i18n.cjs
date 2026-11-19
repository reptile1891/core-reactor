const assert = require('node:assert/strict');
const C = require('../dist/engine');
const I = require('../dist/i18n');

for (const [locale, reason, phase] of [
  ['zh-CN', '失败原因', '阶段'],
  ['tr', 'Yenilgi nedeni', 'Aşama'],
]) {
  const save = C.freshSave();
  save.settings.language = locale;
  const values = new Map();
  const storage = {getItem: key => values.get(key), setItem: (key, value) => values.set(key, value)};
  const store = new C.SaveStore(storage);
  store.import(JSON.stringify(save));
  assert.equal(new C.SaveStore(storage).data.settings.language, locale);
  assert.equal(I.setLanguage(locale), locale);
  assert.equal(I.t('Причина поражения'), reason);
  assert.equal(I.t('Фаза 3'), phase + ' 3');
  assert.equal(
    I.html('<button data-id="Причина поражения" aria-label="Причина поражения">Причина поражения</button>'),
    `<button data-id="Причина поражения" aria-label="${reason}">${reason}</button>`,
  );
}

I.setLanguage('tr');
assert.equal(I.t('Перегрузка · нужно ещё 20 энергии'), 'Aşırı yükleme · gereken: 20 enerji');
assert.equal(I.t('ДО БОССА 00:59'), 'BOSSA KALAN 00:59');
assert.equal(I.t('КРУГ 1/2'), 'TUR 1/2');
assert.equal(I.t('ФАЗА 3'), 'AŞAMA 3');

assert.equal(I.setLanguage('ru'), 'ru');
assert.equal(I.t('Причина поражения'), 'Причина поражения');
assert.equal(I.setLanguage('unsupported'), 'en');
assert.equal(I.t('Причина поражения'), 'Cause of defeat');
console.log('Language selection, save data, translated labels and stable IDs passed.');
