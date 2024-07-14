import "./index.css";

document.addEventListener("click", (event) => {
  event.preventDefault();
  (window as any).electronAPI.close();
});

document.getElementById("yep").addEventListener("click", (event) => {
  event.preventDefault();
  (window as any).electronAPI.close();
});
