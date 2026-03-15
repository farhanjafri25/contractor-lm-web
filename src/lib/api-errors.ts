export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.') {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return typeof message === 'string' && message.trim() ? message : fallback;
}
