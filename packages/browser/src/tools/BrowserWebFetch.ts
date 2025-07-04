export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  cors?: 'include' | 'same-origin' | 'omit';
}

export interface FetchResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  text: string;
  url: string;
  success: boolean;
  error?: string;
}

export class BrowserWebFetch {
  private defaultTimeout = 30000; // 30 seconds

  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      cors = 'same-origin'
    } = options;

    try {
      // Validate URL
      new URL(url); // This will throw if URL is invalid

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method,
        headers,
        body,
        credentials: cors,
        signal: controller.signal
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const text = await response.text();
      
      // Convert Headers object to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        text,
        url: response.url,
        success: response.ok
      };

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            status: 0,
            statusText: 'Timeout',
            headers: {},
            text: '',
            url,
            success: false,
            error: `Request timed out after ${timeout}ms`
          };
        }

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          return {
            status: 0,
            statusText: 'Network Error',
            headers: {},
            text: '',
            url,
            success: false,
            error: 'Network error (possibly CORS issue or site is down)'
          };
        }
      }

      return {
        status: 0,
        statusText: 'Error',
        headers: {},
        text: '',
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async get(url: string, headers?: Record<string, string>): Promise<FetchResult> {
    return this.fetch(url, { method: 'GET', headers });
  }

  async post(url: string, body: string, headers?: Record<string, string>): Promise<FetchResult> {
    return this.fetch(url, { 
      method: 'POST', 
      body, 
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  async downloadFile(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  }

  async downloadAndSaveFile(url: string, filename?: string): Promise<void> {
    try {
      const blob = await this.downloadFile(url);
      
      // Try to get filename from URL if not provided
      if (!filename) {
        const urlObj = new URL(url);
        filename = urlObj.pathname.split('/').pop() || 'download';
      }

      // Create download link
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isCorsEnabled(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const currentOrigin = window.location.origin;
      return urlObj.origin === currentOrigin;
    } catch {
      return false;
    }
  }

  async testConnectivity(url: string = 'https://www.google.com'): Promise<boolean> {
    try {
      const result = await this.fetch(url, { 
        method: 'HEAD', 
        timeout: 5000,
        cors: 'omit'
      });
      return result.success;
    } catch {
      return false;
    }
  }
}