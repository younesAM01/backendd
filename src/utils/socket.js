let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io instance not initialized");
  }
  return ioInstance;
};

// Helper function to emit booking events
export const emitBookingEvent = (event, booking) => {
  const io = getIO();
  const agencyRoom = `agency:${booking.agencyId}`;
  const cityRoom = `city:${booking.agencyId}:${booking.location}`;
  
  io.to(agencyRoom).emit(event, booking);
  io.to(cityRoom).emit(event, booking);
};

// Helper function to emit service events
export const emitServiceEvent = (event, service) => {
  const io = getIO();
  const agencyRoom = `agency:${service.agencyId}`;
  const cityRoom = `city:${service.agencyId}:${service.location}`;
  
  io.to(agencyRoom).emit(event, service);
  io.to(cityRoom).emit(event, service);
};



















