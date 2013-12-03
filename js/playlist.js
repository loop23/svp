// Playlist holds an array of items

// Constructor
playList = function(filer) {
  this.filer = filer;
  this.current = -1;
  this.items = [];
  this.lastSum = -1;
};

// Proper pl management: getNext and getCurrent
playList.prototype.getNext = function() {
  this.current += 1;
  if (this.current >= this.items.length)
    this.current = 0;
  // console.debug("[Playlist] GetNext su %s ha indice a %i", this, this.current);
  return this.getCurrent();
};

playList.prototype.getCurrent = function() {
  return this.items[this.current];
};

playList.prototype.canPlay = function() {
  return this.items[0] && this.items[0].status === 'DOWNLOADED';
};

// Parsa una serie di linee separate da nl.
// Torna array di files che possono essere cancellati.
// Controlla il sum, se e' come prima non fa nulla
playList.prototype.parsePlaylistText = function(text) {
  console.info("[Playlist].parsePlaylistText: I have some text for %i bytes", text.length);
  var new_sum = text.sum();
  if (new_sum == this.lastSum) {
    console.debug("[Playlist] unchanged!");
    return [];
  }
  // Copio i files che ho adesso, in modo da poter calcolare la diff
  var old_files = this.filenames();
  console.debug("[Playlist] Before parsing,  old_files: %o", old_files);
  var new_items = [];
  text.split("\n").forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0]; // Unused?
      var filename = md[1];
      var timestamp = md[2];
      // Istanziare il pli triggera il controllo se e' gia presente su filer
      var new_item = new playlistItem(this.filer, line);
      new_items.push(new_item);
    } else {
      if (line != '')
        console.warn("[Playlist] Linea non parsabile: %o", line);
    }
  }.bind(this));
  // new_items contiene gli item appena letti;
  this.items = new_items;
  this.lastSum = new_sum;
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = old_files.difference(this.filenames());
  if (maybe_delete.length > 0) {
    console.debug("[Playlist]parsePlayList torna %o to delete:", maybe_delete);
  };
  this.downloadMissing();
  return maybe_delete;
};

playList.prototype.downloadMissing = function() {
  console.debug("[playList] Downloading missing files");
  this.items.forEach(function(item) {
    if (item.ispending()) {
      console.debug("dlmiss, %s was pending, downloading it", item.toString());
      this.filer.downloader.downloadPlaylistItem(item);
    } else {
      ;
    }
  });
};

playList.prototype.filenames = function() {
  return this.items.map(function(e) { return e.localFile });
};

playList.prototype.hasDownloadedFile = function(filename) {
  console.debug("[playlist] ho file %o ?", filename);
  if (this.items.some(function(e) {
    return e.localFile === filename &&
    e.status === 'DOWNLOADED'; })) {
    return true;
  }
  return false;
};

// La pl viene notificata cosi' quando un dl termina
playList.prototype.finishDownload = function(filename) {
  for (var i = 0; i < this.items.length; i++) {
    if (this.items[i].localFile == filename)
      this.items[i].finishDownload();
  }
}

// Need that to display in nice fashion
playList.prototype.asHtmlList = function() {
  var out = '<ul class="playlist">';
  for (var i = 0; i < this.items.length; i ++) {
    out += '<li>' + (this.current == i ? '&gt; ' : '  ') + this.items[i] + '</li>';
  };
  out += '</ul>';
  return out;
};
