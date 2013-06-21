document.addEventListener(
  'DOMContentLoaded',
  function() {
    openSyncableFileSystem();
  }
);

function onFileSystemOpened(fs) {
  console.log('Got FileSystem:' + fs.name);
  var video = new Video(fs, '#video');
  console.log('Got video!');
  var filer = new Filer(fs, '#filer', video);
  console.log('Got filer!');
  window.filer = filer;
  video.filer = filer;
  // Ora dovrebbe essere ok chiamare loadNext.. ma invece?
  // Per ora mi accontento di questo timeout
  setTimeout(function() { video.loadNext(); }, 1000);
  setTimeout(function() { simulatedClick($('#video')); }, 3000);
  // Rimetto questo polling, ended e' ancora inaffidabile!
  setInterval(function(){
    if (video.hasEnded()) {
      console.log("Ha finito playing!");
      video.loadNext();
    }
  }, 1000);
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
