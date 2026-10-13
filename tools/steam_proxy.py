#!/usr/bin/env python3
"""
[V1.1.0] Steam Market CORS Proxy
Servidor local mínimo para contornar bloqueio de CORS da Steam.

USO:
    python3 tools/steam_proxy.py

O servidor ficará disponível em http://localhost:8765
Acesse via: http://localhost:8765/price?name={MARKET_HASH_NAME}&currency=7

NOTA: Este servidor roda APENAS localmente e NUNCA envia seus dados para terceiros.
      É 100% transparente e auditável (este é o código fonte completo).
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import sys
from datetime import datetime

PORT = 8765
STEAM_PRICE_URL = "https://steamcommunity.com/market/priceoverview/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TTBH-Proxy/1.1.0"

class SteamProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Rota de health check
        if parsed.path == '/health':
            self.send_json(200, {
                'status': 'ok',
                'service': 'TTBH Steam Proxy',
                'version': '1.1.0',
                'timestamp': datetime.now().isoformat()
            })
            return
        
        # Rota principal: buscar preço
        if parsed.path == '/price':
            params = urllib.parse.parse_qs(parsed.query)
            name = params.get('name', [None])[0]
            currency = params.get('currency', ['7'])[0]
            appid = params.get('appid', ['3678970'])[0]
            
            if not name:
                self.send_json(400, {'error': 'Missing name parameter'})
                return
            
            try:
                # Fazer request real à Steam
                steam_url = f"{STEAM_PRICE_URL}?appid={appid}&currency={currency}&market_hash_name={urllib.parse.quote(name)}"
                req = urllib.request.Request(steam_url, headers={'User-Agent': USER_AGENT})
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    
                    self.send_json(200, {
                        'success': data.get('success', False),
                        'market_hash_name': name,
                        'lowest_price': data.get('lowest_price'),
                        'median_price': data.get('median_price'),
                        'volume': data.get('volume'),
                        'currency': currency,
                        'fetched_at': datetime.now().isoformat()
                    })
            except urllib.error.HTTPError as e:
                self.send_json(e.code, {'error': f'Steam HTTP {e.code}'})
            except Exception as e:
                self.send_json(500, {'error': str(e)})
            return
        
        # Rota desconhecida
        self.send_json(404, {'error': 'Not found'})
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')
    
    def send_json(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def log_message(self, format, *args):
        # Log simplificado
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")

def main():
    print("="*60)
    print("🌐 TTBH Steam Market Proxy v1.1.0")
    print("="*60)
    print(f"📡 Servidor rodando em: http://localhost:{PORT}")
    print(f"🔍 Health check: http://localhost:{PORT}/health")
    print(f"💰 Buscar preço: http://localhost:{PORT}/price?name=ITEM_NAME&currency=7")
    print("="*60)
    print("⚠️  Mantenha esta janela aberta enquanto usa o TTBH")
    print("🛑 Pressione Ctrl+C para parar\n")
    
    # Permitir reuso do socket imediatamente
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SteamProxyHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Proxy parado pelo usuário")
            sys.exit(0)

if __name__ == '__main__':
    main()
