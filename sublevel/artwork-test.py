import io,json,unittest
from unittest.mock import patch
from discovery_assets import spotify_thumbnail
class Response(io.BytesIO):
    def __init__(self,data,mime):
        super().__init__(data);self.headers={"Content-Type":mime}
class ArtworkTests(unittest.TestCase):
    source="https://open.spotify.com/track/5XDOInNwslPcQM8xv2rUkL"
    def meta(self,title="Raindance",art="https://i.scdn.co/image/abc123"):
        return Response(json.dumps({"provider_name":"Spotify","title":title,"thumbnail_url":art}).encode(),"application/json")
    def test_exact_title_and_provider(self):
        with patch("discovery_assets.urlopen",side_effect=[self.meta(),Response(b"image bytes 123456789","image/jpeg")]):
            self.assertEqual(spotify_thumbnail(self.source,"RAINDANCE"),"https://i.scdn.co/image/abc123")
    def test_mismatch_never_fetches_image(self):
        with patch("discovery_assets.urlopen",return_value=self.meta("Raindance - Remix")) as fetch:
            self.assertEqual(spotify_thumbnail(self.source,"RAINDANCE"),"")
            self.assertEqual(fetch.call_count,1)
    def test_untrusted_host(self):
        with patch("discovery_assets.urlopen",return_value=self.meta(art="https://i.scdn.co.evil.test/image/abc")) as fetch:
            self.assertEqual(spotify_thumbnail(self.source,"RAINDANCE"),"")
            self.assertEqual(fetch.call_count,1)
    def test_no_generic_search_sources(self):
        with patch("discovery_assets.urlopen") as fetch:
            self.assertEqual(spotify_thumbnail("https://open.spotify.com/search/raindance","RAINDANCE"),"")
            fetch.assert_not_called()
from embed_sources import Page,identity
from html import escape
class BandcampIdentityTests(unittest.TestCase):
    def props(self,kind,ident):
        return '<meta name="bc-page-properties" content="'+escape(json.dumps({"item_type":kind,"item_id":ident}),quote=True)+'">'
    def check(self,markup,kind="album"):
        page=Page();page.feed(markup)
        return identity(page,"https://artist.bandcamp.com/"+kind+"/release")
    def test_album(self):
        self.assertEqual(self.check(self.props("a",12345)),("album","12345"))
    def test_track(self):
        self.assertEqual(self.check(self.props("t",456),"track"),("track","456"))
    def test_wrong_kind(self):
        self.assertIsNone(self.check(self.props("t",123)))
    def test_conflict(self):
        self.assertIsNone(self.check(self.props("a",123)+'<meta property="og:video" content="https://bandcamp.com/EmbeddedPlayer/album=456/size=large/">'))
    def test_agreement(self):
        self.assertEqual(self.check(self.props("a",123)+'<meta property="og:video" content="https://bandcamp.com/EmbeddedPlayer/album=123/size=large/">'),("album","123"))
    def test_invalid(self):
        for value in (0,-1,"abc","123/track=4",True,None):
            self.assertIsNone(self.check(self.props("a",value)))
    def test_legacy(self):
        self.assertEqual(self.check('<div data-tralbum="'+escape(json.dumps({"current":{"item_type":"a","id":987}}),quote=True)+'"></div>'),("album","987"))
if __name__=="__main__":unittest.main()
