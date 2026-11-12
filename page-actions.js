const closeStyle = 'background:#087f83;color:#fff;border:1px solid #087f83;border-radius:10px;padding:10px 16px;font:inherit;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;cursor:pointer';
const actionSelector = '.dialog-actions,.work-action-buttons,.alarm-section-save,.actions,.work-draft-actions';

export function installPageActions(win = window, popup = false) {
 function install() {
  const doc = win.document;
  if (!doc.body || doc.documentElement.dataset.pageActions === 'ready') return;
  doc.documentElement.dataset.pageActions = 'ready';
  const style = doc.createElement('style');
  style.textContent = `
   .page-action-footer{display:flex!important;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap;width:100%;margin:18px 0 0!important;padding:16px!important;border:1px solid #cce5e5;border-radius:12px;background:#f4fafb;box-sizing:border-box}
   .page-action-footer>.danger,.page-action-footer>.delete-record,.page-action-footer>[data-delete],.page-action-footer>[id^="delete"]{margin-right:auto}
   .page-action-footer>[role="status"]:empty{display:none}
   .page-action-footer>[role="status"]:not(:empty){flex-basis:100%;margin:0}
   .page-action-footer button{min-height:42px}
   .work-draft-title{align-items:flex-start;gap:16px}
   .work-draft-title h2{margin-top:4px}
   .alarm-section-save{margin-top:14px}
   .alarm-section-reporter{gap:12px!important}
   .bess-trip-event{padding:16px!important}
   .bess-trip-event .thai-date-summary{display:none}
   .bess-trip-event .be-calendar,.bess-trip-event .time-picker-24,.bess-trip-event .thai-time-controls{margin-top:5px}
   @media(max-width:600px){.page-action-footer{gap:8px;padding:12px!important}.page-action-footer button{padding:9px 12px}}
  `;
  doc.head.append(style);
  let queued = false;
  function refresh() {
   queued = false;
   const roots = popup ? [doc.body] : [...doc.querySelectorAll('dialog')];
   for (const root of roots) {
    // Only explicit close controls qualify. Keep save, cancel and delete behavior intact.
    const closers = [...root.querySelectorAll('button')].filter(button =>
     /^(?:ปิด(?:\s*[×✕✖])?|[×✕✖])$/.test(button.textContent.trim()) ||
     /^(?:ปิด|ปิดหน้าต่าง)$/.test(button.getAttribute('aria-label') || ''));
    for (const button of closers) {
     if (button.dataset.standardClose) continue;
     button.dataset.standardClose = 'true';
     button.textContent = 'ปิด ×';
     button.style.cssText += ';' + closeStyle;
    }
    for (const actions of root.querySelectorAll(actionSelector)) {
     if (actions.closest('header,.heading') || !actions.querySelector('button')) continue;
     if (!actions.querySelector('button[type="submit"],button.primary,[data-cancel],[data-close],[data-close-page],[data-save-section],[id*="close"],[id*="cancel"],[id*="save"],[id*="delete"]')) continue;
     actions.classList.add('page-action-footer');
    }
    // Read-only pages have a close action only.
    if (!popup || root.querySelector('.page-action-footer') || !closers.length) continue;
    const original = closers[0];
    const footer = doc.createElement('div');
    footer.className = 'page-action-footer';
    const close = doc.createElement('button');
    close.type = 'button';
    close.textContent = 'ปิด ×';
    close.style.cssText = closeStyle;
    close.dataset.standardClose = 'true';
    close.onclick = () => original.click();
    footer.append(close);
    (root.querySelector('main') || root).append(footer);
   }
  }
  const queue = () => {
   if (queued) return;
   queued = true;
   win.queueMicrotask(refresh);
  };
  new win.MutationObserver(queue).observe(doc.body, { childList: true, subtree: true });
  refresh();
 }
 if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', install, {once:true});
 else install();
 if (win.__pageActionsInstalled) return;
 win.__pageActionsInstalled = true;
 const originalOpen = win.open;
 win.open = function(...args) {
  const child = originalOpen.apply(this,args);
  if (!child) return child;
  try {
   installPageActions(child,true);
   const closeDocument = child.document.close;
   child.document.close = function(...values) {
    const result = closeDocument.apply(this,values);
    installPageActions(child,true);
    return result;
   };
   child.addEventListener('load', () => installPageActions(child,true));
  } catch { /* Cross-origin tabs provide their own controls. */ }
  return child;
 };
}
installPageActions(window, !document.querySelector('#workspace'));
