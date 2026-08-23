//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let path = require("path");
path = __toESM(path);
let fs = require("fs");
fs = __toESM(fs);
//#region src/shared/config.ts
var DEFAULT_CONFIG = {
	scale: 1,
	opacity: 1,
	fps: 60,
	mouseTracking: true,
	mouseSensitivity: 1,
	clickThrough: false,
	alwaysOnTop: true,
	startWithWindows: false
};
var configCache = null;
var getConfigPath = () => {
	return path.default.join(electron.app.getPath("userData"), "aiko-settings.json");
};
var getConfig = () => {
	if (configCache) return configCache;
	const configPath = getConfigPath();
	try {
		if (fs.default.existsSync(configPath)) {
			const data = fs.default.readFileSync(configPath, "utf-8");
			configCache = {
				...DEFAULT_CONFIG,
				...JSON.parse(data)
			};
		} else configCache = { ...DEFAULT_CONFIG };
	} catch (error) {
		console.error("Failed to read config:", error);
		configCache = { ...DEFAULT_CONFIG };
	}
	return configCache;
};
var saveConfig = (newConfig) => {
	configCache = {
		...getConfig(),
		...newConfig
	};
	try {
		fs.default.writeFileSync(getConfigPath(), JSON.stringify(configCache, null, 2), "utf-8");
	} catch (error) {
		console.error("Failed to save config:", error);
	}
};
//#endregion
//#region src/main/main.ts
var mainWindow = null;
var tray = null;
var isInteractive = true;
var createWindow = () => {
	const config = getConfig();
	isInteractive = !config.clickThrough;
	mainWindow = new electron.BrowserWindow({
		width: 600,
		height: 800,
		x: config.x,
		y: config.y,
		transparent: true,
		frame: false,
		alwaysOnTop: config.alwaysOnTop,
		skipTaskbar: true,
		resizable: false,
		webPreferences: {
			preload: path.default.join(__dirname, "../preload/preload.js"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
		mainWindow.webContents.openDevTools({ mode: "detach" });
	} else mainWindow.loadFile(path.default.join(__dirname, "../../dist/index.html"));
	if (config.clickThrough) mainWindow.setIgnoreMouseEvents(true, { forward: true });
	mainWindow.on("moved", () => {
		if (mainWindow) {
			const bounds = mainWindow.getBounds();
			saveConfig({
				x: bounds.x,
				y: bounds.y
			});
		}
	});
	mainWindow.on("close", (e) => {
		if (!electron.app.isQuitting) {
			e.preventDefault();
			mainWindow?.hide();
		}
	});
};
var createTray = () => {
	const icon = electron.nativeImage.createEmpty();
	tray = new electron.Tray(icon);
	const updateMenu = () => {
		const contextMenu = electron.Menu.buildFromTemplate([
			{
				label: mainWindow?.isVisible() ? "Hide Character" : "Show Character",
				click: () => {
					if (mainWindow?.isVisible()) mainWindow.hide();
					else mainWindow?.show();
					updateMenu();
				}
			},
			{
				label: isInteractive ? "Disable Interaction (Click-Through)" : "Enable Interaction",
				click: () => {
					isInteractive = !isInteractive;
					mainWindow?.setIgnoreMouseEvents(!isInteractive, { forward: true });
					mainWindow?.webContents.send("interaction-toggled", isInteractive);
					updateMenu();
				}
			},
			{ type: "separator" },
			{
				label: "Exit",
				click: () => {
					electron.app.isQuitting = true;
					electron.app.quit();
				}
			}
		]);
		tray?.setContextMenu(contextMenu);
	};
	updateMenu();
};
electron.app.whenReady().then(() => {
	createWindow();
	createTray();
	let lastX = 0, lastY = 0;
	setInterval(() => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			const point = electron.screen.getCursorScreenPoint();
			if (point.x !== lastX || point.y !== lastY) {
				lastX = point.x;
				lastY = point.y;
				const bounds = mainWindow.getBounds();
				const relX = point.x - (bounds.x + bounds.width / 2);
				const relY = point.y - (bounds.y + bounds.height / 2);
				const normX = Math.max(-1, Math.min(1, relX / (bounds.width / 2)));
				const normY = Math.max(-1, Math.min(1, relY / (bounds.height / 2)));
				mainWindow.webContents.send("global-mouse-move", normX, -normY);
			}
		}
	}, 30);
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
	const win = electron.BrowserWindow.fromWebContents(event.sender);
	if (win) win.setIgnoreMouseEvents(ignore, options);
});
electron.ipcMain.on("show-context-menu", (event) => {
	electron.Menu.buildFromTemplate([
		{
			label: "Toggle Interaction (Click-Through)",
			click: () => {
				isInteractive = !isInteractive;
				mainWindow?.setIgnoreMouseEvents(!isInteractive, { forward: true });
				mainWindow?.webContents.send("interaction-toggled", isInteractive);
			}
		},
		{ type: "separator" },
		{
			label: "Exit",
			click: () => {
				electron.app.isQuitting = true;
				electron.app.quit();
			}
		}
	]).popup({ window: electron.BrowserWindow.fromWebContents(event.sender) ?? void 0 });
});
electron.ipcMain.on("close-app", () => {
	electron.app.isQuitting = true;
	electron.app.quit();
});
electron.ipcMain.on("move-window", (event, x, y) => {
	const win = electron.BrowserWindow.fromWebContents(event.sender);
	if (win && !win.isDestroyed()) win.setPosition(Math.round(x), Math.round(y));
});
//#endregion
