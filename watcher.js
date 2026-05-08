require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

const vipFile = path.join(__dirname, 'vipList.json');

// VIP ro'yxatni o'qish
function getVipList() {
    try {
        const data = fs.readFileSync(vipFile, 'utf8');
        return JSON.parse(data).vip_contacts || [];
    } catch (e) {
        return [];
    }
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
  // 1. Raw Signallarni ushlash (O'QILGANLIK HOLATI)
  client.addEventHandler(async (event) => {
      let updates = [];
      if (event.className === 'UpdateShort') updates = [event.update];
      else if (event.updates) updates = event.updates; // Updates yoki UpdatesCombined uchun
      else updates = [event];

      for (const update of updates) {
          if (update && (update.className === 'UpdateReadHistoryInbox' || update.className === 'UpdateReadChannelInbox')) {
              try {
                  const entity = await client.getEntity(update.peer);
                  const username = entity.username ? `@${entity.username.toLowerCase()}` : '';
                  if (username) {
                      await supabase.from('unanswered')
                          .update({ status: 'read' })
                          .ilike('username', username)
                          .eq('status', 'unread');
                      console.log(`\n👀 [O'QILDI] Siz ${username} xabarini o'qidingiz!`);
                  }
              } catch(e) {
                  console.log("O'qilganlikni aniqlashda xato:", e.message);
              }
          }
      }
  }); // Bunga hech qanday filtr qo'shilmaydi (Raw updates)

  // 2. Yangi kelgan xabarlarni ushlash
  client.addEventHandler(async (event) => {
      const message = event.message;
      if (!message) return;
      
      const vips = getVipList();

      // Soddalashtirilgan AI Analyzer
      function analyzeMessage(text) {
          const t = text.toLowerCase();
          if (t.includes('tez') || t.includes('zudlik') || t.includes('muhim') || t.includes('shoshilinch') || t.includes('bugun')) return "Juda Muhim Topshiriq 🚨";
          if (t.includes('qachon') || t.includes('nimaga') || t.includes('nechi') || t.includes('qanday') || t.includes('qani')) return "Savol / Ma'lumot so'ralyapti ❓";
          if (t.includes('salom') || t.includes('qalay') || t.includes('yaxshimi') || t.includes('assalom')) return "Oddiy Salomlashuv 👋";
          if (t.includes('rahmat') || t.includes('ok') || t.includes('xop') || t.includes('tushunarli')) return "Tasdiqlash / Minnatdorchilik ✅";
          return "Umumiy xabar / Fikr bildirish ℹ️";
      }

      // Agar xabar bizdan ketsa (Outgoing - ya'ni Javob)
      if (message.out) {
          const peer = await message.getChat();
          if (!peer) return;
          const receiverUsername = peer.username ? `@${peer.username.toLowerCase()}` : '';
          
          const isVip = vips.find(v => v.username.toLowerCase() === receiverUsername);
          if (isVip) {
              const { data: pendingMsg } = await supabase
                 .from('unanswered')
                 .select('*')
                 .ilike('username', receiverUsername)
                 .single();

              if (pendingMsg) {
                  await supabase.from('unanswered').delete().ilike('username', receiverUsername);
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

      if (isVip) {
          console.log(`\n📥 [VIP XABAR] ${isVip.name} yozdi. Xotiraga saqlanmoqda...`);
          
          const { data: existing } = await supabase
              .from('unanswered')
              .select('*')
              .ilike('username', senderUsername)
              .single();
          
          if (!existing) {
              const aiAnalysis = analyzeMessage(message.message);
              await supabase.from('unanswered').insert([{
                  name: isVip.name,
                  username: senderUsername,
                  message: message.message,
                  analysis: aiAnalysis,
                  status: 'unread',
                  reminder_level: 0
              }]);
              console.log(`⏳ Aqlli taymer ishga tushdi! (Xabar darajasiga qarab eslatiladi).`);
          } else {
              console.log(`(Bu odamdan oldin ham xabar kelgan edi, eslatma kaskadi davom etmoqda)`);
  }, new NewMessage({}));
})();
