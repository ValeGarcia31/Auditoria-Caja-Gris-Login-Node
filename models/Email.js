const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Usuario = require("./Usuario");
const { config } = require("../config/database");

function transporter() {
    if (config.mail_transport === "smtp") {
        return nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure !== "",
            auth: config.smtp_auth ? { user: config.smtp_user, pass: config.smtp_pass } : undefined
        });
    }
    return nodemailer.createTransport({ sendmail: true });
}

async function enviar(to, subject, html, text) {
    return transporter().sendMail({
        from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
        to,
        subject,
        html,
        text
    });
}

async function registrar(userId) {
    const usuario = (await require("../config/database").query(
        `SELECT * FROM tm_usuario WHERE usu_id = '${userId}'`
    )).rows[0];
    const iv = crypto.randomBytes(16);
    const key = Buffer.alloc(32);
    key.write(config.crypto_key);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const token = Buffer.concat([iv, cipher.update(String(userId)), cipher.final()]).toString("base64");
    const html = fs.readFileSync(path.join(__dirname, "../assets/email/registrar.html"), "utf8")
        .replace("xlinkcorreourl", `${config.base_url}confirmar?id=${encodeURIComponent(token)}`);
    return enviar(usuario.usu_correo, "Seguridad Informática I", html, "Confirmar Registro");
}

async function recuperar(correo) {
    const usuario = await Usuario.get_usuario_recuperacion(correo);
    if (!usuario || await Usuario.recuperacion_en_limite(usuario.usu_id)) return "NOT_FOUND_OR_INACTIVE";
    const token = Usuario.randomToken();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await Usuario.crear_recuperacion(usuario.usu_id, tokenHash);
    const html = fs.readFileSync(path.join(__dirname, "../assets/email/recuperar.html"), "utf8")
        .replace("xlinkrestablecer", `${config.base_url}restablecer?token=${token}`);
    try {
        await enviar(usuario.usu_correo, "Seguridad Informática I", html, "Restablece tu contraseña");
        return "SENT";
    } catch (error) {
        await Usuario.cancelar_recuperacion(tokenHash);
        console.error("Error al enviar correo de recuperación:", error.message);
        return "MAIL_ERROR";
    }
}

module.exports = { registrar, recuperar };
