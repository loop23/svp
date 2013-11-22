/* Oggettino che wrappa un playlistItem

Ha attributi:
  * remoteUrl
  * localFile
  * status (che puo' essere: PENDING || DOWNLOADING || DOWNLOADED || ERROR)
*/

// Constructor
playlistItem = function(filer, remoteUrl, localFile) {
  this.filer = filer;
  this.localFile = localFile;
  if (localFile) {
    this.status = 'DOWNLOADED';
    return;
  }
  this.remoteUrl = remoteUrl;
  var md = remoteUrl.match(/.+\/(.+)\?(\d+)$/);
  if (md) {
    this.localFile = md[1];
    this.status = filer.fileExistsLocally() ? 'DOWNLOADED' : 'PENDING';
  }
}

playlistItem.prototype.tmpFile = function() {
  return this.localFile + '.tmp';
}

playlistItem.prototype.startDownload = function() {
  if (this.status == 'DOWNLOADING')
    console.warn("Attenzione, %o era gia' DOWNLOADING!", this);
  this.status = 'DOWNLOADING';
}

playlistItem.prototype.isDownloading = function() {
  return this.status == 'DOWNLOADING';
}

playlistItem.prototype.isDownloadFinished = function() {
  return this.status == 'DOWNLOADED';
}

playlistItem.prototype.finishDownload = function() {
  if (this.status == 'DOWNLOADED')
    console.warn("Attenzione, %o era gia' DOWNLOADED!", this);
  this.status = 'DOWNLOADED';
}

playlistItem.prototype.toString = function() {
  return "[PlaylistItem: " + this.localfile + ' - ' + this.status + ']';
}

