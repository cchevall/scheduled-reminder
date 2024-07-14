import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import cron, { ScheduledTask } from "node-cron";
import path from "path";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const isDev = MAIN_WINDOW_VITE_DEV_SERVER_URL ? true : false;
let mainWindow: BrowserWindow;
let tray: Tray | null = null;
let scheduledTasks: ScheduledTask[] = [];

const createAlertWindow = () => {
  const alertWindow = new BrowserWindow({
    backgroundColor: "black",
    titleBarStyle: "hidden",
    show: true,
    width: 600,
    height: 600,
    webPreferences: {
      webSecurity: false,
    },
  });
  console.log({
    ALERT_WINDOW_VITE_DEV_SERVER_URL,
    ALERT_WINDOW_VITE_NAME,
  });
  if (ALERT_WINDOW_VITE_DEV_SERVER_URL) {
    alertWindow.loadURL(ALERT_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    alertWindow.loadFile(
      path.join(__dirname, `../renderer/${ALERT_WINDOW_VITE_NAME}/index.html`)
    );
  }
  alertWindow.focus();
  // alertWindow.webContents.openDevTools();
};

const createSettingsWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 750,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  console.log({
    MAIN_WINDOW_VITE_DEV_SERVER_URL,
    MAIN_WINDOW_VITE_NAME,
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
  scheduledTasks.forEach((task) => task.stop());
  scheduledTasks = [];
};

const createTray = () => {
  let imgPath = isDev
    ? "assets/keyTemplate.png"
    : path.join(process.resourcesPath, "keyTemplate.png");
  tray = new Tray(imgPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Settings",
      click: () => {
        if (mainWindow.isDestroyed()) {
          createSettingsWindow();
        }
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Alert",
      click: () => {
        createAlertWindow();
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Electron Scheduler");
  tray.setContextMenu(contextMenu);
};

const launch = (): void => {
  ipcMain.on("schedule-task", (event, tasks: Record<string, string[]>) => {
    // Parse the time and schedule a task
    for (const day in tasks) {
      for (const hours of tasks[day]) {
        const dayToCronDayNum: Record<string, number> = {
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
        };
        const [hour, minute] = hours.split(":").map(Number);
        const task = cron.schedule(
          `${minute} ${hour} * * ${dayToCronDayNum[day]}`,
          () => {
            createAlertWindow();
          }
        );
        scheduledTasks.push(task);
      }
    }
    mainWindow.close();
  });
  createSettingsWindow();
  createTray();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", launch);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createSettingsWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
