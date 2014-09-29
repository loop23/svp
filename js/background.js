// Creates the window and maximizes it; Size is fixed, maybe should not, but
// was fine in our env.
chrome.app.runtime.onLaunched.addListener(function (arg) {
  chrome.app.window.create(
    'main.html',
    { state: 'fullscreen',
      frame:"none" },
  function(win) {
    win.maximize();
  });
});
