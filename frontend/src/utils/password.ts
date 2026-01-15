export function isStrongPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length < 8) {
    return false;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const typesCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  return typesCount >= 2;
}

export const STRONG_PASSWORD_REQUIREMENT_ZH = '至少8位且包含字母、数字或特殊字符中的任意两种';
export const STRONG_PASSWORD_REQUIREMENT_EN = 'At least 8 characters with any two of letters, numbers, or special characters';

