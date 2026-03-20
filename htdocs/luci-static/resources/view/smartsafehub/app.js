'use strict';
'require view';

const ASSET_BASE = '/luci-static/smartsafehub/';
const ASSET_VERSION = '0.2.0-r4';
const ROOT_ID = 'smartsafehub-root';
const PRODUCT_VIEW_CLASS = 'smartsafehub-product-view';
const PRODUCT_CHROME_STYLE_ID = 'smartsafehub-product-chrome-style';
const PRODUCT_VIEW_OBSERVER_KEY = '__SMARTHUB_PRODUCT_VIEW_OBSERVER__';
const PRODUCT_ANCESTOR_CLASS = 'smartsafehub-product-ancestor';
const VIEWPORT_META_ID = 'smartsafehub-mobile-viewport';

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
	background: #f8fafc !important;
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
	background: transparent !important;
	border: 0 !important;
	border-radius: 0 !important;
	box-shadow: none !important;
	overflow: visible !important;
}

html.${PRODUCT_VIEW_CLASS} #${ROOT_ID} {
	position: relative !important;
	left: 50% !important;
	display: block !important;
	width: 100vw !important;
	min-width: 0 !important;
	max-width: none !important;
	margin-left: -50vw !important;
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

function ensureApplication() {
	const activeVersion = window.__SMARTHUB_APP_ASSET_VERSION__;
	if (
		typeof window.__SMARTHUB_APP_MOUNT__ === 'function' &&
		activeVersion === ASSET_VERSION
	) {
		window.__SMARTHUB_APP_MOUNT__();
		return;
	}

	// LuCI keeps the current JavaScript context while navigating between views.
	// After a package upgrade an older SmartSafeHub mount function can therefore
	// remain in memory even though ASSET_VERSION changed. Remove the stale script
	// and globals so the versioned module URL is loaded again.
	document
		.querySelectorAll('script[data-smartsafehub-asset="js"]')
		.forEach((node) => node.remove());
	delete window.__SMARTHUB_APP_MOUNT__;
	delete window.__SMARTHUB_APP_ASSET_VERSION__;

	const script = document.createElement('script');
	script.type = 'module';
	script.src = assetUrl('app.js');
	script.dataset.smartsafehubAsset = 'js';
	script.dataset.smartsafehubVersion = ASSET_VERSION;
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
			locale: document.documentElement.lang || 'ko',
		});

		removeLegacyStylesheet();
		window.requestAnimationFrame(ensureApplication);

		return E('div', {
			'id': ROOT_ID,
			'class': 'smartsafehub-host',
			'aria-live': 'polite',
			'style': 'display:block;width:100%;min-width:0;max-width:100%;',
		});
	},

	remove: function() {
		stopObservingProductView();
		setProductViewActive(false);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
