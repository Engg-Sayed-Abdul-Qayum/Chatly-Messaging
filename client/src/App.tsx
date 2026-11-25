import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { MessageCircle, Search, Plus, Send, Paperclip, Mic, Image, Video, Phone, Video as VideoIcon, MoreVertical, Smile, CheckCheck, Users, CircleDot, Settings, X, PhoneOff, MicOff, Volume2, Camera, ArrowLeft, LogOut, Play, FileAudio, Sparkles } from 'lucide-react'

type Contact = { id:string; name:string; color:string; online?:boolean; lastSeen?:string }
type Message = { id:string; from:string; to:string; text?:string; type:'text'|'image'|'audio'|'video'; fileUrl?:string; fileName?:string; time:string }
type Status = { id:string; user:string; text:string; color:string; time:string; imageUrl?:string; reactions?:Record<string,string> }
const API = import.meta.env.VITE_API_URL || (location.port === '5173' ? 'http://localhost:4000' : location.origin)
// VERSION 1 — Text chat, emojis and contact management (active).
const releases: number[] = [1]
// VERSION 2 — Image, audio and video messaging. Uncomment next line.
// releases.push(2)
// VERSION 3 — Create and view stories. Uncomment next line.
// releases.push(3)
// VERSION 4 — Simulated voice/video calls. Uncomment next line.
// releases.push(4)
// VERSION 5 — Story reactions. Uncomment next line.
// releases.push(5)
// VERSION 6 — Light and neon gaming dark themes. Uncomment next line.
// releases.push(6)
const VERSION = Math.max(...releases)
const FEATURES = {media:releases.includes(2),status:releases.includes(3),calls:releases.includes(4),reactions:releases.includes(5),theme:releases.includes(6)}
const initial:Contact[] = [
 {id:'maya',name:'Maya Patel',color:'#d98d72',online:true},{id:'arjun',name:'Arjun Rao',color:'#719b91',online:true},
 {id:'sara',name:'Sara Khan',color:'#9b83bd',online:false,lastSeen:'last seen recently'},{id:'daniel',name:'Daniel Kim',color:'#c49b5d',online:true},
 {id:'riya',name:'Riya Sharma',color:'#c77b9b',online:false,lastSeen:'last seen today'}
]
const stamp=()=>new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
const initials=(s:string)=>s.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()

