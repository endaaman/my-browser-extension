function isClaudeComposer(t) {
  return t.tagName === "DIV" && t.contentEditable === "true";
}

function isCaretOnFirstLine(editor) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;
  if ((editor.textContent || "").length === 0) return true;

  const cr = range.getClientRects();
  const caretTop = cr.length ? cr[0].top : range.getBoundingClientRect().top;
  if (!caretTop) return true;

  const probe = document.createRange();
  probe.selectNodeContents(editor);
  probe.collapse(true);
  const pr = probe.getClientRects();
  let firstTop = pr.length ? pr[0].top : probe.getBoundingClientRect().top;
  if (!firstTop) {
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
