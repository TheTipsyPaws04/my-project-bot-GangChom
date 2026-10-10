require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("./config");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const ffmpeg = require("ffmpeg-static");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ============ ช่วยเหลือ / สไตล์แมววิเชียรมาศ ============
function isStaff(member) {
  if (!member) return false;
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return true;
  }
  if (config.staffRoleIds.length) {
    return member.roles.cache.some((r) => config.staffRoleIds.includes(r.id));
  }
  return false;
}

// ============ ต้อนรับ + ห้องตรวจบัตร (ticket) ============
const WELCOME_BUTTON_ID = "verify_ticket";
const PASS_BUTTON_ID = "ticket_pass";
const FAIL_BUTTON_ID = "ticket_fail";
const CLOSE_BUTTON_ID = "ticket_close";

const BARTENDER_BOT = "สมศรี";

function randomEmojis(guild, count) {
  const emojis = [...guild.emojis.cache.values()].filter(
    (e) => !e.deleted && !/^[0-9]/.test(e.name || "")
  );
  if (!emojis.length) return Array(count).fill("");
  for (let i = emojis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojis[i], emojis[j]] = [emojis[j], emojis[i]];
  }
  return emojis.slice(0, count).map((e) => `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`);
}

function buildBox(lines) {
  return lines.join("\n");
}

const WELCOME_VIDEO_URLS = [
  "https://files.catbox.moe/nwhmu2.mp4",
  "https://files.catbox.moe/3f4p69.mov",
  "https://files.catbox.moe/u6wauf.mov",
];

function welcomeGifPath(i) {
  return path.join(__dirname, `welcome_${i}.gif`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpeg, args, { timeout: 90000 }, (err, stdout, stderr) => {
      if (err) {
        console.error("ffmpeg error:", (stderr || "").split("\n").slice(-3).join("\n"));
        return reject(err);
      }
      resolve();
    });
  });
}

async function prepareOneGif(url, i) {
  const out = welcomeGifPath(i);
  try {
    if (fs.existsSync(out) && fs.statSync(out).size > 0) return true;
    console.log(`⏳ แปลง GIF ต้อนรับ #${i + 1}...`);
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tmp = path.join(__dirname, `welcome_tmp_${i}.mp4`);
    fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    await runFfmpeg([
      "-y",
      "-i", tmp,
      "-vf", "fps=8,scale=280:-2:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=0[p];[s1][p]paletteuse=diff_mode=rectangle",
      "-loop", "0",
      out,
    ]);
    fs.unlinkSync(tmp);
    console.log(`✅ GIF ต้อนรับ #${i + 1} พร้อมใช้`);
    return true;
  } catch (err) {
    console.error(`prepareOneGif #${i + 1} error:`, err.message);
    return false;
  }
}

async function prepareWelcomeGifs() {
  await Promise.all(WELCOME_VIDEO_URLS.map((url, i) => prepareOneGif(url, i)));
}

let lastGifPath = null;

function welcomeGifAttachment() {
  const ready = WELCOME_VIDEO_URLS.map((_, i) => welcomeGifPath(i)).filter(
    (p) => fs.existsSync(p) && fs.statSync(p).size > 0
  );
  if (!ready.length) return null;
  let pick;
  if (ready.length === 1) {
    pick = ready[0];
  } else {
    const candidates = ready.filter((p) => p !== lastGifPath);
    pick = candidates[Math.floor(Math.random() * candidates.length)];
    lastGifPath = pick;
  }
  return { attachment: pick, name: "welcome.gif" };
}

const WELCOME_BOX_COLORS = [
  0xf2a7c3, 0x57f287, 0xfee75c, 0xeb459e, 0x5865f2, 0x1abc9c,
  0xe67e22, 0x9b59b6, 0xe91e63, 0x00bcd4, 0x2ecc71, 0xe74c3c,
];

