"""SUBLEVEL Unsigned — invite-only, moderated community pilot."""
import os, re, secrets, hmac, hashlib
from datetime import timedelta
from urllib.parse import urlsplit, urlencode, parse_qs
from flask import Flask, request, session, g, abort, redirect, url_for, render_template, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg
from psycopg.rows import dict_row

app=Flask(__name__)
app.config.update(SECRET_KEY=os.environ.get("SECRET_KEY") or secrets.token_hex(32),
 SESSION_COOKIE_SECURE=True,SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE="Lax",
 PERMANENT_SESSION_LIFETIME=timedelta(hours=12),MAX_CONTENT_LENGTH=16384)
GENRES=("Drum & Bass","Jungle","UK garage","House","Techno","Dubstep","Ambient","Experimental","Other")
HANDLE=re.compile(r"[a-z0-9_]{3,24}\Z")
def music_link(raw):
    try:
        u=urlsplit(raw.strip())
        if u.scheme!="https" or u.username or u.password or u.port or u.fragment or len(raw)>500:return None
        host=u.hostname or ""
        p=u.path.rstrip("/")
        if (host in ("soundcloud.com","www.soundcloud.com") and re.fullmatch(r"/[\w.-]+/[\w.-]+",p)
            or host.endswith(".bandcamp.com") and re.fullmatch(r"/(?:track|album)/[\w.-]+",p)
            or host in ("www.youtube.com","youtube.com","music.youtube.com") and p=="/watch" and re.search(r"(?:^|&)v=[A-Za-z0-9_-]{11}(?:&|$)",u.query)
            or host=="youtu.be" and re.fullmatch(r"/[A-Za-z0-9_-]{11}",p)):
            return u.geturl()
    except (ValueError,AttributeError):pass
    return None
def player_spec(raw,bandcamp_embed=""):
    url=music_link(raw)
    if not url:return None
    u=urlsplit(url);host=u.hostname or ""
    if host in ("soundcloud.com","www.soundcloud.com"):
        return {"name":"SoundCloud","src":"https://w.soundcloud.com/player/?"+urlencode({"url":"https://soundcloud.com"+u.path,"auto_play":"false","visual":"false"}),"height":166}
    if host in ("youtube.com","www.youtube.com","music.youtube.com","youtu.be"):
        vid=u.path.strip("/") if host=="youtu.be" else parse_qs(u.query).get("v",[""])[0]
        if re.fullmatch(r"[A-Za-z0-9_-]{11}",vid):
            return {"name":"YouTube","src":"https://www.youtube-nocookie.com/embed/"+vid+"?playsinline=1","height":220}
    if host.endswith(".bandcamp.com") and bandcamp_embed:
        try:
            e=urlsplit(bandcamp_embed)
            if e.scheme!="https" or e.hostname!="bandcamp.com" or e.username or e.password or e.port or not e.path.startswith("/EmbeddedPlayer/"):return None
            kind="track" if u.path.startswith("/track/") else "album"
            m=re.search(r"(?:^|/)"+kind+r"=(\d{1,12})(?:/|$)",e.path)
            if m:
                return {"name":"Bandcamp","src":"https://bandcamp.com/EmbeddedPlayer/"+kind+"="+m.group(1)+"/size=large/bgcol=101b1c/linkcol=79c9b7/tracklist=false/artwork=small/transparent=true/","height":120}
        except ValueError:pass
    return None
def field(name,maxlen,minimum=1):
    value=request.form.get(name,"").strip()
    if not minimum<=len(value)<=maxlen:abort(400,"Please check "+name.replace("_"," ")+".")
    return value
def db():
    if "db" not in g:g.db=psycopg.connect(os.environ["DATABASE_URL"],row_factory=dict_row,autocommit=True,connect_timeout=6)
    return g.db
def one(sql,args=()):return db().execute(sql,args).fetchone()
def rows(sql,args=()):return db().execute(sql,args).fetchall()
@app.teardown_appcontext
def close_db(_):
    conn=g.pop("db",None)
    if conn:conn.close()
def csrf():
    if "csrf" not in session:session["csrf"]=secrets.token_urlsafe(32)
    return session["csrf"]
app.jinja_env.globals["csrf"]=csrf
@app.before_request
def protect():
    if request.method=="POST":
        token=request.form.get("csrf","")
        if not session.get("csrf") or not hmac.compare_digest(token.encode(),session["csrf"].encode()):abort(403)
    g.user=None
    if request.endpoint not in ("static","health") and isinstance(session.get("uid"),int):
        g.user=one("SELECT id,handle,bio,is_admin FROM members WHERE id=%s AND active AND session_version=%s",(session["uid"],session.get("version") if isinstance(session.get("version"),int) else 0))
        if not g.user:session.clear()
