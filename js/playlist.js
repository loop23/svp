function playList() {
  // Ora prende una stringa, opzionale.
  // Se passata, torna il primo che inizia con la stringa.
  this.circulate = function(arg) {
    var tmp;
    if (arg) {
      var idx = null;
      for (var i = 0; i < this.length; i++) {
	if (this[i].indexOf(arg) == 0) {
	  idx = i;
	  break;
	}
      }
      if (idx) {
	tmp = this.splice(idx,1)[0];
      } else {
	tmp = this.shift();
      }
    } else {
      tmp = this.shift();
    }
    if (tmp)
      this.push(tmp);
    return tmp;
  };
}

playList.prototype = Array.prototype;
