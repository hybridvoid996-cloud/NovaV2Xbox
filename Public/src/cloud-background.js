const host = document.getElementById('cloud-background');
const video = host.querySelector('video'), image = host.querySelector('img');
image.onerror = () => image.hidden = true; video.addEventListener('error', () => video.hidden = true);
export function syncBackground() {
  if(document.documentElement.classList.contains('nova-os-embedded')){video.pause();host.hidden=true;return;}
  const reduced = (globalThis.NovaMotion?.reduced ?? matchMedia('(prefers-reduced-motion:reduce)').matches) || localStorage.getItem('nova_reduce_motion') === 'true';
  const quiet = localStorage.getItem('nova_performance_mode') === 'true';
  document.documentElement.classList.toggle('reduce-motion', reduced || quiet);
  document.documentElement.classList.toggle('page-hidden', document.hidden);
  let gradient; try { gradient = JSON.parse(localStorage.getItem('nova_grad')); } catch {}
  host.style.background = ''; video.hidden = image.hidden = true;
  if (gradient && [gradient.c1, gradient.c2, gradient.c3].every(color => /^#[a-f0-9]{3,8}$/i.test(color))) {
    const direction = /^(to (left|right|top|bottom)( (left|right|top|bottom))?|[0-9.-]+deg)$/.test(gradient.dir) ? gradient.dir : '135deg';
    host.style.background = `linear-gradient(${direction},${gradient.c1},${gradient.c2},${gradient.c3})`;
    video.pause(); return;
  }
  const source = localStorage.getItem('nova_wallpaper_upload') || localStorage.getItem('nova_wallpaper');
  if (!source) { video.pause(); return; }
  const isVideo = localStorage.getItem('nova_wallpaper_is_video') === 'true' || /\.mp4(?:$|[?#])/i.test(source);
  const media = isVideo ? video : image; media.hidden = false;
  if (media.getAttribute('src') !== source) media.src = source;
  if (isVideo && !document.hidden && !reduced && !quiet) video.play().catch(() => {}); else video.pause();
}
syncBackground(); addEventListener('storage', syncBackground); document.addEventListener('visibilitychange', syncBackground);
