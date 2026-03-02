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

// Helper function to emit car events
export const emitCarEvent = (event, car) => {
  const io = getIO();
  const agencyRoom = `agency:${car.agencyId}`;
  io.to(agencyRoom).emit(event, car);

  if (car.agence) {
    const cityRoom = `city:${car.agencyId}:${car.agence}`;
    io.to(cityRoom).emit(event, car);
  }
};

// Helper function to emit user expense events
export const emitUserExpenseEvent = (event, expense) => {
  const io = getIO();
  const agencyRoom = `agency:${expense.agencyId}`;
  io.to(agencyRoom).emit(event, expense);
};



















