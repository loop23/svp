/* Oggettino che wrappa un playlistItem

Ha attributi:
  * remoteUrl
  * localFile
  * status (che puo' essere: PENDING || DOWNLOADING || DOWNLOADED || ERROR)
*/

// Constructor
// Unica dipendenza per filer e' chiedergli se fileExistsLocally ;
// forse converrebbe dipendere da playlist invece che da filer?
// O addurittura da downloader? mi farebbe comodo iniziare qui i dl
playlistItem = function(filer, remoteUrl, localFile) {
  this.filer = filer;
  this.localFile = localFile;
  if (localFile) {
    this.status = 'DOWNLOADED';
    console.log("Creato item via lf: %s", this);
    return;
  }
  this.remoteUrl = remoteUrl;
  var md = remoteUrl.match(/.+\/(.+)\?(\d+)$/);
  if (md) {
    this.localFile = md[1];
    this.status = filer.fileExistsLocally(this.localFile) ? 'DOWNLOADED' : 'PENDING';
  }
  console.log("Creato item via remoteUrl: %s", this.toString())
};

playlistItem.prototype.ispending = function() {
  return this.status === 'PENDING';
};

playlistItem.prototype.tmpFile = function() {
  return this.localFile + '.tmp';
};

playlistItem.prototype.startDownload = function() {
  console.log("Invocata startDownload su %s", this.toString());
  if (this.status == 'DOWNLOADING')
    console.warn("Attenzione, item %o era gia' DOWNLOADING!", this.localFile);
  this.status = 'DOWNLOADING';
};

playlistItem.prototype.isDownloading = function() {
  return this.status == 'DOWNLOADING';
};

playlistItem.prototype.isDownloadFinished = function() {
  return this.status == 'DOWNLOADED';
};

playlistItem.prototype.finishDownload = function() {
  if (this.status == 'DOWNLOADED')
    console.warn("Attenzione, item %o era gia' DOWNLOADED!", this.localFile);
  this.status = 'DOWNLOADED';
};

playlistItem.prototype.toString = function() {
  return "[PlaylistItem: " + this.localFile + ' - ' + this.status + ']';
};
