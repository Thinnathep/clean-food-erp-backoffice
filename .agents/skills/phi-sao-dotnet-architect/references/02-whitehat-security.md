# 🛡️ 02: แฮกเกอร์สายขาว & มาตรฐานความปลอดภัย (White-Hat Defensive Security)

คู่มือการป้องกันช่องโหว่และการตรวจสอบความปลอดภัยเชิงลึกสำหรับ .NET Core Web API

---

## 1. OWASP Top 10 Defense Checklist สำหรับ .NET

```
[+] 1. Injection (SQLi)        ➔ บังคับใช้ EF Core LINQ Parameterized Query 100%
[+] 2. Broken Authentication  ➔ ใช้ ASP.NET Identity + JWT (HMAC-SHA256) + ClockSkew = 0
[+] 3. Sensitive Data Leak     ➔ ปิด DeveloperExceptionPage ใน Prod, ใช้ Azure Key Vault
[+] 4. Broken Access Control   ➔ เช็คความเป็นเจ้าของข้อมูล (UserId == currentUserId) ทุก Endpoint
[+] 5. Security Misconfig      ➔ บังคับ HTTPS, HSTS, และปิด CORS Wildcard (*)
[+] 6. Rate Limiting / DoS     ➔ ใช้ AddRateLimiter() ป้องกันการยิงรัวโจมตี API
```

---

## 2. โค้ดแม่แบบความปลอดภัย (Production-Grade Security Snippets)

### 🔹 การตั้งค่า Rate Limiting ใน `Program.cs` (ป้องกันการยิงถล่ม)
```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("FixedPolicy", opt =>
    {
        opt.Window = TimeSpan.FromSeconds(60);
        opt.PermitLimit = 100; // อนุญาตให้ยิงได้ 100 ครั้งต่อนาที
        opt.QueueLimit = 10;
    });
});
```

### 🔹 การจัดการ JWT Token แบบปลอดภัย
```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ValidateIssuer = true,
            ValidateAudience = true,
            ClockSkew = TimeSpan.Zero // หมดเวลาปุ๊บ ตัดทันที ไม่มีเวลาแถม
        };
    });
```

---

## 3. Threat Modeling (การวิเคราะห์ความเสี่ยงก่อน Deploy)
1. **อะไรที่รับมาจาก Client ถือว่าเป็นพิษเสมอ:** ต้องผ่าน Model Validation (`[Required]`, `[Range]`, `[StringLength]`)
2. **ห้ามเก็บ Password ในรูปแบบ Plaintext:** ใช้ PBKDF2/Argon2 ที่มี Salt เสมอ
3. **Audit Log:** บันทึก Timestamp, UserId, Action, IP Address ของทุกการเปลี่ยนแปลงสำคัญในระบบ
