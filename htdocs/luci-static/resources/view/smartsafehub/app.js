'use strict';
'require view';

const ASSET_BASE = '/luci-static/smartsafehub/';
const ASSET_VERSION = '0.2.0-r14';
const ROOT_ID = 'smartsafehub-root';
const PRODUCT_VIEW_CLASS = 'smartsafehub-product-view';
const PRODUCT_CHROME_STYLE_ID = 'smartsafehub-product-chrome-style';
const PRODUCT_VIEW_OBSERVER_KEY = '__SMARTHUB_PRODUCT_VIEW_OBSERVER__';
const PRODUCT_ANCESTOR_CLASS = 'smartsafehub-product-ancestor';
const SCRIPT_LOADING_KEY = '__SMARTHUB_APP_SCRIPT_LOADING__';
const VIEWPORT_META_ID = 'smartsafehub-mobile-viewport';

let applicationFrame = null;
let productAncestors = [];
let productViewActive = false;
let productViewFrame = null;

function assetUrl(name) {
	return `${ASSET_BASE}${name}?v=${encodeURIComponent(ASSET_VERSION)}`;
}

function ensureMobileViewport() {
	let viewport = document.querySelector('meta[name="viewport"]');

	if (!viewport) {
		viewport = document.createElement('meta');
		viewport.name = 'viewport';
		viewport.id = VIEWPORT_META_ID;
		document.head.appendChild(viewport);
	}

	viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
}

function removeLegacyStylesheet() {
	document
		.querySelectorAll('link[data-smartsafehub-asset="css"]')
		.forEach((node) => node.remove());
}

function ensureProductChromeStyle() {
	let style = document.getElementById(PRODUCT_CHROME_STYLE_ID);

	if (style) {
		return;
	}

	style = document.createElement('style');
	style.id = PRODUCT_CHROME_STYLE_ID;
	style.textContent = `
html.${PRODUCT_VIEW_CLASS},
html.${PRODUCT_VIEW_CLASS} body {
	margin: 0 !important;
	padding: 0 !important;
	overflow-x: hidden !important;
}

html.${PRODUCT_VIEW_CLASS} body > header,
html.${PRODUCT_VIEW_CLASS} body > footer,
html.${PRODUCT_VIEW_CLASS} footer,
html.${PRODUCT_VIEW_CLASS} #footer {
	display: none !important;
}

html.${PRODUCT_VIEW_CLASS} .${PRODUCT_ANCESTOR_CLASS} {
	max-width: none !important;
	border: 0 !important;
	border-radius: 0 !important;
	box-shadow: none !important;
}

html.${PRODUCT_VIEW_CLASS} #${ROOT_ID} {
	display: block !important;
	width: 100% !important;
	min-width: 0 !important;
	max-width: 100% !important;
	overflow-x: clip !important;
}

@media (max-width: 767px) {
	html.${PRODUCT_VIEW_CLASS} .alert-message {
		margin-right: 0 !important;
		margin-left: 0 !important;
		padding: 1rem !important;
		border-radius: 0 !important;
	}

	html.${PRODUCT_VIEW_CLASS} .alert-message .btn {
		display: flex !important;
		width: 100% !important;
		min-height: 44px !important;
		margin-top: 0.75rem !important;
		align-items: center !important;
		justify-content: center !important;
	}
}
`;
	document.head.appendChild(style);
}

function clearProductAncestors() {
	for (const node of productAncestors) {
		node.classList.remove(PRODUCT_ANCESTOR_CLASS);
	}

	productAncestors = [];
}

function markProductAncestors() {
	const nextAncestors = [];
	let node = document.getElementById(ROOT_ID)?.parentElement ?? null;

	while (node && node !== document.body) {
		nextAncestors.push(node);
		node = node.parentElement;
	}

	if (
		nextAncestors.length === productAncestors.length &&
		nextAncestors.every((item, index) => item === productAncestors[index])
	) {
		return;
	}

	clearProductAncestors();
	productAncestors = nextAncestors;

	for (const ancestor of productAncestors) {
		ancestor.classList.add(PRODUCT_ANCESTOR_CLASS);
	}
}

function setProductViewActive(active) {
	ensureProductChromeStyle();

	if (productViewActive !== active) {
		productViewActive = active;
		document.documentElement.classList.toggle(PRODUCT_VIEW_CLASS, active);
	}

	if (active) {
		markProductAncestors();
	}
	else if (productAncestors.length) {
		clearProductAncestors();
	}
}

function scheduleProductViewSync() {
	if (productViewFrame != null) {
		return;
	}

	productViewFrame = window.requestAnimationFrame(function() {
		productViewFrame = null;
		setProductViewActive(document.getElementById(ROOT_ID) != null);
	});
}

function observeProductView() {
	if (window[PRODUCT_VIEW_OBSERVER_KEY] instanceof MutationObserver) {
		return;
	}

	const observer = new MutationObserver(scheduleProductViewSync);

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
	window[PRODUCT_VIEW_OBSERVER_KEY] = observer;
}

