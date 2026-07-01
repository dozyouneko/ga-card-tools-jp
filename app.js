/* カード印刷PDF生成 — A4に3×3=9枚 */

const { jsPDF } = window.jspdf;

// A4 (mm)
const A4_W = 210;
const A4_H = 297;
const COLS = 3;
const ROWS = 3;
const SLOTS = COLS * ROWS; // 9
const DPI = 300; // 出力解像度

const state = {
  cards: [], // { dataUrl, img }
};

// ---- DOM ----
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const cardList = document.getElementById('cardList');
const cardSizeSel = document.getElementById('cardSize');
const customSize = document.getElementById('customSize');
const cardWInput = document.getElementById('cardW');
const cardHInput = document.getElementById('cardH');
const gapInput = document.getElementById('gap');
const cutMarksChk = document.getElementById('cutMarks');
const outlineChk = document.getElementById('outline');
const previewCanvas = document.getElementById('preview');
const generateBtn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');

// ---- 入力 ----
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

['dragenter', 'dragover'].forEach(ev =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); })
);
['dragleave', 'drop'].forEach(ev =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); })
);
dropzone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

function handleFiles(fileList) {
  const files = [...fileList].filter(f => f.type.startsWith('image/'));
  let pending = files.length;
  if (!pending) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.cards.push({ dataUrl: reader.result, img });
        if (--pending === 0) refresh();
        else refresh();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function removeCard(idx) {
  state.cards.splice(idx, 1);
  refresh();
}

function renderCardList() {
  cardList.innerHTML = '';
  state.cards.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'card-thumb';
    const img = document.createElement('img');
    img.src = c.dataUrl;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.title = '削除';
    btn.addEventListener('click', () => removeCard(i));
    div.append(img, btn);
    cardList.appendChild(div);
  });
}

// ---- オプション ----
cardSizeSel.addEventListener('change', () => {
  if (cardSizeSel.value === 'custom') {
    customSize.hidden = false;
  } else {
    customSize.hidden = true;
    const [w, h] = cardSizeSel.value.split(',').map(Number);
    cardWInput.value = w;
    cardHInput.value = h;
  }
  refresh();
});
[cardWInput, cardHInput, gapInput, cutMarksChk, outlineChk].forEach(el =>
  el.addEventListener('input', refresh)
);

function getOptions() {
  const cardW = parseFloat(cardWInput.value) || 63;
  const cardH = parseFloat(cardHInput.value) || 88;
  const gap = parseFloat(gapInput.value) || 0;
  return { cardW, cardH, gap, cutMarks: cutMarksChk.checked, outline: outlineChk.checked };
}

// グリッド全体の配置（中央寄せ）を計算
function computeLayout(opt) {
  const gridW = COLS * opt.cardW + (COLS - 1) * opt.gap;
  const gridH = ROWS * opt.cardH + (ROWS - 1) * opt.gap;
  const offsetX = (A4_W - gridW) / 2;
  const offsetY = (A4_H - gridH) / 2;
  const positions = [];
  for (let r = 0; r < ROWS; r++) {
    for (let cIdx = 0; cIdx < COLS; cIdx++) {
      positions.push({
        x: offsetX + cIdx * (opt.cardW + opt.gap),
        y: offsetY + r * (opt.cardH + opt.gap),
      });
    }
  }
  return { positions, gridW, gridH, offsetX, offsetY };
}

// 画像を指定アスペクト比の枠に cover で切り抜いてcanvasを返す
function coverCrop(img, targetW, targetH) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  const ir = img.width / img.height;
  const tr = targetW / targetH;
  let sx, sy, sw, sh;
  if (ir > tr) {
    // 画像が横長 → 左右をトリミング
    sh = img.height;
    sw = sh * tr;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / tr;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas;
}

// スロット index に割り当てる画像（複数画像は循環）
function cardForSlot(i) {
  if (state.cards.length === 0) return null;
  return state.cards[i % state.cards.length];
}

