declare module "html5-qrcode" {
  interface CameraDevice {
    id: string;
    label: string;
  }

  export class Html5Qrcode {
    static getCameras(): Promise<CameraDevice[]>;
    constructor(elementId: string, config?: any);
    start(
      camera: string | { facingMode: string },
      config: any,
      onScanSuccess: (decodedText: string) => void,
      onScanFailure?: (error: any) => void
    ): Promise<void>;
    stop(): Promise<void>;
    clear(): void;
  }

  export enum Html5QrcodeScannerState {
    UNKNOWN = 0,
    NOT_STARTED = 1,
    SCANNING = 2,
    PAUSED = 3,
  }
}
