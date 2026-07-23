"use strict";
/*
 * 印刷PDFツール — UI層
 * 画像アップロードとオプションUIを担当し、レイアウト/PDF生成は共有コア
 * shared/pdf/card-sheet.js（window.CardSheet）に委譲する。
 */

const CardSheet = window.CardSheet;

// jsPDF（356KB）はPDF生成のときだけ要る。初期読み込みから外し、
// 「PDFを生成する」を押した時点で取得する（#22）
let jspdfPromise = null;
function loadJsPdf() {
  if (jspdfPromise) return jspdfPromise;
  jspdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "../../shared/vendor/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf);
    s.onerror = () => { jspdfPromise = null; reject(new Error("PDFエンジンの読み込みに失敗しました")); };
    document.head.appendChild(s);
  });
  return jspdfPromise;
}

const state = {
  cards: [], // { dataUrl, img }
};

// ---- DOM ----
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const cardList = document.getElementById("cardList");
const cardSizeSel = document.getElementById("cardSize");
const customSize = document.getElementById("customSize");
const cardWInput = document.getElementById("cardW");
const cardHInput = document.getElementById("cardH");
const gapInput = document.getElementById("gap");
const cutMarksChk = document.getElementById("cutMarks");
const outlineChk = document.getElementById("outline");
const previewCanvas = document.getElementById("preview");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");

// ---- 入力 ----
dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
);
dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

function handleFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith("image/"));
  let pending = files.length;
  if (!pending) return;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.cards.push({ dataUrl: reader.result, img });
        refresh();
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
  cardList.innerHTML = "";
  state.cards.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "card-thumb";
    const img = document.createElement("img");
    img.src = c.dataUrl;
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.title = "削除";
    btn.addEventListener("click", () => removeCard(i));
    div.append(img, btn);
    cardList.appendChild(div);
  });
}

// ---- オプション ----
cardSizeSel.addEventListener("change", () => {
  if (cardSizeSel.value === "custom") {
    customSize.hidden = false;
  } else {
    customSize.hidden = true;
    const [w, h] = cardSizeSel.value.split(",").map(Number);
    cardWInput.value = w;
    cardHInput.value = h;
  }
  refresh();
});
[cardWInput, cardHInput, gapInput, cutMarksChk, outlineChk].forEach((el) =>
  el.addEventListener("input", refresh)
);

function getOptions() {
  return {
    cardW: parseFloat(cardWInput.value) || 63,
    cardH: parseFloat(cardHInput.value) || 88,
    gap: parseFloat(gapInput.value) || 0,
    cutMarks: cutMarksChk.checked,
    outline: outlineChk.checked,
  };
}

function images() {
  return state.cards.map((c) => c.img);
}

// ---- PDF生成 ----
generateBtn.addEventListener("click", async () => {
  if (state.cards.length === 0) return;
  // 生成処理に入る前に jsPDF を用意する（未定義のまま buildPdf に渡さない）
  setStatus("PDFエンジンを読み込み中…");
  let jsPDF;
  try {
    ({ jsPDF } = await loadJsPdf());
  } catch (err) {
    console.error(err);
    setStatus("❌ エラー: " + err.message);
    return;
  }
  setStatus("生成中…");
  // 「生成中…」を描画させてから同期の重い処理に入るためのウェイト（従来どおり）
  setTimeout(() => {
    try {
      const pdf = CardSheet.buildPdf(images(), getOptions(), jsPDF);
      pdf.save("cards_a4.pdf");
      setStatus("✅ PDFを保存しました");
    } catch (err) {
      console.error(err);
      setStatus("❌ エラー: " + err.message);
    }
  }, 30);
});

// ---- 共通 ----
function setStatus(msg) { statusEl.textContent = msg; }

function refresh() {
  renderCardList();
  CardSheet.drawToCanvas(previewCanvas, images(), getOptions());
  generateBtn.disabled = state.cards.length === 0;
  if (state.cards.length === 0) setStatus("");
}

refresh();
