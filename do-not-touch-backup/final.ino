#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ESP32Servo.h> 
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

#define SS_PIN 5
#define RST_PIN 4
#define BUZZER_PIN 15
#define SERVO_PIN 13

MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Servo myServo;

// PERBAIKAN: Menggunakan Adafruit_SH1106G dan sintaks instansiasi yang benar
#define i2c_Address 0x3C 
Adafruit_SH1106G display(128, 64, &Wire, -1);

const char* ssid = "ABCD";       
const char* password = "nasigoreng02"; 
String GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXadnCxXmib-NHcWtR7ZEnYGjcOTHkq9MjRL6x0LM-uY9ZoLtjQ8X0zSn_aPeqN6qnlQ/exec"; 

void setup() {
  Serial.begin(115200); 
  SPI.begin();          
  mfrc522.PCD_Init();   
  
  lcd.init();           
  lcd.backlight();      
  
  delay(250); 
  display.begin(i2c_Address, true);
  display.clearDisplay();
  display.display();
  
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); 
  
  myServo.attach(SERVO_PIN);
  myServo.write(0); 
  
  lcd.setCursor(0, 0);
  lcd.print("Menyambung WiFi");
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(15, 28);
  display.print("Menyambung WiFi...");
  display.display();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Terhubung!");
  delay(1500);

  tampilkanStandby();
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String content = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
     content.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " "));
     content.concat(String(mfrc522.uid.uidByte[i], HEX));
  }
  content.toUpperCase();
  String currentUID = content.substring(1); 

  tampilkanLoadingAnimasiCepat();

  if (WiFi.status() == WL_CONNECTED) {
    String uidEncoded = currentUID;
    uidEncoded.replace(" ", "%20"); 
    
    WiFiClientSecure client;
    client.setInsecure(); 
    
    HTTPClient http;
    String urlAkhir = GOOGLE_SCRIPT_URL + "?uid=" + uidEncoded;
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS); 
    http.begin(client, urlAkhir); 
    
    int httpCode = http.GET();
    
    if (httpCode > 0) { 
      String payload = http.getString(); 
      
      if (payload.indexOf("Sukses") >= 0) {
        String namaUser = "User";
        int firstComma = payload.indexOf(',');
        int secondComma = payload.indexOf(',', firstComma + 1);
        if (secondComma > 0) {
          namaUser = payload.substring(secondComma + 1);
        }
        
        // Buzzer duluan agar respons instan
        digitalWrite(BUZZER_PIN, HIGH); delay(80);
        digitalWrite(BUZZER_PIN, LOW);  delay(80);
        digitalWrite(BUZZER_PIN, HIGH); delay(80);
        digitalWrite(BUZZER_PIN, LOW);

        myServo.write(90); 
        tampilkanSukses(namaUser);
        
        delay(7000); // Durasi pintu terbuka selama 7 detik
        myServo.write(0);  

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

void tampilkanStandby() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("silahkan tap");
  lcd.setCursor(0, 1);
  lcd.print("kartu akses");

  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(12, 10);
  display.print("SILAHKAN");
  display.setCursor(8, 35);
  display.print("TAP KARTU");
  display.display();
}

void tampilkanLoadingAnimasiCepat() {
  for (int i = 0; i < 2; i++) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Please wait");
    lcd.setCursor(0, 1);
    lcd.print(". . . .    ");
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(30, 50);
    display.print("Please wait...");
    display.drawCircle(64, 25, 15, SH110X_WHITE);
    display.display();
    delay(100);

    lcd.setCursor(0, 1);
    lcd.print("   . . . . ");
    display.drawCircle(64, 25, 20, SH110X_WHITE);
    display.display();
    delay(100);
  }
}

void tampilkanSukses(String nama) {
  display.clearDisplay();
  for(int j=-1; j<=1; j++) {
    display.drawLine(40, 35+j, 55, 50+j, SH110X_WHITE);
    display.drawLine(55, 50+j, 90, 15+j, SH110X_WHITE);
  }
  display.setTextSize(1);
  display.setCursor(20, 55);
  display.print("SUCCESS ACCESS");
  display.display();

  for (int i = 0; i < 3; i++) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(nama);
    delay(200);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(nama);
    lcd.setCursor(0, 1);
    lcd.print("Access Granted"); 
    delay(200);
  }
}

void aksesDitolak() {
  for(int i = 0; i < 5; i++){
    digitalWrite(BUZZER_PIN, HIGH);
    delay(50); 
    digitalWrite(BUZZER_PIN, LOW);
    delay(50);
  }

  display.clearDisplay();
  for(int j=-1; j<=1; j++) {
    display.drawLine(45, 15+j, 85, 45+j, SH110X_WHITE);
    display.drawLine(85, 15+j, 45, 45+j, SH110X_WHITE);
  }
  display.setTextSize(1);
  display.setCursor(25, 55);
  display.print("ACCESS DENIED");
  display.display();
  
  for (int i = 0; i < 3; i++) {
    lcd.clear();
    delay(200);
    
    lcd.clear();
    lcd.setCursor(0, 1);
    lcd.print("Access Denied");
    delay(200);
  }
  delay(1000); 
}