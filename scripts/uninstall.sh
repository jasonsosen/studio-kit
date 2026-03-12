#!/bin/bash
set -e

APP_NAME="Studio Kit"
APP_BUNDLE="Studio Kit.app"
INSTALL_DIR="/Applications"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
LAUNCH_AGENT_PLIST="com.studio.kit.plist"
DATA_DIR="$HOME/.studio-kit"

echo "📦 $APP_NAME アンインストーラー"
echo "================================"

echo "🛑 自動起動を停止中..."
launchctl unload "$LAUNCH_AGENT_DIR/$LAUNCH_AGENT_PLIST" 2>/dev/null || true
rm -f "$LAUNCH_AGENT_DIR/$LAUNCH_AGENT_PLIST"
echo "   ✅ 自動起動を解除しました"

echo "🗑️ アプリケーションを削除中..."
if [[ -d "$INSTALL_DIR/$APP_BUNDLE" ]]; then
    rm -rf "$INSTALL_DIR/$APP_BUNDLE"
    echo "   ✅ アプリを削除しました"
else
    echo "   ⚠️ アプリは見つかりませんでした"
fi

echo ""
read -p "📂 データも削除しますか？ ($DATA_DIR) [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$DATA_DIR"
    echo "   ✅ データを削除しました"
else
    echo "   ℹ️ データは保持されます"
fi

echo ""
echo "================================"
echo "✅ アンインストール完了！"
echo ""
