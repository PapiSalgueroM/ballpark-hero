export function publicAdCanonical(path = location.pathname) {
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = 'https://douknowball.com' + path;
  document.head.appendChild(canonical);
  return canonical;
}

export function mountPublicFooterSlot() {
  const footer = document.createElement('div');
  footer.setAttribute('data-public-footer-ad', '');
  footer.innerHTML = '<div data-dukb-manual-ad="public-footer"><ins class="adsbygoogle" data-ad-slot="7540487748"></ins></div>';
  document.body.appendChild(footer);
  return footer.querySelector('ins')!;
}
