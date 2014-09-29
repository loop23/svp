importScripts('/js/downloader.js');

var dl; // Globalozza che detiene il Downloader

addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
  case 'initialize':
    // Can we get that accross?
    console.info("[dl_worker] - initializing with: %o", data);
    break;
  case 'stop':
    console.info('[dl_worker] - WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
    close(); // Terminates the worker.
    break;
  case 'download':
    postMessage('Dl requested to worker: ' + data.remoteUrl);
    r = dl.downloadFile(data.remoteUrl, data.localFile);
    console.debug("[dl_worker] - downloadFile torna %o", r);
    break;
  default:
    postMessage('Unknown command: ' + data.msg);
  };
}, false);


// Apre il fs se puo'
function openSyncableFileSystem() {
  console.debug("[dl_worker] - ofs in worker");
  if (!window || !window.webkitRequestFileSystem) {
    error("requestFileSystem unsupported");
    return;
  }
  console.info('[dl_worker] - Obtaining local FileSystem; This sometimes takes a while...');
  window.webkitRequestFileSystem(window.PERSISTENT,
				 1024*1024*1024*30, // 30G
				 onFileSystemOpened,
				 error);
}

// Invocata quando il sistema torna il fs, inizializza la app.
function onFileSystemOpened(fs) {
  console.info('[dl_worker] - opened FileSystem: %o', fs);
  dl = new Downloader(fs);
  console.debug("[dl_worker] - Got dl? %o", dl);
  postMessage('WORKER STARTED: ' + dl);
}
