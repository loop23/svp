document.addEventListener('DOMContentLoaded', function() {
  openSyncableFileSystem();
});

// Invocata quando il sistema torna il fs, inizializza la app.
function onFileSystemOpened(fs) {
  console.log('Got FileSystem: %o', fs);
  var video = new Video(fs, '#video');
  window.video = video;
  var filer = new Filer(fs, '#filer', video);
  window.filer = filer;
  video.filer = filer;
  // Ora dovrebbe essere ok chiamare loadNext.. ma invece?
  // Per ora mi accontento di questo timeout
  // setTimeout(function() { video.loadNext(); }, 1000);
  // Simula il click, dovrebbe far sparire il cursore
  setTimeout(function() { simulatedClick($('#video')); }, 5000);
  console.log("Sto per uscire da main..");
  // Qui uso il polling perche' video.ended e' (ancora) inaffidabile
}

function openSyncableFileSystem() {
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
