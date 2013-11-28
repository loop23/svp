// Constructor
playList = function(filer) {
  this.filer = filer;
  this.current = 0;
}

playList.prototype = Array.prototype;

// Need that to display in nice fashion
playList.prototype.asHtmlList = function() {
  var out = '<ul class="playlist">';
  for (var i = 0; i < this.length; i ++) {
    out += '<li>' + (this.current == i ? '&gt; ' : '  ') + this[i] + '</li>';
  };
  out += '</ul>'
  return out;
}

// Proper pl management: getNext and getCurrent
playList.prototype.getNext = function() {
  this.current += 1;
  if (this.current >= this.length)
    this.current = 0;
  console.log("[Playlist] GetNext su %s ha indice a %i", this, this.current);
  return this.getCurrent();
}

playList.prototype.getCurrent = function() {
  return this[this.current];
}

// Parsa una serie di linee separate da nl.
// Torna array di files che possono essere cancellati
playList.prototype.parsePlaylistText = function(text) {
  console.log("[Playlist].parsePlaylistText: I (%o) have this playlist text:\n%o",
  	      this,
  	      text);
  // Copio i files che ho adesso, in modo da poter calcolare la diff
  var old_files = this.filenames();
  var new_entries = [];
  text.split("\n").forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0];
      var filename = md[1];
      var timestamp = md[2];
      var new_item = new playlistItem(this.filer, line);
      // Eh no.
      new_items.push(new_item);
      if (!this.filer.fileExistsLocally(filename)) {
	filer.downloader.downloadPlaylistItem(new_item);
      }
    } else {
      if (line != '')
        console.log("[Playlist] Linea non parsabile: %o", line);
    }
  }.bind(this));
  // new_entries contiene gli item appena letti; Me la cavo con la splice??
  this.splice(0, this.length, new_entries);
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = old_files.difference(this.filenames());
  if (maybe_delete.length > 0) {
    console.log("[Playlist]parsePlayList torna %o to delete:", maybe_delete);
  };
  return maybe_delete;
};

playList.prototype.filenames = function() {
  return this.map(function(e) { return e.localFile });
}

playList.prototype.appendItem = function(item) {
  if (this.some(function(e) { item.localFile === e.localFile })) {
    console.log("[Playlist] Tentato append di %o fallito, c'era gia'!", item);
    return false;
  }
  this.unshift(item);
  return true;
}

// Torna true se riesce a rimuoverlo
playList.prototype.removeItem = function(filename) {
  for (var i = 0; i < this.length; i++) {
    if (this[i].localFile == filename) {
      console.log("[Playlist] Tentato splice di %s da %i", filename, i);
      this = this.splice(i,1);
      return true;
    };
  };
  return false;
}

playList.prototype.hasDownloadedFile = function(filename) {
  if (this.some(function(e) {
    e.localFile === filename &&
    e.status === 'DOWNLOADED'})) {
    return true;
  }
  return false;
}

// Dice alla pl che il download in filename e' completato
playList.prototype.finishDownload = function(filename) {
  for (var i = 0; i < this.length; i++) {
    if (this[i].fileName === filename) {
      console.log("[Playlist].finishDownload ha trovato %o da settare a scaricato", this[i]);
      this[i].finishDownload();
      return true;
    };
  };
  console.log("[Playlist].finishDownload NON HA trovato %o da settare", filename);
  return false;
}
