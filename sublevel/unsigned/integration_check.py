"""Exercise the real Flask routes and PostgreSQL constraints in an isolated
transaction. All synthetic accounts, ratings and test schemas are rolled back.
No production rows or invitation codes are used."""
import os
import secrets
from pathlib import Path
from unittest.mock import patch
from psycopg import sql
from psycopg.rows import dict_row

def run(mod,conn):
    schema="sl_test_"+secrets.token_hex(8)
    password=secrets.token_urlsafe(24)
    invite=secrets.token_urlsafe(24)
    admin_code=secrets.token_urlsafe(24)
    app=mod.app
    def check(condition,label):
        if not condition:raise AssertionError(label)
    def post(client,path,expected=302,**data):
        with client.session_transaction(base_url="https://beta.test") as sess:
            if "csrf" not in sess:sess["csrf"]=secrets.token_urlsafe(32)
            data["csrf"]=sess["csrf"]
        response=client.post(path,data=data,base_url="https://beta.test")
        check(response.status_code==expected,path+" expected "+str(expected)+" got "+str(response.status_code))
        return response
    def get(client,path):
        return client.get(path,base_url="https://beta.test")
    def register(handle):
        c=app.test_client()
        post(c,"/join",handle=handle,password=password,invite=invite)
        return c
    with conn.transaction(force_rollback=True):
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        conn.execute(sql.SQL("SET LOCAL search_path TO {}").format(sql.Identifier(schema)))
        conn.execute(Path(__file__).with_name("schema.sql").read_text())
        # The route helpers use the same test transaction; teardown never closes it.
        with patch.object(mod,"db",return_value=conn),patch.dict(os.environ,{"INVITE_CODE":invite,"ADMIN_CODE":admin_code}):
            guest=app.test_client()
            check(get(guest,"/health").status_code==200,"health")
            check(get(guest,"/submit").status_code==401,"guest submission")
            post(guest,"/join",expected=403,handle="badinvite",password=password,invite="wrong")
            owner=register("test_producer")
            moderator=register("test_moderator")
            post(moderator,"/moderation/unlock",code=admin_code)
            post(owner,"/profile",bio="Synthetic integration-test profile.")
            post(owner,"/submit",expected=400,title="Unsafe link",genre="Jungle",url="https://evil.test/audio",note="",rights="yes")
            response=post(owner,"/submit",title="Test recording",genre="Jungle",url="https://soundcloud.com/example/test-track",note="Integration test only.",rights="yes")
            track_path=response.headers["Location"]
            track_id=int(track_path.rsplit("/",1)[1])
            check(get(guest,track_path).status_code==404,"pending recording private")
            post(owner,"/moderation/track/"+str(track_id),expected=403,action="approve")
            post(moderator,"/moderation/track/"+str(track_id),action="approve")
            check(get(guest,track_path).status_code==200,"approved recording visible")
            check(b"Test recording" in get(guest,"/").data,"published catalogue")
            post(owner,track_path+"/feedback",expected=403,rating="19",body="Self rating should not be accepted.")
            reviewer=register("test_reviewer")
            post(reviewer,track_path+"/feedback",expected=400,rating="20",body="Out of range rating should not be accepted.")
            post(reviewer,track_path+"/feedback",rating="15",body="The arrangement is clear and the bass could be refined.")
            post(reviewer,track_path+"/feedback",rating="17",body="Updated review of the arrangement and bass production.")
            count=conn.execute("SELECT count(*) AS n FROM feedback WHERE track=%s",(track_id,)).fetchone()["n"]
            check(count==1,"one rating per reviewer")
            feedback=conn.execute("SELECT id,rating,status FROM feedback WHERE track=%s",(track_id,)).fetchone()
            check(feedback["rating"]==17 and feedback["status"]=="pending","edited review returns to moderation")
            check(b"Updated review" not in get(guest,track_path).data,"unapproved feedback hidden")
            post(moderator,"/moderation/feedback/"+str(feedback["id"]),action="approve")
            check(b"Updated review" in get(guest,track_path).data,"approved review visible")
            check(b"Rankings will appear" in get(guest,"/").data,"minimum vote threshold")
            # Four more eligible reviewers (including moderator) create five approved ratings.
            reviewers=[moderator]+[register("test_review_"+str(i)) for i in range(3)]
            for c in reviewers:
                post(c,track_path+"/feedback",rating="15",body="Constructive integration-test production feedback.")
            for row in conn.execute("SELECT id FROM feedback WHERE status='pending'").fetchall():
                post(moderator,"/moderation/feedback/"+str(row["id"]),action="approve")
            check(b"12.70 / 19" in get(guest,"/").data,"weighted ranking after five ratings")
            post(reviewer,track_path+"/report",reason="Synthetic report for integration testing.")
            report=conn.execute("SELECT id FROM reports WHERE track=%s",(track_id,)).fetchone()
            post(moderator,"/moderation/report/"+str(report["id"]),action="resolve")
            check(conn.execute("SELECT resolved FROM reports WHERE id=%s",(report["id"],)).fetchone()["resolved"],"report resolved")
            post(reviewer,track_path+"/withdraw",expected=404)
            post(reviewer,track_path+"/withdraw-feedback")
            check(conn.execute("SELECT count(*) AS n FROM feedback WHERE track=%s",(track_id,)).fetchone()["n"]==4,"reviewer can remove only their feedback")
            check(b"Rankings will appear" in get(guest,"/").data,"withdrawn feedback excluded from ranking")
            post(reviewer,track_path+"/feedback",rating="17",body="Reinstated review for deletion regression test.")
            check(conn.execute("SELECT count(*) AS n FROM feedback WHERE track=%s",(track_id,)).fetchone()["n"]==5,"reviewer can submit new feedback")
            post(reviewer,"/logout")
            post(reviewer,"/login",handle="test_reviewer",password=password)
            post(reviewer,"/account/delete",password=password)
            check(conn.execute("SELECT count(*) AS n FROM feedback WHERE track=%s",(track_id,)).fetchone()["n"]==4,"account deletion cascades")
            post(owner,track_path+"/withdraw")
            check(get(guest,track_path).status_code==404,"owner-withdrawn recording private")
            check(b"Test recording" not in get(guest,"/").data,"withdrawn recording excluded from discovery")
            check(get(owner,track_path).status_code==200,"owner retains private track access")
            post(moderator,"/moderation/track/"+str(track_id),action="hide")
            check(get(guest,track_path).status_code==404,"hidden recording private")
    check(conn.execute("SELECT to_regnamespace(%s) IS NULL AS absent",(schema,)).fetchone()["absent"],"test schema rolled back")
    print("Unsigned PostgreSQL route integration passed: registration, login, CSRF, profiles, link validation, private pending tracks, moderation, ratings, duplicate prevention, rank threshold, reports, owner withdrawal, feedback removal, deletion; test schema rolled back.",flush=True)
