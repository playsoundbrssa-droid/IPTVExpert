#!/usr/bin/env python3
"""
IPTV Expert - Inicia servidores de desenvolvimento (backend com sudo, frontend).
Resolve o problema de terminal para entrada de senha sudo.
"""

import os
import subprocess
import signal
import sys
import time
import threading
from pathlib import Path

# Caminhos dos projetos (calculados a partir do local deste script)
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"

# Processos filhos
backend_proc = None
frontend_proc = None

def cleanup():
    """Encerra todos os processos filhos."""
    print("\n🛑 Encerrando servidores...")
    for proc in (backend_proc, frontend_proc):
        if proc and proc.poll() is None:
            proc.terminate()
    time.sleep(2)
    for proc in (backend_proc, frontend_proc):
        if proc and proc.poll() is None:
            proc.kill()

def signal_handler(sig, frame):
    cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def run_backend():
    """Inicia o backend com sudo, herdando o terminal para interação com a senha."""
    global backend_proc
    print("🔧 Iniciando BACKEND (sudo npm run dev)...")
    print(f"   Diretório: {BACKEND_DIR}")
    print("⚠️  A senha sudo será solicitada no terminal.\n")
    
    # Não redireciona stdout/stderr/stdin -> herda o terminal atual
    cmd = f"cd '{BACKEND_DIR}' && sudo npm run dev"
    backend_proc = subprocess.Popen(
        cmd,
        shell=True,
        # Sem redirecionamento: usa o mesmo terminal que o script
        stdout=None,
        stderr=None,
        stdin=None,
        preexec_fn=os.setsid if os.name != 'nt' else None
    )
    return backend_proc

def run_frontend():
    """Inicia o frontend com captura de saída para prefixar logs."""
    global frontend_proc
    print("\n🎨 Iniciando FRONTEND (npm run dev)...")
    print(f"   Diretório: {FRONTEND_DIR}\n")
    
    cmd = f"cd '{FRONTEND_DIR}' && npm run dev"
    frontend_proc = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1,
        preexec_fn=os.setsid if os.name != 'nt' else None
    )
    return frontend_proc

def monitor_frontend_output():
    """Exibe a saída do frontend com prefixo."""
    for line in iter(frontend_proc.stdout.readline, ""):
        if line:
            print(f"[FRONTEND] {line.rstrip()}")

def main():
    print("🚀 IPTV Expert - Ambiente de Desenvolvimento")
    print("=" * 50)
    
    if not BACKEND_DIR.exists():
        print(f"❌ Diretório backend não encontrado: {BACKEND_DIR}")
        sys.exit(1)
    if not FRONTEND_DIR.exists():
        print(f"❌ Diretório frontend não encontrado: {FRONTEND_DIR}")
        sys.exit(1)
    
    # 1. Backend (interativo, pede senha sudo)
    run_backend()
    
    # Aguarda um pouco para garantir que o sudo foi processado e o backend iniciou
    print("\n⏳ Aguardando 5 segundos para o backend estabilizar...")
    time.sleep(5)
    
    # Verifica se o backend ainda está rodando (caso a senha tenha falhado)
    if backend_proc.poll() is not None:
        print("❌ O backend encerrou inesperadamente. Verifique a senha sudo ou o comando.")
        cleanup()
        sys.exit(1)
    
    # 2. Frontend (captura saída para logs)
    run_frontend()
    
    # Thread para exibir logs do frontend
    t = threading.Thread(target=monitor_frontend_output)
    t.daemon = True
    t.start()
    
    print("\n✅ Ambos os servidores iniciados!")
    print("📋 Logs do frontend aparecerão prefixados com [FRONTEND].")
    print("   Logs do backend aparecerão diretamente no terminal (sem prefixo).")
    print("Pressione Ctrl+C para encerrar.\n")
    
    try:
        # Mantém o script vivo enquanto os processos existirem
        while backend_proc.poll() is None or frontend_proc.poll() is None:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()

if __name__ == "__main__":
    main()