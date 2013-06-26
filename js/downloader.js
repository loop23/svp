/* This object downloads files, trying to be smart about it. */
Downloader = function(filesystem, filer) {

  // At the beginning it's none
  this.downloads_in_progress = [];
  var CHUNK_SIZE = 1024 * 1024;

  // Takes a XMLHttpRequest and returns hash with content range info.
  this.parseReqChunks = function(req) {
    var md = req.getResponseHeader("Content-Range").match(/(\d+)-(\d+)\/(\d+)/);
    if (!md) {
      return {};
    }
    var start = md[1];
    var end = md[2];
    var total = md[3];
    return {start: start,
	    end: end,
	    total: total };
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
Filer.prototype.downloadFile = function(url, filename, chunk) {
  if (!chunk)
    chunk = 0;
  console.log("Richiesto download di %o su filename %o, chunk %o", url, filename, chunk);
  var oReq = new XMLHttpRequest;
  // Counter per stamparne solo alcune
  var count = 0;
  oReq.open("GET", url, true);
  oReq.responseType = "blob";
  var start = chunk * CHUNK_SIZE;
  var end = ((chunk + 1) * CHUNK_SIZE) - 1;
  console.log("Inizio a %o e finisco a %o", start, end);
  oReq.setRequestHeader("Range", "bytes=" + start + '-' + end);

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
    if (oEvent.target.status == 206) {
      console.log("Request for %o succeded, saving file - or chunk!", url);
      if (isReqSingleChunk(oReq)) {
        this.saveResponseToFile(oReq.response, filename);
      } else if (isReqFirstChunk(oReq)) {
	this.startPartialResponse(oReq.response, filename, url);
      } else if (isReqMiddleChunk(oReq)) {
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

Filer.prototype.startPartialResponse = function(response, filename, url) {
  var ftemp = filename + '.tmp';
  console.log("in startPartialResponse, saving %o bytes to file: %o",
	      response.size,
	      ftemp);
  var my_filer = this;
  this.filesystem.root.getFile(ftemp,
			       { create: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	my_filer.downloadFile(url, filename, 1);
      }
    }
  }
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
