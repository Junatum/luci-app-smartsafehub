import { callApi } from './rpc';
import type { JarbisCandidate, JarbisCredentials, JarbisDevice, JarbisStatus, JarbisLightState } from '../types/jarbis';

const rpc = <T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 6500) =>
  callApi<T>('jarbis', method, params, { priority: 'high', timeoutMs });

export const getJarbisStatus = () => rpc<JarbisStatus>('status');
export const getJarbisDevices = () => rpc<{ devices: JarbisDevice[] }>('devices_list');
export const getJarbisCandidates = () => rpc<{ devices: JarbisCandidate[] }>('discovery_list');
export const scanJarbis = () => rpc<{ devices: JarbisCandidate[] }>('discovery_scan', {}, 35000);
export const setJarbisEnabled = (enabled: boolean) => rpc<{ enabled: boolean }>('settings_update', { enabled }, 15000);
export const addJarbisDevice = (id: string, name: string, topic: string) => rpc<{ id: string; added: boolean }>('device_add', { id, name, topic });
export const updateJarbisDevice = (id: string, name: string, enabled: boolean) => rpc<{ id: string; updated: boolean }>('device_update', { id, name, enabled });
export const removeJarbisDevice = (id: string) => rpc<{ id: string; removed: boolean }>('device_remove', { id });
export const getJarbisLightState = (id: string) => rpc<JarbisLightState>('light_state', { id }, 11500);
export const setJarbisLight = (id: string, capability: 'power' | 'brightness' | 'color' | 'color_temperature', value: string) =>
  rpc<{ accepted: boolean }>('light_set', { id, capability, value });
export const getJarbisCredentials = () => rpc<JarbisCredentials>('broker_credentials');

// Pairing never exposes the managed MQTT secret to the browser. The optional
// Tasmota web-admin password is sent only in this explicit RPC request.
export const pairJarbisDevice = (id: string, adminPassword = '', replaceExisting = false) =>
  rpc<{ id: string; configured: boolean; mqttConfirmed: boolean }>(
    'device_pair', { id, admin_password: adminPassword, replace_existing: replaceExisting }, 32000,
  );
