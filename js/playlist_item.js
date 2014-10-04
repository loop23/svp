/* Oggettino che wrappa un playlistItem

Ha attributi:
  * remoteUrl
  * localFile
  * status (che puo' essere: PENDING || DOWNLOADING || DOWNLOADED || ERROR)
  * title - Il titolo della traccia eventualmente da mostrare
*/

// Constructor
// O addurittura da downloader? mi farebbe comodo iniziare qui i dl
playlistItem = function(remoteUrl, localFile, title) {
  this.localFile = localFile;
  this.title = title;
  if (localFile) {
    this.status = 'DOWNLOADED';
    console.debug("Creato item via localFile: %s", this);
    return;
  }
  this.remoteUrl = remoteUrl;
  var md = remoteUrl.match(/.+\/(.+)$/);
  if (md) {
    console.debug("[PlaylistItem] - qui dentro md: %o", md);
    this.localFile = md[1];
    this.status = window.mainController.fileExistsLocally(this.localFile) ? 'DOWNLOADED' : 'PENDING';
    console.debug("[PlaylistItem] - Creato item via remoteUrl: %s", this.toString());
  } else {
      console.warn("[PlaylistItem] - new PlaylistItem confuso da %s, regexp non matcha", remoteUrl);
  }
};

playlistItem.prototype.ispending = function() {
  return this.status === 'PENDING';
};

playlistItem.prototype.tmpFile = function() {
  return this.localFile + '.tmp';
};

playlistItem.prototype.startDownload = function() {
  console.debug("[PlaylistItem] Invocata startDownload su %s", this.toString());
  if (this.status == 'DOWNLOADING')
    console.warn("[PlaylistItem] - Attenzione, item %o era gia' DOWNLOADING!", this.localFile);
  this.status = 'DOWNLOADING';
};

playlistItem.prototype.isDownloading = function() {
  return this.status == 'DOWNLOADING';
};

playlistItem.prototype.isDownloadFinished = function() {
  return this.status == 'DOWNLOADED';
};

playlistItem.prototype.finishDownload = function() {
  if (this.status == 'DOWNLOADED') {
    console.warn("[PlaylistItem] - Attenzione, item %o era gia' DOWNLOADED!",
		 this.localFile);
  }
  this.status = 'DOWNLOADED';
};

playlistItem.prototype.toString = function() {
    return "[PlaylistItem: " + this.localFile + " - url: " + this.remoteUrl +
	(this.title !== '' ? ('(' + this.title + ')') : '') + ' - ' + this.status + ']';
};
