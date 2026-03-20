'use strict';

return view.extend({
	render: function() {
		return E([
			E('link', {
				rel: 'stylesheet',
				href: L.resource('smartsafehub/dashboard.css')
			}),
			E('div', { id: 'app' })
		]);
	}
});