function stopObservingProductView() {
	const observer = window[PRODUCT_VIEW_OBSERVER_KEY];

	if (observer instanceof MutationObserver) {
		observer.disconnect();
		delete window[PRODUCT_VIEW_OBSERVER_KEY];
	}

	if (productViewFrame != null) {
		window.cancelAnimationFrame(productViewFrame);
		productViewFrame = null;
	}
}

function unmountApplication() {
	if (typeof window.__SMARTHUB_APP_UNMOUNT__ !== 'function') {
		return;
	}

	try {
		window.__SMARTHUB_APP_UNMOUNT__();
	}
	catch (error) {
		console.error('SmartSafeHub application unmount failed', error);
	}
}

function clearApplicationGlobals() {
	delete window.__SMARTHUB_APP_MOUNT__;
	delete window.__SMARTHUB_APP_UNMOUNT__;
	delete window.__SMARTHUB_APP_ASSET_VERSION__;
}

function renderApplicationLoadError() {
	const host = document.getElementById(ROOT_ID);

	if (!host) {
		return;
	}

	host.replaceChildren();

	const panel = document.createElement('div');
	panel.setAttribute('role', 'alert');
	panel.style.cssText = [
		'max-width:720px',
		'margin:32px auto',
		'padding:24px',
		'border:1px solid #fecdd3',
		'border-radius:16px',
		'background:#fff1f2',
		'color:#881337',
		'font-family:system-ui,sans-serif',
	].join(';');

	const title = document.createElement('strong');
	title.textContent = _('Failed to load SmartSafeHub screen.');
	title.style.display = 'block';
	title.style.marginBottom = '8px';

	const description = document.createElement('p');
	description.textContent = _('Static assets may be missing or the browser cache may be out of date.');
	description.style.margin = '0 0 16px';

	const retry = document.createElement('button');
	retry.type = 'button';
	retry.textContent = _('RELOAD');
	retry.style.cssText = [
		'min-height:44px',
		'padding:10px 16px',
		'border:0',
		'border-radius:10px',
		'background:#be123c',
		'color:#fff',
		'font-weight:700',
		'cursor:pointer',
	].join(';');
	retry.addEventListener('click', function() {
		host.replaceChildren();
		ensureApplication(true);
	});

	panel.append(title, description, retry);
	host.appendChild(panel);
}

function ensureApplication(forceReload) {
	const activeVersion = window.__SMARTHUB_APP_ASSET_VERSION__;
	if (
		forceReload !== true &&
		typeof window.__SMARTHUB_APP_MOUNT__ === 'function' &&
		activeVersion === ASSET_VERSION
	) {
		window.__SMARTHUB_APP_MOUNT__();
		return;
	}

	if (window[SCRIPT_LOADING_KEY] === ASSET_VERSION) {
		return;
	}

	// LuCI keeps the current JavaScript context while navigating between views.
	// After a package upgrade an older SmartSafeHub mount function can therefore
	// remain in memory even though ASSET_VERSION changed. Unmount the old tree
	// before replacing its module script and global lifecycle functions.
	unmountApplication();
	document
		.querySelectorAll('script[data-smartsafehub-asset="js"]')
		.forEach((node) => node.remove());
	clearApplicationGlobals();

	const script = document.createElement('script');
	script.type = 'module';
	script.src = assetUrl('app.js');
	script.dataset.smartsafehubAsset = 'js';
	script.dataset.smartsafehubVersion = ASSET_VERSION;
	window[SCRIPT_LOADING_KEY] = ASSET_VERSION;

	script.addEventListener('load', function() {
		if (window[SCRIPT_LOADING_KEY] === ASSET_VERSION) {
			delete window[SCRIPT_LOADING_KEY];
		}

		if (typeof window.__SMARTHUB_APP_MOUNT__ !== 'function') {
			renderApplicationLoadError();
		}
	});
	script.addEventListener('error', function() {
		if (window[SCRIPT_LOADING_KEY] === ASSET_VERSION) {
			delete window[SCRIPT_LOADING_KEY];
		}

		script.remove();
		renderApplicationLoadError();
	});
	document.head.appendChild(script);
}

return view.extend({
	render: function() {
		ensureMobileViewport();
		setProductViewActive(true);
		observeProductView();

		window.__SMARTHUB_BOOTSTRAP__ = Object.freeze({
			sessionId: L.env.sessionid,
			rpcUrl: L.url('admin/ubus'),
			assetBase: ASSET_BASE,
			assetVersion: ASSET_VERSION,
			locale: document.documentElement.lang || 'en',
			translate: _,
		});

		removeLegacyStylesheet();
		applicationFrame = window.requestAnimationFrame(function() {
			applicationFrame = null;
			ensureApplication(false);
		});

		return E('div', {
			'id': ROOT_ID,
			'class': 'smartsafehub-host',
			'aria-live': 'polite',
			'style': 'display:block;width:100%;min-width:0;max-width:100%;',
		});
	},

	remove: function() {
		if (applicationFrame != null) {
			window.cancelAnimationFrame(applicationFrame);
			applicationFrame = null;
		}

		unmountApplication();
		stopObservingProductView();
		setProductViewActive(false);
		delete window.__SMARTHUB_BOOTSTRAP__;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
