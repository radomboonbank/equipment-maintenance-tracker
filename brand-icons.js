const brandAssets = [
 {rel:'icon', type:'image/x-icon', file:'CROD-Grid-Care.ico'},
 {rel:'icon', type:'image/png', sizes:'192x192', file:'icon-192.png'},
 {rel:'apple-touch-icon', file:'icon-192.png'},
 {rel:'manifest', file:'site.webmanifest'}
];

export function installBrandIcons(win = window) {
 function attach() {
  const doc = win.document;
  if (!doc.head || doc.__gridBrandHead === doc.head) return;
  doc.__gridBrandHead = doc.head;
  function update() {
   for (const asset of brandAssets) {
    const href = new URL('./' + asset.file + '?v=20261115-transparent', import.meta.url).href;
    if ([...doc.head.querySelectorAll('link')].some(link => link.rel === asset.rel && link.href === href)) continue;
    const link = doc.createElement('link');
    link.rel = asset.rel;
    if (asset.type) link.type = asset.type;
    if (asset.sizes) link.sizes = asset.sizes;
    link.href = href;
    doc.head.append(link);
   }
  }
  update();
  new win.MutationObserver(update).observe(doc.head, {childList:true});
 }
 try {attach();} catch {return;}
 if (win.__gridBrandInstalled) return;
 win.__gridBrandInstalled = true;
 const open = win.open;
 win.open = function(...args) {
  const child = open.apply(this,args);
  if (!child) return child;
  try {
   installBrandIcons(child);
   const close = child.document.close;
   child.document.close = function(...values) {
    const result = close.apply(this,values);
    installBrandIcons(child);
    return result;
   };
   child.addEventListener('load', () => installBrandIcons(child));
  } catch { /* Other websites manage their own branding. */ }
  return child;
 };
}
installBrandIcons();
