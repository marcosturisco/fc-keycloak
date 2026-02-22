import express from "express";
import session from "express-session";

/* ================================
   🔥 NOVO: Imports necessários para ESM
================================ */
import { fileURLToPath } from "url";      // 🔥 NOVO
import { dirname } from "path";           // 🔥 NOVO
import path from "path";                  // 🔥 NOVO

/* ================================
   🔥 NOVO: Simulação do __dirname no ESM
================================ */
const __filename = fileURLToPath(import.meta.url); // 🔥 NOVO
const __dirname = dirname(__filename);             // 🔥 NOVO

const app = express();
app.use(express.urlencoded({ extended: true }));

const memoryStore = new session.MemoryStore();

app.use(
  session({
    secret: "my-secret",
    resave: false,
    saveUninitialized: false,
    store: memoryStore,
  })
);

const middlewareIsAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  //@ts-expect-error - type mismatch
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

app.get("/login", (req, res) => {
  //@ts-expect-error - type mismatch
  if (req.session.user) {
    return res.redirect("/admin");
  }

  /* ================================
     🔥 ALTERADO: uso correto do path.join
  ================================= */
  res.sendFile(path.join(__dirname, "login.html")); // 🔥 ALTERADO
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const response = await fetch(
    "http://host.docker.internal:8080/realms/fullcycle-realm/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: "fullcycle-client",
        grant_type: "password",
        username,
        password,
        scope: "openid",
      }).toString(),
    }
  );

  const result = await response.json();
  console.log(result);

  //@ts-expect-error - type mismatch
  req.session.user = result;
  req.session.save();

  res.redirect("/admin");
});

app.get("/logout", async (req, res) => {
  await fetch(
    "http://host.docker.internal:8080/realms/fullcycle-realm/protocol/openid-connect/revoke",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: "fullcycle-client",
        //@ts-expect-error
        token: req.session.user.refresh_token,
      }).toString(),
    }
  );

  req.session.destroy((err) => {
    console.error(err);
  });

  res.redirect("/login");
});

app.get("/admin", middlewareIsAuth, (req, res) => {
  //@ts-expect-error - type mismatch
  res.json(req.session.user);
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});