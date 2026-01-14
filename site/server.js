import e from "express";
import cors from 'cors';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
if (!(fs.existsSync(path.join(__dirname, "_db")))) {
    fs.mkdirSync(path.join(__dirname, "_db"))
    
}

const app = e()
app.use(cors());
app.use(e.json());
app.use('/', e.static(path.join(__dirname, 'public')));

// Serve a small JS payload with site configuration derived from ENV (fallback domain etc.)
app.get('/js/site_config.js', (req, res) => {
    const fallback = process.env.FALLBACK_DOMAIN || 'howosec';
    res.type('application/javascript').send(`window.SITE_CONFIG = ${JSON.stringify({ fallbackDomain: fallback })};`);
});

import routes from "./controllers/routes.js";
import { initDb } from "./controllers/db.js";
import errorPage from "./modules/error.js";

// Ensure DB is initialized before registering routes and starting the server
(async () => {
    await initDb();
    app.use(routes);

    app.listen("9999", () => {
        console.log("LISTENING IN PORT 9999: http://0.0.0.0:9999")
    });
})();
