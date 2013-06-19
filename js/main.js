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
  // Rimetto questo polling, ended e' ancora inaffidabile; Inoltre inizializza la app
  // non appena c'e' qualcosa di visualizzare
  setInterval(function(){
    if (video.hasEnded()) {
      console.log("Ha finito playing!");
      video.loadNext();
    }
  }, 1000);
}

function openSyncableFileSystem() {
  if (!chrome || !chrome.syncFileSystem ||
      !chrome.syncFileSystem.requestFileSystem) {
    error('Syncable FileSystem is not supported in your environment; Maybe too old chrome version (needs at least 28) or too new if APIs changed');
    return;
  }
  if (chrome.syncFileSystem.setConflictResolutionPolicy) {
    chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');
  }
  log('Obtaining syncable FileSystem; This sometimes takes a while...');
  chrome.syncFileSystem.requestFileSystem(function (fs) {
    if (chrome.runtime.lastError) {
      error('requestFileSystem: ' + chrome.runtime.lastError.message);
      return;
    }
    onFileSystemOpened(fs);
  });
  console.log('Esco dal metodo...');
}
