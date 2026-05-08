require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const fs = require('fs');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

const UNANSWERED_FILE = 'unanswered.json';

// VIP ro'yxatni o'qish
function getVipList() {
    try {
        const data = fs.readFileSync('vipList.json', 'utf8');
        return JSON.parse(data).vip_contacts || [];
    } catch (e) {
        return [];
    }
}

// Javobsiz xabarlarni o'qish
function getUnanswered() {
    try {
        if (!fs.existsSync(UNANSWERED_FILE)) {
            fs.writeFileSync(UNANSWERED_FILE, JSON.stringify({ pending: [] }, null, 2));
        }
        const data = fs.readFileSync(UNANSWERED_FILE, 'utf8');
        return JSON.parse(data).pending || [];
    } catch (e) {
        return [];
    }
}

// Javobsiz xabarlarni saqlash
function saveUnanswered(pending) {
    fs.writeFileSync(UNANSWERED_FILE, JSON.stringify({ pending }, null, 2));
}

(async () => {
  if (!process.env.TELEGRAM_SESSION) {
      console.error("TELEGRAM_SESSION topilmadi.");
      process.exit(1);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  console.log("Telegram mijoziga ulanilmoqda...");
  await client.connect();
  console.log("Muvaffaqiyatli ulandi! Yangilangan Mantiq va Taymer ishga tushdi...");

  client.addEventHandler(async (event) => {
      const message = event.message;
      const vips = getVipList();
      let pending = getUnanswered();

      // Agar xabar bizdan ketsa (Outgoing - ya'ni Javob)
      if (message.out) {
          const peer = await message.getChat();
          if (!peer) return;
          const receiverUsername = peer.username ? `@${peer.username.toLowerCase()}` : '';
          
          const isVip = vips.find(v => v.username.toLowerCase() === receiverUsername);
          if (isVip) {
              const initialLength = pending.length;
              // Biz unga javob yozdik, demak ro'yxatdan o'chiramiz
              pending = pending.filter(p => p.username.toLowerCase() !== receiverUsername);
              if (pending.length < initialLength) {
                  saveUnanswered(pending);
                  console.log(`\n✅ [JAVOB BERILDI] Siz ${isVip.name} ga javob yozdingiz. Uning xabari taymerdan olib tashlandi.`);
              }
          }
          return;
      }

      // Agar xabar VIP'dan kelsa (Incoming)
      const sender = await message.getSender();
      if (!sender) return;

      const senderUsername = sender.username ? `@${sender.username.toLowerCase()}` : '';
      const isVip = vips.find(v => v.username.toLowerCase() === senderUsername);

      // Soddalashtirilgan AI Analyzer (Kalit so'zlar asosida)
      function analyzeMessage(text) {
          const t = text.toLowerCase();
          if (t.includes('tez') || t.includes('zudlik') || t.includes('muhim') || t.includes('shoshilinch') || t.includes('bugun')) return "Juda Muhim Topshiriq 🚨";
          if (t.includes('qachon') || t.includes('nimaga') || t.includes('nechi') || t.includes('qanday') || t.includes('qani')) return "Savol / Ma'lumot so'ralyapti ❓";
          if (t.includes('salom') || t.includes('qalay') || t.includes('yaxshimi') || t.includes('assalom')) return "Oddiy Salomlashuv 👋";
          if (t.includes('rahmat') || t.includes('ok') || t.includes('xop') || t.includes('tushunarli')) return "Tasdiqlash / Minnatdorchilik ✅";
          return "Umumiy xabar / Fikr bildirish ℹ️";
      }

      if (isVip) {
          console.log(`\n📥 [VIP XABAR] ${isVip.name} yozdi. Xotiraga saqlanmoqda...`);
          
          const existing = pending.find(p => p.username.toLowerCase() === senderUsername);
          
          if (!existing) {
              pending.push({
                  name: isVip.name,
                  username: senderUsername,
                  message: message.message,
                  analysis: analyzeMessage(message.message),
                  timestamp: new Date().toISOString(),
              });
              saveUnanswered(pending);
              console.log(`⏳ Taymer ishga tushdi! Agar javob bermasangiz, Dashboard'da qizarib ko'rinib turadi.`);
          } else {
              console.log(`(Bu odamdan oldin ham xabar kelgan edi, taymer davom etmoqda)`);
          }
      }
  }, new NewMessage({}));
})();
