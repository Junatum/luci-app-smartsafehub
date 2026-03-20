'use strict';
'require view';

return view.extend({
	render: function() {
		return E('div', { class: 'smart-dashboard' }, [
			E('h1', {}, _('통계')),
			E('div', { class: 'smart-card' }, [
				E('p', {}, _('이 페이지는 다음 단계에서 차단 통계와 추이 차트로 확장됩니다.'))
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
