export {};
declare global {
  interface Window {
    fourpatakaDesktop?: {
      platform: string;
      openProject?: () => Promise<{ canceled: boolean; text?: string; name?: string }>;
      saveProject?: (text: string, name: string) => Promise<{ canceled: boolean; name?: string }>;
      onMenuAction: (callback: (action: string) => void) => () => void;
    };
  }
}
