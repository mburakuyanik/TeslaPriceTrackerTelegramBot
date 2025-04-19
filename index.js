const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();
const nodemailer = require('nodemailer');
const notifier = require('node-notifier');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

// Tesla envanter sayfası URL'si
const INVENTORY_URL = 'https://www.tesla.com/tr_TR/inventory/new/my?arrangeby=plh&zip=34096&range=0';

// Bildirim gönderilecek fiyat limiti (.env dosyasından okuma)
const PRICE_LIMIT = process.env.PRICE_LIMIT ? parseInt(process.env.PRICE_LIMIT) : 2000000; // 2 milyon TL

// Kontrol aralığı (cron format)
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '*/30 * * * *';

// Bildirim gönderme fonksiyonu (E-posta, Masaüstü ve Telegram bildirimleri)
async function sendNotification(newCars) {
  try {
    // 1. Masaüstü bildirim gönder
    notifier.notify({
      title: '🚨 Tesla Fırsat Alarmı! 🚨',
      message: `${newCars.length} adet ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı yeni Tesla Model Y bulundu!`,
      icon: path.join(__dirname, 'tesla-icon.png'), // İsteğe bağlı: Tesla ikonu ekleyebilirsiniz
      sound: true,
      wait: true,
      timeout: 30
    });
    
    // 2. Bildirim detaylarını dosyaya kaydet (her zaman çalışır)
    const notificationFilename = `notification-${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(notificationFilename, JSON.stringify({
      date: new Date().toISOString(),
      message: `${newCars.length} adet ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı yeni Tesla Model Y bulundu!`,
      cars: newCars
    }, null, 2));
    
    console.log(`🚨 ALARM: ${newCars.length} adet ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı yeni araç bulundu!`);
    console.log(`Bildirim detayları ${notificationFilename} dosyasına kaydedildi.`);
    
    // 3. E-posta ile bildirim gönder (yapılandırılmışsa)
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailTo = process.env.EMAIL_TO;
    
    if (emailUser && emailPass && emailTo) {
      // E-posta gönderim yapılandırması
      let transporter;
      
      // E-mail servisini otomatik tespit et (gmail veya yandex)
      if (emailUser.includes('@gmail.com')) {
        // Gmail için yapılandırma
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });
      } else if (emailUser.includes('@outlook') || emailUser.includes('@hotmail')) {
        // Outlook/Hotmail için yapılandırma (normal parola kullanabilirsiniz)
        transporter = nodemailer.createTransport({
          service: 'outlook',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });
      } else if (emailUser.includes('@yandex')) {
        // Yandex Mail için yapılandırma
        transporter = nodemailer.createTransport({
          host: 'smtp.yandex.com',
          port: 465,
          secure: true, // SSL/TLS
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });
      } else {
        // Diğer mail sağlayıcıları için genel SMTP
        transporter = nodemailer.createTransport({
          host: 'smtp.office365.com', // varsayılan olarak outlook/hotmail
          port: 587,
          secure: false,
          auth: {
            user: emailUser,
            pass: emailPass
          },
          tls: {
            ciphers: 'SSLv3'
          }
        });
      }
      
      // E-posta içeriği
      let carListHtml = '';
      newCars.forEach((car, index) => {
        const priceStr = typeof car.price === 'string' ? car.price : `${car.price} ₺`;
        carListHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${car.trim}</td>
            <td><b style="color:red">${priceStr}</b></td>
            <td>${car.color}</td>
            <td>${car.specs?.range?.value || '-'} ${car.specs?.range?.unit || ''}</td>
            <td><a href="${car.url}" target="_blank">Satın Al</a></td>
          </tr>
        `;
      });
      
      const mailOptions = {
        from: emailUser,
        to: emailTo,
        subject: '🚨 Tesla Fırsat Alarmı: 2 Milyon TL Altı Model Y Bulundu!',
        html: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                h1 { color: #e82127; } /* Tesla kırmızısı */
                table { border-collapse: collapse; width: 100%; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                .price { color: red; font-weight: bold; }
                .btn { background-color: #e82127; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>🚨 Tesla Fırsat Alarmı</h1>
              <p>Merhaba,</p>
              <p><b>${newCars.length} adet</b> ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı yeni Tesla Model Y bulundu!</p>
              <p>Araçlar:</p>
              
              <table>
                <tr>
                  <th>#</th>
                  <th>Model</th>
                  <th>Fiyat</th>
                  <th>Renk</th>
                  <th>Menzil</th>
                  <th>İşlem</th>
                </tr>
                ${carListHtml}
              </table>
              
              <p>Bu araçlar hızla tükenebilir, ilgileniyorsanız acele etmenizi öneririz.</p>
              <p>İyi günler,<br>Tesla Takip Botu</p>
            </body>
          </html>
        `
      };
      
      try {
        await transporter.sendMail(mailOptions);
        console.log('E-posta bildirimi gönderildi.');
      } catch (emailError) {
        console.error('E-posta gönderimi başarısız oldu:');
        console.error('Hata detayı:', emailError.message);
        console.error('Mail bilgileri kontrol edilmeli. Gmail için "Uygulama Şifresi" gereklidir!');
        console.error('Yardım için: https://myaccount.google.com/apppasswords');
        
        // Hata kaydı
        fs.writeFileSync('email-error.json', JSON.stringify({
          date: new Date().toISOString(),
          error: emailError.message,
          errorCode: emailError.code || 'Bilinmiyor',
          errorInfo: emailError.toString()
        }, null, 2));
      }
    }
    
    // 3. Telegram ile bildirim gönder (yapılandırılmışsa)
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    
    if (telegramBotToken && telegramChatId) {
      try {
        // Araç listesi metni oluştur
        let carListText = '🚗 *YENİ TESLA MODEL Y FIRSATLARI* 🚗\n\n';
        carListText += `🔥 *${newCars.length} adet* ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı yeni araç bulundu!\n\n`;
        
        newCars.forEach((car, index) => {
          carListText += `*${index + 1}. ${car.trim}*\n`;
          carListText += `💰 Fiyat: ${car.price}\n`;
          if (car.discount) {
            carListText += `🏷️ İndirim: ${car.discount} (Orijinal: ${car.originalPrice})\n`;
          }
          carListText += `🎨 Renk: ${car.color}\n`;
          if (car.specs && car.specs.range) {
            carListText += `🔋 Menzil: ${car.specs.range.value} ${car.specs.range.unit}\n`;
          }
          if (car.specs && car.specs.acceleration) {
            carListText += `⚡ 0-100 Hızlanma: ${car.specs.acceleration.value} ${car.specs.acceleration.unit}\n`;
          }
          carListText += `🔗 [Satın Al](${car.url})\n\n`;
        });
        
        carListText += `\n_Tesla Takip Botu - ${new Date().toLocaleString('tr-TR')}_`;
        
        // Telegram API'sine HTTP isteği gönder
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        const response = await axios.post(telegramUrl, {
          chat_id: telegramChatId,
          text: carListText,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        });
        
        if (response.data && response.data.ok) {
          console.log('Telegram bildirimi gönderildi.');
        } else {
          console.error('Telegram bildirimi başarısız oldu:', response.data);
        }
      } catch (telegramError) {
        console.error('Telegram bildirimi gönderilemedi:', telegramError.message);
        
        // Hata durumunda basit metin göndermeyi dene
        try {
          const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
          const simpleMessage = `🚨 Tesla Fırsat: ${newCars.length} adet ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı yeni Tesla Model Y bulundu!`;
          
          await axios.post(telegramUrl, {
            chat_id: telegramChatId,
            text: simpleMessage,
            parse_mode: 'HTML'
          });
          console.log('Basit Telegram bildirimi gönderildi.');
        } catch (simpleError) {
          console.error('Basit Telegram bildirimi de başarısız oldu:', simpleError.message);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Bildirim gönderilirken hata oluştu:', error.message);
    return false;
  }
}

// Ana fonksiyon - Tesla envanter verisi çek
async function fetchTeslaInventory() {
  console.log('Başlatılıyor... Tesla Model Y envanter verisi çekiliyor...');
  console.log(`Kontrol zamanı: ${new Date().toLocaleString('tr-TR')}`);
  
  // Çıktıları kontrol etmek için flag
  let apiDataFetched = false;
  let inventoryApiResponse = null;
  
  const browser = await puppeteer.launch({
    headless: true, // Tarayıcıyı görünmez modda çalıştır
    defaultViewport: null, // Tam ekran modu
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--enable-features=NetworkService'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Tarayıcı algılanmasını engellemek için ek ayarlar
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36');
    
    // JavaScript enabled
    await page.setJavaScriptEnabled(true);
    
    // Tablet/mobile görünümünü devre dışı bırak
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
    
    // İzleme önleme özelliklerini devre dışı bırak
    await page.evaluateOnNewDocument(() => {
      // Navigator.webdriver özelliğini gizle (anti-bot)
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // User-Agent helper
      window.navigator.chrome = { runtime: {} };
      
      // Plugins ve mime tip listesini oluştur
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Otomasyonu gizle
      Object.defineProperty(navigator, 'languages', {
        get: () => ['tr-TR', 'tr', 'en-US', 'en'],
      });
    });
    
    // Network isteklerini izle - bunu sessiz yap
    page.on('response', async response => {
      const url = response.url();
      // API yanıtlarını yakalamak için URL'yi kontrol et
      if ((url.includes('inventory-results') || url.includes('inventory/api')) && !apiDataFetched) {
        try {
          const responseBody = await response.json();
          inventoryApiResponse = responseBody;
          apiDataFetched = true;
          fs.writeFileSync('api-response.json', JSON.stringify(responseBody, null, 2));
          // API bilgisi sonra yazdırılacak
        } catch (error) {
          // JSON olmayan yanıtları atla
        }
      }
    });
    
    // Doğrudan API URL'sine istek yap
    const apiUrl = 'https://www.tesla.com/inventory/api/v4/inventory-results?query=%7B%22query%22%3A%7B%22model%22%3A%22my%22%2C%22condition%22%3A%22new%22%2C%22options%22%3A%7B%7D%2C%22arrangeby%22%3A%22Price%22%2C%22order%22%3A%22asc%22%2C%22market%22%3A%22TR%22%2C%22language%22%3A%22tr%22%2C%22super_region%22%3A%22north%20america%22%2C%22lng%22%3A28.9533%2C%22lat%22%3A41.0145%2C%22zip%22%3A%2234096%22%2C%22range%22%3A0%2C%22region%22%3A%22TR%22%7D%2C%22offset%22%3A0%2C%22count%22%3A50%2C%22outsideOffset%22%3A0%2C%22outsideSearch%22%3Afalse%7D';
    
    // Tesla envanter sayfasına git
    console.log('Tesla API\'sine bağlanılıyor...');
    await page.goto(INVENTORY_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 saniye timeout
    });
    
    // Sayfanın tamamen yüklenmesi için biraz bekle
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Sessizce dosyaları kaydet
    await page.screenshot({ path: 'tesla-page.png' });
    
    // API yanıtı yakalanmadıysa doğrudan API'ye istek gönder
    if (!inventoryApiResponse && !apiDataFetched) {
      console.log('Alternatif yöntem deneniyor...');
      
      try {
        const apiResponse = await page.evaluate(async (url) => {
          try {
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.tesla.com/tr_TR/inventory/new/my',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
              },
              credentials: 'include'
            });
            
            return await response.json();
          } catch (error) {
            return { error: error.toString() };
          }
        }, apiUrl);
        
        if (apiResponse && !apiResponse.error) {
          inventoryApiResponse = apiResponse;
          apiDataFetched = true;
          fs.writeFileSync('api-response.json', JSON.stringify(apiResponse, null, 2));
        }
      } catch (fetchError) {
        console.log('API verisi çekilemedi:', fetchError.message);
      }
    }
    
    // Tüm araçları saklayacak dizi
    const allVehicles = [];
    // 2 milyon TL altı araçlar için ayrı bir dizi
    const cheapVehicles = [];
    
    // API yanıtlarını kontrol et - eğer yakalanmışsa, önce bunu kullanalım
    if (inventoryApiResponse) {
      console.log('Veri analizi başlatılıyor...');
      let vehicles = [];
      
      // API yanıtında results varsa, bunu kullan
      if (inventoryApiResponse.results && Array.isArray(inventoryApiResponse.results)) {
        vehicles = inventoryApiResponse.results.map(item => {
          // Özellik detaylarını topla
          const features = {};
          
          // OptionCodeData'dan özellikleri topla
          if (item.OptionCodeData && Array.isArray(item.OptionCodeData)) {
            item.OptionCodeData.forEach(option => {
              if (option.group && option.name) {
                if (!features[option.group]) {
                  features[option.group] = [];
                }
                
                // Fiyatı varsa ekle
                if (option.price) {
                  features[option.group].push({
                    name: option.name,
                    description: option.description || null,
                    price: option.price
                  });
                } else {
                  features[option.group].push({
                    name: option.name,
                    description: option.description || null
                  });
                }
              }
            });
          }
          
          // Temel aracın teknik özelliklerini bul
          const acceleration = item.OptionCodeData?.find(o => o.group === 'SPECS_ACCELERATION');
          const topSpeed = item.OptionCodeData?.find(o => o.group === 'SPECS_TOP_SPEED');
          const range = item.OptionCodeData?.find(o => o.group === 'SPECS_RANGE');
          
          // Trimini belirle
          let trimName = item.TrimName || 'Model Y';
          if (item.DRIVE && item.DRIVE.includes('DRLH') && item.ADL_OPTS && item.ADL_OPTS.includes('PERFORMANCE_UPGRADE')) {
            trimName = 'Performance Dört Çeker';
          } else if (item.DRIVE && item.DRIVE.includes('DRLH')) {
            trimName = 'Long Range Dört Çeker';
          } else if (item.DRIVE && item.DRIVE.includes('DRB')) {
            trimName = 'Arkadan İtişli';
          }
          
          // Renk adını daha anlaşılır yap
          let colorName = 'Belirtilmemiş';
          if (item.PAINT) {
            const colorCode = item.PAINT[0];
            switch (colorCode) {
              case 'WHITE':
                colorName = 'Pearl White (Beyaz)';
                break;
              case 'BLACK':
                colorName = 'Solid Black (Siyah)';
                break;
              case 'BLUE':
                colorName = 'Deep Blue (Lacivert)';
                break;
              case 'CHERRY':
                colorName = 'Midnight Cherry Red (Vişne)';
                break;
              case 'RED':
                colorName = 'Red Multi-Coat (Kırmızı)';
                break;
              case 'SILVER':
                colorName = 'Quicksilver (Gümüş)';
                break;
              case 'GREY':
                colorName = 'Midnight Silver (Gri)';
                break;
              default:
                colorName = colorCode;
            }
          }
          
          // Fiyatı tam sayı olarak çıkar (bildirimler için)
          let numericPrice = 0;
          if (item.InventoryPrice) {
            numericPrice = parseInt(item.InventoryPrice);
          }
          
          const vehicle = {
            model: item.Model || 'my',
            trim: trimName,
            numericPrice: numericPrice, // Sayısal değer olarak fiyat
            price: item.InventoryPrice ? `${item.InventoryPrice} ₺` : 'Fiyat bilgisi yok',
            originalPrice: item.CashDetails?.cash?.inventoryPriceWithoutDiscounts ? `${item.CashDetails.cash.inventoryPriceWithoutDiscounts} ₺` : null,
            discount: item.Discount ? `${item.Discount} ₺` : null,
            color: colorName,
            interiorColor: item.INTERIOR ? item.INTERIOR[0] : null,
            specs: {
              acceleration: acceleration ? {
                value: acceleration.value,
                unit: acceleration.unit_long
              } : null,
              topSpeed: topSpeed ? {
                value: topSpeed.value,
                unit: topSpeed.unit_long
              } : null,
              range: range ? {
                value: range.value,
                unit: range.unit_long,
                source: range.range_source
              } : null
            },
            features: features,
            vin: item.VIN || item.Hash || '',
            inTransit: item.InTransit || false,
            isDemo: item.IsDemo || false,
            url: item.VIN ? `https://www.tesla.com/tr_TR/my/order/${item.VIN}` 
                : (item.Hash ? `https://www.tesla.com/tr_TR/my/order/${item.Hash}` : '')
          };
          
          // Tüm araçlar listesine ekle
          allVehicles.push(vehicle);
          
          // 2 milyon TL altındaysa ucuz araçlar listesine ekle
          if (numericPrice > 0 && numericPrice < PRICE_LIMIT) {
            cheapVehicles.push(vehicle);
          }
          
          return vehicle;
        });
        
        // Araçları fiyata göre sırala
        vehicles.sort((a, b) => {
          const priceA = a.numericPrice || 0;
          const priceB = b.numericPrice || 0;
          return priceA - priceB;
        });
        
        // Önceki sonuçları yükle (eğer varsa)
        let previousResults = [];
        try {
          if (fs.existsSync('previous-results.json')) {
            previousResults = JSON.parse(fs.readFileSync('previous-results.json', 'utf8'));
          }
        } catch (err) {
          console.log('Önceki sonuçlar yüklenemedi, ilk kez çalışıyor olabilir.');
        }
        
        // Yeni 2 milyon TL altı araçları bul
        const newCheapVehicles = cheapVehicles.filter(newCar => {
          // VIN veya Hash ile eşleşen araç önceki sonuçlarda var mı kontrol et
          return !previousResults.some(oldCar => 
            (newCar.vin && oldCar.vin === newCar.vin) || 
            (newCar.url && oldCar.url === newCar.url)
          );
        });
        
        // Yeni sonuçları kaydet (bir sonraki çalıştırma için)
        fs.writeFileSync('previous-results.json', JSON.stringify(allVehicles, null, 2));
        
        // Tüm sonuçları kaydet
        fs.writeFileSync('inventory-results.json', JSON.stringify(allVehicles, null, 2));
        
        // Özet rapor oluştur
        const summary = {
          date: new Date().toISOString(),
          totalVehicles: allVehicles.length,
          cheapVehicles: cheapVehicles.length,
          newCheapVehicles: newCheapVehicles.length,
          priceRange: {
            min: allVehicles.length > 0 ? allVehicles[0].price : 'N/A',
            max: allVehicles.length > 0 ? allVehicles[allVehicles.length - 1].price : 'N/A'
          },
          trims: {},
          colors: {}
        };
        
        // Trim ve renk istatistiklerini topla
        allVehicles.forEach(vehicle => {
          // Trim sayısı
          if (vehicle.trim) {
            summary.trims[vehicle.trim] = (summary.trims[vehicle.trim] || 0) + 1;
          }
          
          // Renk sayısı
          if (vehicle.color) {
            summary.colors[vehicle.color] = (summary.colors[vehicle.color] || 0) + 1;
          }
        });
        
        fs.writeFileSync('inventory-summary.json', JSON.stringify(summary, null, 2));
        
        // Yeni 2 milyon TL altı araç varsa bildirim gönder
        if (newCheapVehicles.length > 0) {
          await sendNotification(newCheapVehicles);
        }
        
        // Araçları terminalde görüntüle
        console.log('\n========================================================');
        console.log('|         TESLA MODEL Y ENVANTER - ' + new Date().toLocaleDateString('tr-TR') + '        |');
        console.log('========================================================');
        console.log(`\nToplam ${vehicles.length} araç bulundu.`);
        console.log(`${PRICE_LIMIT} TL altında: ${cheapVehicles.length} araç`);
        if (newCheapVehicles.length > 0) {
          console.log(`YENİ EKLENEN: ${newCheapVehicles.length} araç 2 milyon TL altında!`);
        }
        console.log('\n---------------- ARAÇ LİSTESİ -----------------\n');
        
        vehicles.forEach((vehicle, index) => {
          const isCheap = vehicle.numericPrice > 0 && vehicle.numericPrice < PRICE_LIMIT;
          const isNew = newCheapVehicles.some(newCar => 
            (newCar.vin && newCar.vin === vehicle.vin) || 
            (newCar.url && newCar.url === vehicle.url)
          );
          
          console.log(`${index + 1}. ${vehicle.trim}${isCheap ? ' 🔥' : ''}${isNew ? ' 🆕' : ''}`);
          console.log(`   Fiyat: ${vehicle.price}`);
          if (vehicle.discount) {
            console.log(`   İndirim: ${vehicle.discount} (Orijinal: ${vehicle.originalPrice})`);
          }
          console.log(`   Renk: ${vehicle.color}`);
          if (vehicle.specs && vehicle.specs.range) {
            console.log(`   Menzil: ${vehicle.specs.range.value} ${vehicle.specs.range.unit}`);
          }
          if (vehicle.specs && vehicle.specs.acceleration) {
            console.log(`   0-100 Hızlanma: ${vehicle.specs.acceleration.value} ${vehicle.specs.acceleration.unit}`);
          }
          console.log('');
        });
        
        console.log('========================================================');
        console.log('Not: Detaylı bilgiler inventory-results.json dosyasına kaydedildi.');
        console.log('========================================================\n');
        
        return { allVehicles, cheapVehicles, newCheapVehicles };
      } else {
        console.log('API yanıtında araç verisi bulunamadı.');
      }
    } else {
      console.log('API yanıtı alınamadı veya işlenemedi.');
    }
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
    
    // Hata durumunda ekran görüntüsü al
    try {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({ path: 'error-screenshot.png' });
      }
    } catch (screenshotError) {
      // Sessizce hatayı yönet
    }
    
    return null;
  } finally {
    await browser.close();
  }
}

