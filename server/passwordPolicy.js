// The rules for a password somebody chooses (changing their own, or an administrator setting one).
// Returns an error message in Russian, or null when the password is acceptable.
// Rules: 8–128 characters, no spaces at the ends, at least one letter and one digit, not the login, not a
// well-known weak password. The same rules are shown to the user in the app (src/components/shared/ChangePassword.jsx).
const WEAK = new Set(["12345678", "123456789", "1234567890", "11111111", "qwertyui", "qwerty123", "qwertyuiop", "password", "password1", "password123", "adminadmin", "admin123", "йцукенгш", "1q2w3e4r", "q1w2e3r4"]);

function passwordProblem(password, login = "") {
  if (typeof password !== "string") return "Введите пароль.";
  if (password.trim() !== password) return "Пароль не должен начинаться или заканчиваться пробелом.";
  if (password.length < 8) return "Пароль слишком короткий: не меньше 8 символов.";
  if (password.length > 128) return "Пароль слишком длинный: не больше 128 символов.";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "В пароле должны быть и буквы, и цифры.";
  if (login && password.toLowerCase().includes(String(login).toLowerCase())) return "Пароль не должен содержать логин.";
  if (WEAK.has(password.toLowerCase())) return "Этот пароль слишком простой. Придумайте другой.";
  return null;
}

module.exports = { passwordProblem };
