// ============================================================
// STUDIOSTAFF Windows — Electron Main Process
// ============================================================
// Bundles STUDIOSTAFF inside a native Windows window using
// Electron. Starts an Express server to serve the static SPA
// and proxy API calls to the live Vercel backend.
// ============================================================

const { app, BrowserWindow, Menu, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let server = null;
let actualPort = 3100;
const { startServer } = require('./server');

// Window state persistence file
const STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      return {
        x: data.x,
        y: data.y,
        width: data.width || 1440,
        height: data.height || 900,
        isMaximized: data.isMaximized || false,
      };
    }
  } catch (_) {
    // Corrupt state file — use defaults
  }
  return { width: 1440, height: 900, isMaximized: false };
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const isMaximized = mainWindow.isMaximized();
  const state = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, isMaximized };
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state));
  } catch (_) {
    // Non-critical — silently skip
  }
}

// ============================================================
// Build native Windows app menu
// ============================================================
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Ctrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Ctrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Ctrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Ctrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Ctrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Ctrl+A', role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: 'Actual Size', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'STUDIOSTAFF Website',
          click: () => {
            shell.openExternal('https://studiostaff.houseofexp.com');
          },
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About STUDIOSTAFF',
              message: 'STUDIOSTAFF v1.0.0',
              detail: 'Native Windows Staff Operating System for House of EXP',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================
// Create the main window
// ============================================================
function createWindow() {
  const iconPath = path.join(__dirname, 'favico-exp.png');
  let icon = null;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (_) {
    // Icon optional
  }

  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 600,
    title: 'STUDIOSTAFF',
    icon: icon || undefined,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0A0E12',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
    },
    show: false,
  });

  mainWindow.loadURL('https://studiostaff.houseofexp.com');

  mainWindow.once('ready-to-show', () => {
    if (state.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
  });

  // Save window state on move/resize/close
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// ============================================================
// App lifecycle
// ============================================================
app.whenReady().then(async () => {
  // Required for Windows notification/taskbar grouping
  app.setAppUserModelId('com.houseofexp.studiostaff');

  buildMenu();

  try {
    const { server: serverInstance, port } = await startServer();
    server = serverInstance;
    actualPort = port;
    console.log('[main] Server started on port', port);
  } catch (err) {
    console.error('[main] Failed to start server:', err);
    dialog.showErrorBox(
      'Server Error',
      `Failed to start STUDIOSTAFF server:\n${err.message}\n\nPort ${actualPort} may be in use.`
    );
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On Windows, quit when all windows are closed
  app.quit();
});

app.on('before-quit', () => {
  if (server) {
    server.close();
    server = null;
  }
});
