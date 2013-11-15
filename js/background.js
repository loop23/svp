// Creates the window and maximizes it; Size is fixed, maybe should not, but
// was fine in our env.
chrome.app.runtime.onLaunched.addListener(function (arg) {
  chrome.app.window.create(
    'main.html',
    { bounds: { left: 0, top: 0, width:1280, height:768 },
      frame:"none" },
  function(win) {
    win.maximize();
  });
});
