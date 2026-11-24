// 用 Node fetch 测试 PATCH /api/mistakes/:id
const base = 'http://127.0.0.1:3000';
const add = await fetch(base + '/api/mistakes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question_text: 'patch test', favorite: 1 }),
}).then((r) => r.json());
console.log('add', add);

const patch = await fetch(base + '/api/mistakes/' + add.id, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ favorite: 0 }),
});
console.log('patch', patch.status, await patch.text());

const fav = await fetch(base + '/api/mistakes?favorite=1').then((r) => r.json());
console.log('favorite list total', fav.total);

await fetch(base + '/api/mistakes/' + add.id, { method: 'DELETE' });
console.log('deleted');