async function sendWelcomeToNewMember(member) {
  if (!config.welcomeChannelId) return;
  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return;

  const [g1, g2, g3, g4, g5] = randomEmojis(member.guild, 5);
  const description = buildBox([
    `${g4} ${member.user} ผู้น่ารัก บาร์สวนสัตว์ลับสำหรับมนุษย์ผู้โหยหาความสงบ`,
    ``,
    `${g2} ***"เข้ามาแล้วกำลังหลงทาง เธอคนดีลองมาดูทางนี้ได้เลยคนเก่ง"***`,
    ``,
    `เธอกำลังมองหาอะไรนี่ไง เอาแผนที่บาร์พวกเราไป แล้วเตรียมตัวไปสนุกกันเลย ${g3}`,
    `[ ${g5} คุณได้รับ Item : <#1537781966252802069> : 1 EA ]`,
  ]);

  const color = WELCOME_BOX_COLORS[Math.floor(Math.random() * WELCOME_BOX_COLORS.length)];
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${g1} ฮายฮาย นุดๆ ยินดีต้อนรับเข้าสู่ 𝚃𝚑𝚎 𝚃𝚒𝚙𝚜𝚢 𝙿𝚊𝚠`)
    .setDescription(description);

  const gif = welcomeGifAttachment();
  if (gif) embed.setImage("attachment://welcome.gif");

  try {
    const files = gif ? [gif] : [];
    await channel.send({ embeds: [embed], files });
    console.log(`👋 ทักทายสมาชิกใหม่: ${member.user.tag}`);
  } catch (err) {
    console.error("sendWelcomeToNewMember error:", err);
  }
}

async function sendOnce(channel, customId, embed, row) {
  try {
    const recent = await channel.messages.fetch({ limit: 15 });
    const existing = recent.find(
      (m) =>
        m.author.id === client.user.id &&
        m.components.some((r) => r.components.some((b) => b.customId === customId))
    );
    if (existing) return false;
    await channel.send({ embeds: [embed], components: row ? [row] : [] });
    return true;
  } catch (err) {
    console.error(`sendOnce error (${channel.name}):`, err);
    return false;
  }
}

async function postVerifyMessage(guild) {
  if (!config.verifyChannelId) return;
  const channel = guild.channels.cache.get(config.verifyChannelId);
  if (!channel) {
    console.warn(`⚠️ หาช่องตรวจบัตรไม่เจอ (${config.verifyChannelId})`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🔞 โซนสำหรับผู้ใหญ่ 18+ — ตรวจบัตร")
    .setDescription(
      `เหมียว~ ที่นี่คือจุดตรวจบัตรเข้าซอกลับของบาร์เรา

**ต้องการเข้าโซน 18+ ให้ทำตามนี้**
1. กดปุ่ม **🔞 ตรวจบัตร** ด้านล่าง
2. บอทจะเปิดห้องส่วนตัวระหว่างคุณกับทีมงานเท่านั้น
3. ส่งรูปบัตรที่แสดง **วัน/เดือน/ปีเกิด** (ปกปิดเลขบัตรและข้อมูลอื่นได้)
4. เมื่อผ่านคุณจะได้ role เข้าซอกลับทันที

⚠️ อายุ ${config.ageRequirement} ปีบริบูรณ์ขึ้นไปเท่านั้น และขอความร่วมมือลบรูปหลังตรวจเสร็จ`
    )
    .setColor(0xf2a7c3)
    .setFooter({ text: `ผู้ตรวจ: ทีมงานบาร์เหล่าสัตว์` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(WELCOME_BUTTON_ID)
      .setLabel("🔞 ตรวจบัตร")
      .setStyle(ButtonStyle.Danger)
  );

  const posted = await sendOnce(channel, WELCOME_BUTTON_ID, embed, row);
  if (posted) console.log(`🎉 โพสต์ปุ่มตรวจบัตรใน ${channel.name}`);
}

const TICKET_CATEGORY_NAME = "🎫 ทิกเก็ตตรวจบัตร";

async function ensureTicketCategory(guild) {
  if (config.ticketCategoryId) {
    const cat = guild.channels.cache.get(config.ticketCategoryId);
    if (cat) return cat;
  }
  let cat = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildCategory && ch.name === TICKET_CATEGORY_NAME
  );
  if (!cat) {
    cat = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      reason: "หมวดหมู่ทิกเก็ตตรวจบัตร",
    });
  }
  config.ticketCategoryId = cat.id;
  try {
    const cfgPath = path.join(__dirname, "config.js");
    const src = fs
      .readFileSync(cfgPath, "utf8")
      .replace(/ticketCategoryId:\s*"[^"]*"/, `ticketCategoryId: "${cat.id}"`);
    fs.writeFileSync(cfgPath, src);
    console.log(`🎫 หมวดหมู่ทิกเก็ต: ${cat.name} (${cat.id})`);
  } catch (err) {
    console.error("save ticketCategoryId error:", err);
  }
  return cat;
}

async function openVerifyTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;

  await interaction.deferReply({ ephemeral: true });

  // ห้องซ้ำ?
  const existing = guild.channels.cache.find((ch) => ch.name === `verify-${user.id}`);
  if (existing) {
    return interaction.followUp({
      content: `เหมียว~ คุณมีห้องตรวจบัตรอยู่แล้ว <#${existing.id}> ไปส่งรูปที่นั่นเลยนะ`,
      ephemeral: true,
    });
  }

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // ใครก็ตาม
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }, // บอท
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, // เจ้าของห้อง
  ];
  // ทีมงาน (role) ให้เห็นห้อง
  for (const roleId of config.staffRoleIds) {
    overwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    });
  }

  const channel = await guild.channels.create({
    name: `verify-${user.id}`,
    type: ChannelType.GuildText,
    parent: (await ensureTicketCategory(guild)).id,
    topic: user.id,
    permissionOverwrites: overwrites,
    reason: "ห้องตรวจอายุส่วนตัว",
  });

  const embed = new EmbedBuilder()
    .setTitle("🔞 ตรวจบัตรเข้าโซน 18+")
    .setDescription(
      `สวัสดีคุณ ${user.username} เหมียว~ ยินดีต้อนรับสู่บาร์เหล่าสัตว์
ที่นี่คือห้องส่วนตัวระหว่างคุณกับทีมงานเท่านั้น

**ขั้นตอน**
1. ส่ง **รูปบัตรประชาชน** ที่แสดง วัน/เดือน/ปีเกิด
2. ปกปิดเลขบัตร และข้อมูลอื่นที่ไม่จำเป็นได้ (ห้ามอย่างดเห็นวันเกิด)
3. ทีมงานจะมาตรวจเมื่อว่าง ไม่นาน
4. เมื่อผ่านอายุ ${config.ageRequirement} ปีขึ้นไปคุณจะได้ role เข้าโซนลับทันที

🗑️ **หลังตรวจเสร็จ กด "ปิดห้องและลบ" เพื่อป้องกันข้อมูลส่วนตัว**`
    )
    .setColor(0xf2a7c3);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(PASS_BUTTON_ID).setLabel("✅ ผ่าน (ทีมงาน)").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(FAIL_BUTTON_ID).setLabel("❌ ไม่ผ่าน (ทีมงาน)").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(CLOSE_BUTTON_ID).setLabel("🗑️ ปิดห้องและลบ").setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row] });

  await interaction.followUp({
    content: `สร้างห้องตรวจบัตรให้แล้วเหมียว~ <#${channel.id}>`,
    ephemeral: true,
  });
}

