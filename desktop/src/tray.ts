import { Tray, Menu, BrowserWindow, App, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(app: App, mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABbElEQVRYhe2WQUsDMRCFX5K9eNqDeBAP/gUPHjyIB0FR8A8IHjx48OBBQRAEQfDkQQ+CB0EQBEFQ8A8InjyIJ4/iSbyIB0HYy8xu0t3dtKmUlTqwsGQy8968mckkIiKiiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiI6D+Q4h4AAAAAASUVORK5CYII='
    );
  }

  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show ChatV1', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Hide', click: () => mainWindow.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('ChatV1');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow.isVisible()) mainWindow.focus();
    else mainWindow.show();
  });
}
