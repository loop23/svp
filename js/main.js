// In dev e' 2, in prod e' 1.. come gestirlo non lo so ancora.
const PLAYLIST_URL = 'http://madre-r3.indemo.it/playlists/1.txte';
const ADSERVER_URL = "http://54.247.57.12/www/delivery/avw.php?zoneid=1&amp;n=24739e6";
const PLAYLIST_REFRESH_TIME = 1000 * 60;


function loadFont() {
  var styleNode           = document.createElement("style");
  styleNode.type          = "text/css";
  styleNode.textContent   = "@font-face { font-family: \"MyriadProReg\"; src: url('"
    + chrome.runtime.getURL("css/MYRIADPROREGULAR.woff")
    + "'); }";
  document.head.appendChild(styleNode);
}

// Invocata quando il ciborio e' pronto
document.addEventListener('DOMContentLoaded', function() {
  loadFont();
  openSyncableFileSystem();
  registerKeyHandler();
});

// Apre il fs se puo'
function openSyncableFileSystem() {
  if (!window || !window.webkitRequestFileSystem) {
    error("requestFileSystem unsupported");
    return;
  }
  // log('Obtaining local FileSystem; This sometimes takes a while...');
  window.webkitRequestFileSystem(window.PERSISTENT,
				 1024*1024*1024*30, // 30G
				 onFileSystemOpened,
				 error);
}

// Invocata quando il sistema torna il fs, inizializza la app.
function onFileSystemOpened(fs) {
  console.info('Got FileSystem: %o', fs);
  window.video = new Video(fs, '#video');
  window.mainController = new MainController(fs, '#filer', window.video);
  hideCursor();
  initWorker();
}

// Just to separate concerns into methods, opens worker and starts it
function initWorker() {
  window.worker = new Worker('js/dl_worker.js');
  console.info("I have worker: %o", window.worker);
  window.worker.addEventListener('message', function(e) {
    console.debug("Received from worker: %o", e);
  }, false);
  window.worker.postMessage({
    'cmd': 'initialize',
    'fs': window.filesystem
  });
}

// Just to separate concerns into methods
function hideCursor() {
  // Simula il click, dovrebbe far sparire il cursore
  setTimeout(function() { simulatedClick($('#video')); }, 5000);
}

function registerKeyHandler() {
  $('#body').addEventListener('keypress', keyHandler);
}
