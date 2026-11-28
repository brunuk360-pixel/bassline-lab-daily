import unittest
from unittest.mock import patch
from app import app,music_link,player_spec,recovery_digest
class CommunityTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True,SESSION_COOKIE_SECURE=False)
        self.client=app.test_client()
    def test_music_links(self):
        for x in ["https://soundcloud.com/example/track","https://artist.bandcamp.com/track/music","https://www.youtube.com/watch?v=abcdefghijk","https://youtu.be/abcdefghijk"]:
            self.assertEqual(music_link(x),x)
        for x in ["javascript:alert(1)","http://soundcloud.com/a/b","https://soundcloud.com.evil.test/a/b","https://evil.test/a/b","https://user@soundcloud.com/a/b","https://soundcloud.com:123/a/b","https://www.youtube.com/redirect?q=https://evil.test"]:
            self.assertIsNone(music_link(x))
    def test_player_allowlist(self):
        self.assertTrue(player_spec("https://soundcloud.com/example/track")["src"].startswith("https://w.soundcloud.com/player/"))
        self.assertEqual(player_spec("https://youtu.be/abcdefghijk")["src"],"https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1")
        self.assertIsNone(player_spec("https://soundcloud.com.evil.test/a/b"))
        self.assertIsNone(player_spec("https://artist.bandcamp.com/track/music","https://evil.test/EmbeddedPlayer/track=123/"))
        self.assertIsNone(player_spec("https://artist.bandcamp.com/track/music","https://bandcamp.com/EmbeddedPlayer/album=123/"))
        self.assertTrue(player_spec("https://artist.bandcamp.com/track/music","https://bandcamp.com/EmbeddedPlayer/track=123/")["src"].startswith("https://bandcamp.com/EmbeddedPlayer/track=123/"))
    def test_post_requires_csrf(self):
        for path in ["/join","/login","/logout","/profile","/submit","/track/1/feedback","/track/1/report","/moderation/unlock","/moderation/track/1","/account/delete","/account/password","/account/export","/account/recovery-code","/recover","/track/1/withdraw","/track/1/withdraw-feedback"]:
            self.assertEqual(self.client.post(path).status_code,403,path)
    def test_login_form_security_headers(self):
        response=self.client.get("/login")
        self.assertEqual(response.status_code,200)
        self.assertIn(b'name="csrf"',response.data)
        self.assertIn("frame-ancestors 'none'",response.headers["Content-Security-Policy"])
        self.assertEqual(response.headers["Cache-Control"],"no-store")
    def test_guest_cannot_submit(self):
        self.assertEqual(self.client.get("/submit").status_code,401)
    def test_guest_cannot_moderate(self):
        self.assertEqual(self.client.get("/moderation").status_code,401)
    def test_no_fake_rankings(self):
        with patch("app.rows",return_value=[]):
            response=self.client.get("/")
            self.assertEqual(response.status_code,200)
            self.assertIn(b"Rankings will appear",response.data)
    def test_public_community_guide(self):
        response=self.client.get("/community-guide")
        self.assertEqual(response.status_code,200)
        self.assertIn(b"Your information",response.data)
        self.assertIn(b"not a complete privacy notice",response.data)
    def test_guest_cannot_withdraw(self):
        with self.client.session_transaction() as sess:sess["csrf"]="test-csrf"
        for path in ("/track/1/withdraw","/track/1/withdraw-feedback","/account/password","/account/export","/account/recovery-code"):
            self.assertEqual(self.client.post(path,data={"csrf":"test-csrf"}).status_code,401)
    def test_recovery_digest_and_form(self):
        import secrets
        code=secrets.token_urlsafe(32)
        self.assertEqual(len(recovery_digest(code)),64)
        self.assertNotEqual(code,recovery_digest(code))
        self.assertIsNone(recovery_digest("short"))
        self.assertIsNone(recovery_digest("a"*42+"!"))
        response=self.client.get("/recover")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.headers["Cache-Control"],"no-store")
        self.assertIn(b'name="csrf"',response.data)
        self.assertIn(b"no email reset",response.data)
if __name__=="__main__":unittest.main()
