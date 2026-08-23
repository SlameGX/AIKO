import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron';
import path from 'path';
import { getConfig, saveConfig } from '../shared/config';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isInteractive = true;

const createWindow = () => {
  const config = getConfig();
  isInteractive = !config.clickThrough;

  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    x: config.x,
    y: config.y,
    transparent: true,
    frame: false,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: true, // Only show in tray
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the Vite dev server or the production build
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' }); // TEMPORARY DEBUGGING
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  if (config.clickThrough) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  mainWindow.on('moved', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      saveConfig({ x: bounds.x, y: bounds.y });
    }
  });

  // Hide window instead of closing when requested
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
};

const createTray = () => {
  // Use an empty image for now until we have an actual icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: mainWindow?.isVisible() ? 'Hide Character' : 'Show Character', 
        click: () => {
          if (mainWindow?.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow?.show();
          }
          updateMenu();
        } 
      },
      {
        label: isInteractive ? 'Disable Interaction (Click-Through)' : 'Enable Interaction',
        click: () => {
          isInteractive = !isInteractive;
          mainWindow?.setIgnoreMouseEvents(!isInteractive, { forward: true });
          mainWindow?.webContents.send('interaction-toggled', isInteractive);
          updateMenu();
        }
      },
      { type: 'separator' },
      { 
        label: 'Exit', 
        click: () => {
          app.isQuitting = true;
          app.quit();
        } 
      }
    ]);
    tray?.setContextMenu(contextMenu);
  };

  updateMenu();
};

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Global mouse tracking loop
  let lastX = 0, lastY = 0;
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const point = screen.getCursorScreenPoint();
      if (point.x !== lastX || point.y !== lastY) {
        lastX = point.x;
        lastY = point.y;
        
        // Convert screen coordinates to relative window coordinates [-1, 1] for Live2D
        const bounds = mainWindow.getBounds();
        // Mouse position relative to window center
        const relX = point.x - (bounds.x + bounds.width / 2);
        const relY = point.y - (bounds.y + bounds.height / 2);
        
        // Normalize to roughly [-1, 1]
        const normX = Math.max(-1, Math.min(1, relX / (bounds.width / 2)));
        const normY = Math.max(-1, Math.min(1, relY / (bounds.height / 2)));
        
        mainWindow.webContents.send('global-mouse-move', normX, -normY);
      }
    }
  }, 30);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC listeners
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on('show-context-menu', (event) => {
  const template = [
    {
      label: 'Toggle Interaction (Click-Through)',
      click: () => {
        isInteractive = !isInteractive;
        mainWindow?.setIgnoreMouseEvents(!isInteractive, { forward: true });
        mainWindow?.webContents.send('interaction-toggled', isInteractive);
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) ?? undefined });
});

ipcMain.on('close-app', () => {
  app.isQuitting = true;
  app.quit();
});

ipcMain.on('move-window', (event, x, y) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.setPosition(Math.round(x), Math.round(y));
  }
});
