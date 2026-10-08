# Local dev server with caching disabled, so edits always show up on reload.
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 3000))
http.server.ThreadingHTTPServer(("", port), NoCache).serve_forever()
