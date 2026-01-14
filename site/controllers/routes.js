import "dotenv/config"
import e from 'express';
import { articleViewer } from './reqhandler.js';
import { uploadArticle, updateArticle } from './uploadhandler.js';
import { all, lastest, wallpapers, searchArticles, voteArticle, voteFile, getArticle } from "./api.js";
import { getFromStorage, insertIntoStorage } from "./storage.js";
import errorPage from "../modules/error.js";
import cookieParser from 'cookie-parser'
import { register, login, logout, requireAuth, verifyWorm, registerWorm } from './auth.js'
import path from 'path'
import { __dirname } from "../server.js";
import { me } from './auth.js';

const routes = e.Router()
routes.use(cookieParser())

routes.get("/p/:slug", articleViewer);
// Auth endpoints
routes.post('/api/register', register)
routes.post('/api/login', login)
routes.post('/api/logout', logout)
// Worms can register other worms via this protected endpoint
routes.post('/api/worms', requireAuth, verifyWorm, registerWorm)
routes.get('/api/me', requireAuth, me)
// Article endpoints - specific routes BEFORE parameterized routes
routes.get('/api/articles/latest', lastest);
routes.get('/api/articles/all', all);
routes.get('/api/articles/search', searchArticles);
routes.post("/api/articles", requireAuth, verifyWorm, uploadArticle);
routes.get("/api/articles/:slug", requireAuth, getArticle);
routes.put("/api/articles/:slug", requireAuth, verifyWorm, updateArticle);
// voting: authenticated non-worm users can vote
routes.post('/api/articles/:slug/vote', requireAuth, voteArticle);
routes.post('/api/files/:slug/vote', requireAuth, voteFile);
// File endpoints
routes.post('/api/files', requireAuth, verifyWorm, insertIntoStorage);
routes.get('/api/wallpapers', wallpapers);
routes.get('/f/:f', getFromStorage);

routes.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));

});

routes.get('/u/papers', requireAuth, verifyWorm, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'upload-paper.html'));

});

routes.get('/u/papers/:slug', requireAuth, verifyWorm, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'edit-paper.html'));

});

// Simple UI to upload arbitrary files to storage
routes.get('/u/file', requireAuth, verifyWorm, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'upload-file.html'));

});

routes.get('/p', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'papers-index.html'));

});

routes.get('/a/about-me', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'about.html'))

})

routes.get('/a/wallpapers', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'wallpapers.html'))

})

routes.get('/app/health/cron_health_check', (req, res) => {
    console.log("Req HEAD ping to health check from", req.ip)
    res.setHeader("Success", "yeyeye")
    res.status(200).json({"msg": "hi :3"})
    
})

routes.use((req, res) => {
    res.status(404).send(errorPage(404, "Page not found."));

})

export default routes
