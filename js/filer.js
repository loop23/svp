/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object
 */
Filer = function(filesystem, container_name, video) {

  this.filesystem = filesystem;
  this.video = video;
  this.schedule = new playList();

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
  this.allNodes = function() { return nodes; };
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
  if (fileEntry.isFile) {
    if (fileEntry.name === 'schedule') {
      this.loadSchedule(fileEntry);
    } else if (fileEntry.name.match(/^cc_ugc_/)) {
      this.videos.unshift(fileEntry.name);
    } else if (fileEntry.name.match(/^cc_spot_/)) {
      this.spot.unshift(fileEntry.name);
    } else if (fileEntry.name.match(/^cc_other_/)) {
      this.altri.unshift(fileEntry.name);
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
    this.schedule.push('spot', 'video', 'video', 'video', 'video');
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