// ---- プレビュー ----
function drawPreview() {
  const opt = getOptions();
  const ctx = previewCanvas.getContext('2d');
  const scale = previewCanvas.width / A4_W; // px per mm
  previewCanvas.height = Math.round(A4_H * scale);

  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  const { positions } = computeLayout(opt);
  const mm = (v) => v * scale;

  positions.forEach((pos, i) => {
    const card = cardForSlot(i);
    const x = mm(pos.x), y = mm(pos.y), w = mm(opt.cardW), h = mm(opt.cardH);
    if (card) {
      const cropped = coverCrop(card.img, Math.round(w), Math.round(h));
      ctx.drawImage(cropped, x, y, w, h);
    } else {
      ctx.fillStyle = '#eef0f4';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#aab';
      ctx.font = `${Math.round(h / 6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + w / 2, y + h / 2);
    }
    if (opt.outline) {
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    }
  });

  if (opt.cutMarks) drawCutMarksCanvas(ctx, opt, scale);
}

// カード境界（左右/上下の各エッジ）のmm座標を返す
function cutEdges(opt) {
  const { offsetX, offsetY, gridW, gridH } = computeLayout(opt);
  const colX = [];
  const rowY = [];
  for (let c = 0; c < COLS; c++) {
    const left = offsetX + c * (opt.cardW + opt.gap);
    colX.push(left, left + opt.cardW);
  }
  for (let r = 0; r < ROWS; r++) {
    const top = offsetY + r * (opt.cardH + opt.gap);
    rowY.push(top, top + opt.cardH);
  }
  return { colX, rowY, offsetX, offsetY, gridW, gridH };
}

function drawCutMarksCanvas(ctx, opt, scale) {
  const { colX, rowY, offsetX, offsetY, gridW, gridH } = cutEdges(opt);
  const markLen = 4; // mm
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  const mm = (v) => v * scale;
  colX.forEach(cx => {
    line(ctx, mm(cx), mm(offsetY - markLen), mm(cx), mm(offsetY));
    line(ctx, mm(cx), mm(offsetY + gridH), mm(cx), mm(offsetY + gridH + markLen));
  });
  rowY.forEach(cy => {
    line(ctx, mm(offsetX - markLen), mm(cy), mm(offsetX), mm(cy));
    line(ctx, mm(offsetX + gridW), mm(cy), mm(offsetX + gridW + markLen), mm(cy));
  });
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ---- PDF生成 ----
generateBtn.addEventListener('click', generatePDF);

function generatePDF() {
  const opt = getOptions();
  if (state.cards.length === 0) return;

  setStatus('生成中…');
  // 少し遅延させてUIを更新
  setTimeout(() => {
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const { positions } = computeLayout(opt);
      const pxW = Math.round(opt.cardW / 25.4 * DPI);
      const pxH = Math.round(opt.cardH / 25.4 * DPI);

      positions.forEach((pos, i) => {
        const card = cardForSlot(i);
        if (!card) return;
        const cropped = coverCrop(card.img, pxW, pxH);
        const data = cropped.toDataURL('image/jpeg', 0.92);
        pdf.addImage(data, 'JPEG', pos.x, pos.y, opt.cardW, opt.cardH);
        if (opt.outline) {
          pdf.setDrawColor(120);
          pdf.setLineWidth(0.1);
          pdf.rect(pos.x, pos.y, opt.cardW, opt.cardH);
        }
      });

      if (opt.cutMarks) drawCutMarksPDF(pdf, opt);

      pdf.save('cards_a4.pdf');
      setStatus('✅ PDFを保存しました');
    } catch (err) {
      console.error(err);
      setStatus('❌ エラー: ' + err.message);
    }
  }, 30);
}

function drawCutMarksPDF(pdf, opt) {
  const { colX, rowY, offsetX, offsetY, gridW, gridH } = cutEdges(opt);
  const markLen = 4;
  pdf.setDrawColor(60);
  pdf.setLineWidth(0.15);
  colX.forEach(cx => {
    pdf.line(cx, offsetY - markLen, cx, offsetY);
    pdf.line(cx, offsetY + gridH, cx, offsetY + gridH + markLen);
  });
  rowY.forEach(cy => {
    pdf.line(offsetX - markLen, cy, offsetX, cy);
    pdf.line(offsetX + gridW, cy, offsetX + gridW + markLen, cy);
  });
}

// ---- 共通 ----
function setStatus(msg) { statusEl.textContent = msg; }

function refresh() {
  renderCardList();
  drawPreview();
  generateBtn.disabled = state.cards.length === 0;
  if (state.cards.length === 0) setStatus('');
}

refresh();
