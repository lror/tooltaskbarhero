#!/usr/bin/env bash
# Cria o symlink steam_save/ apontando para o save do Taskbar Hero (Steam Proton/Linux)
APPID=3678970
BASE="pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero"
for ROOT in "$HOME/.steam/steam" "$HOME/.steam/debian-installation" "$HOME/.local/share/Steam"; do
  TARGET="$ROOT/steamapps/compatdata/$APPID/$BASE"
  if [ -d "$TARGET" ]; then
    ln -sfn "$TARGET" steam_save
    echo "✅ symlink steam_save -> $TARGET"
    exit 0
  fi
done
echo "⚠️ Pasta do jogo não encontrada. Use upload manual ou 'Selecionar Pasta Completa'."
exit 1
