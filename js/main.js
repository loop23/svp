// Invocata quando il ciborio e' pronto
document.addEventListener('DOMContentLoaded', function() {
  openSyncableFileSystem();
  registerKeyHandler();
  loadAdvert();
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
  console.debug('Got FileSystem: %o', fs);
  window.video = new Video(fs, '#video');
  window.filer = new Filer(fs, '#filer', window.video);
  hideCursor();
  initWorker();
}

// Just to separate concerns into methods, opens worker and starts it
function initWorker() {
  window.worker = new Worker('js/dl_worker.js');
  console.log("I have worker: %o", window.worker);
  window.worker.addEventListener('message', function(e) {
    console.info("Received from worker: %o", e);
  }, false);
  worker.postMessage({
    'cmd': 'initialize',
    'fs': window.filesystem
// Filer can't be serialized :(
//    'filer': window.filer
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
// Chiamata all'inizio per mostrare il primo cartello, e poi da Video.showAdvert
function loadAdvert() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET',
           ADSERVER_URL,
	   true);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    var img = $('#video-overlay img');
    img.src = window.URL.createObjectURL(this.response);
    window.setTimeout(function() {img.src = '';}, 6000);
  };
  xhr.send();
  return false;
}
