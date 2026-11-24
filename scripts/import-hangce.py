# -*- coding: utf-8 -*-
"""把「常识真题总表」「高频逻辑填空词汇表」导入为项目 JSON。"""
import openpyxl, json, os

SRC = r'E:\AI考公助手'
OUT = r'E:\文档\deepseek-harness\default-workspace\shenlun-sucailiao\data\hangce'
os.makedirs(OUT, exist_ok=True)


def sheet_rows(ws):
    it = ws.iter_rows(values_only=True)
    header = next(it)
    header = [('' if h is None else str(h).strip()) for h in header]
    for r in it:
        yield {header[i]: ('' if v is None else str(v).strip()) for i, v in enumerate(r) if i < len(header)}


# ---------- 常识 ----------
wb = openpyxl.load_workbook(os.path.join(SRC, '常识真题总表.xlsx'), read_only=True, data_only=True)
all_q = list(sheet_rows(wb['真题总表']))
answered = list(sheet_rows(wb['有答案_供选卡']))
freq = list(sheet_rows(wb['考频统计']))
wb.close()

json.dump(
    {'total': len(all_q), 'answeredCount': len(answered), 'questions': answered},
    open(os.path.join(OUT, 'changshi.json'), 'w', encoding='utf-8'),
    ensure_ascii=False,
)
json.dump({'freq': freq}, open(os.path.join(OUT, 'changshi_freq.json'), 'w', encoding='utf-8'), ensure_ascii=False)

# ---------- 逻辑填空 ----------
wb = openpyxl.load_workbook(os.path.join(SRC, '高频逻辑填空词汇表.xlsx'), read_only=True, data_only=True)
words = list(sheet_rows(wb['高频逻辑填空词汇表']))
wb.close()

json.dump(
    {'total': len(words), 'words': words},
    open(os.path.join(OUT, 'logic_words.json'), 'w', encoding='utf-8'),
    ensure_ascii=False,
)

print('常识总题数', len(all_q), '有答案', len(answered), '考频行', len(freq))
print('逻辑填空词数', len(words))
print('输出目录', OUT)
