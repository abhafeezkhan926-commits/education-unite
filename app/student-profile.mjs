export function validUsername(value) {
  return /^[a-z0-9]{1,64}$/.test(value);
}

export function validTemporaryPassword(value) {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

export function validStudentId(value) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
}
