/* Oggettino mezzo triste che wrappa una playlistItem */

playlistItem = function(args) {
  this.downloaded = args['downloaded'] || false
  this.localfile = args['localfile']
  this.remotefile = args['remoteurl']
}

// Che piu' che altro e' un inizializzatore.
playlistItem.prototype.toString = function() {
  return "PlaylistItem: " + this.localfile + (this.downloaded ? '' : '(In progress)');
};

playlistItem.prototype.finishedDownloading = function {
  this.downloaded = true;
}


