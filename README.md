# 降水量 MCP サーバー

Yahoo!の天気情報 API を使用した降水量データを提供する Model Context Protocol (MCP) サーバーです。

## 機能

このサーバーは以下の 2 つのツールを提供します：

1. **get-rainfall**: 日本の指定座標における現在と予測の降水強度データを取得
2. **get-rainfall-past**: 過去 1〜2 時間の降水強度履歴を取得

## 前提条件

- Node.js 18 以上
- Yahoo!デベロッパーネットワークの API キー
  - [Yahoo!デベロッパーネットワーク](https://developer.yahoo.co.jp/)で取得できます

## インストール

```bash
git clone https://github.com/yourusername/mcp-rainfall.git
cd mcp-rainfall
npm install
```

## ビルド

```bash
npm run build
```

## 使い方

### コマンドラインからの実行

```bash
# 開発環境での実行
node --loader ts-node/esm src/index.ts --yahoo-app-id=YOUR_API_KEY

# ビルド後の実行
node build/index.js --yahoo-app-id=YOUR_API_KEY
```

### mcp.json での設定例

```json
{
  "weather": {
    "command": "node",
    "args": [
      "/path/to/mcp-rainfall/build/index.js",
      "--yahoo-app-id=YOUR_API_KEY"
    ]
  }
}
```

## MCP ツールの利用例

### get-rainfall

緯度・経度を指定して現在と予測の降水強度を取得します。

```json
{
  "longitude": 139.7673,
  "latitude": 35.6809
}
```

### get-rainfall-past

過去の降水強度データを取得します。`past`パラメータには 1 または 2 を指定して、過去 1 時間または 2 時間のデータを取得できます。

```json
{
  "longitude": 139.7673,
  "latitude": 35.6809,
  "past": 2
}
```

## ライセンス

ISC

## 謝辞

このプロジェクトは Yahoo!デベロッパーネットワークの[気象情報 API](https://developer.yahoo.co.jp/webapi/map/openlocalplatform/v1/weather.html)を使用しています。
