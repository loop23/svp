/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object
 */
Filer = function(filesystem, container_name, video) {
  this.filesystem = filesystem;
  this.video = video;
  this.downloader = new Downloader(filesystem, this);
  // proviamo con un array. Questo contiene la mia idea del filesystem
  this.all_files = [];

  // this.setupFiles();
  // Se invocata senza parametri assume dei default ragionevoli

  // Adesso c'e' un unica playlist; contiene i prossimi files che
  // devo visualizzare.
  this.playList = [];

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

  this.reload();
  this.reloadPlaylist();
  this.initial_cb = setInterval(function() {
    console.log("Posso iniziare a playare?");
    if (this.playList.length > 0) { // Can play
      console.log("Si! daje!");
      this.video.loadNext();
      this.clear_initial_cb();
      this.video.setupCallbacks();
    }
  }.bind(this), 1000 * 5);

  this.clear_initial_cb = function() {
    console.log("Mi e' arrivato clear_initial_cb da video");
    if (this.initial_cb == null) {
      console.log("Ma gia' la tolsi");
      return;
    } else {
      console.log("La tolgo davvero");
      window.clearInterval(this.initial_cb);
      this.initial_cb = null;
    }
  };

  // Ogni minuto provo a ricaricare la playlist
  setInterval(function() {
    filer.reloadPlaylist();
  }, 1000 * 60);

  console.log("filer initialized");
};

// Che piu' che altro e' un inizializzatore.
Filer.prototype.reload = function() {
  this.playList = new playList;
  this.listDir(this.filesystem.root);
};

Filer.prototype.getNext = function() {
  return this.playList.getNext();
};

// List (della root); Invocata allo startup
Filer.prototype.listDir = function(dir) {
  // TODO(kinuko): This should be queued up.
  console.log("Invocata list per dir %o", dir);
  var node = this.getListNode(dir.fullPath);
  if (node.fetching)
    return;
  node.fetching = true;
  var reader = dir.createReader();
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Invocata quando si e' finito di leggere le entries (ls)
Filer.prototype.didReadEntries = function(dir, reader, entries) {
  var node = this.getListNode(dir.fullPath);
  if (!entries.length) {
    node.fetching = false;
    return;
  }
  for (var i = 0; i < entries.length; ++i) {
    var this_e = entries[i];
    if (this_e.name.match(/\.tmp$/)) {
      console.log("Provo a eliminare il tmpfile %o", this_e);
      this_e.remove(function() {
	console.log("Eliminato %o", this_e);
      });
    } else {
      this.addFile(this_e);
    }
  }
  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Funzione invocata per ogni file, prende una fileEntry
// e decide dove metterlo e cosa farci
Filer.prototype.addFile = function(fileEntry) {
  console.log("file.AddFile Processing entry: %o", fileEntry.name);
  if (fileEntry.isFile) {
    if (fileEntry.name.match(/\.tmp$/))
      return;
    this.all_files.push(fileEntry.name);
    if (fileEntry.name === 'playlist') {
      this.readPlaylist();
    } else if (fileEntry.name.match(/^cc_.+\.mp4$/)) { // files video
      this.playList.unshift(fileEntry.name);
    } else {
      console.log("Aggiunto file inutile (che non verra' playato perche' non corrisponde a nulla che io conosca): %o",
		  fileEntry.name);
    }
  } else {
    console.log("Toh, e' stato aggiunto un non-file: %o, non ci faccio niente", fileEntry);
  }
};

// Aggiunge un file (per nome) alla lista dei files a me noti.
Filer.prototype.addFileByName = function(filename) {
  console.log("addFileByName per file: %o..Io sono" + this, filename);
  var my_filer = this;
  this.filesystem.root.getFile(filename,
			       { create: false },
                               function(fileEntry) {
    my_filer.addFile(fileEntry);
  },error);
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

// Controlla se un file mi e' noto in _local_files.
Filer.prototype.fileExistsLocally = function(filename) {
  return this.all_files.include(filename);
};

// Parsa una serie di linee separate da nl
Filer.prototype.parsePlaylist = function(playlist_as_text) {
  // console.log("I (%o) have this playlist text:\n%o",
  // 	      this.toString(),
  // 	      playlist_as_text);
  var my_filer = this;
  // Copio i files che ho adesso
  var old_files = this.all_files.slice(0) || [];
  var this_pl_files = [];
  //console.log("Prima di parsare la playlist, vecchia lista di files sul mio fs: %o",
  //            old_files);
  playlist_as_text.split("\n").reverse().forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0];
      var filename = md[1];
      var timestamp = md[2];
      this_pl_files.unshift(filename);
      if (!this.fileExistsLocally(filename)) {
        this.downloader.downloadFile(url, filename);
      }
    } else {
      if (line != '')
        console.log("Linea non parsabile: %o", line);
    }
  }.bind(this));
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = old_files.difference(this_pl_files);
  maybe_delete.delete('playlist');
  if (maybe_delete.length > 0) {
    console.log("Mi accingo a cancellare: %o - e' stato rimosso dalla playlist", maybe_delete);
    maybe_delete.forEach(function(filename) {
      my_filer.deleteFile(filename);
    });
  }
};

// Legge la playlist locale e invoca il suo parser
Filer.prototype.readPlaylist = function() {
  console.log("ReadPlaylist: " + this);
  var my_filer = this;
  this.filesystem.root.getFile('playlist',
			       { create: false },
			       function(fileEntry) {
    fileEntry.file(function(file) {
       var reader = new FileReader();
       reader.onloadend = function(e) {
	 my_filer.parsePlaylist(this.result);
       };
       reader.readAsText(file);
    }, error);
  }, error);
};

// Cancella la playlist (se c'e') e cinque secondi dopo la riscarica
Filer.prototype.reloadPlaylist = function() {
  this.deleteFile('playlist');
  setTimeout(function() {
    this.downloader.downloadFile('http://madre-dam.atcloud.it/playlists/1.txt',
				 'playlist');
  }.bind(this), 5000);
};

// Chiaramente, elimina un file; Se ha successo lo elimina da all_files e dalla playList
Filer.prototype.deleteFile = function(filename) {
  var my_filer = this;
  console.log("Chiamato deleteFile con filename: %o", filename);
  this.filesystem.root.getFile(filename,
			      { create: false },
			      function(fileEntry) {
    fileEntry.remove(function() {
      my_filer.all_files.delete(filename);
      my_filer.playList.delete(filename);
      console.log("Rimosso " + filename);
    });
  });
};

Filer.prototype.toString = function() {
  return("[Filer con " + this.all_files.length + " elementi in dir]");
};
