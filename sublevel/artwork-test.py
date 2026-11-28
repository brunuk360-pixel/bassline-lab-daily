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
if __name__=="__main__":unittest.main()
