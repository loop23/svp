/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object; Acts as main controller for the app.
 */

// In dev e' 2, in prod e' 1.. come gestirlo non lo so ancora.
const PLAYLIST_URL = 'http://madre-dam.atcloud.it/playlists/2.txt';
const PLAYLIST_REFRESH_TIME = 1000 * 60;

Filer = function(filesystem, container_name, video) {
  console.log("[Filer] - initializeing w/ %o, cn: %o, video el: %o", filesystem, container_name, video);
  this.filesystem = filesystem;
  this.video = video;
  this.downloader = new Downloader(filesystem, this);

  // this.setupFiles();
  // Se invocata senza parametri assume dei default ragionevoli

  // Adesso c'e' un unica playlist; contiene i prossimi files che
  // devo visualizzare.
  this.playList = new playList(this);

  // La mia idea dei files rimasti.
  this.localFiles = [];

  // Directory path => ul node mapping.
  var nodes = {};

  this.getListNode = function(path) {
    return nodes[path];
  };

  this.setListNode = function(path, node) {
    nodes[path] = node;
  };

  var container = $(container_name);
  container.innerHTML = '';

  // Set up the root node.
  var rootNode = createElement('ul');
  this.setListNode('/', rootNode);
  container.appendChild(rootNode);

  this.playList = new playList(this);
  this.listDir(this.filesystem.root);

  this.requestPlaylistDownload();

  this.initial_cb = setInterval(function() {
    console.log("[Filer] Posso iniziare a playare?");
    if (this.playList.length > 0) { // Can play
      console.log("[Filer] Si! daje!");
      this.video.loadNext();
      this.clear_initial_cb();
      this.video.setupCallbacks();
    }
  }.bind(this), 1000 * 5);

  // Ogni minuto provo a ricaricare la playlist
  setInterval(function() {
    filer.requestPlaylistDownload();
  }, PLAYLIST_REFRESH_TIME);

  // Done!
  console.log("[Filer] Initialized!");
};

Filer.prototype.clear_initial_cb = function() {
  console.log("[Filer].clear_initial_cb");
  if (this.initial_cb == null) {
    console.log("[Filer] ...Ma gia' la tolsi");
    return;
  } else {
    console.log("[Filer] ...La tolgo davvero");
    window.clearInterval(this.initial_cb);
    this.initial_cb = null;
  }
};


Filer.prototype.getNext = function() {
  return this.playList.getNext();
};

