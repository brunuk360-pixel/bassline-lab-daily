import unittest
from unittest.mock import patch
from app import app,music_link
class CommunityTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True,SESSION_COOKIE_SECURE=False)
        self.client=app.test_client()
    def test_music_links(self):
        for x in ["https://soundcloud.com/example/track","https://artist.bandcamp.com/track/music","https://www.youtube.com/watch?v=abcdefghijk","https://youtu.be/abcdefghijk"]:
            self.assertEqual(music_link(x),x)
        for x in ["javascript:alert(1)","http://soundcloud.com/a/b","https://soundcloud.com.evil.test/a/b","https://evil.test/a/b","https://user@soundcloud.com/a/b","https://soundcloud.com:123/a/b","https://www.youtube.com/redirect?q=https://evil.test"]:
            self.assertIsNone(music_link(x))
    def test_post_requires_csrf(self):
        for path in ["/join","/login","/logout","/profile","/submit","/track/1/feedback","/track/1/report","/moderation/unlock","/moderation/track/1","/account/delete"]:
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
if __name__=="__main__":unittest.main()