@app.after_request
def headers(response):
    response.headers["Content-Security-Policy"]="default-src 'none'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; script-src 'self'; frame-src https://w.soundcloud.com https://www.youtube-nocookie.com https://bandcamp.com"
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["Referrer-Policy"]="no-referrer"
    response.headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"]="no-store"
    response.headers["X-Robots-Tag"]="noindex, nofollow"
    response.headers["X-Frame-Options"]="DENY"
    return response
def limit(action,maximum,identity=None):
    # Database-backed hourly budget, not reset by restarting a server.
    key=hmac.new(app.secret_key.encode(),(action+":"+str(identity or request.remote_addr or "unknown")).encode(),hashlib.sha256).hexdigest()
    item=one("""INSERT INTO limits(key,hour,n) VALUES(%s,date_trunc('hour',now()),1)
    ON CONFLICT(key,hour) DO UPDATE SET n=limits.n+1 RETURNING n""",(key,))
    if item["n"]>maximum:abort(429,"Please try again later.")
def member():
    if not g.user:abort(401,"Sign in to continue.")
    return g.user["id"]
def admin():
    member()
    if not g.user["is_admin"]:abort(403)
def secret_matches(name,value):
    configured=os.environ.get(name,"")
    return bool(configured) and hmac.compare_digest(configured.encode(),value.encode())
@app.get("/health")
def health():
    one("SELECT 1 AS ok FROM members LIMIT 1")
    return {"status":"ok","database":"reachable"}
@app.get("/")
def home():
    genre=request.args.get("genre","")
    if genre not in GENRES:genre=""
    tracks=rows("""SELECT t.id,t.title,t.genre,t.url,t.note,m.handle,
      count(f.id) FILTER(WHERE f.status='approved' AND reviewer.active AND f.author<>t.owner) AS votes,
      round(avg(f.rating) FILTER(WHERE f.status='approved' AND reviewer.active AND f.author<>t.owner),1) AS rating
      FROM tracks t JOIN members m ON m.id=t.owner LEFT JOIN feedback f ON f.track=t.id LEFT JOIN members reviewer ON reviewer.id=f.author
      WHERE t.status='approved' AND m.active AND (%s='' OR t.genre=%s)
      GROUP BY t.id,m.handle ORDER BY t.created DESC LIMIT 60""",(genre,genre))
    # One equally weighted contribution per active reviewer per producer.
    chart=rows("""WITH reviewer_scores AS (
      SELECT t.owner AS producer,f.author,avg(f.rating) AS rating
      FROM tracks t JOIN feedback f ON f.track=t.id AND f.status='approved'
      JOIN members reviewer ON reviewer.id=f.author AND reviewer.active
      WHERE t.status='approved' AND f.author<>t.owner
      GROUP BY t.owner,f.author
      )
      SELECT m.handle,count(s.author) AS votes,round(avg(s.rating),1) AS rating,
      round((sum(s.rating)+5*10.0)/(count(s.author)+5),2) AS score
      FROM members m JOIN reviewer_scores s ON s.producer=m.id
      WHERE m.active GROUP BY m.id,m.handle HAVING count(s.author)>=5
      ORDER BY score DESC,votes DESC,m.handle LIMIT 20""")
    return render_template("page.html",view="home",tracks=tracks,chart=chart,genre=genre,genres=GENRES)
@app.get("/community-guide")
def community_guide():return render_template("page.html",view="guide")
@app.get("/join")
def join_page():return render_template("page.html",view="join")
@app.post("/join")
def join():
    limit("join",8)
    handle=field("handle",24,3).lower()
    password=request.form.get("password","")
    if not HANDLE.fullmatch(handle) or not 12<=len(password)<=128:abort(400,"Use a valid handle and a password of 12–128 characters.")
    if not secret_matches("INVITE_CODE",request.form.get("invite","")):abort(403,"A beta invitation is required.")
    row=one("INSERT INTO members(handle,password_hash) VALUES(%s,%s) ON CONFLICT(handle) DO NOTHING RETURNING id,session_version",(handle,generate_password_hash(password,method="scrypt")))
    if not row:abort(400,"Handle unavailable.")
    session.clear();session["uid"]=row["id"];session["version"]=row["session_version"];session.permanent=True
    return redirect(url_for("profile",handle=handle))
