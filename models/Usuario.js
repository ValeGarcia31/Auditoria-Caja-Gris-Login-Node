const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const Logger = require("./Logger");

async function login(correo, pass, req, res) {
    if (correo === "" || pass === "") {
        Logger.login("LOGIN_FAILED", correo, "EMPTY_FIELDS", req.ip);
        return res.redirect("/login?m=2");
    }

    const resultado = (await db.query(
        `SELECT * FROM tm_usuario WHERE usu_correo = '${correo}' AND fech_elim IS NULL`
    )).rows[0];

    if (!resultado) {
        Logger.login("LOGIN_FAILED", correo, "USER_NOT_FOUND", req.ip);
        return res.redirect("/login?m=1");
    }

    const passValido = await bcrypt.compare(pass, String(resultado.usu_pass));
    if (!passValido) {
        Logger.login("LOGIN_FAILED", correo, "BAD_PASSWORD", req.ip);
        return res.redirect("/login?m=1");
    }

    if (resultado.est !== 1) {
        Logger.login("LOGIN_NOT_CONFIRMED", correo, "NOT_CONFIRMED", req.ip);
        return res.redirect("/login?m=4");
    }

    req.session.usu_id = resultado.usu_id;
    req.session.usu_nomape = resultado.usu_nomape;
    req.session.usu_correo = resultado.usu_correo;
    Logger.login("LOGIN_SUCCESS", correo, "", req.ip);
    return res.redirect("/home");
}

async function get_usuario_correo(correo) {
    return (await db.query(`SELECT * FROM tm_usuario WHERE usu_correo = '${correo}'`)).rows;
}

async function registrar_usuario(nombre, correo, pass, imagen, estado) {
    const hash = await bcrypt.hash(pass, 10);
    const result = await db.query(
        `INSERT INTO tm_usuario (usu_nomape, usu_correo, usu_pass, usu_img, est) VALUES ('${nombre}', '${correo}', '${hash}', '${imagen}', ${estado}) RETURNING usu_id`
    );
    return result.rows;
}

async function activar_usuario(id) {
    const encrypted = Buffer.from(String(id).replace(/ /g, "+"), "base64");
    const key = Buffer.alloc(32);
    key.write(db.config.crypto_key);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, encrypted.subarray(0, 16));
    const userId = Buffer.concat([decipher.update(encrypted.subarray(16)), decipher.final()]).toString("utf8");
    return db.query(`UPDATE tm_usuario SET est = 1, fech_acti = CURRENT_TIMESTAMP WHERE usu_id = '${userId}'`);
}

async function get_usuario_recuperacion(correo) {
    return (await db.query(
        `SELECT usu_id, usu_correo FROM tm_usuario WHERE usu_correo = '${correo}' AND est = 1 AND fech_elim IS NULL`
    )).rows[0];
}

async function get_recuperacion_valida(tokenHash) {
    return (await db.query(
        `SELECT * FROM tm_recuperacion WHERE token_hash = '${tokenHash}' AND usado = 0 AND expira > CURRENT_TIMESTAMP`
    )).rows[0];
}

async function crear_recuperacion(userId, tokenHash) {
    return db.query(
        `INSERT INTO tm_recuperacion (usu_id, token_hash, expira) VALUES ('${userId}', '${tokenHash}', CURRENT_TIMESTAMP + INTERVAL '30 minutes')`
    );
}

async function restablecer_recuperacion(tokenHash, pass) {
    const recuperacion = await get_recuperacion_valida(tokenHash);
    if (!recuperacion) return false;
    const hash = await bcrypt.hash(pass, 10);
    await db.query(`UPDATE tm_usuario SET usu_pass = '${hash}' WHERE usu_id = '${recuperacion.usu_id}'`);
    await db.query(`UPDATE tm_recuperacion SET usado = 1 WHERE rec_id = '${recuperacion.rec_id}'`);
    return true;
}

async function recuperacion_en_limite(userId) {
    const result = await db.query(
        `SELECT COUNT(*)::int AS total FROM tm_recuperacion WHERE usu_id = '${userId}' AND fech_crea > CURRENT_TIMESTAMP - INTERVAL '10 minutes'`
    );
    return result.rows[0].total >= 5;
}

async function cancelar_recuperacion(tokenHash) {
    return db.query(`UPDATE tm_recuperacion SET usado = 1 WHERE token_hash = '${tokenHash}'`);
}

module.exports = {
    login,
    get_usuario_correo,
    registrar_usuario,
    activar_usuario,
    get_usuario_recuperacion,
    get_recuperacion_valida,
    crear_recuperacion,
    restablecer_recuperacion,
    recuperacion_en_limite,
    cancelar_recuperacion,
    randomToken: () => crypto.randomBytes(32).toString("hex")
};
