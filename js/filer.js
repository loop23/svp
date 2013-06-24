/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object
 */
Filer = function(filesystem, container_name, video) {

  this.filesystem = filesystem;
  this.video = video;
  this.schedule = new playList();

  // this.setupFiles();
  // Se invocata senza parametri assume dei default ragionevoli
  this.loadSchedule();

  // Directory path => ul node mapping.
  var nodes = {};
  this.local_files = [];
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

  var tools = createElement('div', {'class': 'filer-tools'});
  tools.appendChild(createElement('span', {id:'filer-usage'}));
  tools.appendChild(createElement(
      'button', {id:'filer-reload', 'class':'button', innerText:'Reload'}));
  container.appendChild(tools);
  container.appendChild(createElement(
      'div', {id:'filer-empty-label', innerText:'-- empty --'}));

  // Set up the root node.
  var rootNode = createElement('ul');
  this.setListNode('/', rootNode);
  container.appendChild(rootNode);

  this.reload = function() {
    rootNode.innerHTML = '';
    this.resetPlaylists();
    this.list(filesystem.root);
  };
  $('#filer-reload').addEventListener('click', this.reload.bind(this));
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
  this.local_files = [];
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

  hide('#filer-empty-label');

  for (var i = 0; i < entries.length; ++i) {
    this.addFile(entries[i]);
  }
  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Funzione invocata per ogni file, decide dove metterlo e cosa farci
Filer.prototype.addFile = function(fileEntry) {
  console.log("file.AddFile Processing entry: %o", fileEntry);
  this.local_files.push(fileEntry.name);
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

Filer.prototype.parsePlaylist = function(playlist_as_text) {
  console.log("I have this playlist:%o", playlist_as_text);
  playlist_as_text.split("\n").forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0];
      var filename = md[1];
      var timestamp = md[2];
      if (! filer.fileExistsLocally(filename)) {
	filer.downloadFile(url, filename);
      }
    } else {
      console.log("Linea non parsabile: %o", line);
    }
  });
};

Filer.prototype.fileExistsLocally = function(filename) {
  if (this.local_files.indexOf(filename) >= 0)
    return true;
  else
    return false;
};

Filer.prototype.downloadFile = function(url, filename) {
  console.log("Richiesto download di %o su filename: %o", url, filename);
  this.filesystem.root.getFile(filename,
			       { create: true,
			         exclusive: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwriteend = function(e) {
	console.log("Write completed: for file %o", filename);
	filer.filesystem.root.getFile(filename,
				      { create: false },
				      function(fileEntry) {
    	  filer.addFile(fileEntry);
        }
      );};
      fileWriter.onerror = function(e) {
        console.log('Write failed for file: %o, errore: %o: ', filename, e.toString());
      };
      // Make request for fixed file
      var oReq = new XMLHttpRequest;
      oReq.open("GET", url, true);
      oReq.responseType = "blob";
      var count = 0;
      oReq.addEventListener("progress", function(p) {
	if (p.lengthComputable) {
	  if (count % 500 == 0) {
	    var pct = (p.loaded / p.total * 100).toFixed(2);
	    console.log("Downloading %o, %o% done", url, pct);
	  }
	  count += 1;
	}
      }, false);
      // Funzione che scrive il blob quando abbiamo la risposta
      oReq.onload = function(oEvent) {
	console.log("Download terminato, entro in metodo costoso");
	for (i = 0; i < oReq.response.size ; i ++) {
          fileWriter.write(oReq.response[i]);
	}
	console.log("Write terminato");
      };
      oReq.send();
    }, error);
  }, error);
};

// Legge la playlist locale e invoca il suo parser
Filer.prototype.readPlaylist = function() {
  this.filesystem.root.getFile('playlist',
			       { create: false },
			       function(fileEntry) {
    // Get a File object representing the file,
    // then use FileReader to read its contents.
    fileEntry.file(function(file) {
       var reader = new FileReader();
       reader.onloadend = function(e) {
	 filer.parsePlaylist(this.result);
       };
       reader.readAsText(file);
    }, error);
  }, error);
};

// Cancella la playlist e poi la ricarica. Che manco va benissimo.
Filer.prototype.setupFiles = function() {
  this.deleteFile('playlist');
  this.downloadFile('http://madre-dam.atcloud.it/playlists/1.txt',
		    'playlist');
};

Filer.prototype.deleteFile = function(filename) {
  this.filesystem.root.getFile(filename,
			      { create: false },
			      function(fileEntry) {
    fileEntry.remove(function() {
      console.log("Rimosso " + filename);
      var i = this.local_files.indexOf(filename);
      if (i >= 0) {
	this.local_files.splice(i, 1);
      }
    });
  });
};