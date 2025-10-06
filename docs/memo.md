## インストール手順

1. 新しいフォルダを作成（例: claude-quick-ask）

2. 以下のファイルを作成：
   - manifest.json（上記の内容をコピー）
   - background.js（上記の内容をコピー）
   - icon.png（任意のアイコン画像、なくても動作します）

3. Chromeで拡張機能を読み込む：
   a. chrome://extensions/ を開く
   b. 右上の「デベロッパーモード」をONにする
   c. 「パッケージ化されていない拡張機能を読み込む」をクリック
   d. 作成したフォルダを選択

4. 使い方：
   - 任意のウェブページでテキストを選択
   - 右クリック
   - "Ask Claude: '選択したテキスト'" を選択
   - Claudeが新しいタブで開き、テキストが自動入力される

5. トラブルシューティング：
   - もしテキストが入力されない場合は、Claude.aiの構造が変更された可能性があります
   - その場合はbackground.jsのセレクタを調整してください


```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askClaude" && info.selectionText) {
    // コンテキスト情報を含むテキストを作成
    const contextText = `以下のテキストについて質問があります：

"${info.selectionText}"

出典: ${tab.title}
URL: ${tab.url}`;

    // 以下同じ処理...
    chrome.tabs.create({
      url: 'https://claude.ai/new',
      active: true
    }, (newTab) => {
      // ...
      chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: injectText,
        args: [contextText]  // contextTextを渡す
      });
      // ...
    });
  }
});
```
