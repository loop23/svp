// Playlist holds an array of items

// Constructor
playList = function(filer) {
  this.filer = filer;
  this.current = -1;
  this.items = [];
};

// Proper pl management: getNext and getCurrent
playList.prototype.getNext = function() {
  this.current += 1;
  if (this.current >= this.items.length)
    this.current = 0;
  console.log("[Playlist] GetNext su %s ha indice a %i", this, this.current);
  return this.getCurrent();
};

playList.prototype.getCurrent = function() {
  return this.items[this.current];
};

playList.prototype.canPlay = function() {
  return this.items.some(function(item) { return item.status == 'DOWNLOADED'; });
};

// Parsa una serie di linee separate da nl.
// Torna array di files che possono essere cancellati
playList.prototype.parsePlaylistText = function(text) {
  console.log("[Playlist].parsePlaylistText: I (%o) have this playlist text:\n%o",
  	      this,
  	      text);
  // Copio i files che ho adesso, in modo da poter calcolare la diff
  var old_files = this.filenames();
  console.log("[Playlist] Before parsing,  old_files: %o", old_files);
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
        console.log("[Playlist] Linea non parsabile: %o", line);
    }
  }.bind(this));
  // new_items contiene gli item appena letti;
  this.items = new_items;
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = old_files.difference(this.filenames());
  if (maybe_delete.length > 0) {
    console.log("[Playlist]parsePlayList torna %o to delete:", maybe_delete);
  };
  this.downloadMissing();
  return maybe_delete;
};

playList.prototype.downloadMissing = function() {
  this.items.forEach(function(item) {
		       console.log("dlmiss, item: %s", item);
		       if (item.ispending) {
			 console.log("dlmiss, was pending, downloading it");
			 this.filer.downloader.downloadPlaylistItem(item);
		       } else {
			 console.log("No c'era!");
		       }
      });
};

playList.prototype.filenames = function() {
  return this.items.map(function(e) { return e.localFile });
};

playList.prototype.hasDownloadedFile = function(filename) {
  if (this.items.some(function(e) {
    return e.localFile === filename &&
    e.status === 'DOWNLOADED'; })) {
    return true;
  }
  return false;
};

// Need that to display in nice fashion
playList.prototype.asHtmlList = function() {
  var out = '<ul class="playlist">';
  for (var i = 0; i < this.length; i ++) {
    out += '<li>' + (this.current == i ? '&gt; ' : '  ') + this[i] + '</li>';
  };
  out += '</ul>';
  return out;
};
