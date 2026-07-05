'use strict';

/**
 * Syncr website SDK — include on https://dsyncr.com pages.
 * Talks to the Syncr browser extension via postMessage (requires the extension installed).
 *
 * Usage:
 *   const ready = await SyncrWeb.whenReady();
 *   if (ready.installed) {
 *     const { enabled } = await SyncrWeb.getActivity('netflix');
 *     await SyncrWeb.enableActivity('netflix');
 *   }
 */
(function (global) {
  const CHANNEL_IN = 'syncr-web';
  const CHANNEL_OUT = 'syncr-extension';
  const activityListeners = new Set();

  function isInstalled() {
    return document.documentElement?.getAttribute('data-syncr-extension') === 'true';
  }

  function getVersion() {
    return document.documentElement?.getAttribute('data-syncr-extension-version') || null;
  }

  function whenReady(timeoutMs) {
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 3000;
    return new Promise((resolve) => {
      if (isInstalled()) {
        resolve({ installed: true, version: getVersion() });
        return;
      }
      const timer = setTimeout(() => {
        window.removeEventListener('syncr-extension-ready', onReady);
        resolve({ installed: false, version: null });
      }, timeout);
      function onReady(e) {
        clearTimeout(timer);
        resolve({ installed: true, version: e.detail?.version || getVersion() });
      }
      window.addEventListener('syncr-extension-ready', onReady, { once: true });
    });
  }

  function emitActivitiesChanged(detail) {
    for (const cb of activityListeners) {
      try { cb(detail); } catch {}
    }
  }

  function initActivityListeners() {
    if (initActivityListeners._ready) return;
    initActivityListeners._ready = true;

    window.addEventListener('syncr-activities-changed', (e) => {
      emitActivitiesChanged(e.detail || {});
    });

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.channel !== CHANNEL_OUT || data.type !== 'event') return;
      if (data.event === 'activities-changed') {
        emitActivitiesChanged(data.payload || {});
      }
    });
  }

  function send(command, payload) {
    initActivityListeners();
    const id = (global.crypto?.randomUUID?.())
      || (`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Syncr extension did not respond'));
      }, 10000);

      function onMessage(event) {
        if (event.source !== window || event.origin !== window.location.origin) return;
        const data = event.data;
        if (!data || data.channel !== CHANNEL_OUT || data.id !== id) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        if (data.ok) resolve(data.payload);
        else reject(new Error(data.error || 'Request failed'));
      }

      window.addEventListener('message', onMessage);
      window.postMessage({
        channel: CHANNEL_IN,
        id,
        command,
        payload: payload || {},
      }, window.location.origin);
    });
  }

  global.SyncrWeb = {
    isInstalled,
    getVersion,
    whenReady,
    ping: () => send('ping'),
    getStatus: () => send('getStatus'),
    getActivities: () => send('getActivities').then(r => r.activities),
    getActivity: (activityId) => send('getActivityEnabled', { activityId }),
    isActivityEnabled: (activityId) => send('getActivityEnabled', { activityId }).then(r => r.enabled),
    openPage: (page, options) => send('openPage', { page, ...(options || {}) }),
    openTestMode: (hash) => send('openPage', { page: 'test-mode', hash: hash || '' }),
    openInstallUpdate: (url) => send('openPage', {
      page: 'install-update',
      query: url ? { url } : {},
    }),
    setTestMode: (enabled) => send('setTestMode', { enabled: !!enabled }),
    setActivityEnabled: (activityId, enabled) => send('setActivityEnabled', {
      activityId,
      enabled: !!enabled,
    }),
    enableActivity: (activityId) => send('setActivityEnabled', { activityId, enabled: true }),
    disableActivity: (activityId) => send('setActivityEnabled', { activityId, enabled: false }),
    onActivitiesChanged(callback) {
      initActivityListeners();
      if (typeof callback !== 'function') return () => {};
      activityListeners.add(callback);
      return () => activityListeners.delete(callback);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
