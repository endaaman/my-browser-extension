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

  // 何もないところで右クリックした時のサブメニュー
  chrome.contextMenus.create({
    id: "copyMenu",
    title: "コピー",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "copyTitle",
    parentId: "copyMenu",
    title: "タイトルをコピー",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "copyMarkdown",
    parentId: "copyMenu",
    title: "Markdownでコピー",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "copyAmazonShortUrl",
    parentId: "copyMenu",
    title: "Amazonの短縮URLをコピー",
    contexts: ["page"],
    // Amazonのときだけ有効化
    documentUrlPatterns: ["*://*.amazon.co.jp/*"]
  });
});

// コピー系メニューの処理
const copyMenuIds = ["copyTitle", "copyMarkdown", "copyAmazonShortUrl"];

// メニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (copyMenuIds.includes(info.menuItemId) && tab && tab.id != null) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: copyToClipboard,
      args: [info.menuItemId]
    });
    return;
  }

  if (info.menuItemId === "askClaude" && info.selectionText) {
    // Claudeのタブを作成
    chrome.tabs.create({
      url: 'https://claude.ai/new',
      active: true
    }, (newTab) => {
      // タブが完全に読み込まれるまで待つ
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        // loading状態になったら即座にlocalStorageを書き込む
        if (tabId === newTab.id && changeInfo.status === 'loading') {
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: setLocalStorage,
            args: [info.selectionText]
          });
        }

        if (tabId === newTab.id && changeInfo.status === 'complete') {
          // ページ読み込み完了後、DOMでも書き換え
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              func: injectTextToDOM,
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

// クリップボードにコピーする関数（ページコンテキストで実行）
function copyToClipboard(menuItemId) {
  function writeText(text) {
    // textarea + execCommand（注入スクリプトで確実に動く方法）
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      // フォールバック
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    }
    document.body.removeChild(textarea);
  }

  let text = null;

  if (menuItemId === 'copyTitle') {
    text = document.title;
  } else if (menuItemId === 'copyMarkdown') {
    text = `[${document.title}](${location.href})`;
  } else if (menuItemId === 'copyAmazonShortUrl') {
    // /dp/ASIN, /gp/product/ASIN などからASINを抽出
    const match = location.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    if (match) {
      text = `https://www.amazon.co.jp/dp/${match[1]}`;
    } else {
      console.warn('ASINが見つかりませんでした:', location.href);
      return;
    }
  }

  if (text != null) {
    writeText(text);
    console.log('クリップボードにコピーしました:', text);
  }
}

// localStorageに書き込む関数（ページ読み込み前に実行）
function setLocalStorage(text) {
  const storageKey = 'LSS-new-conversation:textInput';
  const existing = localStorage.getItem(storageKey);

  let storageValue;
  let parsed = null;
  let parseError = false;

  if (existing) {
    parsed = JSON.parse(existing);
  }

  if (parseError || !parsed) {
    // パースエラーまたはエントリーが存在しない場合は新規作成
    storageValue = {
      value: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{
            type: "text",
            text: text
          }]
        }]
      },
      tabId: crypto.randomUUID(),
      timestamp: Date.now()
    };
  } else {
    // 必要なキーがすべて存在するか検証
    const isValid = parsed &&
                    typeof parsed === 'object' &&
                    parsed.value &&
                    parsed.value.type === 'doc' &&
                    Array.isArray(parsed.value.content) &&
                    typeof parsed.tabId === 'string' &&
                    typeof parsed.timestamp === 'number';

    if (isValid) {
      // 形式が正しければcontentだけ書き換え
      storageValue = parsed;
      storageValue.value.content = [{
        type: "paragraph",
        content: [{
          type: "text",
          text: text
        }]
      }];
      storageValue.timestamp = Date.now();
    } else {
      // 形式が不正なら新規作成
      storageValue = {
        value: {
          type: "doc",
          content: [{
            type: "paragraph",
            content: [{
              type: "text",
              text: text
            }]
          }]
        },
        tabId: crypto.randomUUID(),
        timestamp: Date.now()
      };
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(storageValue));
}

// DOMに直接書き込む関数（フォールバック）
function injectTextToDOM(text) {
  function findAndFillInput() {
    // contenteditable要素を探す
    let inputElement = document.querySelector('[contenteditable="true"][role="textbox"]');

    // ProseMirrorクラスを探す
    if (!inputElement) {
      inputElement = document.querySelector('.ProseMirror');
    }

    // aria-labelでClaudeの入力欄を探す
    if (!inputElement) {
      inputElement = document.querySelector('[aria-label*="クロード"], [aria-label*="Claude"], [aria-label*="prompt"]');
    }

    if (inputElement) {
      // テキストを挿入
      if (inputElement.querySelector('p')) {
        const p = inputElement.querySelector('p');
        p.textContent = text;
      } else {
        inputElement.innerHTML = `<p>${text}</p>`;
      }

      // 入力イベントを発火
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

      console.log('DOMにテキストを挿入しました:', text);
      return true;
    }
    return false;
  }

  // DOMでの挿入を試行
  if (!findAndFillInput()) {
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
