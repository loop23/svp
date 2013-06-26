/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object
 */
Filer = function(filesystem, container_name, video) {

  this.filesystem = filesystem;
  this.video = video;
  this.schedule = new playList();
  // Questo serve per evitare di scaricare lo stesso file piu' volte in parallelo
  this._download_list = [];
  this._local_files = [];


  // this.setupFiles();
  // Se invocata senza parametri assume dei default ragionevoli
  this.loadSchedule();

  // Directory path => ul node mapping.
  var nodes = {};
  // Le mie playlist separate - e' inutile inizializzarle qui, lo fara' reload
  // this.resetPlaylists();
  this.getListNode = function(path) {
    return nodes[path];
  };
  this.setListNode = function(path, node) {
    nodes[path] = node;
  };
  // this.allNodes = function() { return nodes; };
  // this.getVideos = function() { return videos; };
  // this.getSpot = function() { return spot; };
  // this.getAltri = function() { return altri; };

  var container = $(container_name);
  container.innerHTML = '';

  // Set up the root node.
  var rootNode = createElement('ul');
  this.setListNode('/', rootNode);
  container.appendChild(rootNode);

  this.reload = function() {
    rootNode.innerHTML = '';
    this.resetPlaylists();
    this.list(filesystem.root);
  };
  this.reload();

  console.log("filer initialized");
};

Filer.prototype.resetPlaylists = function() {
  this.videos = new playList();
  this.spot = new playList();
  this.altri = new playList();
};

Filer.prototype.getNext = function() {
  var tmp = this.schedule.circulate();
  console.log("getNext invocata!, il prossimo che playo sara: %o", tmp);
  switch (tmp) {
    case 'video':
      return this.videos.circulate();
    case 'spot':
      return this.spot.circulate();
    case 'altri':
      return this.altri.circulate();
    default:
      return this.videos.circulate();
   }
};

Filer.prototype.list = function(dir) {
  // TODO(kinuko): This should be queued up.
  console.log("Invocata list per dir %o", dir);
  var node = this.getListNode(dir.fullPath);
  if (node.fetching)
    return;
  this._local_files = [];
  node.fetching = true;
  var reader = dir.createReader();
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

Filer.prototype.didReadEntries = function(dir, reader, entries) {
  var node = this.getListNode(dir.fullPath);
  if (!entries.length) {
    console.log("Finito di leggere entries!");
    node.fetching = false;
    return;
  }

  for (var i = 0; i < entries.length; ++i) {
    this.addFile(entries[i]);
  }
  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Funzione invocata per ogni file, decide dove metterlo e cosa farci
Filer.prototype.addFile = function(fileEntry) {
  console.log("file.AddFile Processing entry: %o", fileEntry);
  this._local_files.push(fileEntry.name);
  if (fileEntry.isFile) {
    if (fileEntry.name === 'schedule') {
      this.loadSchedule(fileEntry);
    } else if (fileEntry.name === 'playlist') {
      this.readPlaylist();
    } else if (fileEntry.name.match(/^cc_ugc_/)) {
      this.videos.unshift(fileEntry.name);
    } else if (fileEntry.name.match(/^cc_spot_/)) {
      this.spot.unshift(fileEntry.name);
    } else if (fileEntry.name.match(/^cc_other_/)) {
      this.altri.unshift(fileEntry.name);
    } else {
      console.log("Aggiunto file inutile: %o", fileEntry.name);
    }
  } else {
    console.log("Toh, e' stato aggiunto un non-file: %o", fileEntry);
  }
};

// Loads schedule. If fileEntry is provided, loads it from there, otherwise
// loads a reasonable default
Filer.prototype.loadSchedule = function(fileEntry) {
  if (!fileEntry) {
    this.schedule = new playList();
    this.schedule.push('spot', 'video', 'altri', 'video', 'video', 'video');
  } else {
    this.schedule = new playList;
    // Var to clojure over
    var tmp = this.schedule;
    fileEntry.file(function(file) {
      var reader = new FileReader();
      reader.onloadend = function(e) {
	console.log("Finito di leggere la schedule, testo: %o", this.result);
	var items = this.result.match(/[a-z,]+/)[0].split(',');
	console.log("items: %o", items);
	for (i in items) {
	  tmp.push(items[i]);
	}
      };
      reader.readAsText(file);
    }, error);
  }
};

Filer.prototype.formatSize = function(size) {
  var unit = 0;
  while (size > 1024 && unit < 5) {
    size /= 1024;
    unit++;
  }
  size = Math.floor(size);
  return size + ' ' + ['', 'K', 'M', 'G', 'T'][unit] + 'B';
};

// Controlla se un file mi e' noto in _local_files.
Filer.prototype.fileExistsLocally = function(filename) {
  if (this._local_files.indexOf(filename) >= 0)
    return true;
  else
    return false;
};

Filer.prototype.parsePlaylist = function(playlist_as_text) {
  console.log("Hello I'm " + this);
  console.log("I have this playlist text:\n%o", this, playlist_as_text);
  var my_filer = this;
  this._old_files = this._local_files.slice(0) || [];
  playlist_as_text.split("\n").forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0];
      var filename = md[1];
      var timestamp = md[2];
      if (! my_filer.fileExistsLocally(filename)) {
	my_filer.downloadFile(url, filename);
      }
    } else {
      console.log("Linea non parsabile: %o", line);
    }					   
  });
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = this._old_files.diff(this._local_files || []);
  console.log("Sarebbe da cancellare: %o", maybe_delete);
};

