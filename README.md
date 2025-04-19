# 🚗 Tesla Model Y Fiyat Takip Botu

<p align="center">
  <img src="https://www.tesla.com/themes/custom/tesla_frontend/assets/favicons/favicon.ico" width="100" alt="Tesla Logo">
</p>

Tesla Model Y araçlarının envanter durumunu otomatik olarak izleyen ve belirtilen fiyat limitinin altındaki yeni araçlar eklendiğinde size anında bildirim gönderen bir bot.

## 🌟 Özellikler

- ✅ Belirlediğiniz aralıklarla otomatik kontrol (dakika, saat veya gün olarak ayarlanabilir)
- ✅ İstediğiniz fiyat limiti altındaki araçlar hakkında anında bildirim
- ✅ **Telegram** bildirimleri (en güvenilir yöntem)
- ✅ E-posta bildirimleri (Gmail, Outlook, Yandex)
- ✅ Detaylı araç bilgileri (model, trim, renk, menzil, hızlanma, fiyat)
- ✅ İndirimli araçların tespit edilmesi ve bildirilmesi
- ✅ Envanter verilerini JSON formatında kaydetme
- ✅ İstatistiksel özet raporları

## 🖼️ Örnek Bildirim

Telegram ile gelen bir bildirim örneği:

```
🚗 YENİ TESLA MODEL Y FIRSATLARI 🚗

🔥 3 adet 4.000.000 TL altı yeni araç bulundu!

1. Performance Dört Çeker
💰 Fiyat: 3.356.160 ₺
🏷️ İndirim: 193.640 ₺ (Orijinal: 3.727.949 ₺)
🎨 Renk: Midnight Cherry Red (Vişne)
🔋 Menzil: 514 kilometre
⚡ 0-100 Hızlanma: 3.7 saniye
🔗 [Satın Al](https://www.tesla.com/tr_TR/my/order/...)

...
```

## 📋 Gereksinimler

- Node.js 14+
- npm

## ⚙️ Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/KULLANICI_ADINIZ/tesla-fiyat-takip.git
cd tesla-fiyat-takip
```

2. Gerekli paketleri yükleyin:
```bash
npm install
```

3. Yapılandırma dosyasını oluşturun:
```bash
cp .env.example .env
```

4. `.env` dosyasını düzenleyerek bildirim ayarlarınızı yapın.

## 🔔 Bildirim Ayarları

### Telegram Bildirimleri (Önerilen)

1. Telegram'da [@BotFather](https://t.me/botfather) ile konuşmaya başlayın
2. `/newbot` komutunu gönderin ve adımları takip edin
3. Bot token'ını `.env` dosyasına ekleyin:
```
TELEGRAM_BOT_TOKEN=botunuzun_token_değeri
```
4. Botunuza bir mesaj gönderin
5. Chat ID'nizi almak için: https://api.telegram.org/botTOKEN_DEĞERI/getUpdates
6. Chat ID'yi `.env` dosyasına ekleyin:
```
TELEGRAM_CHAT_ID=chat_id_değeri
```

### Fiyat ve Kontrol Sıklığı Ayarları

`.env` dosyasında:
```
# Fiyat limiti (TL)
PRICE_LIMIT=4000000

# Kontrol aralığı (dakika cinsinden)
CHECK_INTERVAL=30
```

## 🚀 Kullanım

Bot'u başlatmak için:

```bash
node index.js
```

Farklı bir kontrol aralığıyla çalıştırmak için:

```bash
# 15 dakikada bir kontrol için:
node index.js 15
```

## 🛠️ Arka Planda Sürekli Çalıştırma

### Windows 

Windows Görev Zamanlayıcısı kullanarak her bilgisayar başlangıcında otomatik başlatabilirsiniz.

### Linux/macOS

PM2 ile sürekli çalıştırmak için:

```bash
npm install -g pm2
pm2 start index.js --name "tesla-tracker"
pm2 startup
pm2 save
```

## 📄 Lisans

MIT

## 👨‍💻 Geliştiren

- [M. Burak UYANIK](https://github.com/mburakuyanik)

---

<p align="center">
  <b>🔍 Tesla Model Y Fiyat Takip Botu ile uygun fiyatlı Tesla'nızı kaçırmayın!</b><br>
</p> 