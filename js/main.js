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
  // Simula il click, dovrebbe far sparire il cursore
  setTimeout(function() { simulatedClick($('#video')); }, 5000);
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
