const Email = require("../models/Email");
const Logger = require("../models/Logger");

async function email(req, res) {
    if (req.query.op === "recuperar") {
        const resultado = await Email.recuperar(req.body.usu_correo);
        Logger.login("PASSWORD_RESET_REQUESTED", req.body.usu_correo, resultado, req.ip);
        return res.send("1");
    }
    return res.sendStatus(404);
}

module.exports = email;
