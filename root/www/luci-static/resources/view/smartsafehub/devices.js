'use strict';
'require view';

function fetchDevices() {
	return fetch(L.url('admin/smart/api/devices'), {
		method: 'GET',
		credentials: 'same-origin'
	}).then((res) => {
		if (!res.ok)
			throw new Error('Failed to load devices');
		return res.json();
	});
}

function formatLeaseExpiry(expires) {
	if (!expires || expires <= 0)
		return _('알 수 없음');

	const now = Math.floor(Date.now() / 1000);
	const diff = expires - now;

	if (diff <= 0)
		return _('만료됨');

	const hours = Math.floor(diff / 3600);
	const mins = Math.floor((diff % 3600) / 60);

	if (hours > 0)
		return _('약 %dh %dm 남음').format(hours, mins);

	return _('약 %dm 남음').format(mins);
}

function renderDeviceRow(device) {
	return E('tr', {}, [
		E('td', {}, device.hostname || '—'),
		E('td', {}, device.ipaddr || '—'),
		E('td', {}, device.mac || '—'),
		E('td', {}, formatLeaseExpiry(device.expires))
	]);
}

return view.extend({
	load: function() {
		return fetchDevices().catch(() => null);
	},

	render: function(data) {
		if (!data) {
			return E('div', { class: 'smart-dashboard' }, [
				E('h1', {}, _('기기')),
				E('div', { class: 'smart-card' }, [
					E('p', {}, _('기기 목록을 불러오지 못했습니다.'))
				])
			]);
		}

		const devices = Array.isArray(data.devices) ? data.devices : [];
		const count = data.count || devices.length || 0;

		return E('div', { class: 'smart-dashboard' }, [
			E('div', { class: 'smart-dashboard-header' }, [
				E('div', {}, [
					E('h1', {}, _('기기')),
					E('p', { class: 'smart-subtle' }, _('현재 연결된 기기와 DHCP 기반 주소 정보를 확인합니다.'))
				])
			]),

			E('div', { class: 'smart-card' }, [
				E('div', { class: 'smart-card-header-row' }, [
					E('h2', {}, _('연결된 기기')),
					E('span', { class: 'smart-badge is-ok' }, _('총 %d대').format(count))
				]),

				devices.length
					? E('div', { class: 'table-wrapper' }, [
						E('table', { class: 'table' }, [
							E('thead', {}, [
								E('tr', {}, [
									E('th', {}, _('이름')),
									E('th', {}, _('IP 주소')),
									E('th', {}, _('MAC 주소')),
									E('th', {}, _('임대 만료'))
								])
							]),
							E('tbody', {}, devices.map(renderDeviceRow))
						])
					])
					: E('div', { class: 'smart-empty' }, [
						E('p', {}, _('표시할 기기가 없습니다.'))
					])
			]),

			E('div', { class: 'smart-actions' }, [
				E('a', {
					class: 'cbi-button cbi-button-neutral',
					href: L.url('admin/smart/dashboard')
				}, _('홈으로 돌아가기')),

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