// List (della root); Invocata allo startup
Filer.prototype.listDir = function(dir) {
  console.log("[Filer] Invocata list per dir %o", dir);
  var node = this.getListNode(dir.fullPath);
  if (node.fetching) // Already fetching
    return;
  node.fetching = true;
  var reader = dir.createReader();
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Invocata quando si e' finito di leggere le entries (ls)
// Dovrebbe capitare solo allo startup?
Filer.prototype.didReadEntries = function(dir, reader, entries) {
  var node = this.getListNode(dir.fullPath);
  if (!entries.length) {
    node.fetching = false;
    return;
  }
  for (var i = 0; i < entries.length; ++i) {
    var entry = entries[i];
    if (entry.name.match(/\.tmp$/)) {
      console.log("[Filer] Provo a eliminare il tmpfile %o", entry);
      entry.remove(function() {
	console.log("[Filer]  Eliminato %o da filesystem locale.. giusto? boh!", entry);
      });
    } else {
      this.addFile(entry);
    }
  }
  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Callback invocata durante la listdir per ogni fileEntry, decide cosa farci
Filer.prototype.addFile = function(fileEntry) {
  console.log("[Filer].addFile Processing entry: %o", fileEntry);
  if (!fileEntry.isFile) {
    console.log("[Filer] Toh, e' stato aggiunto un non-file: %o, non ci faccio niente", fileEntry);
    return;
  }
  if (fileEntry.name.match(/\.tmp$/)) // tmpfile
    return;
  if (fileEntry.name === 'playlist') {
    this.readPlaylist();
  } else if (fileEntry.name.match(/\.mp4$/)) { // files video
    var new_item = new playlistItem(this, null, fileEntry.name);
    console.log("[Filer] Appendo nuova entry: %o alla playlist", new_item);
    this.playList.appendItem(new_item);
    this.localFiles.push(fileEntry.name)
  } else {
    console.log("[Filer] Aggiunto file inutile (che non verra' playato perche' non corrisponde a nulla che io conosca): %o",
		fileEntry.name);
  }
};

// Aggiunge un file (per nome) alla lista dei files a me noti.
Filer.prototype.addFileByName = function(filename) {
  console.log("[Filer].addFileByName per file: %o..Io sono" + this, filename);
  this.filesystem.root.getFile(filename,
			       { create: false },
    function(fileEntry) {
      this.addFile(fileEntry);
    }.bind(this),error);
};

// Filer.prototype.formatSize = function(size) {
//   var unit = 0;
//   while (size > 1024 && unit < 5) {
//     size /= 1024;
//     unit++;
//   }
//   size = Math.floor(size);
//   return size + ' ' + ['', 'K', 'M', 'G', 'T'][unit] + 'B';
// };

// Controlla se un file col nome filename e' stato scaricato (chiede alla playList)
Filer.prototype.fileExistsLocally = function(filename) {
  var do_you = this.localFiles.some(function(e) { return e == filename });
  console.log("[Filer].fileExistsLocally per %o torna: %o", filename, do_you);
  return do_you;
};

// Legge la playlist locale e invoca il suo parser
Filer.prototype.readPlaylist = function() {
  console.log("[Filer] ReadPlaylist on %o", this);
  this.filesystem.root.getFile('playlist',
			       { create: false },
			       function(fileEntry) {
    console.log("1... %o", this);
    fileEntry.file(function(file) {
       console.log("2... %o, file:", this, file);
       var reader = new FileReader();
       reader.onload = function(e) {
	 var txt = e.target.result;
	 console.log("3... this: %o, e: %o - text?: %o", this, e, txt);
	 if (!txt) {
	   console.log("[Filer] Strano, niente testo!");
	   return; // Non c'e' nessun testo!
	 }
	 var delenda = this.playList.parsePlaylistText(txt);
	 console.log("[Filer] Delenda: %o", delenda);
	 delenda.forEach(function(filename) {
	   console.log("4... %o", this);
	   this.deleteFile(filename);
	 }.bind(this), error);
       }.bind(this);
       console.log("[Filer] - mi accingo a chiamare reader.readastext su file %o", file);
       reader.readAsText(file);
    }.bind(this), error);
  }.bind(this), error);
};

// Cancella il file della playlist (se c'e') e cinque secondi dopo la riscarica
Filer.prototype.requestPlaylistDownload = function() {
  this.deleteFile('playlist');
  setTimeout(function() {
    this.downloader.downloadFile(PLAYLIST_URL,
				 'playlist');
  }.bind(this), 5000);
};

// Chiaramente, elimina un file; Se ha successo lo elimina dalla playList
Filer.prototype.deleteFile = function(filename) {
  console.log("[Filer].deleteFile con filename: %o", filename);
  this.filesystem.root.getFile(filename,
			      { create: false },
			      function(fileEntry) {
    fileEntry.remove(function() {
      console.log("[File].deleteFile, dentro fileEntry.remove... chi e' this? %o", this);
      var plrem = this.playList.removeItem(filename);
      this.localFiles = this.localFiles.filter(function(e) { return e != filename });
      console.log("[Filer] Rimosso %o da local file, e da playlist? %o", filename, plrem);
    }.bind(this));
  }.bind(this));
};

Filer.prototype.toString = function() {
  return("[Filer con pl:" + this.playList.toString());
};