@app.get("/login")
def login_page():return render_template("page.html",view="login")
@app.post("/login")
def login():
    handle=field("handle",24,3).lower()
    limit("login-ip",30);limit("login-account",8,handle)
    password=request.form.get("password","")
    if not 12<=len(password)<=128:abort(400)
    user=one("SELECT id,password_hash,session_version FROM members WHERE handle=%s AND active",(handle,))
    if not user or not check_password_hash(user["password_hash"],password):abort(401,"Incorrect handle or password.")
    session.clear();session["uid"]=user["id"];session["version"]=user["session_version"];session.permanent=True
    return redirect(url_for("home"))
@app.post("/logout")
def logout():
    session.clear();return redirect(url_for("home"))
@app.get("/producer/<handle>")
def profile(handle):
    user=one("SELECT id,handle,bio FROM members WHERE handle=%s AND active",(handle,))
    if not user:abort(404)
    owner=g.user and g.user["id"]==user["id"]
    tracks=rows("SELECT id,title,genre,status FROM tracks WHERE owner=%s AND (status='approved' OR %s) ORDER BY created DESC",(user["id"],bool(owner)))
    return render_template("page.html",view="profile",producer=user,tracks=tracks,owner=owner)
@app.post("/profile")
def edit_profile():
    uid=member();limit("profile",20,uid)
    db().execute("UPDATE members SET bio=%s WHERE id=%s",(field("bio",600,0),uid))
    return redirect(url_for("profile",handle=g.user["handle"]))
@app.get("/submit")
def submit_page():member();return render_template("page.html",view="submit",genres=GENRES)
@app.post("/submit")
def submit():
    uid=member();limit("submit",5,uid)
    genre=field("genre",40);url=music_link(field("url",500))
    if genre not in GENRES or not url:abort(400,"Choose a genre and a supported public music link.")
    if request.form.get("rights")!="yes":abort(400,"Confirm that you have permission to share the recording.")
    embed=field("embed_url",500,0)
    if embed:
        spec=player_spec(url,embed)
        if not spec or spec["name"]!="Bandcamp":abort(400,"Use the official Bandcamp embed URL, not HTML.")
        embed=spec["src"]
    row=one("INSERT INTO tracks(owner,title,genre,url,note,embed_url) VALUES(%s,%s,%s,%s,%s,%s) RETURNING id",(uid,field("title",100),genre,url,field("note",1200,0),embed))
    flash("Submitted for moderation. It will appear publicly after approval.")
    return redirect(url_for("track",track_id=row["id"]))
def accessible_track(track_id):
    t=one("SELECT t.*,m.handle FROM tracks t JOIN members m ON m.id=t.owner WHERE t.id=%s AND m.active",(track_id,))
    if not t or (t["status"]!="approved" and not (g.user and (g.user["id"]==t["owner"] or g.user["is_admin"]))):abort(404)
    return t
@app.get("/track/<int:track_id>")
def track(track_id):
    t=accessible_track(track_id)
    feedback=rows("""SELECT f.rating,f.body,m.handle FROM feedback f JOIN members m ON m.id=f.author
      WHERE f.track=%s AND f.status='approved' AND m.active ORDER BY f.created DESC LIMIT 100""",(track_id,))
    own=one("SELECT rating,body,status FROM feedback WHERE track=%s AND author=%s",(track_id,g.user["id"])) if g.user else None
    return render_template("page.html",view="track",t=t,feedback=feedback,own=own,player=player_spec(t["url"],t.get("embed_url","")))
@app.post("/track/<int:track_id>/feedback")
def rate(track_id):
    uid=member();limit("feedback",20,uid);t=accessible_track(track_id)
    if t["status"]!="approved" or t["owner"]==uid:abort(403)
    try:rating=int(request.form.get("rating",""))
    except ValueError:abort(400)
    if not 1<=rating<=19:abort(400,"Choose a rating from 1 to 19.")
    body=field("body",1500,20)
    db().execute("""INSERT INTO feedback(track,author,rating,body) VALUES(%s,%s,%s,%s)
    ON CONFLICT(track,author) DO UPDATE SET rating=EXCLUDED.rating,body=EXCLUDED.body,status='pending',created=now()""",(track_id,uid,rating,body))
    flash("Feedback sent for review. Only approved ratings count.");return redirect(url_for("track",track_id=track_id))
@app.post("/track/<int:track_id>/withdraw")
def withdraw_track(track_id):
    uid=member();limit("withdraw",20,uid)
    # An owner can withdraw their own pending or published recording only.
    changed=one("UPDATE tracks SET status='hidden',withdrawn=true WHERE id=%s AND owner=%s RETURNING id",(track_id,uid))
    if not changed:abort(404)
    flash("Track withdrawn from public discovery and rankings. Your linked release has not been deleted.")
    return redirect(url_for("profile",handle=g.user["handle"]))
