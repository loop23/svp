
// Funzionera'?? boh!
importScripts('Downloader.js');

var downloader;

addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
    case 'initialize':
      downloader = new Downloader(data.fs, data.filer);
      break;
    case 'download':
      dl.downloadFile(data.url, data.filename);
      break;
    default:
      postMessage('Unknown command: ' + data.msg);
  };
}, false);
