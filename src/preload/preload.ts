import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => 
    ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  onInteractionToggled: (callback: (isInteractive: boolean) => void) =>
    ipcRenderer.on('interaction-toggled', (_event, isInteractive) => callback(isInteractive)),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  closeApp: () => ipcRenderer.send('close-app'),
  moveWindow: (x: number, y: number) => ipcRenderer.send('move-window', x, y),
  onGlobalMouseMove: (callback: (x: number, y: number) => void) =>
    ipcRenderer.on('global-mouse-move', (_event, x, y) => callback(x, y))
});
