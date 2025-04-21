# Tesla Model Y Price Tracker Bot

## Overview

**Tesla Model Y Price Tracker Bot** monitors Tesla's official inventory page at regular intervals to identify new vehicles listed below a specified price threshold. When a matching vehicle is found, you are instantly notified via Telegram or email.

> 🚀 A smart and reliable solution to never miss a great deal.

---

## 🔧 Key Features

- 🔁 Automated checks at configurable intervals (minutes, hours, days)
- 💸 Detects new listings below your set price limit
- 📬 Real-time notifications via **Telegram and Email**
- 📊 Detailed vehicle information (model, trim, range, acceleration, price, discount)
- 🏷️ Detects discounted vehicles and highlights savings
- 💾 Saves inventory data in JSON format
- 📈 Provides summarized reports

---

## 🔔 Sample Notification

```
🚗 NEW TESLA MODEL Y DEALS 🚗

🔥 3 new vehicles found under 4,000,000 TL!

1. Performance AWD
💰 Price: ₺3,356,160
🏷️ Discount: ₺193,640 (Original: ₺3,727,949)
🎨 Color: Midnight Cherry Red
🔋 Range: 514 km
⚡ 0-100 km/h: 3.7 sec
🔗 Purchase: [Link](https://www.tesla.com/tr_TR/my/order/...)
```

---

## 🚀 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/mburakuyanik/TeslaPriceTrackerTelegramBot.git
cd TeslaPriceTrackerTelegramBot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your environment config

```bash
cp .env.example .env
```

### 4. Edit `.env` file

Configure your Telegram or email settings, price limit, and check interval:

```env
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx

PRICE_LIMIT=4000000
CHECK_INTERVAL=30
```

---

## 📤 Notification Methods

### ✅ Telegram (Recommended)

1. Start a chat with [@BotFather](https://t.me/botfather) to create your bot
2. Copy the token and paste it into your `.env` file
3. To retrieve your chat ID, send a message to your bot and use the `getUpdates` API

### 📧 Email

- Supports Gmail, Outlook, and Yandex via SMTP. Add SMTP credentials in your `.env` file.

---

## 🛠️ Running the Bot

```bash
node index.js
```

> Optional: Set a custom check interval (in minutes)

```bash
node index.js 15  # Check every 15 minutes
```

---

## ♾️ Run in the Background

### Linux/macOS (Using PM2)

```bash
npm install -g pm2
pm2 start index.js --name "tesla-tracker"
pm2 startup
pm2 save
```

### Windows

- Use Task Scheduler to launch the bot on system startup.

---

## 📄 License

Distributed under the MIT License.

---

## 👨‍💻 Developer

**M. Burak UYANIK**  
🔗 [GitHub](https://github.com/mburakuyanik)

