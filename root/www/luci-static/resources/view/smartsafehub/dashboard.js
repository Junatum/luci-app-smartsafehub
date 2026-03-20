'use strict';
'require view';
'require rpc';
'require ui';

const callOverview = rpc.declare({
	object: 'luci',
	method: 'getFeatures',
	expect: { '': {} }
});

function fetchOverview() {
	return fetch(L.url('admin/smart/api/overview'), {
		method: 'GET',
		credentials: 'same-origin'
	}).then((res) => {
		if (!res.ok)
			throw new Error('Failed to load overview');
		return res.json();
	});
}

function renderStatusBadge(ok, onText, offText) {
	return E('span', {
		class: 'smart-badge ' + (ok ? 'is-ok' : 'is-off')
	}, ok ? onText : offText);
}

return view.extend({
	load: function() {
		return Promise.all([
			callOverview().catch(() => ({})),
			fetchOverview().catch(() => null)
		]);
	},

	render: function(data) {
		const overview = data[1];

		if (!overview) {
			return E('div', { class: 'smart-dashboard' }, [
				E('h1', {}, _('SmartSafeHub')),
				E('div', { class: 'smart-card' }, [
					E('h2', {}, _('오류')),
					E('p', {}, _('대시보드 데이터를 불러오지 못했습니다.'))
				])
			]);
		}

		const internetUp = !!overview.internet?.up;
		const wanProto = overview.internet?.proto || '-';
		const wanIp = overview.internet?.ipaddr || '-';

		const safeshieldEnabled = !!overview.safeshield?.enabled;
		const blockedToday = overview.safeshield?.blocked_today ?? 0;
		const deviceCount = overview.devices?.count ?? 0;

		return E('div', { class: 'smart-dashboard' }, [
			E('div', { class: 'smart-dashboard-header' }, [
				E('div', {}, [
					E('h1', {}, _('SmartSafeHub')),
					E('p', { class: 'smart-subtle' }, _('집 안의 인터넷, 기기, 보안을 한 곳에서 관리합니다.'))
				])
			]),

			E('div', { class: 'smart-card-grid' }, [
				E('div', { class: 'smart-card' }, [
					E('h2', {}, _('인터넷 상태')),
					E('div', { class: 'smart-card-value' }, [
						renderStatusBadge(internetUp, _('연결됨'), _('연결 안 됨'))
					]),
					E('ul', { class: 'smart-meta-list' }, [
						E('li', {}, [_('연결 방식'), E('strong', {}, wanProto)]),
						E('li', {}, [_('WAN IP'), E('strong', {}, wanIp)])
					])
				]),

				E('div', { class: 'smart-card' }, [
					E('h2', {}, _('SafeShield')),
					E('div', { class: 'smart-card-value' }, [
						renderStatusBadge(safeshieldEnabled, _('활성화됨'), _('비활성화됨'))
					]),
					E('ul', { class: 'smart-meta-list' }, [
						E('li', {}, [_('오늘 차단 수'), E('strong', {}, String(blockedToday))])
					])
				]),

				E('div', { class: 'smart-card' }, [
					E('h2', {}, _('연결된 기기')),
					E('div', { class: 'smart-card-value' }, [
						E('strong', {}, String(deviceCount) + _('대'))
					]),
					E('ul', { class: 'smart-meta-list' }, [
						E('li', {}, [_('현재 DHCP 기준 연결 기기 수')])
					])
				])
			]),

			E('div', { class: 'smart-actions' }, [
				E('a', {
					class: 'cbi-button cbi-button-action',
					href: L.url('admin/smart/safeshield')
				}, _('SafeShield 관리')),

				E('a', {
					class: 'cbi-button cbi-button-neutral',
					href: L.url('admin/smart/devices')
				}, _('기기 보기')),

				E('a', {
					class: 'cbi-button cbi-button-neutral',
					href: L.url('admin/network/network')
				}, _('고급 설정'))
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
