// Tiny pub/sub so any screen can request an interactive crop and await the
// resulting base64 data URI, while a single <PhotoCropperHost/> (mounted at the
// app root) renders the actual cropper UI.
export type CropRequest = {
  uri: string;
  width: number;
  height: number;
  resolve: (base64OrNull: string | null) => void;
};

type Listener = (req: CropRequest) => void;

let listener: Listener | null = null;

export const cropBus = {
  subscribe(l: Listener) {
    listener = l;
    return () => {
      if (listener === l) listener = null;
    };
  },
  open(uri: string, width: number, height: number): Promise<string | null> {
    return new Promise((resolve) => {
      if (listener) listener({ uri, width, height, resolve });
      else resolve(null);
    });
  },
};
