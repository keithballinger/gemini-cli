export interface SystemInfo {
  platform: string;
  userAgent: string;
  language: string;
  languages: readonly string[];
  online: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  maxTouchPoints: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: NetworkInformation;
}

export interface PerformanceInfo {
  timeOrigin: number;
  timing?: PerformanceTiming;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  orientation?: {
    angle: number;
    type: string;
  };
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export class BrowserProcessInfo {
  getSystemInfo(): SystemInfo {
    const nav = navigator as any;
    
    return {
      platform: nav.platform || 'unknown',
      userAgent: nav.userAgent,
      language: nav.language,
      languages: nav.languages || [nav.language],
      online: nav.onLine,
      cookieEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack,
      maxTouchPoints: nav.maxTouchPoints || 0,
      hardwareConcurrency: nav.hardwareConcurrency || 1,
      deviceMemory: nav.deviceMemory,
      connection: nav.connection
    };
  }

  getPerformanceInfo(): PerformanceInfo {
    const perf = performance as any;
    
    return {
      timeOrigin: perf.timeOrigin || perf.timing?.navigationStart || Date.now(),
      timing: perf.timing,
      memory: perf.memory ? {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
      } : undefined
    };
  }

  getScreenInfo(): ScreenInfo {
    const screen = window.screen;
    const orientation = (screen as any).orientation;
    
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: orientation ? {
        angle: orientation.angle,
        type: orientation.type
      } : undefined
    };
  }

  getCurrentDirectory(): string {
    return '/virtual-workspace';
  }

  getHomedir(): string {
    return '/virtual-home';
  }

  getPlatform(): string {
    // Try to determine platform from user agent
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mac')) return 'darwin';
    if (userAgent.includes('win')) return 'win32';
    if (userAgent.includes('linux')) return 'linux';
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    
    return 'browser';
  }

  getArchitecture(): string {
    // Limited detection in browser
    const nav = navigator as any;
    if (nav.userAgentData?.platform) {
      return nav.userAgentData.platform;
    }
    
    // Fallback based on CPU core count
    const cores = navigator.hardwareConcurrency || 1;
    return cores > 4 ? 'x64' : 'unknown';
  }

  getEnvironmentVariables(): Record<string, string> {
    // Browsers don't have traditional environment variables
    // Return browser-specific "environment" info
    return {
      BROWSER: 'true',
      USER_AGENT: navigator.userAgent,
      LANGUAGE: navigator.language,
      PLATFORM: this.getPlatform(),
      ARCHITECTURE: this.getArchitecture(),
      ONLINE: navigator.onLine ? 'true' : 'false',
      COOKIE_ENABLED: navigator.cookieEnabled ? 'true' : 'false'
    };
  }

  async getBatteryInfo(): Promise<any> {
    const nav = navigator as any;
    if ('getBattery' in nav) {
      try {
        return await nav.getBattery();
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  getGeoLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 60000
      });
    });
  }
}