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
from discovery_assets import apply_reviewed_covers,cover_manifest,trusted_cover_url
class CoverManifestTests(unittest.TestCase):
    def setUp(self):
        self.url="https://artist.bandcamp.com/album/record"
        self.art="https://f4.bcbits.com/img/a123_16.jpg"
        self.data={"items":[["record","Record","Artist","2026-11-27","Techno","New release",self.url]],"artwork":{},"artworkSources":{},"reviewedArtwork":{"record":{"title":"Record","artist":"Artist","releaseUrl":self.url,"art":self.art,"source":self.url}}}
    def test_survives_failed_lookup(self):
        apply_reviewed_covers(self.data)
        self.assertEqual(self.data["artwork"]["record"],self.art)
        self.assertEqual(cover_manifest(self.data),self.data["reviewedArtwork"])
    def test_changed_identity_rejected(self):
        for field,value in (("title","Other mix"),("artist","Other artist"),("releaseUrl","https://artist.bandcamp.com/album/other")):
            self.setUp()
            self.data["reviewedArtwork"]["record"][field]=value
            apply_reviewed_covers(self.data)
            self.assertEqual(self.data["artwork"],{})
    def test_reviewed_priority(self):
        self.data["artwork"]["record"]="https://f4.bcbits.com/img/a999_16.jpg"
        apply_reviewed_covers(self.data)
        self.assertEqual(self.data["artwork"]["record"],self.art)
    def test_reject_spoofed_hosts(self):
        for url in ("http://i.scdn.co/image/abc","https://evilcoverartarchive.org/a","https://i.scdn.co.evil.test/a","https://bad@i.scdn.co/image/abc"):
            self.assertFalse(trusted_cover_url(url))
        self.assertTrue(trusted_cover_url("https://i.scdn.co/image/abc"))
from discovery_assets import exact_store_title
class StoreTitleTests(unittest.TestCase):
    def test_exact_and_format(self):
        self.assertTrue(exact_store_title("IONIO EP","IONIO EP","album"))
        self.assertTrue(exact_store_title("IONIO - EP","IONIO EP","album"))
        self.assertTrue(exact_store_title("PIMP - EP","PIMP","album"))
    def test_not_a_different_mix(self):
        self.assertFalse(exact_store_title("Bindweed","Bindweed (Limonata Mix)","album"))
        self.assertFalse(exact_store_title("Track - Radio Edit","Track - Extended Mix","song"))
        self.assertFalse(exact_store_title("Track - Single","Track","song"))
from discovery_assets import load_release_covers,get_art
from embed_sources import apple_identity
class ReleaseCoverFetchTests(unittest.TestCase):
    def test_retained_cover_skips_network(self):
        row=["record","Record","Artist","2026-11-27","Techno","New release","https://artist.bandcamp.com/album/record"]
        art="https://f4.bcbits.com/img/a123_16.jpg"
        data={"items":[row],"reviewedArtwork":{"record":{"title":row[1],"artist":row[2],"releaseUrl":row[6],"art":art,"source":row[6]}}}
        with patch("discovery_assets.get_art") as fetch:
            load_release_covers(data)
            fetch.assert_not_called()
        self.assertEqual(data["artwork"]["record"],art)
    def test_changed_release_redirect_rejected(self):
        from unittest.mock import MagicMock
        response=MagicMock()
        response.__enter__.return_value=response
        response.geturl.return_value="https://artist.bandcamp.com/album/different"
        with patch("discovery_assets.urlopen",return_value=response) as fetch:
            self.assertEqual(get_art("https://artist.bandcamp.com/album/record"),"")
            self.assertEqual(fetch.call_count,1)
    def test_exact_artwork_requires_image_response(self):
        from unittest.mock import MagicMock
        response=MagicMock()
        response.__enter__.return_value=response
        response.geturl.return_value="https://artist.bandcamp.com/album/record"
        response.read.return_value=b'<meta property="og:image" content="https://f4.bcbits.com/img/a123_16.jpg">'
        invalid=Response(b"not image content","text/html")
        with patch("discovery_assets.urlopen",side_effect=[response,invalid]):
            self.assertEqual(get_art(response.geturl.return_value),"")
    def test_apple_identity_matches_expected_kind(self):
        base="https://music.apple.com/gb/album/test/123456"
        self.assertEqual(apple_identity(base+"?uo=4","album")["id"],"123456")
        self.assertEqual(apple_identity(base+"?i=654321","track")["id"],"654321")
        for url,kind in [(base,"track"),(base+"?i=654321","album"),(base+"?i=654321&i=123","track"),(base+"?i=","album"),("https://music.apple.com.evil.test/gb/album/test/123","album")]:
            self.assertIsNone(apple_identity(url,kind))
if __name__=="__main__":unittest.main()