@app.post("/track/<int:track_id>/withdraw-feedback")
def withdraw_feedback(track_id):
    uid=member();limit("withdraw-feedback",20,uid);accessible_track(track_id)
    db().execute("DELETE FROM feedback WHERE track=%s AND author=%s",(track_id,uid))
    flash("Your feedback and rating have been removed.")
    return redirect(url_for("track",track_id=track_id))
@app.post("/track/<int:track_id>/report")
def report(track_id):
    uid=member();limit("report",10,uid);accessible_track(track_id)
    db().execute("INSERT INTO reports(track,author,reason) VALUES(%s,%s,%s) ON CONFLICT(track,author) DO NOTHING",(track_id,uid,field("reason",400,10)))
    flash("Report submitted.");return redirect(url_for("track",track_id=track_id))
@app.get("/moderation")
def moderation():
    member()
    if not g.user["is_admin"]:return render_template("page.html",view="unlock")
    return render_template("page.html",view="moderation",
      tracks=rows("SELECT t.*,m.handle FROM tracks t JOIN members m ON m.id=t.owner WHERE t.status='pending' AND NOT t.withdrawn AND m.active ORDER BY t.created LIMIT 100"),
      feedback=rows("SELECT f.*,m.handle,t.title FROM feedback f JOIN members m ON m.id=f.author JOIN tracks t ON t.id=f.track WHERE f.status='pending' AND t.status='approved' AND NOT t.withdrawn AND m.active ORDER BY f.created LIMIT 100"),
      reports=rows("SELECT r.*,t.title FROM reports r JOIN tracks t ON t.id=r.track WHERE NOT r.resolved ORDER BY r.created LIMIT 100"))
@app.post("/moderation/unlock")
def unlock():
    uid=member();limit("admin",5,uid)
    if not secret_matches("ADMIN_CODE",request.form.get("code","")):abort(403)
    db().execute("UPDATE members SET is_admin=true WHERE id=%s",(uid,))
    return redirect(url_for("moderation"))
@app.post("/moderation/<kind>/<int:item_id>")
def moderate(kind,item_id):
    admin();action=request.form.get("action","")
    limit("moderate",200,g.user["id"])
    if kind=="report" and action=="resolve":
        db().execute("UPDATE reports SET resolved=true WHERE id=%s",(item_id,))
    elif kind=="track" and action in ("approve","hide"):
        if action=="approve":
            changed=one("""UPDATE tracks SET status='approved' WHERE id=%s AND status='pending' AND NOT withdrawn
              AND EXISTS(SELECT 1 FROM members m WHERE m.id=tracks.owner AND m.active) RETURNING id""",(item_id,))
            if not changed:abort(409,"This submission is no longer awaiting approval.")
        else:db().execute("UPDATE tracks SET status='hidden' WHERE id=%s",(item_id,))
    elif kind=="feedback" and action in ("approve","hide"):
        if action=="approve":
            changed=one("""UPDATE feedback SET status='approved' WHERE id=%s AND status='pending'
              AND EXISTS(SELECT 1 FROM tracks t JOIN members m ON m.id=t.owner AND m.active
              WHERE t.id=feedback.track AND t.status='approved' AND NOT t.withdrawn AND t.owner<>feedback.author)
              AND EXISTS(SELECT 1 FROM members r WHERE r.id=feedback.author AND r.active) RETURNING id""",(item_id,))
            if not changed:abort(409,"This review is no longer eligible for approval.")
        else:db().execute("UPDATE feedback SET status='hidden' WHERE id=%s",(item_id,))
    else:abort(400)
    return redirect(url_for("moderation"))
def confirm_account(uid,password):
    if not 12<=len(password)<=128:abort(403,"Incorrect password.")
    user=one("SELECT password_hash,session_version FROM members WHERE id=%s AND active",(uid,))
    if not user or not check_password_hash(user["password_hash"],password):abort(403,"Incorrect password.")
    return user
@app.post("/account/password")
def change_password():
    uid=member();limit("password-change",5,uid)
    current=request.form.get("password","")
    replacement=request.form.get("new_password","")
    if not 12<=len(replacement)<=128 or replacement!=request.form.get("confirm_password","") or replacement==current:
        abort(400,"Choose a different password of 12–128 characters and confirm it.")
    user=confirm_account(uid,current)
    changed=one("UPDATE members SET password_hash=%s,recovery_hash=NULL,session_version=session_version+1 WHERE id=%s AND session_version=%s RETURNING session_version",(generate_password_hash(replacement,method="scrypt"),uid,user["session_version"]))
    if not changed:abort(403,"Account changed. Please sign in again.")
    session.clear()
    flash("Password updated. All previous sessions have been signed out. Sign in with your new password.")
    return redirect(url_for("login_page"))