Filer.prototype.downloadFile = function(url, filename) {
  console.log("Richiesto download di %o su filename: %o", url, filename);
  // Make request for fixed file
  var oReq = new XMLHttpRequest;
  oReq.open("GET", url, true);
  oReq.responseType = "blob";
  // Counter per stamparne solo alcune
  var count = 0;
  oReq.onprogress = function(p) {
    if (p.lengthComputable) {
      if (count % 250 == 0) {
        var pct = (p.loaded / p.total * 100).toFixed(2);
        console.log("Downloading %o, %o% done", url, pct);
      }
      count += 1;
    }
  };
  // Funzione che scrive il blob quando abbiamo la risposta (ed e' un 200)
  oReq.onload = function(oEvent) {
    if (oEvent.target.status == 200) {
      console.log("Request for %o succeded, saving file!", url);
      this.saveResponseToFile(oReq.response, filename);
    } else {
      console.log("Request for %o failed: %o", url, oEvent.target.status);
    }
  }.bind(this);
  oReq.onloadstart = function() {
    this._download_list.push(filename);
  }.bind(this);
  oReq.onloadend = function() {
    var pos = this._download_list.indexOf(filename);
    if (pos > -1)
      this._download_list.splice(pos, 1);
    else
      console.log("Il file %o non mi risultava fra quelli che stavo scaricando.. strano!", filename);
  }.bind(this);
  if (this._download_list.indexOf(filename) == -1) // ottimo non e' nella lista
    oReq.send();
  else
    console.log("Download di file %o rifiutato, lo sto gia' scaricando",
		filename);
};

Filer.prototype.addFileByName = function(filename) {
  console.log("addFileByName..Io sono" + this);
  var my_filer = this;
  this.filesystem.root.getFile(filename,
			       { create: false },
                               function(fileEntry) {
    my_filer.addFile(fileEntry);
  },error);
};

Filer.prototype.saveResponseToFile = function(response, filename) {
  console.log("in saveResponseToFile for response: %o, filename: %o",
	      response,
	      filename);
  // Proviamo .. 64k?
  var chunksize = 1024 * 64;
  var my_filer = this;
  this.filesystem.root.getFile(filename,
			       { create: true,
			         exclusive: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      var chunk = 0;
      var slstart = chunk * chunksize;
      var slend = Math.min((chunk + 1) * chunksize, response.size);
      var tmpBlob = response.slice(slstart,
                                   slend,
                                   response.type);
      fileWriter.write(tmpBlob);
      fileWriter.onwriteend = function(e) {
	if (tmpBlob.size < chunksize) {
	  console.log("Ho finito davvero!");
	  my_filer.addFileByName(filename);
	} else {
	  chunk++;
	  slstart = chunk * chunksize;
	  slend = Math.min((chunk + 1) * chunksize, response.size);
          // fileWriter.seek(slstart);
	  tmpBlob = response.slice(slstart,
                                   slend,
                                   response.type);
          fileWriter.write(tmpBlob);
	}
      };
    }, error);
  }, error);
};

// Legge la playlist locale e invoca il suo parser
Filer.prototype.readPlaylist = function() {
  console.log("ReadPlaylist: " + this);
  var my_filer = this;
  this.filesystem.root.getFile('playlist',
			       { create: false },
			       function(fileEntry) {
    // Get a File object representing the file,
    // then use FileReader to read its contents.
    fileEntry.file(function(file) {
       var reader = new FileReader();
       reader.onloadend = function(e) {
	 my_filer.parsePlaylist(this.result);
       };
       reader.readAsText(file);
    }, error);
  }, error);
};

// Cancella la playlist e poi la ricarica. Che manco va benissimo.
Filer.prototype.reloadPlaylist = function() {
  this.deleteFile('playlist');
  var my_filer = this;
  setTimeout(function() {
    my_filer.downloadFile('http://madre-dam.atcloud.it/playlists/1.txt',
			  'playlist');
  }, 2000);
};


Filer.prototype.deleteFile = function(filename) {
  var my_filer = this;
  console.log("Chiamato deleteFile con filename: %o", filename);
  this.filesystem.root.getFile(filename,
			      { create: false },
			      function(fileEntry) {
    fileEntry.remove(function() {
      console.log("Rimosso " + filename);
      var i = my_filer._local_files.indexOf(filename);
      if (i >= 0) {
	my_filer._local_files.splice(i, 1);
      }
    });
  });
};

Filer.prototype.toString = function() {
  return("[Filer con " + this._local_files.length + " elementi e che ne sta scaricando " + this._download_list.length + "]");
};
