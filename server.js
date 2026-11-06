const path = require("path");
const express = require("express");
const ejs = require("ejs");
const session = require("express-session");
const Usuario = require("./models/Usuario");
const db = require("./config/database");
const usuarioController = require("./controller/usuario");
const emailController = require("./controller/email");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));
app.engine("ejs", (filePath, options, callback) => {
    ejs.renderFile(filePath, options, { encoding: "utf8" }, callback);
});
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
    secret: db.config.crypto_key,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" }
}));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/view", express.static(path.join(__dirname, "view")));
app.use((req, res, next) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    next();
});

app.get(["/", "/login"], (req, res) => res.render("login", { message: req.query.m }));
app.post(["/", "/login"], async (req, res) => Usuario.login(req.body.usu_correo, req.body.usu_pass, req, res));
app.get(["/register", "/view/registro/"], (req, res) => res.render("registro/index"));
app.get(["/recuperar", "/view/recuperar/"], (req, res) => res.render("recuperar/index"));
app.get(["/restablecer", "/view/restablecer/"], async (req, res) => {
    const token = String(req.query.token || "");
    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    const recuperacionValida = token.length === 64 && /^[a-f0-9]+$/i.test(token) && Boolean(await Usuario.get_recuperacion_valida(tokenHash));
    res.render("restablecer/index", { token, recuperacionValida });
});
app.get(["/confirmar", "/view/confirmar/"], (req, res) => res.render("confirmar/index"));
app.get(["/home", "/view/home/"], (req, res) => {
    if (!req.session.usu_id) return res.redirect("/login");
    res.render("home/index", { nombre: req.session.usu_nomape });
});
app.get(["/logout", "/view/logout/"], (req, res) => req.session.destroy(() => res.redirect("/login")));
app.post("/controller/usuario.php", usuarioController);
app.post("/controller/email.php", emailController);
app.post("/controller/usuario", usuarioController);
app.post("/controller/email", emailController);

app.listen(process.env.PORT || 3000, () => console.log("Servidor iniciado en el puerto 3000"));
