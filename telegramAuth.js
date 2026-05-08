require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

(async () => {
  console.log("Telegram API orqali autentifikatsiya jarayoni...");
  
  if (!apiId || !apiHash) {
    console.error("Xatolik: .env faylida TELEGRAM_API_ID yoki TELEGRAM_API_HASH topilmadi. my.telegram.org saytidan oling.");
    process.exit(1);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Telefon raqamingizni kiriting (Masalan, +998901234567): "),
    password: async () => await input.text("2-bosqich parolini kiriting (agar mavjud bo'lsa, yo'qsa bo'sh qoldiring): "),
    phoneCode: async () => await input.text("Telegram'dan kelgan kodini kiriting: "),
    onError: (err) => console.log(err),
  });

  console.log("Muvaffaqiyatli tizimga kirdingiz!");
  
  const newSession = client.session.save();
  console.log("Sizning Telegram Session kodingiz:");
  console.log(newSession);

  // Saqlash uchun .env faylni yangilash
  let envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('TELEGRAM_SESSION=')) {
      envContent = envContent.replace(/TELEGRAM_SESSION=.*/, `TELEGRAM_SESSION=${newSession}`);
  } else {
      envContent += `\nTELEGRAM_SESSION=${newSession}`;
  }
  fs.writeFileSync('.env', envContent);
  console.log("Seans avtomatik tarzda .env fayliga saqlandi.");

  await client.disconnect();
})();
