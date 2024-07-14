/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "./index.css";

document
  .getElementById("schedule-form")!
  .addEventListener("submit", (event) => {
    event.preventDefault();

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const timeSlots: { [key: string]: string[] } = {};

    days.forEach((day) => {
      timeSlots[day] = [];
      for (let i = 1; i <= 8; i++) {
        const id = `${day}-time${i}`;
        const time = (document.getElementById(id) as HTMLInputElement).value;
        if (time) {
          timeSlots[day].push(time);
        }
      }
    });
    (window as any).electronAPI.scheduleTask(timeSlots);
  });
