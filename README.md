# Claude Quick Ask

選択したテキストをClaude.aiに自動送信するChrome拡張機能

## 動作仕様

### 1. 選択テキストを Claude に送る（右クリックメニュー）

1. Webページ上でテキストを選択
2. 右クリックメニューから「Ask Claude: '選択テキスト'」を選択
3. 新しいタブでClaude.aiが開き、選択したテキストが自動入力される

### 2. claude.ai 入力欄での ↑ による直前メッセージ呼び戻しを抑止

claude.ai の入力欄でキャレットが**1行目にあるとき**だけ ↑（ArrowUp）を無効化し、直前送信メッセージの呼び戻しによる下書きの上書きを防ぐ。2行目以降では通常どおりカーソル移動として機能する。

- IME 変換中の候補選択（↑↓）は壊さない
- Shift/Ctrl/Meta/Alt 付きの ↑ には介入しない
- メイン入力欄（`contenteditable="true"` の `<div>`）のみ対象

## ファイル構成

- `manifest.json` — 拡張マニフェスト（MV3）
- `background.js` — 右クリックメニューと Claude タブへの注入を行う Service Worker
- `content.js` — claude.ai に注入され ↑ の呼び戻しを抑止する content script
- `icon.png` — アイコン

## インストール手順

1. このリポジトリをクローンまたはダウンロード
   ```bash
   git clone <repository-url>
   cd extension-ask-claude
   ```

2. Chromeで `chrome://extensions/` を開く

3. 右上の「デベロッパーモード」を有効化

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. このフォルダを選択

6. 拡張機能が有効になったことを確認
