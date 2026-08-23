import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface AppConfig {
  x?: number;
  y?: number;
  scale: number;
  opacity: number;
  fps: number;
  mouseTracking: boolean;
  mouseSensitivity: number;
  clickThrough: boolean;
  alwaysOnTop: boolean;
  startWithWindows: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  scale: 1.0,
  opacity: 1.0,
  fps: 60,
  mouseTracking: true,
  mouseSensitivity: 1.0,
  clickThrough: false,
  alwaysOnTop: true,
  startWithWindows: false,
};

let configCache: AppConfig | null = null;

const getConfigPath = () => {
  return path.join(app.getPath('userData'), 'aiko-settings.json');
};

export const getConfig = (): AppConfig => {
  if (configCache) return configCache;

  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } else {
      configCache = { ...DEFAULT_CONFIG };
    }
  } catch (error) {
    console.error('Failed to read config:', error);
    configCache = { ...DEFAULT_CONFIG };
  }

  return configCache;
};

export const saveConfig = (newConfig: Partial<AppConfig>) => {
  const currentConfig = getConfig();
  configCache = { ...currentConfig, ...newConfig };
  
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(configCache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
};
