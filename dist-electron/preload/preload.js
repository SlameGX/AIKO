let electron = require("electron");
//#region src/preload/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	setIgnoreMouseEvents: (ignore, options) => electron.ipcRenderer.send("set-ignore-mouse-events", ignore, options),
	onInteractionToggled: (callback) => electron.ipcRenderer.on("interaction-toggled", (_event, isInteractive) => callback(isInteractive)),
	showContextMenu: () => electron.ipcRenderer.send("show-context-menu"),
	closeApp: () => electron.ipcRenderer.send("close-app"),
	moveWindow: (x, y) => electron.ipcRenderer.send("move-window", x, y),
	onGlobalMouseMove: (callback) => electron.ipcRenderer.on("global-mouse-move", (_event, x, y) => callback(x, y))
});
//#endregion
