"use strict";
/*
 * 印刷PDFツール — UI層
 * 画像アップロードとオプションUIを担当し、レイアウト/PDF生成は共有コア
 * shared/pdf/card-sheet.js（window.CardSheet）に委譲する。
 */

const { jsPDF } = window.jspdf;
const CardSheet = window.CardSheet;

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
generateBtn.addEventListener("click", () => {
  if (state.cards.length === 0) return;
  setStatus("生成中…");
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
