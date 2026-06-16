"""Threaded static file server for local MaleMetrix preview (no caching)."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Beim lokalen Testen immer frische Dateien ausliefern
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
httpd = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
print(f"Serving MaleMetrix on http://127.0.0.1:{port}")
httpd.serve_forever()
