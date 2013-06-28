playList = function(args) {
  // Ora prende una stringa, opzionale.
  // Se passata, torna il primo che inizia con la stringa.
  if (args)
      console.log("Ho args: %o", args)
}

playList.prototype = Array.prototype;
