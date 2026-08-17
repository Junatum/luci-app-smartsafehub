#!/bin/sh
set -eu

entrypoint=${1:?missing rpcd entrypoint}
module_dir=${2:?missing rpcd module directory}

files="${entrypoint} ${module_dir}/core.uc ${module_dir}/devices.uc ${module_dir}/system.uc ${module_dir}/wifi.uc ${module_dir}/wifi-management.uc"

for file in ${files}; do
	if [ ! -s "${file}" ]; then
		echo "ERROR: SmartSafeHub rpcd source is missing: ${file}" >&2
		exit 1
	fi
done

if [ -e "${module_dir}/safeshield.uc" ]; then
	echo "ERROR: SmartSafeHub must not own SafeShield controller logic; remove smartsafehub/safeshield.uc" >&2
	exit 1
fi

awk '
	FNR == 1 {
		in_import = 0
		previous = ""
		previous_line = 0
	}

	/^[[:space:]]*import[[:space:]]*\{/ {
		in_import = 1
		previous = $0
		previous_line = FNR

		if ($0 ~ /\}[[:space:]]*from[[:space:]]/) {
			in_import = 0
		}

		next
	}

	in_import && /^[[:space:]]*\}[[:space:]]*from[[:space:]]/ {
		if (previous ~ /,[[:space:]]*$/) {
			printf "ERROR: trailing comma in named import: %s:%d\n", FILENAME, previous_line > "/dev/stderr"
			failed = 1
		}

		in_import = 0
		next
	}

	in_import {
		previous = $0
		previous_line = FNR
	}

	/^export[[:space:]]+function[[:space:]]/ {
		in_export_function = 1
		export_line = FNR
		next
	}

	in_export_function && /^}/ {
		if ($0 !~ /^};[[:space:]]*$/) {
			printf "ERROR: exported ucode function must end with };: %s:%d\n", FILENAME, export_line > "/dev/stderr"
			failed = 1
		}

		in_export_function = 0
	}

	END {
		exit failed
	}
' ${files}

grep -Fq "import { wifi_band } from './wifi.uc';" "${module_dir}/devices.uc" || {
	echo "ERROR: devices.uc does not import wifi_band from wifi.uc" >&2
	exit 1
}

grep -Fq 'export function wifi_band(' "${module_dir}/wifi.uc" || {
	echo "ERROR: wifi.uc does not export wifi_band" >&2
	exit 1
}

grep -Fq 'wifi_is_managed_section' "${module_dir}/wifi-management.uc" || {
	echo "ERROR: wifi-management.uc does not use wifi_is_managed_section" >&2
	exit 1
}

grep -Fq 'export function wifi_is_managed_section(' "${module_dir}/wifi.uc" || {
	echo "ERROR: wifi.uc does not export wifi_is_managed_section" >&2
	exit 1
}

for module in devices system wifi-management; do
	grep -Fq "from './smartsafehub/${module}.uc'" "${entrypoint}" || {
		echo "ERROR: smartsafehub.uc does not import ${module}.uc" >&2
		exit 1
	}
done

if grep -Fq "from './smartsafehub/safeshield.uc'" "${entrypoint}"; then
	echo "ERROR: smartsafehub.uc must use the official safeshield ubus object instead of a proxy module" >&2
	exit 1
fi

grep -Fq 'return { smartsafehub: methods };' "${entrypoint}" || {
	echo "ERROR: smartsafehub.uc does not return the rpcd signature" >&2
	exit 1
}

for method in \
	status \
	connected_devices \
	wifi_summary \
	wifi_update \
	system_reboot
do
	grep -Fq "${method}:" "${entrypoint}" || {
		echo "ERROR: smartsafehub.uc does not register ${method}" >&2
		exit 1
	}
done

if grep -Eq 'safeshield_(set_enabled|refresh|rules_list|rule_add|rule_delete):' "${entrypoint}"; then
	echo "ERROR: SmartSafeHub still exposes obsolete SafeShield proxy RPC methods" >&2
	exit 1
fi

if grep -Fq 'system_diagnostics:' "${entrypoint}"; then
	echo "ERROR: smartsafehub.uc still registers the removed system_diagnostics method" >&2
	exit 1
fi
