function playList() {

  this.circulate = function() {
    var tmp = this.shift();
    this.push(tmp);
    return tmp;
  };
}

playList.prototype = Array.prototype;
