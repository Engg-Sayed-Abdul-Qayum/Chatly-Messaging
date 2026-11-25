import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'

const app=express()
const httpServer=createServer(app)
const origin=process.env.CLIENT_ORIGIN||'http://localhost:5173'
const io=new Server(httpServer,{cors:{origin,methods:['GET','POST']},maxHttpBufferSize:10e6})
app.use(cors({origin}))
app.use(express.json({limit:'2mb'}))
const uploadDir=path.resolve('uploads')
fs.mkdirSync(uploadDir,{recursive:true})
app.use('/uploads',express.static(uploadDir))
app.use(express.static(path.resolve('client/dist')))
app.get('*',(req,res,next)=>{if(req.path==='/health'||req.path.startsWith('/api')||req.path.startsWith('/socket.io'))return next();res.sendFile(path.resolve('client/dist/index.html'),err=>{if(err)next()})})
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,uploadDir),filename:(_,file,cb)=>cb(null,`${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g,'')}`)})
const upload=multer({storage,limits:{fileSize:25*1024*1024},fileFilter:(_,file,cb)=>{const ok=/^(image|audio|video)\//.test(file.mimetype);cb(ok?null:new Error('Only image, audio and video files are allowed'),ok)}})
const online=new Map()
const history=[]
// VERSION 3/5 — Shared story and reaction support (in-memory demo).
const stories=new Map()
app.get('/health',(_,res)=>res.json({status:'ok',service:'chatflow-api',onlineUsers:online.size,release:process.env.APP_VERSION||'1.0.0'}))
app.post('/upload',upload.single('file'),(req,res)=>{if(!req.file)return res.status(400).json({error:'No file received'});res.json({url:`${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,name:req.file.originalname,size:req.file.size})})
io.on('connection',socket=>{
 socket.on('user:join',id=>{if(!id)return;socket.data.userId=id;online.set(id,socket.id);socket.join(id);socket.emit('story:list',[...stories.values()]);io.emit('presence',{id,online:true})})
 socket.on('message:send',message=>{
   if(!message?.from||!message?.to||!message?.id)return
   const safe={...message,time:message.time||new Date().toLocaleTimeString()}
   history.push(safe)
   io.to(message.to).emit('message:new',safe)
 })
 socket.on('story:publish',item=>{if(!socket.data.userId||!item?.id)return;const story={...item,user:socket.data.userId,reactions:{}};stories.set(story.id,story);io.emit('story:update',story)})
 socket.on('story:react',({id,emoji}={})=>{const story=stories.get(id),user=socket.data.userId;if(!story||!user||story.user===user||!['❤️','😂','😍','🔥','👏','😮'].includes(emoji))return;story.reactions[user]=emoji;io.emit('story:update',story)})
 socket.on('disconnect',()=>{const id=socket.data.userId;if(id){online.delete(id);io.emit('presence',{id,online:false})}})
})
app.use((err,_,res,next)=>{console.error(err.message);if(res.headersSent)return next(err);res.status(400).json({error:err.message||'Request failed'})})
const port=process.env.PORT||4000
httpServer.listen(port,'0.0.0.0',()=>console.log(`ChatFlow API listening on :${port}`))
