import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', title, body),
  setBadge: (count: number) => ipcRenderer.send('set-badge', count),
  platform: process.platform,
});
