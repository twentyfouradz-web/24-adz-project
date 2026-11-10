const JSON_HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const enc=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec=s=>atob(s.replace(/-/g,"+").replace(/_/g,"/"));
const uid=()=>crypto.randomUUID();
const str=(v,n=5000)=>String(v??"").trim().slice(0,n);
const digits=v=>String(v??"").replace(/\D/g,"");
const validMobile=v=>/^[6-9]\d{9}$/.test(v);
const reply=(data,status=200,origin="*")=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS","Vary":"Origin"}});
const fail=(message,status=400,origin="*")=>reply({success:false,error:message},status,origin);
const readBody=async req=>{try{return await req.json()}catch{return null}};
const all=async(db,sql,...a)=>(await db.prepare(sql).bind(...a).all()).results||[];
const first=async(db,sql,...a)=>db.prepare(sql).bind(...a).first();
const run=async(db,sql,...a)=>db.prepare(sql).bind(...a).run();
async function sign(s,secret){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return enc(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(s)))}
async function token(payload,secret){const p=enc(new TextEncoder().encode(JSON.stringify(payload)));return p+"."+await sign(p,secret)}
async function claims(req,secret){try{const t=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");const [p,s]=t.split(".");if(!p||!s||!secret||await sign(p,secret)!==s)return null;const c=JSON.parse(new TextDecoder().decode(Uint8Array.from(dec(p),x=>x.charCodeAt(0))));return c.exp>Date.now()?c:null}catch{return null}}
async function isAdmin(req,env){return (await claims(req,env.ADMIN_SESSION_SECRET))?.role==="admin"}
async function passwordHash(password,salt){const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:150000,hash:"SHA-256"},material,256);return enc(bits)}
async function clientClaims(req,env){const secret=env.CLIENT_SESSION_SECRET||env.ADMIN_SESSION_SECRET;const c=await claims(req,secret);return c?.role==="client"?c:null}
async function clientAuth(req,env,db){const c=await clientClaims(req,env);if(!c?.sub)return null;const row=await first(db,"SELECT id,name,email,mobile,account_id,email_verified FROM client_accounts WHERE id=?",c.sub);return row&&Number(row.email_verified)===1?row:null}
async function sha256(value){return enc(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))}
async function rateLimit(db,key,max,windowMs){
 const now=Date.now(),row=await first(db,"SELECT hits,window_started FROM api_rate_limits WHERE rate_key=?",key);
 if(!row||now-Number(row.window_started)>=windowMs){await run(db,"INSERT INTO api_rate_limits(rate_key,hits,window_started,updated_at) VALUES(?,1,?,datetime('now')) ON CONFLICT(rate_key) DO UPDATE SET hits=1,window_started=excluded.window_started,updated_at=datetime('now')",key,now);return true;}
 if(Number(row.hits)>=max)return false;
 await run(db,"UPDATE api_rate_limits SET hits=hits+1,updated_at=datetime('now') WHERE rate_key=?",key);return true;
}
async function sendEmail(env,to,subject,html){
 if(!env.RESEND_API_KEY||!env.RESEND_FROM)return false;
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:env.RESEND_FROM,to:[to],subject,html})});
 return r.ok;
}
async function issueEmailToken(db,env,client,action,baseUrl){
 const raw=uid()+uid(),hash=await sha256(raw),expires=new Date(Date.now()+(action==="verify_email"?24:1)*3600000).toISOString();
 await run(db,"UPDATE email_action_tokens SET used_at=datetime('now') WHERE client_id=? AND action=? AND used_at IS NULL",client.id,action);
 await run(db,"INSERT INTO email_action_tokens(id,client_id,token_hash,action,expires_at) VALUES(?,?,?,?,?)",uid(),client.id,hash,action,expires);
 const link=`${baseUrl}/?${action==="verify_email"?"verify_email":"reset_password"}=${encodeURIComponent(raw)}`;
 const subject=action==="verify_email"?"Verify your 24Adz email":"Reset your 24Adz password";
 const html=`<p>Hello ${str(client.name,100)},</p><p>${action==="verify_email"?"Verify your email address to activate your 24Adz account.":"Use the link below to choose a new password."}</p><p><a href="${link}">${action==="verify_email"?"Verify Email":"Reset Password"}</a></p><p>This link expires in ${action==="verify_email"?"24 hours":"1 hour"}. If you did not request this, ignore this email.</p>`;
 return await sendEmail(env,client.email,subject,html);
}
async function table(db,t){return !!(await first(db,"SELECT name FROM sqlite_master WHERE type='table' AND name=?",t))}
async function cols(db,t){return (await all(db,`PRAGMA table_info(${t})`)).map(x=>x.name)}
function safeAd(b,mobile,status="approved"){
 const details=b.category_details&&typeof b.category_details==="object"&&!Array.isArray(b.category_details)?{...b.category_details}:{};
 if(b.subcategory)details.subcategory=str(b.subcategory,100);
 return {id:uid(),title:str(b.title,160),description:str(b.description,5000),category:str(b.category,100),district:str(b.district,100),area:str(b.area,120),price:str(b.price,40),phone:mobile||digits(b.phone),whatsapp:digits(b.whatsapp||mobile||b.phone),image_url:str(b.image_url||b.image,2048),details_json:JSON.stringify(details),status};
}
function validateAdContent(a){
 const category=String(a.category||"").toLowerCase();
 if(["cars","bikes","houses","jobs","mobiles"].includes(category)){
  const text=(String(a.title||"")+" "+String(a.description||"")+" "+String(a.details_json||"")).toLowerCase();
  const blocked=/\b(porn|pornography|xxx|sex|nude|naked|escort|adult|erotic|sexual|hooker|prostitut\w*|call\s*girl|blowjob|handjob|boobs|breasts|genitals|vagina|penis|anal)\b/i;
  if(blocked.test(text))return "Adult or sexually explicit words are not allowed in this category.";
 }
 return "";
}
async function saveAd(db,a){await run(db,"INSERT INTO ads(id,title,description,category,district,area,price,phone,whatsapp,image_url,status,details_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))",a.id,a.title,a.description,a.category,a.district,a.area,a.price,a.phone,a.whatsapp,a.image_url,a.status,a.details_json||"{}");}
const MAIN_CATEGORIES=["Cars","Bikes","Houses","Mobiles","Jobs","Personals"];
async function validateAdCategory(db,category,detailsJson){
 if(!MAIN_CATEGORIES.includes(category))return "Choose one of the six available main categories.";
 let details={};try{details=JSON.parse(detailsJson||"{}")}catch{return "Invalid category details."}
 const available=await first(db,"SELECT COUNT(*) AS n FROM categories c JOIN categories p ON p.id=c.parent_id WHERE p.name=? AND p.active=1 AND c.active=1",category);if(Number(available?.n)>0&&!details.subcategory)return "Please select a subcategory.";
 if(details.subcategory){const sub=await first(db,"SELECT c.id FROM categories c JOIN categories p ON p.id=c.parent_id WHERE c.name=? AND p.name=? AND c.active=1 AND p.active=1",str(details.subcategory,100),category);if(!sub)return "Selected subcategory does not belong to this main category or is inactive.";}
 return null;
}
async function listAreas(db,district){
 if(!await table(db,"areas"))return [];
 const value=str(district,100);
 if(!value)return [];
 const c=await cols(db,"areas");
 // Current 24Adz schema stores the district relation as areas.district_id.
 // Accept either the numeric district ID (used by the homepage dropdown)
 // or a district name, so this works for all 38 districts.
 if(c.includes("district_id")&&await table(db,"districts")){
  if(/^\d+$/.test(value)){
   return all(db,"SELECT * FROM areas WHERE district_id=? ORDER BY name",Number(value));
  }
  const dcols=await cols(db,"districts");
  const name=dcols.includes("name")?"name":dcols.includes("district_name")?"district_name":null;
  if(name){
   return all(db,`SELECT a.* FROM areas a JOIN districts d ON a.district_id=d.id WHERE LOWER(d.${name})=LOWER(?) ORDER BY a.name`,value);
  }
  return [];
 }
 const dc=c.includes("district_name")?"district_name":c.includes("district")?"district":null;
 if(!dc)return [];
 if(/^\d+$/.test(value))return all(db,`SELECT * FROM areas WHERE ${dc}=? ORDER BY name`,Number(value));
 return all(db,`SELECT * FROM areas WHERE LOWER(${dc})=LOWER(?) ORDER BY name`,value);
}
export default {async fetch(req,env){
 const url=new URL(req.url),p=url.pathname.replace(/\/+$/,"")||"/";
 const configured=env.ALLOWED_ORIGIN||"*",origin=req.headers.get("Origin")||"*";
 const allow=configured==="*"||origin===configured?configured:"null";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS","Vary":"Origin"}});
 if(!p.startsWith("/api/")){ 
   if(env.ASSETS)return env.ASSETS.fetch(req);
  return new Response("24Adz.com API is running. Static assets binding is not configured.",{status:200});
 }
 const out=(d,s=200)=>reply(d,s,allow),bad=(m,s=400)=>fail(m,s,allow);
 if(!env.DB)return bad("D1 binding DB is missing in wrangler.toml",500);
 try{
  // D1-backed abuse guard. Login/register/message routes receive stricter limits below.
  const ip=req.headers.get("CF-Connecting-IP")||"unknown";
  if(await table(env.DB,"api_rate_limits")){
   const generalKey=await sha256(`all:${ip}`);
   if(!await rateLimit(env.DB,generalKey,180,60000))return bad("Too many requests. Please try again in one minute.",429);
  }
  if(p==="/api/health"&&req.method==="GET"){const x=await first(env.DB,"SELECT 1 AS ok");return out({success:true,database:x?.ok===1?"connected":"error",app:"24Adz.com",features:{emailVerification:await table(env.DB,"email_action_tokens"),rateLimiting:await table(env.DB,"api_rate_limits"),chat:await table(env.DB,"chat_messages")}})}
  if(p==="/api/admin/login"&&req.method==="POST"){
   const b=await readBody(req);if(!b)return bad("Invalid JSON");
   if(!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET)return bad("Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET Worker secrets",503);
   if(String(b.password||"")!==env.ADMIN_PASSWORD)return bad("Invalid admin password",401);
   return out({success:true,token:await token({role:"admin",exp:Date.now()+8*3600000},env.ADMIN_SESSION_SECRET)});
  }
  // Email/password registration. Mobile OTP is intentionally not used.
  if(p==="/api/client/register"&&req.method==="POST"){
   const ip=req.headers.get("CF-Connecting-IP")||"unknown",key=await sha256(`register:${ip}`);
   if(!await rateLimit(env.DB,key,5,3600000))return bad("Registration limit reached. Try again later.",429);
   const b=await readBody(req)||{},name=str(b.name,100),email=str(b.email,254).toLowerCase(),mobile=digits(b.mobile||b.phone),password=String(b.password||"");
   if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validMobile(mobile)||password.length<10||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))return bad("Enter name, valid email, 10-digit mobile and a password with at least 10 characters including a number.");
   if(await first(env.DB,"SELECT id FROM client_accounts WHERE LOWER(email)=LOWER(?)",email))return bad("This email is already registered",409);
   const id=uid(),accountId="24A-"+uid().slice(0,8).toUpperCase(),salt=uid(),hash=salt+":"+await passwordHash(password,salt);
   await run(env.DB,"INSERT INTO client_accounts(id,account_id,name,email,mobile,password_hash,email_verified,created_at) VALUES(?,?,?,?,?,?,0,datetime('now'))",id,accountId,name,email,mobile,hash);
   await run(env.DB,"INSERT INTO client_coin_wallets(client_id,email,balance) VALUES(?,?,0)",id,email);
   const client={id,account_id:accountId,name,email,mobile};
   const sent=await issueEmailToken(env.DB,env,client,"verify_email",env.PUBLIC_SITE_URL||url.origin);
   return out({success:true,verification_required:true,email_sent:sent,message:sent?"Check your email to verify your account.":"Account created. Email delivery is not configured yet; set RESEND_API_KEY and RESEND_FROM to send verification links."},201);
  }
  if(p==="/api/client/verify-email"&&req.method==="POST"){
   const b=await readBody(req)||{},raw=str(b.token,200),hash=await sha256(raw);if(!raw)return bad("Verification token is required");
   const item=await first(env.DB,"SELECT id,client_id FROM email_action_tokens WHERE token_hash=? AND action='verify_email' AND used_at IS NULL AND datetime(expires_at)>datetime('now')",hash);
   if(!item)return bad("Verification link is invalid or expired",400);
   await run(env.DB,"UPDATE client_accounts SET email_verified=1,updated_at=datetime('now') WHERE id=?",item.client_id);
   await run(env.DB,"UPDATE email_action_tokens SET used_at=datetime('now') WHERE id=?",item.id);
   return out({success:true,message:"Email verified. You can now log in."});
  }
  if(p==="/api/client/login"&&req.method==="POST"){
   const ip=req.headers.get("CF-Connecting-IP")||"unknown",key=await sha256(`login:${ip}`);if(!await rateLimit(env.DB,key,10,900000))return bad("Too many login attempts. Try again in 15 minutes.",429);
   const b=await readBody(req)||{},email=str(b.email,254).toLowerCase(),password=String(b.password||"");
   const row=await first(env.DB,"SELECT id,name,email,mobile,account_id,password_hash,email_verified FROM client_accounts WHERE LOWER(email)=LOWER(?)",email);
   if(!row?.password_hash)return bad("Invalid email or password",401);
   const [salt,stored]=String(row.password_hash).split(":");if(!salt||await passwordHash(password,salt)!==stored)return bad("Invalid email or password",401);
   if(!row.email_verified)return bad("Please verify your email before logging in. Check your inbox.",403);
   const secret=env.CLIENT_SESSION_SECRET||env.ADMIN_SESSION_SECRET;if(!secret)return bad("Set CLIENT_SESSION_SECRET Worker secret",503);
   const {password_hash,...client}=row;return out({success:true,client,token:await token({role:"client",sub:row.id,email:row.email,exp:Date.now()+30*86400000},secret)});
  }
  if(p==="/api/client/forgot-password"&&req.method==="POST"){
   const b=await readBody(req)||{},email=str(b.email,254).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return bad("Enter a valid email address");
   const c=await first(env.DB,"SELECT id,name,email FROM client_accounts WHERE LOWER(email)=LOWER(?)",email);
   // Always return the same response to avoid account enumeration.
   if(c){const sent=await issueEmailToken(env.DB,env,c,"password_reset",env.PUBLIC_SITE_URL||url.origin);if(!sent)return bad("Password reset email service is not configured. Contact Admin.",503);}
   return out({success:true,message:"If the account exists, a password reset link has been sent."});
  }
  if(p==="/api/client/reset-password"&&req.method==="POST"){
   const b=await readBody(req)||{},raw=str(b.token,200),password=String(b.password||"");if(password.length<10||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))return bad("Password must be at least 10 characters and include a number.");
   const item=await first(env.DB,"SELECT id,client_id FROM email_action_tokens WHERE token_hash=? AND action='password_reset' AND used_at IS NULL AND datetime(expires_at)>datetime('now')",await sha256(raw));if(!item)return bad("Reset link is invalid or expired",400);
   const salt=uid(),hash=salt+":"+await passwordHash(password,salt);await run(env.DB,"UPDATE client_accounts SET password_hash=?,updated_at=datetime('now') WHERE id=?",hash,item.client_id);await run(env.DB,"UPDATE email_action_tokens SET used_at=datetime('now') WHERE client_id=? AND action='password_reset' AND used_at IS NULL",item.client_id);return out({success:true,message:"Password updated. Please log in again."});
  }
  if(p==="/api/client/me"&&req.method==="GET"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);
   const wallet=await first(env.DB,"SELECT balance FROM client_coin_wallets WHERE client_id=?",client.id);
   const [emailCount,phoneCount]=await Promise.all([
    first(env.DB,"SELECT COUNT(*) n FROM ads WHERE owner_client_id=? AND created_at>=datetime('now','start of month')",client.id),
    first(env.DB,"SELECT COUNT(*) n FROM ads a LEFT JOIN client_accounts c ON c.id=a.owner_client_id WHERE (c.mobile=? OR a.phone=?) AND a.created_at>=datetime('now','start of month')",client.mobile,client.mobile)
   ]);
   return out({success:true,client,wallet:{balance:Number(wallet?.balance)||0},freeAds:{emailUsed:Number(emailCount?.n)||0,emailLimit:3,phoneUsedThisMonth:Number(phoneCount?.n)||0,phoneMonthlyLimit:3}});
  }
  if(p==="/api/client/ads"&&req.method==="GET"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);
   return out({success:true,ads:await all(env.DB,"SELECT * FROM ads WHERE owner_client_id=? ORDER BY created_at DESC LIMIT 200",client.id)});
  }
  if(p==="/api/client/profile"&&req.method==="PUT"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const b=await readBody(req)||{},name=str(b.name,100),mobile=digits(b.mobile||client.mobile);if(!name||!validMobile(mobile))return bad("Enter a name and valid 10-digit mobile number");
   await run(env.DB,"UPDATE client_accounts SET name=?,mobile=?,updated_at=datetime('now') WHERE id=?",name,mobile,client.id);return out({success:true,client:{...client,name,mobile}});
  }
  if(p==="/api/client/account"&&req.method==="DELETE"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const b=await readBody(req)||{};if(!b.confirm)return bad("Set confirm=true to delete this account");
   await run(env.DB,"UPDATE ads SET owner_client_id=NULL,owner_email=NULL WHERE owner_client_id=?",client.id);
   await run(env.DB,"DELETE FROM email_action_tokens WHERE client_id=?",client.id);await run(env.DB,"DELETE FROM chat_messages WHERE sender_client_id=? OR receiver_client_id=?",client.id,client.id);await run(env.DB,"DELETE FROM coin_purchase_requests WHERE client_id=?",client.id);await run(env.DB,"DELETE FROM coin_transactions WHERE client_id=?",client.id);await run(env.DB,"DELETE FROM client_coin_wallets WHERE client_id=?",client.id);await run(env.DB,"DELETE FROM client_accounts WHERE id=?",client.id);return out({success:true,message:"Account deleted."});
  }
  const clientAd=p.match(/^\/api\/client\/ads\/([^/]+)$/);
  if(clientAd&&req.method==="PATCH"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const b=await readBody(req)||{},a=safeAd(b,client.mobile);const owned=await first(env.DB,"SELECT id,image_url FROM ads WHERE id=? AND owner_client_id=?",clientAd[1],client.id);if(!owned)return bad("You can only edit ads assigned to your account",403);if(!a.title||!a.description||!a.category||!a.district||!a.area)return bad("Title, description, category, district and area are required");const categoryError=await validateAdCategory(env.DB,a.category,a.details_json);if(categoryError)return bad(categoryError);const contentError=validateAdContent(a);if(contentError)return bad(contentError);const image=a.image_url||owned.image_url;await run(env.DB,"UPDATE ads SET title=?,description=?,category=?,district=?,area=?,price=?,phone=?,whatsapp=?,image_url=?,details_json=? WHERE id=? AND owner_client_id=?",a.title,a.description,a.category,a.district,a.area,a.price,a.phone,a.whatsapp,image,a.details_json,clientAd[1],client.id);return out({success:true});
  }
  if(clientAd&&req.method==="DELETE"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const owned=await first(env.DB,"SELECT id,image_url FROM ads WHERE id=? AND owner_client_id=?",clientAd[1],client.id);if(!owned)return bad("You can only delete ads assigned to your account",403);await run(env.DB,"DELETE FROM ads WHERE id=? AND owner_client_id=?",clientAd[1],client.id);return out({success:true});
  }
  if(p==="/api/client/ads"&&req.method==="POST"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);
   const ip=req.headers.get("CF-Connecting-IP")||"unknown";
   if(!await rateLimit(env.DB,await sha256(`client-ad:${client.id}:${ip}`),10,3600000))return bad("Ad posting limit reached. Try again later.",429);
   const b=await readBody(req)||{},a=safeAd(b,client.mobile,"approved");
   if(!a.title||!a.description||!a.category||!a.district||!a.area)return bad("Title, description, category, district and area are required");
   const categoryError=await validateAdCategory(env.DB,a.category,a.details_json);if(categoryError)return bad(categoryError);const contentError=validateAdContent(a);if(contentError)return bad(contentError);
   const [emailCount,phoneCount]=await Promise.all([
    first(env.DB,"SELECT COUNT(*) n FROM ads WHERE owner_client_id=? AND created_at>=datetime('now','start of month')",client.id),
    first(env.DB,"SELECT COUNT(*) n FROM ads a LEFT JOIN client_accounts c ON c.id=a.owner_client_id WHERE (c.mobile=? OR a.phone=?) AND a.created_at>=datetime('now','start of month')",client.mobile,client.mobile)
   ]);
   const freeAllowed=Number(phoneCount?.n||0)<3;
   const plan=str(b.plan||"free",20),days=plan==="vip3"?3:plan==="vip5"?5:plan==="vip7"?7:0;
   const cost=days===3?300:days===5?500:days===7?700:0;
   if(!freeAllowed&&(!days))return bad("Your free limit of "+freeLimit+" ads per mobile number for "+period+" days has been reached. Contact 24Adz Admin on WhatsApp to purchase Coins and continue posting.",402);
   if(days){
    const wallet=await first(env.DB,"SELECT balance FROM client_coin_wallets WHERE client_id=?",client.id);
    if(Number(wallet?.balance||0)<cost)return bad(`Insufficient coins. ${cost} coins required for this VIP plan.`,402);
    await run(env.DB,"UPDATE client_coin_wallets SET balance=balance-?,updated_at=datetime('now') WHERE client_id=? AND balance>=?",cost,client.id,cost);
    const updated=await first(env.DB,"SELECT balance FROM client_coin_wallets WHERE client_id=?",client.id);
    await run(env.DB,"INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note) VALUES(?,?,?,'vip_debit',?,?,?)",uid(),client.id,client.email,-cost,Number(updated?.balance||0),`VIP ad promotion (${days} days)`);
    a.is_vip=1;a.expires_at=new Date(Date.now()+days*86400000).toISOString();
   }else{a.is_vip=0;a.expires_at=new Date(Date.now()+30*86400000).toISOString();}
   await run(env.DB,"INSERT INTO ads(id,title,description,category,district,area,price,phone,whatsapp,image_url,status,created_at,owner_email,owner_client_id,is_vip,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?, 'approved',datetime('now'),?,?,?,?)",a.id,a.title,a.description,a.category,a.district,a.area,a.price,a.phone,a.whatsapp,a.image_url,client.email,client.id,a.is_vip,a.expires_at);
   return out({success:true,ad:{...a,owner_client_id:client.id,owner_email:client.email},message:"Your advertisement has been published."},201);
  }
  if(p==="/api/client/chat"&&req.method==="POST"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const ip=req.headers.get("CF-Connecting-IP")||"unknown";if(!await rateLimit(env.DB,await sha256(`chat:${client.id}:${ip}`),20,60000))return bad("Message limit reached. Please wait.",429);
   const b=await readBody(req)||{},ad=await first(env.DB,"SELECT id FROM ads WHERE id=? AND status='approved'",str(b.ad_id,100)),message=str(b.message,2000);if(!ad)return bad("Ad not found",404);if(!message)return bad("Message required");if((message.match(/https?:\/\//gi)||[]).length>2||/(buy now|click here|free money|crypto investment)/i.test(message))return bad("Message blocked by spam protection",400);
   await run(env.DB,"INSERT INTO chat_messages(ad_id,sender_mobile,receiver_mobile,message,sender_client_id,receiver_client_id) VALUES(?,?,?,?,?,'ADMIN')",ad.id,client.mobile,"ADMIN",message,client.id);return out({success:true,message:"Message sent to Admin."},201);
  }
  if(p==="/api/client/messages"&&req.method==="GET"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const after=Math.max(0,Number(url.searchParams.get("after"))||0);return out({success:true,messages:await all(env.DB,"SELECT id,ad_id,sender_mobile,receiver_mobile,message,created_at,sender_client_id,receiver_client_id FROM chat_messages WHERE (sender_client_id=? OR receiver_client_id=?) AND id>? ORDER BY id ASC LIMIT 100",client.id,client.id,after)});
  }
  if(p==="/api/admin/messages"&&req.method==="GET"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);const after=Math.max(0,Number(url.searchParams.get("after"))||0);return out({success:true,messages:await all(env.DB,"SELECT m.*,c.name AS sender_name,c.email AS sender_email FROM chat_messages m LEFT JOIN client_accounts c ON c.id=m.sender_client_id WHERE m.receiver_client_id='ADMIN' OR m.sender_client_id IN (SELECT id FROM client_accounts) ORDER BY m.id DESC LIMIT 300")});
  }
  const adminReply=p.match(/^\/api\/admin\/messages\/([0-9]+)\/reply$/);
  if(adminReply&&req.method==="POST"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);const b=await readBody(req)||{},original=await first(env.DB,"SELECT * FROM chat_messages WHERE id=?",adminReply[1]);if(!original)return bad("Message not found",404);const message=str(b.message,2000);if(!message)return bad("Reply message required");await run(env.DB,"INSERT INTO chat_messages(ad_id,sender_mobile,receiver_mobile,message,sender_client_id,receiver_client_id) VALUES(?,?,?,?, 'ADMIN',?)",original.ad_id,"ADMIN",original.sender_mobile,message,original.sender_client_id);return out({success:true},201);
  }
  if(p==="/api/client/coin-packages"&&req.method==="GET")return out({success:true,packages:[1000,2000,3000,4000,5000].map(coins=>({coins,amount:coins}))});
  if(p==="/api/client/coin-requests"&&req.method==="POST"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);const b=await readBody(req)||{},coins=Number(b.coins);if(![1000,2000,3000,4000,5000].includes(coins))return bad("Choose a valid coin package");const id=uid();await run(env.DB,"INSERT INTO coin_purchase_requests(id,client_id,email,coins,amount,status) VALUES(?,?,?,?,?,'pending')",id,client.id,client.email,coins,coins);return out({success:true,request_id:id,coins,amount:coins,message:"Contact Admin on WhatsApp and share this request ID after payment."},201);
  }
  if(p==="/api/admin/clients"&&req.method==="GET"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);return out({success:true,clients:await all(env.DB,"SELECT c.id,c.account_id,c.name,c.email,c.mobile,COALESCE(w.balance,0) balance,c.created_at FROM client_accounts c LEFT JOIN client_coin_wallets w ON w.client_id=c.id ORDER BY c.created_at DESC LIMIT 500")});
  }
  if(p==="/api/admin/coin-requests"&&req.method==="GET"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);return out({success:true,requests:await all(env.DB,"SELECT * FROM coin_purchase_requests ORDER BY created_at DESC LIMIT 300")});
  }
  const coinRequest=p.match(/^\/api\/admin\/coin-requests\/([a-f0-9-]+)\/confirm$/i);
  if(coinRequest&&req.method==="POST"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);const r=await first(env.DB,"SELECT * FROM coin_purchase_requests WHERE id=?",coinRequest[1]);if(!r)return bad("Purchase request not found",404);if(r.status!=="pending")return bad("Request already processed",409);const w=await first(env.DB,"SELECT balance FROM client_coin_wallets WHERE client_id=?",r.client_id);if(!w)return bad("Client wallet not found",404);const next=Number(w.balance)+Number(r.coins);await run(env.DB,"UPDATE client_coin_wallets SET balance=?,updated_at=datetime('now') WHERE client_id=?",next,r.client_id);await run(env.DB,"INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note,admin_reference) VALUES(?,?,?,'admin_credit',?,?,?,?)",uid(),r.client_id,r.email,r.coins,next,"Admin confirmed WhatsApp payment",r.id);await run(env.DB,"UPDATE coin_purchase_requests SET status='confirmed',updated_at=datetime('now') WHERE id=?",r.id);return out({success:true,balance:next});
  }
  if(p==="/api/admin/coins/credit"&&req.method==="POST"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);const b=await readBody(req)||{},email=str(b.email,254).toLowerCase(),coins=Number(b.coins);if(!email||!Number.isInteger(coins)||coins<1||coins>1000000)return bad("Valid email and coin amount required");const c=await first(env.DB,"SELECT id,email FROM client_accounts WHERE LOWER(email)=LOWER(?)",email);if(!c)return bad("Client email not found",404);await run(env.DB,"INSERT OR IGNORE INTO client_coin_wallets(client_id,email,balance) VALUES(?,?,0)",c.id,c.email);const w=await first(env.DB,"SELECT balance FROM client_coin_wallets WHERE client_id=?",c.id),next=Number(w.balance)+coins;await run(env.DB,"UPDATE client_coin_wallets SET balance=?,updated_at=datetime('now') WHERE client_id=?",next,c.id);await run(env.DB,"INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note,admin_reference) VALUES(?,?,?,'admin_credit',?,?,?,?)",uid(),c.id,c.email,coins,next,str(b.note||"Manual WhatsApp payment",300),str(b.reference,120));return out({success:true,client_id:c.id,balance:next});
  }
  if(p==="/api/admin/coin-transactions"&&req.method==="GET"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);return out({success:true,transactions:await all(env.DB,"SELECT * FROM coin_transactions ORDER BY created_at DESC LIMIT 500")});
  }
  if(p==="/api/public/settings"&&req.method==="GET"){const rows=await all(env.DB,"SELECT key,value FROM settings"),settings={};for(const r of rows){try{settings[r.key]=JSON.parse(r.value)}catch{settings[r.key]=r.value}}return out({success:true,settings})}
  if(p==="/api/public/contact-settings"&&req.method==="GET"){
   const row=await first(env.DB,"SELECT value FROM settings WHERE key='contact_buttons'");
   let settings={call:true,whatsapp:true};
   if(row?.value){try{settings={...settings,...JSON.parse(row.value)}}catch{}}
   return out({success:true,settings});
  }
  if(p==="/api/public/categories"&&req.method==="GET")return out({success:true,categories:await all(env.DB,"SELECT * FROM categories WHERE active=1 ORDER BY sort_order,id")});
  if(p==="/api/public/form-fields"&&req.method==="GET")return out({success:true,fields:await all(env.DB,"SELECT id,label,field_type,required,options_json,sort_order FROM form_fields WHERE active=1 ORDER BY sort_order,id")});
  if(["/api/public/ads","/api/public/search","/api/public/filter"].includes(p)&&req.method==="GET"){
   const page=Math.max(1,Number(url.searchParams.get("page"))||1),limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit"))||50)),w=["ads.status='approved'"],a=[];
   for(const k of ["category","district","area"]){const v=str(url.searchParams.get(k),120);if(v){w.push("ads."+k+"=?");a.push(v)}}
   const subcategory=str(url.searchParams.get("subcategory"),100);if(subcategory){w.push("json_extract(COALESCE(ads.details_json,'{}'),'$.subcategory')=?");a.push(subcategory)}
   const q=str(url.searchParams.get("q")||url.searchParams.get("keyword"),120);if(q){w.push("(ads.title LIKE ? OR ads.description LIKE ?)");a.push("%"+q+"%","%"+q+"%")}
   const min=url.searchParams.get("min_price"),max=url.searchParams.get("max_price");
   if(min!==null&&min!==""){w.push("CAST(ads.price AS REAL)>=?");a.push(Number(min)||0)}
   if(max!==null&&max!==""){w.push("CAST(ads.price AS REAL)<=?");a.push(Number(max)||0)}
   const sort=url.searchParams.get("sort")==="price_low"?"CAST(ads.price AS REAL) ASC":url.searchParams.get("sort")==="price_high"?"CAST(ads.price AS REAL) DESC":"ads.created_at DESC";
   const count=await first(env.DB,"SELECT COUNT(*) AS n FROM ads WHERE "+w.join(" AND "),...a);
   // Only an ACTIVE promotion is treated as paid/VIP. Pending records never get a paid placement.
   // The correlated lookup also keeps this compatible with the existing ads table; no ads columns or data are changed.
   const vipTable=await table(env.DB,"vip_promotions");
   const vipSelect=vipTable?`,(SELECT p.days FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now') ORDER BY datetime(p.created_at) DESC,p.id DESC LIMIT 1) AS vip_days,(SELECT p.created_at FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now') ORDER BY datetime(p.created_at) DESC,p.id DESC LIMIT 1) AS vip_started_at,(SELECT datetime(p.created_at,'+'||p.days||' days') FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now') ORDER BY datetime(p.created_at) DESC,p.id DESC LIMIT 1) AS vip_expires_at`:`,NULL AS vip_days,NULL AS vip_started_at,NULL AS vip_expires_at`;
   // VIP placement is always first, scoped by the requested district/category filters.
   // Newest active VIP promotion leads; older VIP ads remain above Free ads until expiry.
   const vipOrder=vipTable?`CASE WHEN EXISTS(SELECT 1 FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now')) THEN 1 ELSE 0 END DESC, (SELECT MAX(p.created_at) FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now')) DESC`:`0 DESC`;
   const order=vipOrder+`, `+(url.searchParams.get("sort")==="price_low"||url.searchParams.get("sort")==="price_high"?sort:"ads.created_at DESC");
   const rows=await all(env.DB,"SELECT ads.*"+vipSelect+" FROM ads WHERE "+w.join(" AND ")+` ORDER BY ${order} LIMIT ? OFFSET ?`,...a,limit,(page-1)*limit);
   const ads=rows.map(row=>{
    try{row.subcategory=JSON.parse(row.details_json||"{}").subcategory||""}catch{row.subcategory=""}
    const category=String(row.category||"").toLowerCase();
    const publicContactAllowed=category.includes("massage")||category.includes("spa");
    row.can_chat=!!row.owner_client_id;
    delete row.owner_client_id;
    if(!publicContactAllowed){row.phone="";row.whatsapp="";}
    const days=Number(row.vip_days)||0;
    const started=row.vip_started_at?Date.parse(String(row.vip_started_at).replace(" ","T")+"Z"):0;
    const expires=row.vip_expires_at?Date.parse(String(row.vip_expires_at).replace(" ","T")+"Z"):0;
    return {...row,plan:days?`VIP ${days} Days`:(row.plan||"Free"),vipStartedAt:started||0,vipExpiresAt:expires||0};
   });
   return out({success:true,ads,total:count?.n||0,page,limit});
  }
  if(p==="/api/public/districts"&&req.method==="GET"){
   if(!await table(env.DB,"districts"))return out({success:true,districts:[]});
   const c=await cols(env.DB,"districts"),sort=c.includes("name")?"name":c.includes("district_name")?"district_name":"id";
   return out({success:true,districts:await all(env.DB,`SELECT * FROM districts ORDER BY ${sort}`)});
  } 
   
  if(p==="/api/public/areas"&&req.method==="GET"){const d=str(url.searchParams.get("district"),100);if(!d)return bad("district query parameter is required");return out({success:true,areas:await listAreas(env.DB,d)})}
  const imagePath=p.match(/^\/api\/images\/([a-zA-Z0-9/_-]+)$/);
  if(imagePath&&req.method==="GET"){
   if(!env.IMAGES)return bad("R2 image storage is not configured",503);
   const key=imagePath[1];if(key.includes(".."))return bad("Invalid image key",400);
   const obj=await env.IMAGES.get(key);if(!obj)return bad("Image not found",404);
   const headers=new Headers({"Cache-Control":"public, max-age=86400","Content-Type":obj.httpMetadata?.contentType||"application/octet-stream"});
   return new Response(obj.body,{headers});
  }
  if(p==="/api/client/images/upload"&&req.method==="POST"){
   const client=await clientAuth(req,env,env.DB);if(!client)return bad("Client login required",401);
   if(!env.IMAGES)return bad("R2 image storage is not configured",503);
   const form=await req.formData(),file=form.get("image");if(!file||typeof file.arrayBuffer!=="function")return bad("Image file is required",400);
   const type=String(file.type||"").toLowerCase(),allowed=new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif"]);
   if(!allowed.has(type))return bad("Supported image formats: JPG, PNG, WEBP, GIF and AVIF",415);
   if(file.size<=0||file.size>5*1024*1024)return bad("Image must be between 1 byte and 5 MB",413);
   const ext=type==="image/jpeg"?"jpg":type.split("/")[1],key=`client-ads/${client.id}/${uid()}.${ext}`;
   await env.IMAGES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:type,cacheControl:"public, max-age=31536000"}});
   return out({success:true,key,url:`${url.origin}/api/images/${key}`},201);
  }
  if(p==="/api/admin/images/upload"&&req.method==="POST"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);
   if(!env.IMAGES)return bad("R2 image storage is not configured",503);
   const form=await req.formData(),file=form.get("image")||form.get("file");
   if(!file||typeof file.arrayBuffer!=="function")return bad("Image file is required (field: image)",400);
   const type=String(file.type||"").toLowerCase(),allowed=new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif","image/bmp"]);
   if(!allowed.has(type))return bad("Supported image formats: JPG, PNG, WEBP, GIF, AVIF and BMP",415);
   if(file.size<=0||file.size>5*1024*1024)return bad("Image must be between 1 byte and 5 MB",413);
   const ext=type==="image/jpeg"?"jpg":type.split("/")[1],key=`ads/${new Date().toISOString().slice(0,10)}/${uid()}.${ext}`;
   await env.IMAGES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:type,cacheControl:"public, max-age=31536000"}});
   return out({success:true,key,url:`${url.origin}/api/images/${key}`,size:file.size,contentType:type},201);
  }
  const imageDelete=p.match(/^\/api\/admin\/images\/(.+)$/);
  if(imageDelete&&req.method==="DELETE"){
   if(!await isAdmin(req,env))return bad("Admin login required",401);
   if(!env.IMAGES)return bad("R2 image storage is not configured",503);
   const key=decodeURIComponent(imageDelete[1]);
   if(!key||key.includes(".."))return bad("Invalid image key",400);
   await env.IMAGES.delete(key);
   return out({success:true,key});
  }
  if(p.startsWith("/api/admin/")&&!await isAdmin(req,env))return bad("Admin login required",401);
  if(p==="/api/admin/districts"&&req.method==="GET"){
   if(!await table(env.DB,"districts"))return bad("Districts table is not available in D1",404);
   const c=await cols(env.DB,"districts"),nameCol=c.includes("name")?"name":c.includes("district_name")?"district_name":null;
   if(!nameCol)return bad("District table must contain name or district_name column",500);
   return out({success:true,districts:await all(env.DB,`SELECT * FROM districts ORDER BY ${nameCol}`)});
  }
  if(p==="/api/admin/districts"&&req.method==="POST"){
   if(!await table(env.DB,"districts"))return bad("Districts table is not available in D1",404);
   const c=await cols(env.DB,"districts"),nameCol=c.includes("name")?"name":c.includes("district_name")?"district_name":null,b=await readBody(req)||{},name=str(b.name,100);
   if(!name)return bad("District name is required");
   if(!nameCol)return bad("District table must contain name or district_name column",500);
   const exists=await first(env.DB,`SELECT id FROM districts WHERE LOWER(${nameCol})=LOWER(?)`,name);
   if(exists)return bad("District already exists",409);
   await run(env.DB,`INSERT INTO districts(${nameCol}) VALUES(?)`,name);
   return out({success:true});
  }
  const districtMatch=p.match(/^\/api\/admin\/districts\/(\d+)$/);
  if(districtMatch&&req.method==="PUT"){
   if(!await table(env.DB,"districts"))return bad("Districts table is not available in D1",404);
   const c=await cols(env.DB,"districts"),nameCol=c.includes("name")?"name":c.includes("district_name")?"district_name":null,b=await readBody(req)||{},name=str(b.name,100);
   if(!name)return bad("District name is required");
   if(!nameCol)return bad("District table must contain name or district_name column",500);
   await run(env.DB,`UPDATE districts SET ${nameCol}=? WHERE id=?`,name,districtMatch[1]);
   return out({success:true});
  }
  if(districtMatch&&req.method==="DELETE"){
   if(!await table(env.DB,"districts"))return bad("Districts table is not available in D1",404);
   if(await table(env.DB,"areas")){
    const ac=await cols(env.DB,"areas");
    if(ac.includes("district_id")){
     const used=await first(env.DB,"SELECT COUNT(*) AS n FROM areas WHERE district_id=?",districtMatch[1]);
     if(Number(used?.n)>0)return bad("This district still has areas. Remove or move its areas first.",409);
    }
   }
   await run(env.DB,"DELETE FROM districts WHERE id=?",districtMatch[1]);
   return out({success:true});
  }
  if(p==="/api/admin/dashboard"&&req.method==="GET"){
   const [a,k]=await Promise.all([first(env.DB,"SELECT COUNT(*) n FROM ads"),first(env.DB,"SELECT COUNT(*) n FROM categories")]);
   return out({success:true,stats:{ads:a.n,categories:k.n}});
  }
  if(p==="/api/admin/categories"&&req.method==="GET")return out({success:true,categories:await all(env.DB,"SELECT * FROM categories WHERE name IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals') AND parent_id IS NULL OR parent_id IN (SELECT id FROM categories WHERE name IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals') AND parent_id IS NULL) ORDER BY sort_order,id")});
  if(p==="/api/admin/categories"&&req.method==="POST"){
   const b=await readBody(req)||{},name=str(b.name,80),slug=str(b.slug||name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),100),parentId=Number(b.parent_id);
   if(!name||!slug)return bad("Subcategory name and slug are required.");
   if(!Number.isInteger(parentId)||parentId<=0)return bad("Only subcategories can be created. Select one of the six main categories.");
   const parent=await first(env.DB,"SELECT id,name,parent_id,active FROM categories WHERE id=?",parentId);
   if(!parent||parent.parent_id!==null&&parent.parent_id!==undefined)return bad("Invalid parent. Subcategories must be directly under a main category.");
   if(!MAIN_CATEGORIES.includes(parent.name))return bad("Only Cars, Bikes, Houses, Mobiles, Jobs and Personals are allowed as main categories.");
   if(Number(parent.active)!==1)return bad("Cannot add a subcategory under an inactive main category.");
   if(await first(env.DB,"SELECT id FROM categories WHERE LOWER(name)=LOWER(?) AND parent_id=?",name,parentId))return bad("This subcategory already exists under the selected category.",409);
   if(await first(env.DB,"SELECT id FROM categories WHERE slug=?",slug))return bad("This category URL slug is already in use.",409);
   await run(env.DB,"INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES(?,?,?,?,?,?,datetime('now'))",name,slug,parentId,str(b.icon||"◆",20),Math.max(0,Number(b.sort_order)||0),b.active===false?0:1);return out({success:true});
  }
  const cat=p.match(/^\/api\/admin\/categories\/(\d+)$/);
  if(cat&&req.method==="PUT"){
   const b=await readBody(req)||{},id=Number(cat[1]),current=await first(env.DB,"SELECT * FROM categories WHERE id=?",id);
   if(!current)return bad("Category not found.",404);
   if(!current.parent_id)return bad("Main categories are fixed. Only subcategories can be edited.");
   const name=str(b.name,80),slug=str(b.slug||name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),100),parentId=Number(b.parent_id||current.parent_id);
   if(!name||!slug)return bad("Subcategory name and slug are required.");
   const parent=await first(env.DB,"SELECT * FROM categories WHERE id=?",parentId);
   if(!parent||parent.parent_id!==null&&parent.parent_id!==undefined||!MAIN_CATEGORIES.includes(parent.name)||Number(parent.active)!==1)return bad("Subcategory must belong directly to an active one of the six main categories.");
   if(await first(env.DB,"SELECT id FROM categories WHERE slug=? AND id<>?",slug,id))return bad("This URL slug is already in use.",409);
   if(await first(env.DB,"SELECT id FROM categories WHERE LOWER(name)=LOWER(?) AND parent_id=? AND id<>?",name,parentId,id))return bad("This subcategory already exists under the selected main category.",409);
   await run(env.DB,"UPDATE categories SET name=?,slug=?,parent_id=?,icon=?,sort_order=?,active=? WHERE id=?",name,slug,parentId,str(b.icon||"◆",20),Math.max(0,Number(b.sort_order)||0),b.active===false?0:1,id);return out({success:true});
  }
  if(cat&&req.method==="DELETE"){
   const id=Number(cat[1]),current=await first(env.DB,"SELECT * FROM categories WHERE id=?",id);
   if(!current)return bad("Category not found.",404);
   if(!current.parent_id)return bad("The six main categories cannot be deleted.");
   const parent=await first(env.DB,"SELECT name FROM categories WHERE id=?",current.parent_id);
   const used=await first(env.DB,"SELECT COUNT(*) AS n FROM ads WHERE category=? AND json_extract(COALESCE(details_json,'{}'),'$.subcategory')=?",parent?.name||"",current.name);
   if(Number(used?.n)>0)return bad("This subcategory is used by existing ads. Deactivate it instead of deleting.",409);
   await run(env.DB,"DELETE FROM categories WHERE id=?",id);return out({success:true});
  }
  if(p==="/api/admin/ads"&&req.method==="GET")return out({success:true,ads:await all(env.DB,"SELECT * FROM ads ORDER BY created_at DESC LIMIT 500")});
  if(p==="/api/admin/ads"&&req.method==="POST"){
    const b=await readBody(req)||{},a=safeAd(b,null,"approved");
    if(!a.title||!a.category||!a.district)return bad("Ad title, category and district are required");
    const categoryError=await validateAdCategory(env.DB,a.category,a.details_json);if(categoryError)return bad(categoryError);const contentError=validateAdContent(a);if(contentError)return bad(contentError);
    await saveAd(env.DB,a);
    const vipAmount=700;
    await run(env.DB,"INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))",a.id,7,vipAmount,"active","ADMIN_AUTO_VIP");
    return out({success:true,id:a.id,status:"approved",plan:"VIP 7 Days",message:"Advertisement published with VIP card for 7 days"})
   }
  if(p==="/api/admin/ads/bulk"&&req.method==="POST"){
   const b=await readBody(req)||{},action=str(b.action||"create",20),items=Array.isArray(b.ads)?b.ads:[];
   if(action==="create"){
    if(!items.length||items.length>100)return bad("Provide between 1 and 100 ads");
    const created=[];
    for(const item of items){
     const a=safeAd(item,null,"approved");
     if(!a.title||!a.category||!a.district)return bad("Every ad requires title, category and district");
     const categoryError=await validateAdCategory(env.DB,a.category,a.details_json);if(categoryError)return bad(categoryError);const contentError=validateAdContent(a);if(contentError)return bad(contentError);
     await saveAd(env.DB,a);
     const amount=700;
     await run(env.DB,"INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))",a.id,7,amount,"active","ADMIN_BULK_VIP");
     created.push(a.id);
    }
    return out({success:true,created:created.length,ids:created},201);
   }
   const ids=Array.isArray(b.ids)?b.ids.map(x=>str(x,100)).filter(Boolean):[];
   if(!ids.length||ids.length>500)return bad("Provide between 1 and 500 ad IDs");
   if(action==="delete"){
    for(const id of ids){const row=await first(env.DB,"SELECT image_url FROM ads WHERE id=?",id);if(row?.image_url&&env.IMAGES){const m=String(row.image_url).match(/\/api\/images\/(.+)$/);if(m)await env.IMAGES.delete(m[1]).catch(()=>{});}await run(env.DB,"DELETE FROM ads WHERE id=?",id);}
    return out({success:true,deleted:ids.length});
   }
   if(action==="status"){
    if(!["approved","paused","rejected","pending"].includes(b.status))return bad("Invalid bulk ad status");
    for(const id of ids)await run(env.DB,"UPDATE ads SET status=? WHERE id=?",b.status,id);
    return out({success:true,updated:ids.length,status:b.status});
   }
   return bad("Bulk action must be create, delete or status");
  }
  const ad=p.match(/^\/api\/admin\/ads\/([^/]+)$/);
  if(ad&&req.method==="PATCH"){const b=await readBody(req)||{};if(b.status){if(!["pending","approved","rejected","paused"].includes(b.status))return bad("Invalid ad status");await run(env.DB,"UPDATE ads SET status=? WHERE id=?",b.status,ad[1])}else{const a=safeAd(b,null);const categoryError=await validateAdCategory(env.DB,a.category,a.details_json);if(categoryError)return bad(categoryError);const contentError=validateAdContent(a);if(contentError)return bad(contentError);await run(env.DB,"UPDATE ads SET title=?,description=?,category=?,district=?,area=?,price=?,phone=?,whatsapp=?,image_url=?,details_json=? WHERE id=?",a.title,a.description,a.category,a.district,a.area,a.price,a.phone,a.whatsapp,a.image_url,a.details_json,ad[1])}return out({success:true})}
  if(ad&&req.method==="DELETE"){
   const adRow=await first(env.DB,"SELECT image_url FROM ads WHERE id=?",ad[1]);
   if(adRow?.image_url&&env.IMAGES){const m=String(adRow.image_url).match(/\/api\/images\/(.+)$/);if(m)await env.IMAGES.delete(m[1]).catch(()=>{});}
   await run(env.DB,"DELETE FROM ads WHERE id=?",ad[1]);return out({success:true})
  }
  if(p==="/api/admin/settings"&&req.method==="GET"){if(!await isAdmin(req,env))return bad("Admin login required",401);const rows=await all(env.DB,"SELECT key,value FROM settings"),settings={};for(const r of rows){try{settings[r.key]=JSON.parse(r.value)}catch{settings[r.key]=r.value}}return out({success:true,settings})}
  if(p==="/api/admin/settings"&&req.method==="PUT"){if(!await isAdmin(req,env))return bad("Admin login required",401);const b=await readBody(req)||{};for(const [k,v] of Object.entries(b)){if(k==="contact"){const n=digits(v?.whatsapp_number);if(!validMobile(n))return bad("Enter a valid 10-digit WhatsApp number.");await run(env.DB,"INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",k,JSON.stringify({whatsapp_number:n}));continue;}if(k==="free_ads"){const limit=Number(v?.limit),period=Number(v?.period_days);if(!Number.isInteger(limit)||limit<0||limit>1000||![7,15,30,60,90].includes(period))return bad("Invalid free-ad settings.");}await run(env.DB,"INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",str(k,80),JSON.stringify(v));}return out({success:true,message:"Settings saved."})}
  if(p==="/api/admin/contact-settings"&&req.method==="GET"){
   const row=await first(env.DB,"SELECT value FROM settings WHERE key='contact_buttons'");
   let settings={call:true,whatsapp:true};
   if(row?.value){try{settings={...settings,...JSON.parse(row.value)}}catch{}}
   return out({success:true,settings});
  }
  if(p==="/api/admin/contact-settings"&&req.method==="PUT"){
   const b=await readBody(req)||{},settings={call:b.call!==false,whatsapp:b.whatsapp!==false};
   await run(env.DB,"INSERT INTO settings(key,value) VALUES('contact_buttons',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(settings));
   return out({success:true,settings});
  }

  if(p==="/api/admin/form-fields"&&req.method==="GET")return out({success:true,fields:await all(env.DB,"SELECT * FROM form_fields ORDER BY sort_order,id")});
  if(p==="/api/admin/form-fields"&&req.method==="POST"){const b=await readBody(req)||{};if(!str(b.label,100))return bad("Field label required");await run(env.DB,"INSERT INTO form_fields(label,field_type,required,options_json,sort_order,active) VALUES(?,?,?,?,?,1)",str(b.label,100),str(b.field_type||"text",30),b.required?1:0,JSON.stringify(Array.isArray(b.options)?b.options:[]),Number(b.sort_order)||0);return out({success:true})}
  const formField=p.match(/^\/api\/admin\/form-fields\/(\d+)$/);
  if(formField&&req.method==="DELETE"){await run(env.DB,"DELETE FROM form_fields WHERE id=?",formField[1]);return out({success:true})}
  const vipActivate=p.match(/^\/api\/admin\/vip\/(\d+)\/activate$/);
  if(vipActivate&&req.method==="POST"){
   const id=Number(vipActivate[1]);
   const promo=await first(env.DB,"SELECT id,ad_id,days,status FROM vip_promotions WHERE id=?",id);
   if(!promo)return bad("VIP promotion record not found",404);
   const ad=await first(env.DB,"SELECT id,status FROM ads WHERE id=?",promo.ad_id);
   if(!ad||ad.status!=="approved")return bad("Only a published ad can be activated as VIP",400);
   await run(env.DB,"UPDATE vip_promotions SET status='active',created_at=datetime('now') WHERE id=?",id);
   return out({success:true,status:"active",message:"VIP placement activated. Confirm payment before using this action."});
  }
  if(p==="/api/admin/vip"&&req.method==="GET")return out({success:true,promotions:await all(env.DB,"SELECT * FROM vip_promotions ORDER BY created_at DESC LIMIT 200")});
  if(p==="/api/admin/vip"&&req.method==="POST"){const b=await readBody(req)||{},days=Number(b.days)||3,prices={3:300,5:500,7:700},amount=prices[days];if(!prices[days]||!str(b.ad_id,100))return bad("Invalid VIP promotion plan or Ad ID");await run(env.DB,"INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))",str(b.ad_id,100),days,amount,"pending",str(b.reference,120));return out({success:true,amount})}
  return bad("API route not found",404);
 }catch(e){console.error("24Adz.com API error",e);return bad("Internal server error. Check Worker logs.",500)}
}};
