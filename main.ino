#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ESP32Servo.h> 

#define SS_PIN 5
#define RST_PIN 4
#define BUZZER_PIN 15
#define SERVO_PIN 13

MFRC522 mfrc522(SS_PIN, RST_PIN);
Servo myServo;

// PERHATIAN: 2 Buah LCD membutuhkan alamat I2C yang berbeda agar tidak bentrok.
LiquidCrystal_I2C lcd1(0x27, 16, 2); // LCD Pertama (Dalam)
LiquidCrystal_I2C lcd2(0x3F, 16, 2); // LCD Kedua (Luar)

// WiFi Baru
const char* ssid = "ABCD";       
const char* password = "nasigoreng02"; 
String GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyVnycUTNCVd4vEoCFczMX5rX0qEsO7lATiUnT__ZYxzjd0NwuAqAwGnZ_QX0GDNX6TlQ/exec"; 

void setup() {
  Serial.begin(115200); 
  SPI.begin();          
  mfrc522.PCD_Init();   
  
  // Inisialisasi 2 LCD
  lcd1.init(); lcd1.backlight();      
  lcd2.init(); lcd2.backlight();      
  
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); 
  
  tampilkanPesanLCD("Menyambung WiFi", "........");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  tampilkanPesanLCD("WiFi Terhubung!", "");
  delay(1500);

  tampilkanStandby();
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // 1. OPTIMALISASI UID (Tanpa Spasi)
  String currentUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
     if (mfrc522.uid.uidByte[i] < 0x10) currentUID += "0";
     currentUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  currentUID.toUpperCase(); 

  // 2. OPTIMALISASI KECEPATAN: Tampilkan pesan memproses statis tanpa perulangan delay
  tampilkanPesanLCD("Please wait",".......");

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); 
    
    HTTPClient http;
    String urlAkhir = GOOGLE_SCRIPT_URL + "?uid=" + currentUID;
    
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS); 
    http.setTimeout(15000); 
    
    http.begin(client, urlAkhir); 
    int httpCode = http.GET();
    
    if (httpCode > 0) { 
      String payload = http.getString(); 
      
      if (payload.indexOf("Sukses") >= 0) {
        String namaUser = "User";
        int komaPos = payload.indexOf(',');
        if (komaPos > 0) {
          namaUser = payload.substring(komaPos + 1);
        }
        
        // =======================================================
        // URUTAN BARU SESUAI PERMINTAAN
        // =======================================================

        // 1. SERVO BUKA DULUAN
        myServo.attach(SERVO_PIN); 
        myServo.write(120);        
        delay(270);                
        myServo.write(90);         
        myServo.detach();          
        
        // 2. SUARA & DISPLAY MUNCUL BERSAMAAN
        // Munculkan teks seketika tanpa delay
        tampilkanPesanLCD(namaUser, "Access Granted"); 
        
        // Sambil teks muncul, buzzer langsung berbunyi 2x
        digitalWrite(BUZZER_PIN, HIGH); delay(80);
        digitalWrite(BUZZER_PIN, LOW);  delay(80);
        digitalWrite(BUZZER_PIN, HIGH); delay(80);
        digitalWrite(BUZZER_PIN, LOW);
        
        // Lanjutkan efek kedip teks (memakan waktu ~1.6 detik)
        tampilkanSukses(namaUser);

        // 3. SERVO DELAY (Waktu tunggu orang lewat)
        delay(2000); 

        // 4. SERVO TUTUP KEMBALI
        myServo.attach(SERVO_PIN); 
        myServo.write(60);         
        delay(200);                
        myServo.write(0);         
        myServo.detach();         
        // =======================================================

      } else {
        aksesDitolak(); 
      }
    } else {
      aksesDitolak(); 
    }
    http.end(); 
  } else {
    aksesDitolak();
  }

  tampilkanStandby();
  mfrc522.PICC_HaltA();
}

// ==========================================
// FUNGSI HELPER UNTUK MENGONTROL 2 LCD SEKALIGUS
// ==========================================

void tampilkanPesanLCD(String baris1, String baris2) {
  lcd1.clear();
  lcd1.setCursor(0, 0); lcd1.print(baris1);
  lcd1.setCursor(0, 1); lcd1.print(baris2);

  lcd2.clear();
  lcd2.setCursor(0, 0); lcd2.print(baris1);
  lcd2.setCursor(0, 1); lcd2.print(baris2);
}

void tampilkanStandby() {
  tampilkanPesanLCD("Access Card Required", "    Tap Here    ==>");
}

void tampilkanSukses(String nama) {
  for (int i = 0; i < 4; i++) {
    tampilkanPesanLCD(nama, ""); // Kedip mati baris bawah
    delay(200);
    tampilkanPesanLCD(nama, "Access Granted"); // Kedip nyala baris bawah
    delay(200);
  }
}

void aksesDitolak() {
  for(int i = 0; i < 15; i++){
    digitalWrite(BUZZER_PIN, HIGH);
    delay(50); 
    digitalWrite(BUZZER_PIN, LOW);
    delay(50);
  }

  for (int i = 0; i < 4; i++) {
    tampilkanPesanLCD("", ""); 
    delay(200);
    tampilkanPesanLCD("Access Denied",""); 
    delay(200);
  }
  delay(1000); 
}