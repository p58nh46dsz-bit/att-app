// Local registration prototype. Authentication can consume this same schema
// later: { id, fullName, login, password, role, group, status, createdAt }.
// Plain passwords and the fixed admin credential are for the local demo only;
// production account creation and password hashing belong on the server.
const REGISTER_STORAGE_KEY = "att_registration_accounts_v1";
const REGISTER_ROLES = [
  { value: "student", label: "Студент" },
  { value: "teacher", label: "Преподаватель" },
  { value: "applicant", label: "Абитуриент" },
  { value: "admin", label: "Администратор" },
];

function readRegisteredAccounts() {
  const raw = window.localStorage.getItem(REGISTER_STORAGE_KEY);
  if (raw === null) return [];
  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts) || accounts.some(account =>
    !account || typeof account.id !== "string" ||
    typeof account.login !== "string" || typeof account.fullName !== "string" ||
    typeof account.password !== "string" ||
    !REGISTER_ROLES.some(role => role.value === account.role)
  )) throw new Error("Некорректные данные аккаунтов");
  return accounts;
}

function createRegisteredAccount(draft) {
  const fullName = draft.fullName.trim();
  const login = draft.login.trim();
  const group = draft.role === "student" ? draft.group.trim() : "";
  if (!fullName || fullName.length > 120) throw new Error("Укажите ФИО — до 120 символов.");
  if (!/^[a-zA-Z0-9._@-]{3,80}$/.test(login)) {
    throw new Error("Логин: 3–80 символов, латинские буквы, цифры, точка, дефис, подчёркивание или @.");
  }
  if (!draft.password.trim() || draft.password.length > 128) throw new Error("Укажите пароль — до 128 символов.");
  if (!REGISTER_ROLES.some(role => role.value === draft.role)) throw new Error("Выберите роль пользователя.");
  if (draft.role === "student" && (!group || group.length > 40)) throw new Error("Укажите группу студента — до 40 символов.");

  let accounts;
  try { accounts = readRegisteredAccounts(); }
  catch (error) { throw new Error("Не удалось прочитать аккаунты. Создание остановлено, чтобы сохранить существующие данные."); }
  const normalizedLogin = login.toLowerCase();
  if (["admin", "student@academy.ru"].includes(normalizedLogin) ||
      accounts.some(account => account.login.toLowerCase() === normalizedLogin)) {
    throw new Error("Этот логин уже занят. Укажите другой.");
  }
  const account = {
    id: window.crypto.randomUUID(), fullName, login, password: draft.password,
    role: draft.role, group, status: "active", createdAt: new Date().toISOString(),
  };
  try { window.localStorage.setItem(REGISTER_STORAGE_KEY, JSON.stringify([...accounts, account])); }
  catch (error) { throw new Error("Аккаунт не сохранён. Проверьте, доступно ли хранилище браузера и есть ли в нём место."); }
  return account;
}
