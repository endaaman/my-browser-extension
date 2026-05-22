function isClaudeComposer(t) {
  return t.tagName === "DIV" && t.contentEditable === "true";
}

function isCaretOnFirstLine(editor) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;
  if ((editor.textContent || "").length === 0) return true;

  // Caret rect: collapsed range だと getClientRects() が空になりやすいので
  // getBoundingClientRect を主、getClientRects[0] をフォールバックにする
  let caretTop = null;
  const cbr = range.getBoundingClientRect();
  if (cbr.height) caretTop = cbr.top;
  if (caretTop === null) {
    const rects = range.getClientRects();
    if (rects.length) caretTop = rects[0].top;
  }
  if (caretTop === null) return true;

  // 先頭行の top は「editor 内で最初に出てくる実テキストノード」を基準にする。
  // editor の offset 0 に collapsed range を置く方式は ProseMirror 内で
  // rect が取れず、padding-top フォールバックに落ちて段落マージン分ズレる。
  let firstTop = null;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.length) continue;
    const probe = document.createRange();
    probe.setStart(node, 0);
    probe.setEnd(node, 1);
    const r = probe.getBoundingClientRect();
    if (r.height) { firstTop = r.top; break; }
  }
  if (firstTop === null) {
    const box = editor.getBoundingClientRect();
    firstTop = box.top + parseFloat(getComputedStyle(editor).paddingTop || "0");
  }

  const lh = parseFloat(getComputedStyle(editor).lineHeight) || 20;
  return (caretTop - firstTop) < lh * 0.5;
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
