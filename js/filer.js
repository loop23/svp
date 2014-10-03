/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name
 * object; Acts as main controller for the app.
 */

Filer = function(filesystem, container_name) {
  console.info("[Filer] - initializing w/fs: %o, container_name: %o", filesystem, container_name);
  this.filesystem = filesystem;
  this.downloader = new Downloader(filesystem, this);
  // Adesso c'e' un unica playlist; contiene i prossimi files che
  // devo visualizzare.
  this.playList = new playList(this);

  // La mia idea dei files locali
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

  this.initial_cb = setInterval(function() {
    console.debug("[Filer] Posso iniziare a playare?");
    if (this.playList.canPlay()) { // Can play
      console.debug("[Filer] Si! daje!");
      window.video.loadNext();
      this.clear_initial_cb();
      window.video.setupCallbacks();
    } else {
      console.debug("[Filer] non posso iniziare a playare");
    }
  }.bind(this), 1000 * 5);

  // Ogni minuto provo a ricaricare la playlist
  this.plrefreshtask = setInterval(function() {
    filer.requestPlaylistDownload();
  }, PLAYLIST_REFRESH_TIME);

  // Done!
  this.requestPlaylistDownload();
  console.info("[Filer] Initialized!");
};

Filer.prototype.clear_initial_cb = function() {
  console.debug("[Filer].clear_initial_cb");
  if (this.initial_cb == null) {
    console.warn("[Filer] ...Ma gia' la tolsi");
    return;
  } else {
    console.debug("[Filer] ...La tolgo davvero");
    window.clearInterval(this.initial_cb);
			this.initial_cb = null;
			var myDiv = $('#video-overlay');
			console.log('div %o', myDiv);
			myDiv.style.display = 'none';
  }
};


Filer.prototype.getNext = function() {
  return this.playList.getNext();
};

// List (della root); Invocata allo startup
Filer.prototype.listDir = function(dir) {
  console.debug("[Filer] Invocata list per dir '%s'", dir.fullPath);
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
  console.debug("[Filer] didReadEntries con %i entries", entries.length)
  var node = this.getListNode(dir.fullPath);
  if (!entries.length) {
    node.fetching = false;
    return;
  }
  for (var i = 0; i < entries.length; ++i) {
    var entry = entries[i];
    if (entry.name.match(/\.tmp$/)) {
      console.debug("[Filer] Provo a eliminare il tmpfile %o", entry);
      entry.remove(function() {
	console.debug("[Filer] Eliminata entry %o da filesystem locale", entry);
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
  console.debug("[Filer].addFile Processing entry: %o", fileEntry.name);
  if (!fileEntry.isFile) {
    console.warn("[Filer] Toh, e' stato aggiunto un non-file: %o, non ci faccio niente", fileEntry);
    return;
  }
  if (fileEntry.name.match(/\.tmp$/)) // tmpfile
    return;
  if (fileEntry.name === 'playlist') {
    this.readLocalPlaylist();
  } else if (fileEntry.name.match(/\.mp4$/)) { // files video
    this.localFiles.push(fileEntry.name);
  } else {
    console.warn("[Filer] Aggiunto file inutile (che non verra' playato perche' non corrisponde a nulla che io conosca) - lo elimino: %o",
		fileEntry.name);
    fileEntry.remove(function() {
      console.debug("[Filer] Eliminato file inutile!");
    });
  }
};

// Aggiunge un file (per nome) alla lista dei files a me noti.
Filer.prototype.addFileByName = function(filename) {
  console.debug("[Filer].addFileByName per file: %o..Io sono" + this, filename);
  this.filesystem.root.getFile(filename,
			       { create: false },
    function(fileEntry) {
      this.addFile(fileEntry);
    }.bind(this),error);
};

// Controlla se un file col nome filename e' stato scaricato; Controlla su localFiles
Filer.prototype.fileExistsLocally = function(filename) {
  // console.debug("[Filer] - controllo se %o esiste", filename);
  var do_you = this.localFiles.some(function(e) { return e == filename });
  // console.debug("[Filer].fileExistsLocally per %o torna: %o", filename, do_you);
  return do_you;
};

Filer.prototype.deleteRemoved = function(delenda) {
  console.debug("[Filer] deleting removed: delenda: %o", delenda);
  delenda.forEach(function(filename) {
    console.debug("[Filer] deleting ... %o", filename);
    this.deleteFile(filename);
  }.bind(this), error);
}

// Legge la playlist locale e invoca il suo parser
Filer.prototype.readLocalPlaylist = function() {
  console.debug("[Filer] ReadLocalPlaylist called");
  this.filesystem.root.getFile('playlist',
			       { create: false },
			       function(fileEntry) {
    console.debug("[Filer] 1 Ottenuta entry di playlist");
    fileEntry.file(function(file) {
       console.debug("[Filer] 2 Ottenuto file");
       var reader = new FileReader();
       reader.onload = function(e) {
	 var txt = e.target.result;
	 console.debug("[Filer] 3 Dovrei avere il testo:\n%o", txt);
	 if (!txt) {
	   console.warn("[Filer] Strano, niente testo!");
	   return; // Non c'e' nessun testo!
	 }
	 this.deleteRemoved(this.playList.parsePlaylistText(txt));
       }.bind(this);
       console.debug("[Filer] - mi accingo a chiamare reader.readastext su file %o", file);
       reader.readAsText(file);
    }.bind(this), error);
  }.bind(this), error);
};

// Cancella il file della playlist (se c'e') e dopo la riscarica.
Filer.prototype.requestPlaylistDownload = function() {
  var xhr = new XMLHttpRequest();
  xhr.open('HEAD',
	   PLAYLIST_URL,
	   true);
  xhr.onload = function() {
    this.deleteFile('playlist');
    setTimeout(function() {
      this.downloader.downloadFile(PLAYLIST_URL,
  	   			   'playlist');
    }.bind(this), 100);
  };
  xhr.send();
  return true;
};

// Chiaramente, elimina un file; Se ha successo lo elimina dalla playList
Filer.prototype.deleteFile = function(filename) {
  console.debug("[Filer].deleteFile con filename: %o", filename);
  this.filesystem.root.getFile(filename,
			      { create: false },
			      function(fileEntry) {
    fileEntry.remove(function() {
      // console.debug("[Filer].deleteFile, dentro fileEntry.remove... chi e' this? %o", this);
      this.localFiles = this.localFiles.filter(function(e) { return e != filename; });
      console.debug("[Filer] Rimosso %o da localFiles", filename);
    }.bind(this));
  }.bind(this));
};

// Invocata quando il downloader ha finito di scaricare filename
// e lo ha salvato
Filer.prototype.notifyDownload = function(filename) {
  console.debug("[Filer] notifyDownload per %s", filename);
  this.localFiles.push(filename);
  this.playList.finishDownload(filename);
};

Filer.prototype.toString = function() {
  return("[Filer con pl:" + this.playList.toString() + ']');
};
