(() => {
  // Loaded before the application modules so this also works if startup chunks fail.
  const show = () => {
    if (document.getElementById('app-recovery')) return;
    const panel = document.createElement('section');
    panel.id = 'app-recovery';
    panel.setAttribute('role', 'alert');
    Object.assign(panel.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid',
      placeContent: 'center', padding: '24px', background: '#fffefb', color: '#12372a',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center',
    });
    const title = document.createElement('h1');
    title.textContent = 'Siden kunne ikke indlæses';
    const message = document.createElement('p');
    message.textContent = 'Kontrollér din internetforbindelse, og prøv at indlæse siden igen.';
    const detail = document.createElement('p');
    detail.textContent = 'Hvis du har tekst, der ikke er gemt, så kopiér den først.';
    const retry = document.createElement('button');
    retry.textContent = 'Indlæs siden igen';
    Object.assign(retry.style, {
      padding: '14px 24px', background: '#12372a', color: 'white', border: '0',
      borderRadius: '6px', cursor: 'pointer', font: 'inherit',
    });
    retry.onclick = () => window.location.reload();
    const dismiss = document.createElement('button');
    dismiss.textContent = 'Tilbage til siden';
    Object.assign(dismiss.style, { marginTop: '12px', padding: '12px', cursor: 'pointer', font: 'inherit' });
    dismiss.onclick = () => panel.remove();
    panel.append(title, message, detail, retry, dismiss);
    document.body.append(panel);
    retry.focus();
  };
  const moduleFailure = (error) => {
    const message = typeof error === 'string' ? error : error?.message;
    return typeof message === 'string' &&
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .+ failed|ChunkLoadError/i.test(message);
  };
  window.addEventListener('app-load-failed', show);
  window.addEventListener('unhandledrejection', (event) => {
    if (moduleFailure(event.reason)) show();
  });
  window.addEventListener('error', (event) => {
    if (event.target instanceof HTMLScriptElement && event.target.src) show();
    else if (moduleFailure(event.error ?? event.message)) show();
  }, true);
})();
