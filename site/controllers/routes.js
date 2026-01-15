import "dotenv/config"
import e from 'express';
import { articleViewer, trickViewer } from './reqhandler.js';
import { uploadArticle, updateArticle } from './uploadhandler.js';
import { createTrick, updateTrick } from './trickhandler.js';
import { all, lastest, wallpapers, searchArticles, voteArticle, voteFile, getArticle, getTricks, searchTricks, getTrick, voteTrick, getReflections, getReflection, createReflection } from "./api.js";
import { getFromStorage, insertIntoStorage, attachTrickBinary } from "./storage.js";
import errorPage from "../modules/error.js";
import cookieParser from 'cookie-parser'
import { register, login, logout, requireAuth, verifyWorm, registerWorm } from './auth.js'
import path from 'path'
import { __dirname } from "../server.js";
import { me } from './auth.js';
import { reflectionViewer } from "./reflectionHandler.js";

const routes = e.Router()
routes.use(cookieParser())

routes.get("/p/:slug", articleViewer);
routes.get("/t/:slug", trickViewer);
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
// Trick endpoints
routes.get('/api/tricks', getTricks);
routes.get('/api/tricks/search', searchTricks);
routes.post("/api/tricks", requireAuth, verifyWorm, createTrick);
routes.get("/api/tricks/:slug", requireAuth, getTrick);
routes.put("/api/tricks/:slug", requireAuth, verifyWorm, updateTrick);
routes.post('/api/tricks/:slug/vote', requireAuth, voteTrick);
routes.post('/api/tricks/:slug/attach', requireAuth, verifyWorm, attachTrickBinary);
// Reflection API
routes.get('/api/reflections', getReflections);
routes.get('/api/reflections/:slug', requireAuth, getReflection);
routes.post('/api/reflections', requireAuth, verifyWorm, createReflection);
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

routes.get('/t', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'tricks-index.html'));

});

routes.get('/r', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'reflections-index.html'));

});

routes.get('/r/:slug', reflectionViewer);

routes.get('/u/reflections', requireAuth, verifyWorm, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'create-reflection.html'));

});

routes.get('/u/tricks', requireAuth, verifyWorm, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'create-trick.html'));

});

routes.get('/u/tricks/:slug', requireAuth, verifyWorm, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'edit-trick.html'));

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
