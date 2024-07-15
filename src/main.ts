import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  Tray,
} from "electron";
import cron, { ScheduledTask } from "node-cron";
import path from "path";
import parser from "cron-parser";

type Reminder = {
  task: ScheduledTask;
  cronExpression: string;
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const isDev = MAIN_WINDOW_VITE_DEV_SERVER_URL ? true : false;
let mainWindow: BrowserWindow;
let alertWindow: BrowserWindow;
let tray: Tray | null = null;
let reminders: Reminder[] = [];
let idleDate: Date | null = null;
let isLockScreen = false;

const createAlertWindow = () => {
  if (alertWindow != null && !alertWindow.isDestroyed()) {
    return;
  }
  alertWindow = new BrowserWindow({
    backgroundColor: "black",
    titleBarStyle: "hidden",
    show: true,
    width: 800,
    height: 600,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
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
    show: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
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
};

const createTray = () => {
  let imgPath = isDev
    ? "assets/keyTemplate.png"
    : path.join(process.resourcesPath, "keyTemplate.png");
  tray = new Tray(imgPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Préférences",
      click: () => {
        if (mainWindow.isDestroyed()) {
          createSettingsWindow();
        }
        mainWindow.focus();
      },
    },
    {
      label: "Tester",
      click: () => {
        createAlertWindow();
      },
    },
    {
      label: "Fermer",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("scheduled-reminder");
  tray.setContextMenu(contextMenu);
};

const launch = (): void => {
  ipcMain.on("schedule-task", (event, tasks: Record<string, string[]>) => {
    reminders.forEach((reminder) => reminder.task.stop());
    reminders = [];
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
        const cronExpression = `${minute} ${hour} * * ${dayToCronDayNum[day]}`;
        const task = cron.schedule(
          `${minute} ${hour} * * ${dayToCronDayNum[day]}`,
          () => {
            if (!isLockScreen) {
              createAlertWindow();
            }
          }
        );
        reminders.push({
          task,
          cronExpression,
        });
      }
    }
    mainWindow.close();
  });
  ipcMain.on("close-alert", () => {
    if (alertWindow && !alertWindow.isDestroyed()) {
      alertWindow.close();
    }
  });
  createSettingsWindow();
  createTray();
};

const hasOccurrenceBetween = (
  cronExpression: string,
  startDate: Date
): boolean => {
  const interval = parser.parseExpression(cronExpression);
  const prev = interval.prev();
  return prev.toDate().toISOString() > startDate.toISOString();
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

powerMonitor.on("lock-screen", () => {
  idleDate = new Date();
  isLockScreen = true;
});

powerMonitor.on("unlock-screen", () => {
  isLockScreen = false;
  if (!idleDate) {
    return;
  }
  if (
    reminders.some((task) =>
      hasOccurrenceBetween(task.cronExpression, idleDate)
    )
  ) {
    createAlertWindow();
  }
  idleDate = null;
});

powerMonitor.on("suspend", () => {
  if (isLockScreen) {
    return;
  }
  idleDate = new Date();
});

powerMonitor.on("resume", () => {
  if (isLockScreen) {
    return;
  }
  if (
    reminders.some((task) =>
      hasOccurrenceBetween(task.cronExpression, idleDate)
    )
  ) {
    createAlertWindow();
  }
  idleDate = null;
});
app.dock.hide();
