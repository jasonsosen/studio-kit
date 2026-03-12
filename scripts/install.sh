#!/bin/bash
set -e

APP_NAME="Studio Kit"
APP_BUNDLE="Studio Kit.app"
INSTALL_DIR="/Applications"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
LAUNCH_AGENT_PLIST="com.studio.kit.plist"
DATA_DIR="$HOME/.studio-kit"

echo "📦 $APP_NAME インストーラー"
echo "================================"

if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ このスクリプトはmacOS専用です"
    exit 1
fi

if [[ ! -d "$APP_BUNDLE" ]]; then
    echo "❌ $APP_BUNDLE が見つかりません"
    echo "   まず 'npm run tauri build' でビルドしてください"
    exit 1
fi

echo "📦 アプリケーションをインストール中..."
if [[ -d "$INSTALL_DIR/$APP_BUNDLE" ]]; then
    rm -rf "$INSTALL_DIR/$APP_BUNDLE"
fi
cp -R "$APP_BUNDLE" "$INSTALL_DIR/"
echo "   ✅ $INSTALL_DIR にインストールしました"

echo "📁 データディレクトリを作成中..."
mkdir -p "$DATA_DIR"
echo "   ✅ $DATA_DIR を作成しました"

echo "🚀 自動起動を設定中..."
mkdir -p "$LAUNCH_AGENT_DIR"

cat > "$LAUNCH_AGENT_DIR/$LAUNCH_AGENT_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.studio.kit</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/Studio Kit.app/Contents/MacOS/Studio Kit</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/studio-kit.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/studio-kit.err</string>
</dict>
</plist>
EOF

launchctl unload "$LAUNCH_AGENT_DIR/$LAUNCH_AGENT_PLIST" 2>/dev/null || true
launchctl load "$LAUNCH_AGENT_DIR/$LAUNCH_AGENT_PLIST"
echo "   ✅ 開機自動起動を設定しました"

echo ""
echo "================================"
echo "✅ インストール完了！"
echo ""
echo "📍 アプリの場所: $INSTALL_DIR/$APP_BUNDLE"
echo "📂 データの場所: $DATA_DIR"
echo ""
echo "🎉 次回Mac起動時に自動的に起動します"
echo "   今すぐ起動するには:"
echo "   open '/Applications/Studio Kit.app'"
echo ""
