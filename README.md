# 🐾 The Tipsy Paw — Discord Bot

บอท Discord สำหรับบาร์ **The Tipsy Paw** (ธีมบาร์เหล่าสัตว์ / แมววิเชียรมาศตาสีฟ้า)
ใช้ [discord.js v14](https://discord.js.org/)

## ✨ ฟีเจอร์

- **ต้อนรับสมาชิกใหม่** — ส่งข้อความ embed พร้อม GIF สุ่ม + ปุ่มรับยศ (แปลงวิดีโอเป็น GIF ด้วย ffmpeg อัตโนมัติ)
- **ปุ่มรับยศ (Role Gate)** — กดปุ่มแล้วได้ยศสมาชิกทันที ถ้ายังไม่กดจะมองไม่เห็นห้องอื่น
- **ระบบตรวจบัตร 18+** — กดปุ่มเปิดห้องส่วนตัว (ticket) ส่งรูปบัตร → ทีมงานกดผ่าน/ไม่ผ่าน → ผ่านแล้วได้ยศเข้าโซนลับ
- **`!setupgate`** — ตั้งสิทธิ์ห้องทั้งเซิร์ฟอัตโนมัติ (ห้องทั่วไปเห็นเฉพาะคนมียศ / โซน 18+ เห็นเฉพาะคนผ่านตรวจ)

## 📋 สิ่งที่ต้องมี

- [Node.js](https://nodejs.org/) v18 ขึ้นไป (แนะนำ v20+)
- บอท Discord + token
- บอทต้องมีสิทธิ์: Manage Channels, Manage Roles, Manage Messages

## 🚀 วิธีติดตั้ง

```bash
git clone https://github.com/TheTipsyPaws04/my-project-bot-GangChom.git
cd my-project-bot-GangChom
npm install
```

สร้างไฟล์ `.env` ที่โฟลเดอร์หลัก:

```env
DISCORD_TOKEN=_token_ของบอทคุณ
CLIENT_ID=client_id_ของบอทคุณ
```

> ⚠️ `.env` ไม่ถูกเก็บใน git เพื่อความปลอดภัย ต้องสร้างเอง

## ⚙️ ตั้งค่า `config.js`

แก้ ID ให้ตรงกับเซิร์ฟเวอร์ของคุณ:

| ตัวแปร | คำอธิบาย |
|---|---|
| `welcomeChannelId` | ห้องต้อนรับ (โพสต์ปุ่มรับยศ) |
| `verifyChannelId` | ห้องโพสต์ปุ่มตรวจบัตร 18+ (ต้องเป็นห้องข้อความ) |
| `verifiedRoleId` | ยศที่ได้เมื่อผ่านตรวจ 18+ |
| `staffRoleIds` | ยศทีมงาน (เว้นว่าง = ใช้สิทธิ์ Admin) |
| `ticketCategoryId` | หมวดหมู่สำหรับสร้างห้อง ticket |
| `memberRoleId` | ยศที่ได้จากการกดปุ่มรับยศ |
| `sensitive18Ids` | หมวด/ห้อง 18+ ที่ซ่อนจากคนไม่ผ่านตรวจ |
| `protectedIds` | ห้อง/หมวดที่ห้ามบอทแตะเด็ดขาด |
| `publicChannelIds` | ห้องที่ให้ทุกคนเห็นแม้ยังไม่กดรับยศ |

## ▶️ การรัน

```bash
npm start      # รันปกติ
npm run dev    # รันแบบ watch (แก้โค้ดแล้วรีสตาร์ทเอง)
```

หรือดับเบิลคลิก **`start.bat`** (มีระบบรีสตาร์ทอัตโนมัติ)

## 🔧 ตั้งค่าครั้งแรกในเซิร์ฟเวอร์

1. เปิดบอทด้วย `start.bat` → บอทจะโพสต์ปุ่มในห้อง Welcome และห้องตรวจบัตร
2. **เปิด Message Content Intent**: [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents → เปิด **Message Content Intent**
3. พิมพ์ **`!setupgate`** ในเซิร์ฟ (ต้องเป็นทีมงาน) เพื่อตั้งสิทธิ์ห้องทั้งหมด

## 📁 โครงสร้างไฟล์

```
├── index.js           # โค้ดหลักของบอท
├── config.js          # ตั้งค่า ID ห้อง/ยศ
├── start.bat          # ตัวรันบน Windows (auto-restart)
├── package.json
├── welcome_*.gif      # GIF ต้อนรับ (สร้างอัตโนมัติจากวิดีโอ)
└── .env               # token (ไม่ขึ้น git — ต้องสร้างเอง)
```

## 📝 หมายเหตุ

- บอทจะ**แปลงวิดีโอเป็น GIF** ครั้งแรกที่รัน (ใช้ ffmpeg-static, ใช้เวลาสักครู่) แล้วเก็บเป็น `welcome_*.gif`
- **ห้ามรันบอท 2 ที่พร้อมกัน** (token เดียวกัน) จะทำให้ตอบซ้ำ — ถ้าจำเป็นให้ Reset Token ที่ Developer Portal
- ปุ่มรับยศ/ปุ่มตรวจบัตรเป็น **persistent** ใช้ได้แม้บอทรีสตาร์ท

## 📄 License

MIT
