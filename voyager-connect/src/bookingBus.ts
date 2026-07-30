// Tiny pub/sub so any screen can open the global "Book with me" perks sheet
// (owned by BookCTA) without prop-drilling or lifting state into the layout.
type Listener = () => void;

let listener: Listener | null = null;

export const bookingBus = {
  open() {
    listener?.();
  },
  subscribe(fn: Listener) {
    listener = fn;
    return () => {
      if (listener === fn) listener = null;
    };
  },
};