async function approveTicket(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  const channel = interaction.channel;

  if (!isStaff(member)) {
    return interaction.reply({ content: "เหมียว~ เฉพาะทีมงานเท่านั้นที่ทำได้นะนิ", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const userId = channel.topic || "";
  const target = userId ? await guild.members.fetch(userId).catch(() => null) : null;

  if (!target) {
    return interaction.followUp({ content: "หาตัวเจ้าของห้องไม่เจอเหมียว~ (topic ว่างหรือ user ออกไปแล้ว)", ephemeral: true });
  }

  if (config.verifiedRoleId) {
    const role = guild.roles.cache.get(config.verifiedRoleId);
    if (!role) {
      return interaction.followUp({ content: "⚠️ config ยังไม่ได้ใส่ verifiedRoleId ให้ถูกต้องเหมียว", ephemeral: true });
    }
    await target.roles.add(role, "ตรวจสอบอายุผ่าน");
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ ผ่านการตรวจอายุแล้ว! เหมียว~")
        .setDescription(`คุณ ${target} ได้รับสิทธิ์เข้าใช้เซิร์ฟเวอร์แล้ว\nขอความร่วมมือกด **🗑️ ปิดห้องและลบ** เพื่อความเป็นส่วนตัว`)
        .setColor(0x57f287),
    ],
  });

  await interaction.followUp({ content: "ให้ role และแจ้งสมาชิกเรียบร้อยแล้ว", ephemeral: true });
}

async function rejectTicket(interaction) {
  const member = interaction.member;

  if (!isStaff(member)) {
    return interaction.reply({ content: "เหมียว~ เฉพาะทีมงานเท่านั้นที่ทำได้นะนิ", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.channel.topic || "";
  const target = userId ? await interaction.guild.members.fetch(userId).catch(() => null) : null;

  await interaction.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❌ ยังไม่ผ่านการตรวจ")
        .setDescription(`${target ? `<@${target.id}>` : "คุณ"} ยังไม่ผ่านในรอบนี้ เหตุกี่ครั้งได้ ลองติดต่อทีมงานในช่องอื่น\nขอความร่วมมือกด **🗑️ ปิดห้องและลบ**`)
        .setColor(0xed4245),
    ],
  });

  await interaction.followUp({ content: "แจ้งผู้ใช้เรียบร้อยแล้ว", ephemeral: true });
}

async function closeTicket(interaction) {
  const member = interaction.member;

  if (!isStaff(member)) {
    return interaction.reply({ content: "เหมียว~ เฉพาะแอดมินเท่านั้นที่ปิดห้องได้นะ", ephemeral: true });
  }

  await interaction.deferReply();
  const channel = interaction.channel;
  const user = interaction.user;

  await channel
    .send(`🗑️ ปิดห้องโดย ${user.username} ลบข้อมูลการสนทนาทั้งหมดเพื่อความเป็นส่วนตัว เหมียว~`)
    .catch(() => {});
  // รอสักครู่ก่อนลบ
  setTimeout(async () => {
    await channel.delete("ปิดทิกเก็ตตรวจบัตร").catch((e) => console.error("close ticket error:", e));
  }, 1500);
}

// ============ events ============
client.once("ready", () => {
  console.log(`✅ Bot พร้อมใช้งาน: ${client.user.tag}`);
  prepareWelcomeGifs();
  for (const g of client.guilds.cache.values()) {
    const me = g.members.me;
    console.log(
      `🌍 เซิร์ฟเวอร์: ${g.name} (${g.id}) | Perms: ManageMessages=${!!me?.permissions?.has(PermissionFlagsBits.ManageMessages)} ModerateMembers=${!!me?.permissions?.has(PermissionFlagsBits.ModerateMembers)} ManageRoles=${!!me?.permissions?.has(PermissionFlagsBits.ManageRoles)} BanMembers=${!!me?.permissions?.has(PermissionFlagsBits.BanMembers)} ManageChannels=${!!me?.permissions?.has(PermissionFlagsBits.ManageChannels)}`
    );
    const emojis = g.emojis.cache
      .map((e) => "`" + e.name + "`: <:" + e.name + ":" + e.id + ">")
      .join("\n");
    if (emojis) console.log(`😀 อีโมจิในเซิร์ฟ:\n${emojis}`);
    ensureTicketCategory(g).catch((e) => console.error("ensureTicketCategory error:", e.message));
    postVerifyMessage(g);
  }
  client.user.setActivity("ยินดีต้อนรับบาร์เหล่าสัตว์ เหมียว~", { type: 3 });
});

client.on("guildMemberAdd", (member) => {
  if (member.user.bot) return;
  sendWelcomeToNewMember(member);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    switch (interaction.customId) {
      case WELCOME_BUTTON_ID:
        await openVerifyTicket(interaction);
        break;
      case PASS_BUTTON_ID:
        await approveTicket(interaction);
        break;
      case FAIL_BUTTON_ID:
        await rejectTicket(interaction);
        break;
      case CLOSE_BUTTON_ID:
        await closeTicket(interaction);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    await interaction
      .followUp({ content: "เกิดข้อผิดพลาดเหมียว~ ลองใหม่ทีหลังนะ", ephemeral: true })
      .catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);