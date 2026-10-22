// Runs before the app draws anything: apply the saved light/dark choice so the page never
// flashes the wrong theme. (A separate file, not inline, so a strict Content-Security-Policy
// can forbid all inline scripts.)
try {
  if (localStorage.getItem('appearance') === 'dark') {
    document.documentElement.classList.replace('light', 'dark');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0b1120');
  }
} catch (e) {
  // storage blocked: stay on the default light theme
}
