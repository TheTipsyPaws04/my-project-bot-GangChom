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
  AttachmentBuilder,
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
    GatewayIntentBits.MessageContent,
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
const GATE_BUTTON_ID = "claim_role";

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

const WELCOME_LOGO_PATH = path.join(__dirname, "assets", "tipsy-paw-logo.png");
const TIPSY_AMBER = 0xc58a45;

async function sendWelcomeToNewMember(member) {
  if (!config.welcomeChannelId) return;
  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel || !channel.isTextBased()) return;

  const description = buildBox([
    `🔔 *กริ๊ง~ เสียงกระดิ่งหน้าประตูบาร์ดังขึ้น*`,
    ``,
    `เจ้าแมววิเชียรมาศตาสีฟ้าเดินนวยนาด`,
    `ออกมาจากหลังเคาน์เตอร์ ก่อนจะกระดิกหางทักทาย`,
    ``,
    `**"เมี้ยว~ แขกคนใหม่มาแล้วเหรอ?"**`,
    ``,
    `🥂 **ยินดีต้อนรับ ${member.user}**`,
    `สู่บาร์สุดป่วนของเหล่าอุ้งเท้า!`,
    ``,
    `ที่นี่มีทั้งเสียงหัวเราะ มิตรภาพ`,
    `และเหล่าสัตว์ตัวแสบที่พร้อมอยู่เป็นเพื่อนคุณ ♡`,
    ``,
    `✦ **🐾 ก่อนเริ่มค่ำคืนของคุณ**`,
    `กดปุ่ม **รับยศ** ด้านล่าง → เห็นห้องทั้งหมดในบาร์`,
    `📜 ﹒อ่านกฎประจำบาร์ <#1538041508463382599>`,
    `🧶 ﹒ทำความรู้จักเพื่อนใหม่ <#1538045929570041906>`,
    `🍸 ﹒หรือถ้าหลงทางมามองได้ที่ตรงนี้ <#1537781966252802069>`,
    ``,
    `🔞 โซนลับ 18+ ต้องผ่านการตรวจบัตรก่อนนะเหมียว~`,
    ``,
    `*"เมี้ยว~ โต๊ะพร้อมแล้ว เชิญเลยมนุษย์!"* 🤎`,
  ]);

  const embed = new EmbedBuilder()
    .setColor(TIPSY_AMBER)
    .setTitle("🐈 THE TIPSY PAW | WELCOME")
    .setDescription(description)
    .setFooter({ text: "✦ THE TIPSY PAW · YOUR SEAT IS READY ♡" })
    .setTimestamp();

  const files = [];

  if (fs.existsSync(WELCOME_LOGO_PATH)) {
    const logo = new AttachmentBuilder(WELCOME_LOGO_PATH, { name: "tipsy-paw-logo.png" });
    embed.setThumbnail("attachment://tipsy-paw-logo.png");
    files.push(logo);
  }

  const gif = welcomeGifAttachment();
  if (gif) {
    embed.setImage("attachment://welcome.gif");
    files.push(gif);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(GATE_BUTTON_ID)
      .setLabel("🐾 รับยศเพื่อเข้าห้อง")
      .setStyle(ButtonStyle.Success)
  );

  try {
    await channel.send({
      embeds: [embed],
      components: [row],
      files,
      allowedMentions: { users: [member.id] },
    });
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
  if (!channel.isTextBased() || channel.isVoiceBased()) {
    console.warn(
      `⚠️ verifyChannelId (${config.verifyChannelId}) ชี้ไปที่ "${channel.name}" ซึ่งไม่ใช่ห้องแชท — ตั้งเป็น Channel ID ของห้องข้อความนะ`
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🐾 ยืนยันอายุ · The Tipsy Paw")
    .setDescription(
      `อ่านวิธียืนยันในห้องคู่มือ แล้วเปิดทิกเก็ตเพื่อรับรหัสจากแอดมินค่ะ

✦ ปิดข้อมูลบนบัตร เหลือเฉพาะ **วัน / เดือน / ปีเกิด**
✦ เขียน **วันที่ยื่น · Discord User ID · ชื่อเซิร์ฟเวอร์ · รหัสยืนยัน** ลงกระดาษ
✦ ถ่ายบัตรคู่กับกระดาษ **ในภาพเดียวกัน**

📩 ส่งในทิกเก็ตที่เปิดเท่านั้น
ใช้บัตรและบัญชีของตัวเองนะคะ

🔒 เห็นภาพเฉพาะผู้ยื่นและผู้ตรวจสอบ
ตรวจเสร็จจะปิดทิกเก็ต พร้อมลบภาพและประวัติข้อความค่ะ ♡`
    )
    .setColor(0xf2a7c3)
    .setFooter({ text: `อายุ ${config.ageRequirement} ปีบริบูรณ์ขึ้นไป · ผู้ตรวจ: ทีมงานบาร์เหล่าสัตว์` });

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

// ============ ปุ่มรับยศ (ประตูเข้าเซิร์ฟ) ============
function gateChannelId() {
  return config.welcomeChannelId;
}

async function postGateMessage(guild) {
  const channelId = gateChannelId();
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("🐾 ขั้นที่ 1 — กดรับยศเพื่อเข้าบาร์")
    .setDescription(
      `เหมียว~ ยินดีต้อนรับสู่ 𝚃𝚑𝚎 𝚃𝚒𝚙𝚜𝚢 𝙿𝚊𝚠

**ขั้นตอนเข้าบาร์**
1️⃣ กดปุ่ม **รับยศ** ด้านล่าง → ได้ยศสมาชิก → เห็นห้องทั่วไปทั้งหมด
2️⃣ อยากเข้าโซนลับ 18+? ไปที่ห้องตรวจบัตร แล้วกด **🔞 ตรวจบัตร**
3️⃣ ยื่นบัตรให้ทีมงานตรวจ → ผ่านแล้วได้ยศเข้า DARK ZONE ทันที

⚠️ ยังไม่กดปุ่มรับยศจะมองไม่เห็นห้องอื่นเลยนะเหมียว~`
    )
    .setColor(0xf2a7c3);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(GATE_BUTTON_ID)
      .setLabel("🐾 รับยศ")
      .setStyle(ButtonStyle.Success)
  );

  const posted = await sendOnce(channel, GATE_BUTTON_ID, embed, row);
  if (posted) console.log(`🐾 โพสต์ปุ่มรับยศใน ${channel.name}`);
}

async function handleClaimRole(interaction) {
  const role = interaction.guild.roles.cache.get(config.memberRoleId || "");
  if (!role) {
    return interaction.reply({
      content: "⚠️ ยังไม่ได้ตั้งค่า memberRoleId ในบอทเหมียว~ แจ้งแอดมินได้เลย",
      ephemeral: true,
    });
  }
  const member = interaction.member;
  if (member.roles.cache.has(role.id)) {
    return interaction.reply({
      content: "คุณมียศนี้อยู่แล้วเหมียว~ มองเห็นห้องต่างๆ ได้เลย",
      ephemeral: true,
    });
  }
  await member.roles.add(role, "กดรับยศเอง");
  await interaction.reply({
    content: "✅ ได้รับยศสมาชิกแล้วเหมียว~ เข้าไปดูห้องต่างๆ ในบาร์ได้เลย",
    ephemeral: true,
  });
}

const VIEWABLE_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildVoice,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
];

async function runSetupGate(message) {
  const guild = message.guild;

  if (!isStaff(message.member)) {
    return message.reply("เหมียว~ เฉพาะทีมงานเท่านั้นที่ใช้คำสั่งนี้ได้นะ");
  }
  if (!config.memberRoleId || !guild.roles.cache.has(config.memberRoleId)) {
    return message.reply("⚠️ ยังไม่ได้ตั้ง memberRoleId ใน config.js ให้ถูกต้องเหมียว");
  }
  if (!config.verifiedRoleId || !guild.roles.cache.has(config.verifiedRoleId)) {
    return message.reply("⚠️ ยังไม่ได้ตั้ง verifiedRoleId ใน config.js ให้ถูกต้องเหมียว");
  }

  const publicIds = new Set(
    [config.welcomeChannelId, config.verifyChannelId, ...(config.publicChannelIds || [])].filter(Boolean)
  );
  const ticketCat = await ensureTicketCategory(guild);
  const sensitive = new Set(config.sensitive18Ids.filter(Boolean));
  const protectedSet = new Set(config.protectedIds.filter(Boolean));
  let count = 0;

  for (const channel of guild.channels.cache.values()) {
    if (!VIEWABLE_CHANNEL_TYPES.includes(channel.type)) continue;
    if (ticketCat && channel.id === ticketCat.id) continue;
    if (channel.parentId === ticketCat?.id) continue; // ห้องทิกเก็ตจัดการเอง

    // ห้อง/หมวดที่ห้ามแตะเด็ดขาด (แอดมิน/ช่องกันสแปม) → ข้าม ไม่แก้สิทธิ์อะไรเลย
    const isProtected =
      protectedSet.has(channel.id) || (channel.parentId && protectedSet.has(channel.parentId));
    if (isProtected) continue;

    // ห้องที่ซ่อนจาก @everyone อยู่แล้ว (เช่น ทีมงาน) → ข้าม ห้ามแตะ
    const everyone = channel.permissionOverwrites.cache.get(guild.id);
    if (everyone && everyone.deny.has(PermissionFlagsBits.ViewChannel)) continue;

    if (publicIds.has(channel.id)) {
      // ห้องต้อนรับ / ห้องตรวจบัตร: ทุกคนต้องเห็น (มีปุ่มให้กด)
      await channel.permissionOverwrites
        .edit(guild.id, { ViewChannel: true })
        .catch(() => {});
      count++;
      continue;
    }

    const isSensitive =
      sensitive.has(channel.id) || (channel.parentId && sensitive.has(channel.parentId));

    if (isSensitive) {
      // โซน 18+: เห็นเฉพาะคนผ่านตรวจบัตร (verified) เท่านั้น
      await channel.permissionOverwrites
        .edit(guild.id, { ViewChannel: false })
        .catch(() => {});
      await channel.permissionOverwrites
        .edit(config.memberRoleId, { ViewChannel: false })
        .catch(() => {});
      await channel.permissionOverwrites
        .edit(config.verifiedRoleId, { ViewChannel: true })
        .catch(() => {});
    } else {
      // ห้องทั่วไป: เห็นเฉพาะคนมียศสมาชิก (หรือ verified)
      await channel.permissionOverwrites
        .edit(guild.id, { ViewChannel: false })
        .catch(() => {});
      await channel.permissionOverwrites
        .edit(config.memberRoleId, { ViewChannel: true })
        .catch(() => {});
      await channel.permissionOverwrites
        .edit(config.verifiedRoleId, { ViewChannel: true })
        .catch(() => {});
    }
    count++;
  }

  await message.reply(
    `✅ ตั้งค่าสิทธิ์ห้องเรียบร้อย ${count} ช่องเหมียว~\n` +
      `• ห้องต้อนรับ + ตรวจบัตร + public: ทุกคนเห็น\n` +
      `• ห้องทั่วไป: เห็นเฉพาะยศสมาชิก/ผ่านตรวจบัตร\n` +
      `• ห้อง 18+ (ตาม sensitive18Ids): เห็นเฉพาะผ่านตรวจบัตร\n` +
      `• ห้อง protectedIds: บอทข้าม ไม่แตะสิทธิ์เลย\n\n` +
      `⚠️ คำสั่งนี้เขียนทับสิทธิ์ @everyone / ยศสมาชิก / ยศ verified เดิมของแต่ละช่อง ถ้ามีห้องที่ตั้งสิทธิ์พิเศษไว้ ให้กลับไปเช็คเองนะ`
  );
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
    postGateMessage(g);
  }
  client.user.setActivity("ยินดีต้อนรับบาร์เหล่าสัตว์ เหมียว~", { type: 3 });
});

client.on("guildMemberAdd", (member) => {
  if (member.user.bot) return;
  sendWelcomeToNewMember(member);
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.content.trim().toLowerCase() === "!setupgate") {
    try {
      await runSetupGate(message);
    } catch (err) {
      console.error("setupgate error:", err);
      await message.reply("เกิดข้อผิดพลาดเหมียว~ ลองใหม่อีกครั้งนะ").catch(() => {});
    }
  }
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
      case GATE_BUTTON_ID:
        await handleClaimRole(interaction);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    const payload = { content: "เกิดข้อผิดพลาดเหมียว~ ลองใหม่ทีหลังนะ", ephemeral: true };
    await (interaction.replied || interaction.deferred
      ? interaction.followUp(payload)
      : interaction.reply(payload)
    ).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);