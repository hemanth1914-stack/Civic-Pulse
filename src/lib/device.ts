const DEVICE_ID_KEY = 'civicpulse_device_id';
const REPORTER_LABEL_KEY = 'civicpulse_reporter_label';

/**
 * Retrieves the persistent anonymous device ID from localStorage,
 * or generates and stores a new UUID if one does not exist.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-render-device';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Retrieves a friendly public citizen identity (e.g. "Citizen #4821") from localStorage,
 * or generates and stores one permanently for this device.
 */
export function getOrCreateReporterLabel(): string {
  if (typeof window === 'undefined') {
    return 'Citizen #0000';
  }

  let label = localStorage.getItem(REPORTER_LABEL_KEY);
  if (!label) {
    // Generate a 4-digit citizen number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    label = `Citizen #${randomNum}`;
    localStorage.setItem(REPORTER_LABEL_KEY, label);
  }
  return label;
}

