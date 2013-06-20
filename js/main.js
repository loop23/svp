document.addEventListener(
  'DOMContentLoaded',
  function() {
    openSyncableFileSystem();
  }
);

function onFileSystemOpened(fs) {
  log('Got Syncable FileSystem.');
  console.log('Got FileSystem:' + fs.name);
  var video = new Video(fs, '#video');
  console.log('Got video!');
  var filer = new Filer(fs, '#filer', video);
  console.log('Got filer!');
  window.filer = filer;
  video.filer = filer;
  setupFiles(fs);
  // Ora dovrebbe essere ok chiamare loadNext.. ma invece?
  // Per ora mi accontento di questo timeout
  setTimeout(function() { video.loadNext(); }, 1000);
  // Rimetto questo polling, ended e' ancora inaffidabile!
  setInterval(function(){
    if (video.hasEnded()) {
      console.log("Ha finito playing!");
      video.loadNext();
    }
  }, 1000);
}

function setupFiles(fs) {
  downloadFile(fs,
	       "http://madre-dam.atcloud.it/media/attachments/63/original/cc_spot_interactbb02.mp4",
	       'cc_spot_interactbb02.mp4');
  downloadFile(fs,
	       "http://madre-dam.atcloud.it/media/attachments/111/original/cc_ugc_130619120435.mp4",
	       'cc_ugc_130619120435.mp4');

}

function downloadFile(fs, url, filename) {
  fs.root.getFile(filename, { create: true }, function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwriteend = function(e) {
	console.log("Write completed: %o", e);
	// Chiamare qualche funzione per riindicizzare
      };
      fileWriter.onerror = function(e) {
        console.log('Write failed: ' + e.toString());
      };
      // Make request for fixed file
      var oReq = new XMLHttpRequest;
      oReq.open("GET", url, true);
      oReq.responseType = "blob";
      var filecontent;
      oReq.addEventListener("progress", function(p) {
	console.log("We have some progress here: %o", p);
      }, false);
      // Funzione che scrive il blob quando abbiamo la risposta
      oReq.onload = function(oEvent) {
	filecontent = oReq.response;
        fileWriter.write(filecontent);
      };
      oReq.send();
    }, error);
  }, error);
}

function openSyncableFileSystem() {
  if (!window || !window.webkitRequestFileSystem) {
    error("requestFileSystem unsupported");
    return;
  }
    log('Obtaining local FileSystem; This sometimes takes a while...');
  window.webkitRequestFileSystem(window.PERSISTENT, 1024*5000, onFileSystemOpened, error);
  console.log('Esco dal metodo che ha richiesto il filesystem...');
}
