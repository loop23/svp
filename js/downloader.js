/* This object downloads files, trying to be smart about it. */
Downloader = function(filesystem, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  // At the beginning it's none
  this.downloads_in_progress = [];
  this.CHUNK_SIZE = 1024 * 1024 * 16; // 16M

  // Takes a (serviced) XMLHttpRequest and returns hash with content range info.
  this.parseReqChunks = function(req) {
    var md = req.getResponseHeader("Content-Range").match(/(\d+)-(\d+)\/(\d+)/);
    if (!md) {
      return {};
    }
    var start = md[1];
    var end = md[2];
    var total = md[3];
    var tmp = {start: parseInt(start),
	       end: parseInt(end),
	       total: parseInt(total) };
    return tmp;
  };

  this.isReqSingleChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] == 0) && ((info['end'] + 1) == info['total']))
      return true;
    else
      return false;
  };

  this.isReqFirstChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] == 0) && ((info['end'] + 1) < info['total']))
      return true;
    else
      return false;
  };

  this.isReqMiddleChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] > 0) && ((info['end'] + 1) < info['total']))
      return true;
    else
      return false;
  };

  this.isReqLastChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] > 0) && ((info['end'] + 1) == info['total']))
      return true;
    else
      return false;
  };
};

// Downloads a file.
Downloader.prototype.downloadFile = function(url, filename, chunk) {
  if (!chunk)
    chunk = 0;
  console.log("Richiesto download di %o su filename %o, chunk %o",
	      url,
	      filename,
	      chunk);
  var oReq = new XMLHttpRequest;
  // Counter per stamparne solo alcune
  var count = 0;
  oReq.open("GET", url, true);
  oReq.responseType = "blob";
  var start = chunk * this.CHUNK_SIZE;
  var end = ((chunk + 1) * this.CHUNK_SIZE) - 1;
  console.log("Inizio a %o e finisco a %o", start, end);
  oReq.setRequestHeader("Range", "bytes=" + start + '-' + end);

  oReq.onprogress = function(p) {
    if (p.lengthComputable) {
      if (count % 250 == 0) {
        var pct = (p.loaded / p.total * 100).toFixed(2);
        console.log("Downloading %o, start: %o, end: %o, %o% done", url, start, end, pct);
      }
      count += 1;
    }
  };
  // Funzione che scrive il blob quando abbiamo la risposta (ed e' un 200)
  oReq.onload = function(oEvent) {
    if (oEvent.target.status == 200) {
      console.log("Request for %o succeded in single run, saving file!", url);
      this.saveResponseToFile(oReq.response, filename);
    } else if (oEvent.target.status == 206) {
      if (this.isReqSingleChunk(oReq)) {
        this.saveResponseToFile(oReq.response, filename);
      } else if (this.isReqFirstChunk(oReq)) {
        this.startPartialResponse(oReq.response, filename, url);
      } else if (this.isReqMiddleChunk(oReq)) {
        this.savePartialResponseToFile(oReq.response, filename, url, chunk);
      } else { // Segna che e' finito
	this.finishPartialResponseToFile(oReq.response, filename);
      }
    } else {
      console.log("Request for %o failed: %o", url, oEvent.target.status);
    }
  }.bind(this);
  oReq.onloadstart = function() {
    if (chunk == 0)
      this.downloads_in_progress.push(filename);
  }.bind(this);
  oReq.onloadend = function() {
    if (! this.downloads_in_progress.delete(filename))
      console.log("Il file %o non mi risultava fra quelli che stavo scaricando.. strano!",
		  filename);
  }.bind(this);
  if (!this.downloads_in_progress.include(filename)) // ottimo non e' nella lista
    oReq.send();
  else
    console.log("Download di file %o rifiutato, lo sto gia' scaricando",
		filename);
};

// Appende a un file esistente
Downloader.prototype.savePartialResponseToFile = function(response, filename, url, chunk) {
  var ftemp = filename + '.tmp';  
  console.log("in savePartialResponseToFile, saving %o bytes to file: %o",
	      response.size,
	      ftemp);
  this.filesystem.root.getFile(ftemp,
			       { create: false },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	this.downloadFile(url, filename, chunk + 1);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.startPartialResponse = function(response, filename, url) {
  var ftemp = filename + '.tmp';
  console.log("in startPartialResponse, saving %o bytes to file: %o",
	      response.size,
	      ftemp);
  this.filesystem.root.getFile(ftemp,
			       { create: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	this.downloadFile(url, filename, 1);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.finishPartialResponseToFile = function(response, filename) {
  var ftemp = filename + '.tmp';
  console.log("in finishPartialResponseToFile, saving %o bytes to file: %o",
	      response.size,
	      ftemp);
  this.filesystem.root.getFile(ftemp,
			       { create: false },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	this.filesystem.root.getFile(ftemp, { create: false }, function(fileEntry) {
          fileEntry.moveTo(this.filesystem.root, filename, function() {
            this.filer.addFileByName(filename);
	  }.bind(this), error);
        }.bind(this), error);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.saveResponseToFile = function(response, filename) {
  console.log("in saveResponseToFile, saving %o bytes to file: %o",
	      response.size,
	      filename);
  var my_filer = this.filer;
  this.filesystem.root.getFile(filename,
			       { create: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	try {
  	  console.log("Ultimato salvataggio di %o", filename);
	  my_filer.addFileByName(filename);
	} catch (x) {
	  console.log("Exception adding file %o: %o", filename, x);
	}
      };
    }, error);
  }, error);
};

Downloader.prototype.toString = function() {
  return "[Downloader downloading " + this.downloads_in_progress.length + ' files]';
};