export default function App(){
 const [me,setMe]=useState(localStorage.getItem('chatflow-me')||'You')
 const [contacts,setContacts]=useState<Contact[]>(()=>JSON.parse(localStorage.getItem('chatflow-contacts')||'null')||initial)
 const [active,setActive]=useState('maya')
 const [messages,setMessages]=useState<Message[]>(()=>JSON.parse(localStorage.getItem('chatterly-messages')||'[]'))
 const [emojiOpen,setEmojiOpen]=useState(false)
 const [editing,setEditing]=useState<string|null>(null)
 const [dark,setDark]=useState(localStorage.getItem('chatterly-theme')==='dark')
 const [statusImage,setStatusImage]=useState<File|null>(null)
 const [draft,setDraft]=useState('')
 const [query,setQuery]=useState('')
 const [tab,setTab]=useState<'chats'|'status'>('chats')
 const [showAdd,setShowAdd]=useState(false)
 const [newName,setNewName]=useState('')
 const [newId,setNewId]=useState('')
 const [socketState,setSocketState]=useState('connecting')
 const [statuses,setStatuses]=useState<Status[]>(()=>JSON.parse(localStorage.getItem('chatterly-stories')||'null')||[{id:'s1',user:'Maya Patel',text:'A little progress every day ✨',color:'#426b61',time:'10:20 AM'},{id:'s2',user:'Arjun Rao',text:'Weekend mode: ON 🌴',color:'#715d8d',time:'09:45 AM'}])
 const [statusText,setStatusText]=useState('')
 const [call,setCall]=useState<'voice'|'video'|null>(null)
 const [muted,setMuted]=useState(false),[speaker,setSpeaker]=useState(false),[camera,setCamera]=useState(true)
 const [viewStatus,setViewStatus]=useState<Status|null>(null)
 const [mobileChat,setMobileChat]=useState(false)
 const [notice,setNotice]=useState('')
 const socket=useRef<Socket|null>(null)
 const fileRef=useRef<HTMLInputElement>(null)
 const activeContact=contacts.find(c=>c.id===active)
 useEffect(()=>{localStorage.setItem('chatterly-messages',JSON.stringify(messages))},[messages])
 useEffect(()=>{localStorage.setItem('chatterly-stories',JSON.stringify(statuses))},[statuses])
 useEffect(()=>{localStorage.setItem('chatterly-theme',dark?'dark':'light')},[dark])
 useEffect(()=>{localStorage.setItem('chatflow-contacts',JSON.stringify(contacts))},[contacts])
 useEffect(()=>{localStorage.setItem('chatflow-me',me)},[me])
 useEffect(()=>{
   const s=io(API,{transports:['websocket','polling']});socket.current=s
   s.on('connect',()=>{setSocketState('online');s.emit('user:join',me)});s.on('disconnect',()=>setSocketState('offline'))
   s.on('message:new',(m:Message)=>setMessages(old=>old.some(x=>x.id===m.id)?old:[...old,m]))
   s.on('story:list',(items:Status[])=>setStatuses(old=>[...items,...old.filter(x=>x.id.startsWith('s')&&!items.some(y=>y.id===x.id))]))
   s.on('story:update',(item:Status)=>{setStatuses(old=>[item,...old.filter(x=>x.id!==item.id)]);setViewStatus(old=>old?.id===item.id?item:old)})
   s.on('presence',(p:{id:string;online:boolean})=>setContacts(old=>old.map(c=>c.id===p.id?{...c,online:p.online}:c)))
   return ()=>{s.disconnect()}
 },[me])
 const visible=useMemo(()=>contacts.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())),[contacts,query])
 const thread=messages.filter(m=>(m.from===me&&m.to===active)||(m.from===active&&m.to===me))
 const send=(text:string,type:'text'|'image'|'audio'|'video'='text',fileUrl?:string,fileName?:string)=>{
   if(!activeContact){setNotice('Select a contact first');return}
   if(!text.trim()&&type==='text')return
   const m:Message={id:(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)),from:me,to:active,text,type,fileUrl,fileName,time:stamp()}
   socket.current?.emit('message:send',m);setMessages(old=>[...old,m]);setDraft('')
 }
 // VERSION 1 — Contact CRUD and emoji picker.
 const addContact=()=>{const id=newId.trim(),name=newName.trim();if(!id||!name){setNotice('Enter a name and user ID');return}if(contacts.some(c=>c.id===id&&c.id!==editing)){setNotice('That ID already exists');return}setContacts(old=>editing?old.map(c=>c.id===editing?{...c,id,name}:c):[...old,{id,name,color:'#168b70',online:false}]);setActive(id);setEditing(null);setNewName('');setNewId('');setShowAdd(false)}
 const editContact=(c:Contact)=>{setEditing(c.id);setNewName(c.name);setNewId(c.id);setShowAdd(true)}
 const removeContact=(c:Contact)=>{if(!confirm('Remove '+c.name+'?'))return;setContacts(old=>old.filter(x=>x.id!==c.id));if(active===c.id)setActive(contacts.find(x=>x.id!==c.id)?.id||'')}
 // VERSION 2 — Media upload implementation.
 const upload=async(file:File,type:'image'|'audio'|'video')=>{
   const form=new FormData();form.append('file',file)
   try{const r=await fetch(`${API}/upload`,{method:'POST',body:form});if(!r.ok)throw new Error('upload failed');const data=await r.json();send('',type,data.url,file.name)}
   catch{setNotice('Upload failed. Check that the API server is running.')}
 }
 // VERSION 3 — Publish text or photo stories.
 const publishStatus=async()=>{if(!statusText.trim()&&!statusImage)return;let imageUrl:string|undefined;if(statusImage){try{const form=new FormData();form.append('file',statusImage);const res=await fetch(`${API}/upload`,{method:'POST',body:form});if(!res.ok)throw Error();imageUrl=(await res.json()).url}catch{setNotice('Photo upload failed');return}}const item:Status={id:Date.now().toString(36)+Math.random().toString(36).slice(2),user:me,text:statusText,color:'#087f65',time:stamp(),imageUrl,reactions:{}};setStatuses(old=>[item,...old]);socket.current?.emit('story:publish',item);setStatusText('');setStatusImage(null);setNotice('Story published')}
 // VERSION 4 — Call simulation.
 const startCall=(kind:'voice'|'video')=>{setMuted(false);setSpeaker(false);setCamera(true);setCall(kind)}
 // VERSION 5 — Story reactions.
 const react=(emoji:string)=>{if(!viewStatus||viewStatus.user===me)return;const item={...viewStatus,reactions:{...viewStatus.reactions,[me]:emoji}};setViewStatus(item);setStatuses(old=>old.map(x=>x.id===item.id?item:x));socket.current?.emit('story:react',{id:item.id,emoji});setNotice('Reaction sent '+emoji)}
 const filteredStatuses=statuses
 return <div className={`app-shell ${FEATURES.theme&&dark?'gaming-dark':'light'}`}>
   <aside className={`sidebar ${mobileChat?'hide-mobile':''}`}>
     <div className="side-top"><div className="brand"><div className="brand-mark"><MessageCircle size={21}/></div><div><b>Chatterly</b><small>MESSAGING PLATFORM</small></div></div><button className="icon-btn"><MoreVertical size={19}/></button></div>
     <div className="profile-strip"><div className="avatar self">{initials(me)}</div><div className="profile-info"><b>{me}</b><span><i className="online-dot"/> Available</span></div><button className="icon-btn" title="Set your user ID" onClick={()=>{const n=prompt("Choose your Chatterly user ID",me);if(n?.trim())setMe(n.trim())}}><Settings size={17}/></button></div>
     <div className="tabs"><button className={tab==='chats'?'selected':''} onClick={()=>{setTab('chats');setMobileChat(false)}}><MessageCircle size={16}/> Chats</button><button className={tab==='status'?'selected':''} onClick={()=>{setTab('status');setMobileChat(false)}}><CircleDot size={16}/> Status {FEATURES.status?'':'·'}</button></div>
     {tab==='chats'?<><div className="section-heading"><span>MESSAGES <small>{contacts.length}</small></span><button className="add-btn" title="Add contact" onClick={()=>{setEditing(null);setNewName('');setNewId('');setShowAdd(true)}}><Plus size={17}/></button></div><div className="searchbox"><Search size={16}/><input placeholder="Search conversations" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="contact-list">{visible.map(c=><div role="button" tabIndex={0} key={c.id} className={`contact-row ${active===c.id?'active':''}`} onClick={()=>{setActive(c.id);setMobileChat(true)}}><div className="avatar" style={{background:c.color}}>{initials(c.name)}{c.online&&<i className="avatar-online"/>}</div><div className="contact-meta"><div className="contact-line"><b>{c.name}</b><time> {messages.filter(m=>m.from===c.id||m.to===c.id).at(-1)?.time||''}</time></div><p>{messages.filter(m=>(m.from===c.id&&m.to===me)||(m.from===me&&m.to===c.id)).at(-1)?.text|| (c.online?'Online now':c.lastSeen||'Tap to start chatting')}</p></div><button className="contact-action" title="Edit contact" onClick={e=>{e.stopPropagation();editContact(c)}}>✎</button><button className="contact-action" title="Remove contact" onClick={e=>{e.stopPropagation();removeContact(c)}}>×</button></div>)}</div></>:<div className="status-panel"><div className="section-heading"><span>RECENT UPDATES</span></div>{FEATURES.status?<><div className="my-status" onClick={()=>{const mine=statuses.find(x=>x.user===me);if(mine)setViewStatus(mine);else document.getElementById('story-input')?.focus()}}><div className="status-ring"><div className="avatar self">{initials(me)}</div></div><div><b>My status</b><p>Tap to add an update</p></div></div><div className="status-compose"><input id="story-input" value={statusText} onChange={e=>setStatusText(e.target.value)} placeholder="Share a text update..."/><button onClick={publishStatus}>Post</button></div><div className="story-upload"><label>📷 Add photo <input type="file" accept="image/*" onChange={e=>setStatusImage(e.target.files?.[0]||null)}/></label></div>{filteredStatuses.map(s=><button className="status-row" key={s.id} onClick={()=>setViewStatus(s)}><div className="status-ring"><div className="avatar" style={{background:s.color}}>{initials(s.user)}</div></div><div><b>{s.user===me?'My status':s.user}</b><p>{s.time} · {Object.keys(s.reactions||{}).length} reactions</p></div></button>)}</>:<div className="locked"><Sparkles size={24}/><b>Status arrives in v3.0</b><p>Upgrade the release to unlock stories and status updates.</p></div>}</div>}
     <div className="sidebar-bottom">{/* VERSION 6 — Appearance control */}{FEATURES.theme&&<button className="theme-toggle" onClick={()=>setDark(v=>!v)}>{dark?'☀ Light mode':'☾ Gaming dark mode'}</button>}<div className="server-indicator"><i className={socketState==='online'?'online-dot':'offline-dot'}/><span>Server {socketState}</span><span className="push-right">v{VERSION}.0</span></div><div className="release-pill">CHATTERLY RELEASE <b>{VERSION}.0.0</b></div></div>
   </aside>
   <main className={`chat-area ${!mobileChat?'hide-mobile':''}`}>
     <header className="chat-header"><button className="back-btn" onClick={()=>setMobileChat(false)}><ArrowLeft/></button><div className="avatar" style={{background:activeContact?.color}}>{activeContact?initials(activeContact.name):'?'}</div><div className="header-person"><b>{activeContact?.name||'Choose a contact'}</b><span>{activeContact?.online?'online':activeContact?.lastSeen||'offline'}</span></div><div className="header-actions">{FEATURES.calls&&<><button className="icon-btn" title="Voice call" onClick={()=>startCall('voice')}><Phone size={18}/></button><button className="icon-btn" title="Video call" onClick={()=>startCall('video')}><VideoIcon size={19}/></button></>}<button className="icon-btn"><Search size={18}/></button><button className="icon-btn"><MoreVertical size={19}/></button></div></header>
     <div className="chat-scroll"><div className="day-chip">TODAY</div>{thread.length===0?<div className="empty-chat"><div className="empty-art"><MessageCircle size={38}/></div><h2>Start a conversation</h2><p>Say hello to {activeContact?.name}. Your messages will appear here.</p><span className="encryption-note">🔒 Messages are sent through your Chatterly server</span></div>:thread.map(m=><div key={m.id} className={`message-row ${m.from===me?'mine':''}`}><div className="bubble">{m.type==='text'?<p>{m.text}</p>:m.type==='image'?<><img className="media-preview" src={m.fileUrl} alt={m.fileName}/><small>{m.fileName}</small></>:m.type==='video'?<video className="media-preview" src={m.fileUrl} controls/>:<audio src={m.fileUrl} controls/>}<div className="bubble-meta"><time>{m.time}</time>{m.from===me&&<CheckCheck size={14} className="read-check"/>}</div></div></div>)}</div>
     <div className="composer-wrap"><div className="composer">{FEATURES.media&&<><button className="icon-btn" title="Attach image, audio or video" onClick={()=>fileRef.current?.click()}><Paperclip size={19}/></button><input ref={fileRef} hidden type="file" accept="image/*,audio/*,video/*" onChange={e=>{const f=e.target.files?.[0];if(f){const t=f.type.startsWith('image/')?'image':f.type.startsWith('audio/')?'audio':'video';upload(f,t)}e.currentTarget.value=''}}/></>}<div className="emoji-wrap"><button className="icon-btn emoji-btn" title="Emoji picker" onClick={()=>setEmojiOpen(v=>!v)}><Smile size={19}/></button>{emojiOpen&&<div className="emoji-picker">{Array.from('😀😃😂🤣😊😍🥰😎🤔😭🥳👍👏🙏🔥✨🎉💯💚💙🚀🎮').map(e=><button key={e} onClick={()=>{setDraft(d=>d+e);setEmojiOpen(false)}}>{e}</button>)}</div>}</div><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(draft)} placeholder={`Message ${activeContact?.name||''}...`}/>{FEATURES.media&&<button className="icon-btn" title="Record audio (demo)" onClick={()=>setNotice('Voice recording UI is represented by audio-file upload in this release.')}><Mic size={18}/></button>}<button className="send-btn" onClick={()=>send(draft)}><Send size={17}/></button></div><div className="composer-hint">Enter to send <span>•</span> {FEATURES.media?'Attach media with the paperclip':'Text messaging · v1.0'}</div></div>
   </main>
   {showAdd&&<div className="modal-backdrop"><div className="modal"><div className="modal-title"><div><b>{editing?'Edit contact':'Add a contact'}</b><p>Connect with another Chatterly user</p></div><button className="icon-btn" onClick={()=>setShowAdd(false)}><X/></button></div><label>Contact name</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Priya Sharma"/><label>Unique user ID</label><input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="e.g. priya"/><p className="modal-help">The other person must use the same ID to receive messages.</p><button className="primary-btn" onClick={addContact}>{editing?'Save changes':'Add contact'}</button></div></div>}
   {call&&<div className="call-screen"><div className="call-top"><span>{call==='voice'?'VOICE CALL':'VIDEO CALL'}</span><span className="call-secure">🔒 Chatterly connection</span></div><div className="call-person"><div className="call-avatar" style={{background:activeContact?.color}}>{initials(activeContact?.name||'Contact')}</div><h2>{activeContact?.name}</h2><p>Calling… · Demo interface</p>{call==='video'&&<div className="camera-preview"><Camera size={32}/><span>Camera preview simulation</span></div>}</div><div className="call-controls"><button className={muted?'control-active':''} onClick={()=>setMuted(!muted)}>{muted?<MicOff/>:<Mic/>}<span>{muted?'Unmute':'Mute'}</span></button><button className={speaker?'control-active':''} onClick={()=>setSpeaker(!speaker)}><Volume2/><span>Speaker</span></button>{call==='video'&&<button className={!camera?'control-active':''} onClick={()=>setCamera(!camera)}><Camera/><span>Camera</span></button>}<button className="end-call" onClick={()=>setCall(null)}><PhoneOff/><span>End</span></button></div><div className="call-disclaimer">Simulation only — no real audio or video connection is established.</div></div>}
   {viewStatus&&<div className="status-viewer" style={{background:viewStatus.color}} onClick={()=>setViewStatus(null)}><div className="status-progress"/><div className="status-view-head"><b>{viewStatus.user}</b><button onClick={()=>setViewStatus(null)}><X/></button></div>{viewStatus.imageUrl&&<img className="story-photo" src={viewStatus.imageUrl} alt="Story"/>}<div className="status-message">{viewStatus.text}</div>{FEATURES.reactions&&viewStatus.user!==me&&<div className="story-reactions" onClick={e=>e.stopPropagation()}>{['❤️','😂','😍','🔥','👏','😮'].map(e=><button key={e} onClick={()=>react(e)}>{e}</button>)}</div>}<small>{viewStatus.time} · Tap anywhere to close</small></div>}
   {notice&&<div className="toast" onClick={()=>setNotice('')}>{notice}<button><X size={15}/></button></div>}
   <div className="version-watermark">CHATTERLY • RELEASE {VERSION}.0.0</div>
 </div>
}
