// =============================================
// background.js
// =============================================
// コンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askClaude",
    title: "Ask Claude: '%s'",
    contexts: ["selection"]
  });
});

// メニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askClaude" && info.selectionText) {
    // Claudeのタブを作成
    chrome.tabs.create({
      url: 'https://claude.ai/new',
      active: true
    }, (newTab) => {
      // タブが完全に読み込まれるまで待つ
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          // ページ読み込み完了後、少し待ってからスクリプトを実行
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              func: injectText,
              args: [info.selectionText]
            });
          }, 1000);

          // リスナーを削除
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }
});

// Claude.aiのページに注入する関数
function injectText(text) {
  // 複数の試行方法で入力欄を探す
  function findAndFillInput() {
    // 方法1: contenteditable要素を探す
    let inputElement = document.querySelector('[contenteditable="true"][role="textbox"]');

    // 方法2: ProseMirrorクラスを探す
    if (!inputElement) {
      inputElement = document.querySelector('.ProseMirror');
    }

    // 方法3: aria-labelでClaudeの入力欄を探す
    if (!inputElement) {
      inputElement = document.querySelector('[aria-label*="クロード"], [aria-label*="Claude"], [aria-label*="prompt"]');
    }

    if (inputElement) {
      // テキストを挿入
      if (inputElement.querySelector('p')) {
        // 既存のp要素がある場合
        const p = inputElement.querySelector('p');
        p.textContent = text;
      } else {
        // p要素を作成して挿入
        inputElement.innerHTML = `<p>${text}</p>`;
      }

      // 入力イベントを発火（Claudeに変更を認識させる）
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      // フォーカスを当てる
      inputElement.focus();

      // カーソルを末尾に移動
      const range = document.createRange();
      const selection = window.getSelection();
      if (inputElement.lastChild) {
        range.selectNodeContents(inputElement.lastChild);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      console.log('テキストを挿入しました:', text);
      return true;
    }
    return false;
  }

  // 最初の試行
  if (!findAndFillInput()) {
    // 失敗した場合、少し待ってリトライ
    let retries = 0;
    const retryInterval = setInterval(() => {
      if (findAndFillInput() || retries >= 10) {
        clearInterval(retryInterval);
        if (retries >= 10) {
          console.error('入力欄が見つかりませんでした');
          alert('Claude.aiの入力欄が見つかりませんでした。手動で貼り付けてください。\n\nテキスト: ' + text);
        }
      }
      retries++;
    }, 500);
  }
}