// Zamanlayıcı ile düzenli kontrol
function startMonitoring(interval = CHECK_INTERVAL) {
  // Cron ifadesini dakikaya çevir
  let intervalMinutes = 30; // varsayılan 30 dakika
  
  if (interval.includes('*/')) {
    // */X formatındaysa, X değerini çıkar
    const match = interval.match(/\*\/(\d+)/);
    if (match && match[1]) {
      intervalMinutes = parseInt(match[1]);
    }
  }
  
  console.log(`Tesla envanter takip sistemi başlatıldı. Kontrol aralığı: ${intervalMinutes} dakika`);
  console.log(`${PRICE_LIMIT.toLocaleString('tr-TR')} TL altındaki araçlar izleniyor...`);
  console.log(`Başlangıç zamanı: ${new Date().toLocaleString('tr-TR')}`);
  
  // İlk çalıştırma
  clearPreviousResults(); // Önceki sonuçları temizle
  fetchTeslaInventory().then(result => {
    if (result) {
      console.log(`İlk tarama tamamlandı. ${result.allVehicles.length} araç bulundu.`);
      if (result.cheapVehicles.length > 0) {
        console.log(`İlk taramada ${result.cheapVehicles.length} araç ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altında bulundu.`);
      }
      console.log(`Sonraki kontrol: ${intervalMinutes} dakika sonra (${new Date(Date.now() + intervalMinutes * 60 * 1000).toLocaleString('tr-TR')})`);
    } else {
      console.log('İlk tarama başarısız oldu.');
    }
  });
  
  // setInterval ile düzenli kontrol (cron yerine)
  // Milisaniyeye çevir (dakika * 60 * 1000)
  const intervalMs = intervalMinutes * 60 * 1000;
  
  setInterval(() => {
    console.log('\n--- Yeni kontrol başlatılıyor ---');
    console.log(`Kontrol zamanı: ${new Date().toLocaleString('tr-TR')}`);
    
    clearPreviousResults(); // Her kontrol öncesi önceki sonuçları temizle
    fetchTeslaInventory().then(result => {
      if (result) {
        console.log(`Kontrol tamamlandı. ${result.allVehicles.length} araç bulundu.`);
        if (result.newCheapVehicles.length > 0) {
          console.log(`${result.newCheapVehicles.length} yeni araç ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altında bulundu!`);
        } else {
          console.log(`Yeni ${PRICE_LIMIT.toLocaleString('tr-TR')} TL altı araç bulunamadı.`);
        }
        console.log(`Sonraki kontrol: ${intervalMinutes} dakika sonra (${new Date(Date.now() + intervalMs).toLocaleString('tr-TR')})`);
      } else {
        console.log('Kontrol başarısız oldu.');
      }
    });
  }, intervalMs);
}

