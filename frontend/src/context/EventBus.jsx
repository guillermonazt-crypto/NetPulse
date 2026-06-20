const listeners = {};

const EventBus = {
  on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = listeners[event].filter((cb) => cb !== callback);
    };
  },

  emit(event, data) {
    (listeners[event] || []).forEach((cb) => cb(data));
  },
};

export default EventBus;
