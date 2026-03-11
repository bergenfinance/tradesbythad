/**
 * Router — Hash-based SPA routing with cleanup callbacks.
 *
 * Routes:
 *   #/                        → main page (index charts)
 *   #/group/{groupId}         → group page
 *   #/example/{exampleId}     → example detail
 */
const Router = (() => {
  let routes = {};
  let cleanupFn = null;
  let currentRoute = null;

  function register(pattern, handler) {
    routes[pattern] = handler;
  }

  function navigate(hash) {
    if (hash !== window.location.hash) {
      window.location.hash = hash;
    }
  }

  function parseHash() {
    const hash = window.location.hash || '#/';
    const path = hash.replace('#', '') || '/';
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { route: 'main', params: {} };
    }
    if (parts[0] === 'group' && parts[1]) {
      return { route: 'group', params: { groupId: parts[1] } };
    }
    if (parts[0] === 'example' && parts[1]) {
      return { route: 'example', params: { exampleId: parts[1] } };
    }
    return { route: 'main', params: {} };
  }

  function handleRoute() {
    // Run cleanup from previous view
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }

    const { route, params } = parseHash();
    currentRoute = { route, params };

    const handler = routes[route];
    if (handler) {
      const result = handler(params);
      // Handler can return a cleanup function
      if (typeof result === 'function') {
        cleanupFn = result;
      }
    }
  }

  function getCurrentRoute() {
    return currentRoute || parseHash();
  }

  function start() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function destroy() {
    window.removeEventListener('hashchange', handleRoute);
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
  }

  return { register, navigate, start, destroy, getCurrentRoute, parseHash };
})();
