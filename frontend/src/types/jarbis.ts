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