// Önceki sonuçları temizleme fonksiyonu
function clearPreviousResults() {
  try {
    // previous-results.json dosyasını temizle
    if (fs.existsSync('previous-results.json')) {
      fs.unlinkSync('previous-results.json');
      console.log('Önceki sonuçlar temizlendi.');
    }
    
    // Eski bildirim dosyalarını temizle (isteğe bağlı, 24 saatten eski olanları sil)
    const notificationFiles = fs.readdirSync('.').filter(file => 
      file.startsWith('notification-') && file.endsWith('.json')
    );
    
    // Son 10 bildirim dışındakileri sil
    if (notificationFiles.length > 10) {
      // Dosyaları oluşturma tarihine göre sırala (en yeniden en eskiye)
      notificationFiles.sort((a, b) => {
        return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
      });
      
      // İlk 10 dosya dışındakileri sil
      notificationFiles.slice(10).forEach(file => {
        fs.unlinkSync(file);
        console.log(`Eski bildirim dosyası silindi: ${file}`);
      });
    }
  } catch (error) {
    console.error('Dosya temizleme hatası:', error.message);
  }
}

// Komut satırından çalıştırma
if (require.main === module) {
  // Parametre olarak dakika geçilebilir (örn: node index.js 15)
  let interval = process.argv[2] || CHECK_INTERVAL;
  
  // Eğer sayı ise, cron ifadesine dönüştür
  if (!isNaN(parseInt(interval))) {
    interval = `*/${interval} * * * *`;
  }
  
  startMonitoring(interval);
}

// Modül olarak dışa aktarma
module.exports = { fetchTeslaInventory, startMonitoring }; 