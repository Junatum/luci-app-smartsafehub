export interface JarbisStatus {
  apiVersion: number;
  version: string;
  enabled: boolean;
  mqttConfigured: boolean;
  brokerMode: 'managed' | 'external';
  brokerHost: string;
  brokerPort: string;
  brokerReady: boolean;
}

export interface JarbisDevice {
  id: string;
  name: string;
  kind: string;
  protocol: string;
  topic: string;
  enabled: boolean;
  capabilities: string[];
}

export interface JarbisCandidate {
  protocol: string;
  source: 'http' | 'mqtt';
  ip: string;
  mac: string;
  topic: string;
  name: string;
  registered: boolean;
}

export interface JarbisCredentials {
  host: string;
  port: string;
  username: string;
  secret: string;
}

// STATUS11 from the device (not the MQTT publisher acknowledgement).
export interface JarbisLightState {
  id: string;
  observed: boolean;
  source?: 'mqtt' | 'http' | null;
  power: 'ON' | 'OFF' | null;
  brightness: number | null;
  color: string | null;
  colorTemperature: number | null; // Tasmota mired, 153..500
}
