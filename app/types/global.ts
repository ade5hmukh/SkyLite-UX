type GlobalThis = {
  __BROWSER_TIMEZONE__?: string;
  __TIMEZONE_REGISTERED__?: boolean;
  __TIMEZONE_SERVICE_READY__?: boolean;
};

export function getBrowserTimezone(): string | undefined {
  return (globalThis as GlobalThis).__BROWSER_TIMEZONE__;
}

export function isTimezoneRegistered(): boolean {
  return (globalThis as GlobalThis).__TIMEZONE_REGISTERED__ === true;
}

export function isTimezoneServiceReady(): boolean {
  return (globalThis as GlobalThis).__TIMEZONE_SERVICE_READY__ === true;
}

export function setBrowserTimezone(timezone: string): void {
  (globalThis as GlobalThis).__BROWSER_TIMEZONE__ = timezone;
}

export function setTimezoneRegistered(registered: boolean): void {
  (globalThis as GlobalThis).__TIMEZONE_REGISTERED__ = registered;
}

export function setTimezoneServiceReady(ready: boolean): void {
  (globalThis as GlobalThis).__TIMEZONE_SERVICE_READY__ = ready;
}

export type { };
