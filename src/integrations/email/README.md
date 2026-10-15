# Email Integration
Use `createEmailClient()` and `send({to,subject,text,html})`. Install `nodemailer` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `SMTP_SECURE`, and `EMAIL_FROM`. Render trusted templates with HTML autoescaping; never inject user-supplied HTML or unvalidated URLs. Keep authentication responses generic to avoid account enumeration.
