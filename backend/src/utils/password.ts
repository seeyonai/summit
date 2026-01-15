/**
 * Checks if a password is "strong" based on specific criteria.
 *
 * Criteria:
 * 1. At least 8 characters long.
 * 2. Contains at least two of the following three types:
 * - Letters
 * - Numbers
 * - Special characters
 *
 * @param {string} password - The password to check.
 * @returns {boolean} - True if strong, false otherwise.
 */
export function isStrongPassword(password: string): boolean {
  // 1. Check minimum length
  if (password.length < 8) {
    return false;
  }

  // 2. Check for character types
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  // Matches common special characters (add more inside [] if needed)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // 3. Count how many types are present
  const typesCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  // 4. Return true if at least two types are found
  return typesCount >= 2;
}