def recovery_digest(code):
    if not isinstance(code,str) or not re.fullmatch(r"[A-Za-z0-9_-]{43}",code):return None
    return hashlib.sha256(code.encode("ascii")).hexdigest()
@app.post("/account/recovery-code")
def create_recovery_code():
    uid=member();limit("recovery-create",5,uid)
    user=confirm_account(uid,request.form.get("password",""))
    code=secrets.token_urlsafe(32)
    changed=one("UPDATE members SET recovery_hash=%s WHERE id=%s AND session_version=%s AND active RETURNING id",(recovery_digest(code),uid,user["session_version"]))
    if not changed:abort(403,"Account changed. Please sign in again.")
    # The plaintext code is shown once in the direct POST response only.
    # It is never placed in cookies, query strings, logs or account exports.
    return render_template("page.html",view="recovery_code",code=code)
@app.get("/recover")
def recover_page():return render_template("page.html",view="recover")
@app.post("/recover")
def recover_account():
    handle=field("handle",24,3).lower()
    limit("recovery-ip",20);limit("recovery-account",5,handle)
    replacement=request.form.get("new_password","")
    if not 12<=len(replacement)<=128 or replacement!=request.form.get("confirm_password",""):
        abort(400,"Choose a password of 12–128 characters and confirm it.")
    digest=recovery_digest(request.form.get("recovery_code","").strip())
    if not HANDLE.fullmatch(handle) or not digest:abort(403,"Incorrect handle or recovery code.")
    user=one("SELECT id,session_version,recovery_hash FROM members WHERE handle=%s AND active",(handle,))
    if not user or not user["recovery_hash"] or not hmac.compare_digest(user["recovery_hash"],digest):
        abort(403,"Incorrect handle or recovery code.")
    changed=one("UPDATE members SET password_hash=%s,recovery_hash=NULL,session_version=session_version+1 WHERE id=%s AND session_version=%s AND recovery_hash=%s AND active RETURNING id",(generate_password_hash(replacement,method="scrypt"),user["id"],user["session_version"],digest))
    if not changed:abort(403,"Incorrect handle or recovery code.")
    session.clear()
    flash("Password reset. Your recovery code was used and all old sessions were signed out. Sign in and create a new recovery code.")
    return redirect(url_for("login_page"))
@app.post("/account/export")
def export_account():
    uid=member();limit("account-export",5,uid)
    confirm_account(uid,request.form.get("password",""))
    # Explicit fields: no password hashes, session versions, rate-limit keys,
    # private reviews by other members, or moderator credentials.
    profile=one("SELECT handle,bio,created FROM members WHERE id=%s",(uid,))
    payload={"format":"sublevel-unsigned-member-v1","profile":profile,
      "submissions":rows("SELECT id,title,genre,url,note,status,created,embed_url FROM tracks WHERE owner=%s ORDER BY created",(uid,)),
      "feedback":rows("SELECT track,rating,body,status,created FROM feedback WHERE author=%s ORDER BY created",(uid,)),
      "reports":rows("SELECT track,reason,resolved,created FROM reports WHERE author=%s ORDER BY created",(uid,))}
    response=jsonify(payload)
    response.headers["Content-Disposition"]='attachment; filename="unsigned-account.json"'
    return response
@app.post("/account/delete")
def delete_account():
    uid=member();password=request.form.get("password","");limit("delete",5,uid)
    user=one("SELECT password_hash FROM members WHERE id=%s",(uid,))
    if not user or len(password)>128 or not check_password_hash(user["password_hash"],password):abort(403)
    db().execute("DELETE FROM members WHERE id=%s",(uid,))
    session.clear();return redirect(url_for("home"))
@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(409)
@app.errorhandler(413)
@app.errorhandler(429)
def error(e):return render_template("page.html",view="error",error=e),e.code

if __name__=="__main__":
    with psycopg.connect(os.environ["DATABASE_URL"],autocommit=True,connect_timeout=15,row_factory=dict_row) as conn:
        from pathlib import Path
        conn.execute(Path(__file__).with_name("schema.sql").read_text())
        import sys
        from integration_check import run
        run(sys.modules[__name__],conn)
    print("Unsigned schema initialised.",flush=True)
