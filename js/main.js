var supportsSyncFileSystem = chrome && chrome.syncFileSystem;

document.addEventListener(
  'DOMContentLoaded',
  function() {
    $('#fs-syncable').addEventListener('click', openSyncableFileSystem);
    $('#fs-temporary').addEventListener('click', openTemporaryFileSystem);

    if (supportsSyncFileSystem)
      openSyncableFileSystem();
    else
      openTemporaryFileSystem();
  }
);

function onFileSystemOpened(fs, isSyncable) {
  log('Got Syncable FileSystem.');
  console.log('Got FileSystem:' + fs.name);
  var video = new Video(fs, 'video');
  var filer = new Filer(fs, 'filer', video, isSyncable);
  window.filer = filer;
  video.filer = filer;
  // console.log("filer ha getNext? %o", filer.getNext());
  setInterval(function(){
    if (video.hasEnded()) {
      console.log("Ha finito!");
      video.loadNext();
    } else {
      console.log("Non ha finito");
    }
  }, 500);
}

function openTemporaryFileSystem() {
  $('#fs-temporary').classList.add('selected');
  $('#fs-syncable').classList.remove('selected');
  webkitRequestFileSystem(TEMPORARY, 1024,
                          onFileSystemOpened,
                          error.bind(null, 'requestFileSystem'));
}

function openSyncableFileSystem() {
  if (!chrome || !chrome.syncFileSystem ||
      !chrome.syncFileSystem.requestFileSystem) {
    error('Syncable FileSystem is not supported in your environment.');
    return;
  }
  $('#fs-syncable').classList.add('selected');
  $('#fs-temporary').classList.remove('selected');
  if (chrome.syncFileSystem.setConflictResolutionPolicy) {
    chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');
  }
  log('Obtaining syncable FileSystem...');
  chrome.syncFileSystem.requestFileSystem(function (fs) {
    if (chrome.runtime.lastError) {
      error('requestFileSystem: ' + chrome.runtime.lastError.message);
      $('#fs-syncable').classList.remove('selected');
      return;
    }
    onFileSystemOpened(fs, true);
  });
  console.log('Esco dal metodo...');
}
