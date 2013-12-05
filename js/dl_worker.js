importScripts('/js/downloader.js');

var dl; // Globalozza che detiene il Downloader

addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
  case 'initialize':
    // Can we get that accross?
    console.log("initializeing with: %o", data);
    break;
  case 'stop':
    ('WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
    close(); // Terminates the worker.
    break;
  case 'download':
    postMessage('Dl requested to worker: ' + data.remoteUrl);
    r = dl.downloadFile(data.remoteUrl, data.localFile);
    console.log("downloadFile torna %o", r);
    break;
  default:
    postMessage('Unknown command: ' + data.msg);
  };
}, false);


// Apre il fs se puo'
function openSyncableFileSystem() {
  console.error("ofs in worker")
  if (!window || !window.webkitRequestFileSystem) {
    error("requestFileSystem unsupported");
    return;
  }
  log('Obtaining local FileSystem; This sometimes takes a while...');
  window.webkitRequestFileSystem(window.PERSISTENT,
				 1024*1024*1024*30, // 30G
				 onFileSystemOpened,
				 error);
}

// Invocata quando il sistema torna il fs, inizializza la app.
function onFileSystemOpened(fs) {
  console.error("fs opened in worker")
  console.debug('Got FileSystem: %o', fs);
  dl = new Downloader(fs);
  console.log("Got dl? %o", dl);
  postMessage('WORKER STARTED: ' + dl);
}
