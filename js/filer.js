/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object
 */
Filer = function(filesystem, container_name, video) {
  this.filesystem = filesystem;
  this.video = video;
  this.schedule = new playList();
  // proviamo con un array. Questo contiene la mia idea del filesystem
  this.all_files = [];
  // Questo serve per evitare di scaricare lo stesso file piu' volte in parallelo
  this._download_list = [];

  // this.setupFiles();
  // Se invocata senza parametri assume dei default ragionevoli
  this.loadSchedule();
  // Adesso c'e' un unica playlist; contiene i prossimi files che devo visualizzare.
  this.playList = new playList();

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
  this.initial_cb = setInterval(function() {
    if (this.video.hasEnded()) {
      // console.log("video.hasEnded ha tornato true, carico prossimo");
      this.video.loadNext();
    }
  }, 1000);

  // Ogni minuto provo a ricaricare la playlist
  setInterval(function() {
    filer.reloadPlaylist();
  }, 1000 * 10);

  console.log("filer initialized");
};

// Che piu' che altro e' un inizializzatore.
Filer.prototype.reload = function() {
  this.playList = new playList();
  this.list(this.filesystem.root);
};

Filer.prototype.getNext = function() {
  var tmp = this.schedule.circulate();
  console.log("getNext invocata!, il prossimo che playo sara: %o", tmp);
  switch (tmp) {
    case 'video':
      return this.playList.circulate('cc_ugc');
    case 'spot':
      return this.playList.circulate('cc_spot');
    case 'altri':
      return this.playList.circulate('cc_other');
    default:
      return this.playList.circulate();
   }
};

// List (della root); Invocata allo startup
Filer.prototype.list = function(dir) {
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
    this.addFile(entries[i]);
  }
  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Funzione invocata per ogni file, prende una fileEntry
// e decide dove metterlo e cosa farci
Filer.prototype.addFile = function(fileEntry) {
  console.log("file.AddFile Processing entry: %o", fileEntry.name);
  if (fileEntry.isFile) {
    this.all_files.push(fileEntry.name);
    if (fileEntry.name === 'schedule') {
      this.loadSchedule(fileEntry);
    } else if (fileEntry.name === 'playlist') {
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


// Loads schedule. If fileEntry is provided, loads it from there,
// otherwise loads a reasonable default. If the loaded one is empty,
// again loads a reasonable default
Filer.prototype.loadSchedule = function(fileEntry) {
  if (!fileEntry) {
    this.schedule = new playList();
    this.schedule.push('spot', 'video', 'video', 'video', 'video', 'altri', 'video', 'video', 'video', 'video');
  } else {
    this.schedule = new playList();
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
	// Se non ho letto niente di valido pero' lo resetto al mio default
	if (tmp.length == 0)
	  tmp.push('spot', 'video', 'video', 'video', 'video', 'altri', 'video', 'video', 'video', 'video');
      };
      reader.readAsText(file);
    }, error);
  }
  console.log("Alla fine la schedule e': %o", this.schedule);
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
  if (this.all_files.indexOf(filename) >= 0)
    return true;
  else
    return false;
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
  playlist_as_text.split("\n").forEach(function(line) {
    var md = line.match(/.+\/(.+)\?(\d+)$/);
    if (md) {
      var url = md[0];
      var filename = md[1];
      var timestamp = md[2];
      this_pl_files.push(filename);
      if ((!my_filer.fileExistsLocally(filename)) &&
	  (my_filer._download_list.indexOf(filename) == -1)) {
	my_filer.downloadFile(url, filename);
      }
    } else {
      // console.log("Linea non parsabile: %o", line);
    }
  });
  // Bene, a questo punto dovrei poter cancellare i files che non ho piu'
  var maybe_delete = arr_diff(old_files, this_pl_files);
  if (maybe_delete.indexOf('playlist') > -1) {
    maybe_delete.splice(maybe_delete.indexOf('playlist'), 1);
  }
  if (maybe_delete.length > 0) {
    console.log("Mi accingo a cancellare: %o - e' stato rimosso dalla playlist", maybe_delete);
    maybe_delete.forEach(function(filename) {
      my_filer.deleteFile(filename);
    });
  }
};

// Dovrebbe essere spostata in un modulo a se', per gestire i partial get per
// i file grossi.
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

Filer.prototype.saveResponseToFile = function(response, filename) {
  console.log("in saveResponseToFile, saving %o bytes to file: %o",
	      response.size,
	      filename);
  // Proviamo .. 1M?
  var chunksize = 1024 * 1024;
  var my_filer = this;
  this.filesystem.root.getFile(filename,
			       { create: true },
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
	  try {
  	    console.log("Ultimato salvataggio di %o", filename);
	    my_filer.addFileByName(filename);
	  } catch (x) {
	    console.log("Exception adding file %o: %o", filename, x);
	  }
	} else {
	  try {
	    chunk++;
	    slstart = chunk * chunksize;
	    slend = Math.min((chunk + 1) * chunksize, response.size);
            // fileWriter.seek(slstart);
	    tmpBlob = response.slice(slstart,
                                     slend,
                                     response.type);
            fileWriter.write(tmpBlob);
	  } catch (x) {
	    console.log("Exception calculating and slicing for upload of file %o: %o",
			filename,
			x);
	  }
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
    fileEntry.file(function(file) {
       var reader = new FileReader();
       reader.onloadend = function(e) {
	 my_filer.parsePlaylist(this.result);
       };
       reader.readAsText(file);
    }, error);
  }, error);
};

// Cancella la playlist (se c'e') e due secondi dopo la ricarica
Filer.prototype.reloadPlaylist = function() {
  this.deleteFile('playlist');
  var my_filer = this;
  setTimeout(function() {
    my_filer.downloadFile('http://madre-dam.atcloud.it/playlists/1.txt',
			  'playlist');
  }, 60 * 1000);
};

// Chiaramente, elimina un file; Se ha successo lo elimina da all_files e dalla playList
Filer.prototype.deleteFile = function(filename) {
  var my_filer = this;
  console.log("Chiamato deleteFile con filename: %o", filename);
  this.filesystem.root.getFile(filename,
			      { create: false },
			      function(fileEntry) {
    fileEntry.remove(function() {
      var i = my_filer.all_files.indexOf(filename);
      if (i >= 0) {
	my_filer.all_files.splice(i, 1);
      }
      i = my_filer.playList.indexOf(filename);
      if (i >= 0) {
	 my_filer.playList.splice(i, 1);
      }
      console.log("Rimosso " + filename);
    });
  });
};

Filer.prototype.toString = function() {
  return("[Filer con " + this.all_files.length + " elementi in dir e che ne sta scaricando " + this._download_list.length + "]");
};
