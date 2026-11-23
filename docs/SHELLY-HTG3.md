# Shelly H&T Gen3 스마트홈 연동 계약

이 문서는 `luci-app-smartsafehub`의 센서 UI와 **별도 패키지인 Jarbis**가 충족해야 할 연결 계약을 정의합니다. LuCI 패치만 설치하면 Shelly 기기가 검색·등록·수신되는 것은 **아닙니다**. Jarbis 센서 수신기 구현과 검증이 완료될 때만 아래 feature flag를 활성화해야 합니다.

## 기기 특성

- Shelly H&T Gen3 (`S3SN-0U12A`, `ShellyHTG3-...`)는 온도·습도를 측정하는 배터리/USB 전원 기기입니다.
- 배터리 모드에서는 측정·보고 후 잠듭니다. 변화 보고 기준(기본 온도 0.5°C/습도 5%RH)에 미달하면 약 2시간 동안 새 보고가 없을 수 있습니다. USB 모드에서는 보통 5분 간격으로 보고합니다.
- 따라서 **고정 간격 IP/HTTP 폴링으로 온·오프라인을 판단하지 않습니다.** 관리 화면은 Jarbis에 저장된 마지막으로 검증된 측정값과 측정 시각만 표시합니다.
- Shelly Gen3의 표준 MQTT 토픽 예: `<topic_prefix>/status/temperature:0`, `<topic_prefix>/status/humidity:0`, `<topic_prefix>/status/devicepower:0` (`status_ntf` 필요). 온도 `tC`, 습도 `rh`, 전원 `battery.percent`를 각 구성요소에서 파싱합니다. 부분 보고를 받아도 이전의 다른 센서 값을 초기화하지 않습니다.
- 처음 Wi-Fi와 MQTT 연결은 **사용자가 Shelly 자체의 설정 화면**에서 승인/설정합니다. Tasmota 자동 연결(`device_pair`)을 Shelly에 호출하지 않습니다.

## Jarbis가 충족해야 할 RPC 계약

* `status`: `features: { "shellyHtg3": true }`를 추가합니다. 실제 수신·등록이 준비된 버전에서만 `true`를 보냅니다. 그 전에는 생략하거나 `false`로 유지합니다.
* `discovery_scan`, `discovery_list`: 등록되지 않은 Shelly H&T Gen3를 `protocol: "shelly_htg3"`, `kind: "sensor"`, `source: "http" | "mqtt"`, `topic: "shellyhtg3-..."`, `ip`, `mac`, `name`, `registered`로 반환합니다. mDNS `_shelly._tcp`과 `Shelly.GetDeviceInfo`에서 **gen=3, app=HTG3 또는 model=S3SN-0U12A**를 확인하여 잘못된 제품을 수집하지 않아야 합니다. 기기가 잠든 경우 탐지되지 않을 수 있습니다.
* `device_add`: 기존 Tasmota 요청은 그대로 처리합니다. Shelly 요청에 한하여 `{ id, name, topic, protocol: "shelly_htg3", kind: "sensor" }`를 받아 `{ id, added: true }`를 반환하고 `devices_list`에 `kind: "sensor", protocol: "shelly_htg3"`로 기록합니다. 임의의 IP/토픽/프로토콜 등록과 중복 ID를 방지하며 사용자 동의 없이 기존 MQTT 연결을 덮어쓰지 않습니다.
* `sensor_state`: `{ id }`에 대한 응답은 `{ id, observed, source, temperatureC, humidityPercent, batteryPercent, lastSeen }`입니다. 값은 숫자 또는 null, `lastSeen`은 실제 수신 시각의 Unix **초** 또는 null입니다. 재조회 시각으로 바꾸지 마세요. 검증되지 않은 데이터는 `observed: false`로 반환합니다. 온습도/배터리의 기존 측정치를 유지하고, 재부팅/페이지 재방문에도 마지막 값을 읽을 수 있도록 영속 저장 정책을 정하세요.
* UI의 `sensor_state`는 5분에 한 번(최대 6대, 순차) 조회합니다. 오래된 측정값은 3시간 후 '오래된 측정값'으로 표시하지만 **기기 오프라인 판정**으로 사용하지 않습니다. 기존 `light_state`는 전구에 대해서만 조회합니다.
* SmartSafeHub ACL 읽기 목록에 `sensor_state`만 추가했습니다. 센서 제어·계정 비밀번호를 반환하는 RPC는 추가하지 않았습니다.

## 보안 및 수동 실기기 테스트

- 승인된 등록 기기의 MQTT topic만 구독, 고정된 크기 제한, 메시지 구조/수치/ID 검증, 안전한 파일 갱신을 사용합니다. `sensor_state`에서 MQTT 자격증명이나 임의 HTTP URL을 노출하지 않습니다.
- Broker는 공유기의 신뢰할 수 있는 LAN에만 바인딩하고 WAN 포트 포워딩을 하지 않습니다. 센서의 임의 IP에 접속하거나 Shelly Cloud를 필수로 사용하도록 구현하지 않습니다.
- 실기기: Shelly를 Wi-Fi에 연결 → MQTT Broker 수동 설정 → 센서를 깨워 수신 확인 → 검색 후 등록 → 온도·습도·배터리·수신 시각 확인 → 30분 이상 절전 상태에서 값 유지 확인 → 3시간 이상 보고 없음 상태 확인 → 재부팅 후 측정값 복구 확인.

참고: [Shelly H&T Gen3 API](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyHTG3/), [Shelly MQTT](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Mqtt/), [Shelly H&T Gen3 안내](https://kb.shelly.cloud/knowledge-base/shelly-h-t-gen3).
