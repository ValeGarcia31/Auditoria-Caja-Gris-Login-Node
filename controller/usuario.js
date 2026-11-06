const crypto = require("crypto");
const Usuario = require("../models/Usuario");
const Email = require("../models/Email");
const Logger = require("../models/Logger");

async function usuario(req, res) {
    const op = req.query.op;
    if (op === "registrar") {
        const datos = await Usuario.get_usuario_correo(req.body.usu_correo);
        if (datos.length === 0) {
            const creado = await Usuario.registrar_usuario(req.body.usu_nomape, req.body.usu_correo, req.body.usu_pass, "", 2);
            await Email.registrar(creado[0].usu_id);
            Logger.login("REGISTER", req.body.usu_correo, "NEW_ACCOUNT", req.ip);
            return res.send("1");
        }
        Logger.login("REGISTER", req.body.usu_correo, "EMAIL_EXISTS", req.ip);
        return res.send("0");
    }
    if (op === "activar") {
        return Usuario.activar_usuario(req.body.usu_id).then(() => res.send(""));
    }
    if (op === "restablecer") {
        const token = req.body.token || "";
        const pass = req.body.usu_pass || "";
        if (pass.length < 8 || pass.length > 72 || pass !== (req.body.usu_pass_confir || "")) return res.send("2");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const valido = await Usuario.restablecer_recuperacion(tokenHash, pass);
        Logger.login(valido ? "PASSWORD_RESET_DONE" : "PASSWORD_RESET_INVALID_TOKEN", "", valido ? "DONE" : "INVALID_TOKEN", req.ip);
        return res.send(valido ? "1" : "0");
    }
    return res.sendStatus(404);
}

module.exports = usuario;
