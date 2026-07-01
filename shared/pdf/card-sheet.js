"use strict";
/*
 * card-sheet.js — カード画像を A4 に 3×3＝9枚 並べた印刷用シートを作る再利用コア
 * -----------------------------------------------------------------------------
 * UI から切り離した純粋ロジック。画像の配列（HTMLImageElement[]）とオプションを渡すと、
 *  - drawToCanvas() : プレビュー用に <canvas> へ描画
 *  - buildPdf()     : jsPDF ドキュメントを生成して返す
 * を提供する。
 *
 * 印刷PDFツール（tools/print/）と、将来のカードDB（ルート）から
 * 「カード画像URL → PDF」で共通利用できるようにするための共有モジュール。
 * ES Modules を使わず window.CardSheet に載せる（file:// でもそのまま動く / CSP: script-src 'self'）。
 */
(function (global) {
  const A4_W = 210; // mm
  const A4_H = 297; // mm
  const COLS = 3;
  const ROWS = 3;
  const SLOTS = COLS * ROWS; // 9
  const DPI = 300; // PDF 出力解像度

  const DEFAULT_OPTIONS = {
    cardW: 63,     // mm
    cardH: 88,     // mm
    gap: 0,        // カード間の隙間 mm
    cutMarks: true,
    outline: false,
  };

  function withDefaults(opt) {
    return Object.assign({}, DEFAULT_OPTIONS, opt || {});
  }

  // グリッド全体を中央寄せして各スロットの mm 座標を返す
  function computeLayout(opt) {
    const gridW = COLS * opt.cardW + (COLS - 1) * opt.gap;
    const gridH = ROWS * opt.cardH + (ROWS - 1) * opt.gap;
    const offsetX = (A4_W - gridW) / 2;
    const offsetY = (A4_H - gridH) / 2;
    const positions = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        positions.push({
          x: offsetX + c * (opt.cardW + opt.gap),
          y: offsetY + r * (opt.cardH + opt.gap),
        });
      }
    }
    return { positions, gridW, gridH, offsetX, offsetY };
  }

  // カード境界（トンボ用の左右/上下エッジ）の mm 座標
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

  // 画像を指定アスペクト比の枠に cover で切り抜いて canvas を返す
  function coverCrop(img, targetW, targetH) {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    const ir = img.width / img.height;
    const tr = targetW / targetH;
    let sx, sy, sw, sh;
    if (ir > tr) {
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

  // スロット index に割り当てる画像（複数画像は循環、空なら null）
  function imageForSlot(images, i) {
    if (!images || images.length === 0) return null;
    return images[i % images.length];
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawCutMarksCanvas(ctx, opt, scale) {
    const { colX, rowY, offsetX, offsetY, gridW, gridH } = cutEdges(opt);
    const markLen = 4; // mm
    const mm = (v) => v * scale;
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    colX.forEach((cx) => {
      line(ctx, mm(cx), mm(offsetY - markLen), mm(cx), mm(offsetY));
      line(ctx, mm(cx), mm(offsetY + gridH), mm(cx), mm(offsetY + gridH + markLen));
    });
    rowY.forEach((cy) => {
      line(ctx, mm(offsetX - markLen), mm(cy), mm(offsetX), mm(cy));
      line(ctx, mm(offsetX + gridW), mm(cy), mm(offsetX + gridW + markLen), mm(cy));
    });
  }

  // プレビュー描画：canvas に A4 レイアウトを描く（canvas.width から縮尺を決定）
  function drawToCanvas(canvas, images, opt) {
    opt = withDefaults(opt);
    const ctx = canvas.getContext("2d");
    const scale = canvas.width / A4_W; // px per mm
    canvas.height = Math.round(A4_H * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { positions } = computeLayout(opt);
    const mm = (v) => v * scale;

    positions.forEach((pos, i) => {
      const img = imageForSlot(images, i);
      const x = mm(pos.x), y = mm(pos.y), w = mm(opt.cardW), h = mm(opt.cardH);
      if (img) {
        const cropped = coverCrop(img, Math.round(w), Math.round(h));
        ctx.drawImage(cropped, x, y, w, h);
      } else {
        ctx.fillStyle = "#eef0f4";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#aab";
        ctx.font = `${Math.round(h / 6)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", x + w / 2, y + h / 2);
      }
      if (opt.outline) {
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
    });

    if (opt.cutMarks) drawCutMarksCanvas(ctx, opt, scale);
  }

  function drawCutMarksPdf(pdf, opt) {
    const { colX, rowY, offsetX, offsetY, gridW, gridH } = cutEdges(opt);
    const markLen = 4;
    pdf.setDrawColor(60);
    pdf.setLineWidth(0.15);
    colX.forEach((cx) => {
      pdf.line(cx, offsetY - markLen, cx, offsetY);
      pdf.line(cx, offsetY + gridH, cx, offsetY + gridH + markLen);
    });
    rowY.forEach((cy) => {
      pdf.line(offsetX - markLen, cy, offsetX, cy);
      pdf.line(offsetX + gridW, cy, offsetX + gridW + markLen, cy);
    });
  }

  // 画像URLを HTMLImageElement として読み込む（CORS対応。canvas汚染を避けるため crossOrigin を付与）
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の読み込みに失敗: " + src));
      img.src = src;
    });
  }

  // 1ページ分（最大9枚）を pdf に描画
  function drawPdfPage(pdf, pageImages, opt, pxW, pxH) {
    const { positions } = computeLayout(opt);
    positions.forEach((pos, s) => {
      const img = pageImages[s];
      if (!img) return;
      const cropped = coverCrop(img, pxW, pxH);
      const data = cropped.toDataURL("image/jpeg", 0.92);
      pdf.addImage(data, "JPEG", pos.x, pos.y, opt.cardW, opt.cardH);
      if (opt.outline) {
        pdf.setDrawColor(120);
        pdf.setLineWidth(0.1);
        pdf.rect(pos.x, pos.y, opt.cardW, opt.cardH);
      }
    });
    if (opt.cutMarks) drawCutMarksPdf(pdf, opt);
  }

  // 複数ページ対応：画像を順番に 9枚/ページ で並べ、必要な枚数だけページを作る
  function buildPdfPaged(images, opt, jsPDF) {
    opt = withDefaults(opt);
    if (!jsPDF) throw new Error("jsPDF constructor is required");
    if (!images || images.length === 0) throw new Error("画像が1枚もありません");

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pxW = Math.round((opt.cardW / 25.4) * DPI);
    const pxH = Math.round((opt.cardH / 25.4) * DPI);
    const pageCount = Math.ceil(images.length / SLOTS);

    for (let p = 0; p < pageCount; p++) {
      if (p > 0) pdf.addPage();
      drawPdfPage(pdf, images.slice(p * SLOTS, (p + 1) * SLOTS), opt, pxW, pxH);
    }
    return pdf;
  }

  // 何ページ必要かを返す
  function pageCountFor(imageCount) {
    return Math.ceil((imageCount || 0) / SLOTS);
  }

  // PDF 生成：jsPDF コンストラクタを受け取り、生成済みドキュメントを返す
  function buildPdf(images, opt, jsPDF) {
    opt = withDefaults(opt);
    if (!jsPDF) throw new Error("jsPDF constructor is required");
    if (!images || images.length === 0) throw new Error("画像が1枚もありません");

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const { positions } = computeLayout(opt);
    const pxW = Math.round((opt.cardW / 25.4) * DPI);
    const pxH = Math.round((opt.cardH / 25.4) * DPI);

    positions.forEach((pos, i) => {
      const img = imageForSlot(images, i);
      if (!img) return;
      const cropped = coverCrop(img, pxW, pxH);
      const data = cropped.toDataURL("image/jpeg", 0.92);
      pdf.addImage(data, "JPEG", pos.x, pos.y, opt.cardW, opt.cardH);
      if (opt.outline) {
        pdf.setDrawColor(120);
        pdf.setLineWidth(0.1);
        pdf.rect(pos.x, pos.y, opt.cardW, opt.cardH);
      }
    });

    if (opt.cutMarks) drawCutMarksPdf(pdf, opt);
    return pdf;
  }

  global.CardSheet = {
    A4_W, A4_H, COLS, ROWS, SLOTS, DPI,
    DEFAULT_OPTIONS,
    computeLayout,
    cutEdges,
    coverCrop,
    drawToCanvas,
    buildPdf,
    buildPdfPaged,
    loadImage,
    pageCountFor,
  };
})(window);
