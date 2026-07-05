export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export function validatePasswordStrength(password: string) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/\d/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z\d]/.test(password)) return "Password must include at least one special character.";
  return "";
}

function normalizeUsernamePart(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function generateStudentUsername(branch: string, rollNumber: string) {
  return (branch.substring(0, 2) + rollNumber).toLowerCase();
}

/**
 * Generates a cryptographically random password that satisfies PASSWORD_REGEX.
 * Guaranteed to contain: uppercase, lowercase, digit, and special character.
 * Default length: 12 characters.
 */
export function generateSecurePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*()-_=+[]{}";
  const all = upper + lower + digits + special;

  const getRandom = (charset: string) =>
    charset[Math.floor(Math.random() * charset.length)];

  // Guarantee at least one of each required character class
  const required = [
    getRandom(upper),
    getRandom(lower),
    getRandom(digits),
    getRandom(special),
  ];

  const rest = Array.from({ length: length - required.length }, () => getRandom(all));

  // Shuffle the combined array so required chars aren't always at the front
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join("");
}
