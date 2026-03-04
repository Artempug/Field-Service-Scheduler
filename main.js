'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');

const db = require('./src/database');
const { registerRequestHandlers } = require('./src/handlers/requests');
const { registerAuditHandlers }   = require('./src/handlers/audit');
const { registerRefHandlers }     = require('./src/handlers/refs');
const { registerExportHandlers }  = require('./src/handlers/export');

let mainWindow = null;
let tray       = null;

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    title: 'Field Service Scheduler',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,            // needed for better-sqlite3 via preload
    },
  });

  const isDev = process.env.NODE_ENV === 'development' ||
                process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, 'fe', 'dist', 'fe', 'browser', 'index.html'),
    );
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'fe', 'public', 'favicon.ico');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Field Service Scheduler');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Initialise SQLite (creates DB, runs schema, seeds data)
  db.initialize();

  // Register all IPC handlers — pass a mainWindow getter for export dialog
  const getWindow = () => mainWindow;
  registerRequestHandlers(ipcMain, db);
  registerAuditHandlers(ipcMain, db);
  registerRefHandlers(ipcMain, db);
  registerExportHandlers(ipcMain, db, getWindow);

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS keep the app running (tray); on other platforms quit
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  db.close();
});
