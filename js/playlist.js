// Constructor
playList = function(filer) {
  this.filer = filer;
  this.current = 0;
}

playList.prototype = Array.prototype;

// Need that to display
playList.prototype.asHtmlList = function() {
  var out = '<ul class="playlist">';
  for (var i = 0; i < this.length; i ++) {
    out += '<li>' + (this.current == i ? '&gt; ' : '  ') + this[i] + '</li>';
  };
  out += '</ul>'
  return out;
}

// playList.prototype.asString = function() {
//   return '[Playlist con' + this + ']';
// }

// Proper pl management: getNext and getCurrent
playList.prototype.getNext = function() {
  this.current += 1;
  if (this.current >= this.length)
    this.current = 0;
  console.log("GetNext su %s ha indice a %i", this, this.current);
  return this.getCurrent();
}

playList.prototype.getCurrent = function() {
  return this[this.current];
}

// Parsa una serie di linee separate da nl.
// Torna array di files che possono essere cancellati
playList.prototype.parsePlaylistText = function(text) {
  console.log("I (%o) have this playlist text:\n%o",
  	      this.toString(),
  	      text);
  // Copio i files che ho adesso, in modo da poter calcolare la diff
  var old_files = this.filenames();
  text.split("\n").forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0];
      var filename = md[1];
      var timestamp = md[2];
      this.unshift(new playlistItem(this.filer, line));
    } else {
      if (line != '')
        console.log("Linea non parsabile: %o", line);
    }
  }.bind(this));
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = old_files.difference(this.filenames());
  if (maybe_delete.length > 0) {
    console.log("parsePlayList torna %o", maybe_delete);
  };
  return maybe_delete;
};

playList.prototype.filenames = function() {
  return this.map(function(e) { return e.localFile });
}

playList.prototype.appendItem = function(item) {
  if (this.some(function(e) { item.localFile == e.localFile})) {
    console.log("Tentato append di %o fallito, c'era gia'!", item);
  }
  this.unshift(item);
}
