// =============================
// LOAD ENV
// =============================
client.login(process.env.TOKEN);

client.on("ready", () => {
  console.log("=================================");
  console.log(`✅ Bot online: ${client.user.tag}`);
  console.log("=================================");
});

client.on("error", console.error);
client.on("shardError", console.error);

console.log("=================================");
console.log("TOKEN tồn tại không? ", !!process.env.TOKEN);
console.log("=================================");

if (!process.env.TOKEN) {
  console.error("❌ TOKEN không tồn tại trong Environment Variables!");
  process.exit(1);
}

const express = require("express");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

// =============================
// EXPRESS SERVER (CHO RENDER)
// =============================
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, () => {
  console.log(`🌍 Web server running on port ${PORT}`);
});

// =============================
// DISCORD CLIENT
// =============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// =============================
// ERROR HANDLING
// =============================
process.on("unhandledRejection", err => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", err => {
  console.error("❌ Uncaught Exception:", err);
});

// =============================
// CÀI ĐẶT
// =============================
const CHECK_MINUTES = 1; // test nhanh 1 phút
const ALLOWED_CHANNEL_ID = "1478082462113595494";
const APPROVE_EMOJI = "✅";

const TRN_ROLE_IDS = [
  "1477604160596738109",
  "1478012877783957638"
];

const HRO_ROLE_IDS = [
  "1478012523465674925",
  "1477605566988947486"
];

const warningMessages = new Map();

// =============================
// READY
// =============================
client.once("ready", () => {
  console.log("=================================");
  console.log(`✅ Bot online: ${client.user.tag}`);
  console.log("=================================");
});

// =============================
// MESSAGE CREATE
// =============================
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    const isTRN = TRN_ROLE_IDS.some(id =>
      message.member.roles.cache.has(id)
    );

    if (!isTRN) return;

    console.log(`📩 TRN gửi tin: ${message.author.tag}`);

    setTimeout(async () => {
      try {
        const fetched = await message.fetch().catch(() => null);
        if (!fetched || fetched.deleted) return;

        const reaction = fetched.reactions.cache.find(
          r => r.emoji.name === APPROVE_EMOJI
        );

        if (!reaction) {
          return sendWarning(fetched);
        }

        const users = await reaction.users.fetch();
        const hasHRO = await checkHRO(users, message.guild);

        if (!hasHRO) {
          sendWarning(fetched);
        } else {
          console.log("✅ Đã được HRO duyệt");
        }

      } catch (err) {
        console.log("❌ Lỗi khi check:", err);
      }
    }, CHECK_MINUTES * 60 * 1000);

  } catch (err) {
    console.log("❌ messageCreate error:", err);
  }
});

// =============================
// CHECK HRO
// =============================
async function checkHRO(users, guild) {
  for (const user of users.values()) {
    if (user.bot) continue;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) continue;

    const isHRO = HRO_ROLE_IDS.some(id =>
      member.roles.cache.has(id)
    );

    if (isHRO) return true;
  }
  return false;
}

// =============================
// SEND WARNING
// =============================
async function sendWarning(message) {
  if (warningMessages.has(message.id)) return;

  try {
    console.log("🚨 Gửi cảnh báo...");

    const mentionRoles = HRO_ROLE_IDS.map(id => `<@&${id}>`).join(" ");

    const warning = await message.channel.send({
      content: `${mentionRoles}

🚨 **Hồ sơ này chưa được duyệt sau thời gian quy định!**`,
      allowedMentions: {
        roles: HRO_ROLE_IDS
      }
    });

    warningMessages.set(message.id, warning.id);

  } catch (err) {
    console.log("❌ Lỗi gửi cảnh báo:", err);
  }
}

// =============================
// REACTION ADD
// =============================
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    if (user.bot) return;

    if (reaction.message.channel.id !== ALLOWED_CHANNEL_ID) return;
    if (reaction.emoji.name !== APPROVE_EMOJI) return;

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const isHRO = HRO_ROLE_IDS.some(id =>
      member.roles.cache.has(id)
    );

    if (!isHRO) return;

    const warningId = warningMessages.get(reaction.message.id);

    if (warningId) {
      const warningMsg = await reaction.message.channel.messages.fetch(warningId).catch(() => null);
      if (warningMsg) await warningMsg.delete();
      warningMessages.delete(reaction.message.id);
      console.log("🧹 Đã xoá cảnh báo vì HRO đã duyệt");
    }

  } catch (err) {
    console.log("❌ Lỗi reaction:", err);
  }
});

// =============================
// LOGIN
// =============================
client.login(process.env.TOKEN)
  .then(() => {
    console.log("🔑 Đăng nhập thành công");
  })
  .catch((err) => {
    console.error("❌ Lỗi login Discord:", err);
  });