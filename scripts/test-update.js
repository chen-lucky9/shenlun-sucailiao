// 直接测试 updateMistake
import { addMistake, updateMistake, deleteMistake, listMistakes } from '../src/db.js';

const { id } = addMistake({ question_text: 'update test', favorite: 1 });
console.log('added', id);
try {
  console.log('update favorite', updateMistake(id, { favorite: 0 }));
} catch (e) {
  console.error('update favorite ERR', e.message);
}
try {
  console.log('update mastery', updateMistake(id, { mastery: '初步掌握' }));
} catch (e) {
  console.error('update mastery ERR', e.message);
}
console.log('favorites', listMistakes({ favorite: '1' }).total);
deleteMistake(id);
console.log('done');
