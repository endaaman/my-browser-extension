function isClaudeComposer(t) {
  return t.tagName === "DIV" && t.contentEditable === "true";
}

function isCaretOnFirstLine(editor) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;
  if ((editor.textContent || "").length === 0) return true;

  const caretRect = range.getBoundingClientRect();
  // rect が取れない＝判定不能なら native 動作に委ねる（誤 block の方が UX 悪い）
  if (!caretRect.height) return false;

  // キャレットの半行上に caret position を問い合わせる。
  // 解決した位置が editor 内かつ視覚的に上にあるなら「前の行がある」→ 1行目ではない。
  const lh = parseFloat(getComputedStyle(editor).lineHeight) || 20;
  const above = caretRangeAtPoint(caretRect.left, caretRect.top - lh * 0.5);
  if (!above || !editor.contains(above.startContainer)) return true;

  const aboveRect = above.getBoundingClientRect();
  return !(aboveRect.top < caretRect.top - 2);
}

function caretRangeAtPoint(x, y) {
  const pos = document.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const r = document.createRange();
  r.setStart(pos.offsetNode, pos.offset);
  r.collapse(true);
  return r;
}

function handleArrowUp(event) {
  // IME変換中の候補選択を壊さない
  if (event.isComposing || !event.isTrusted) return;
  if (event.key !== "ArrowUp") return;
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

  const t = event.target;
  if (!isClaudeComposer(t)) return;

  if (isCaretOnFirstLine(t)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

document.addEventListener("keydown", handleArrowUp, { capture: true });
