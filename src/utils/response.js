export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

export const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

export const sendCreated = (res, message, data = null) => {
  return sendSuccess(res, message, data, 201);
};
