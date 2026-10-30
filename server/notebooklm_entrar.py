"""Janela de login do Google pro NotebookLM (aberta pelo botão "Entrar no Google").

Quem digita a senha é a pessoa, na janela; o app nunca vê a senha.
Usa o perfil persistente da notebooklm-py e só fecha quando o NotebookLM abre
LOGADO de verdade: cookie SID sozinho não prova (cookie velho continua lá), por
isso confere o token SNlM0e, que só vem na página de quem está logado.

Uso: python -I notebooklm_entrar.py <pasta do perfil>
"""
import sys
import time

from playwright.sync_api import sync_playwright

ESPERA_S = 900
URL = "https://notebooklm.google.com/"

perfil = sys.argv[1]
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir=perfil,
        headless=False,
        args=["--disable-blink-features=AutomationControlled", "--password-store=basic"],
        ignore_default_args=["--enable-automation"],
    )
    pagina = ctx.pages[0] if ctx.pages else ctx.new_page()
    pagina.goto(URL)
    print("JANELA_ABERTA", flush=True)
    fim = time.time() + ESPERA_S
    ok = False
    while time.time() < fim:
        try:
            if "SNlM0e" in pagina.content() and "accounts.google" not in pagina.url:
                ok = True
                break
        except Exception:
            pass  # a página estava trocando de endereço; tenta de novo
        try:
            pagina.wait_for_timeout(2000)
        except Exception:
            break  # a pessoa fechou a janela
    print("LOGIN_OK" if ok else "SEM_LOGIN", flush=True)
    try:
        if ok:
            pagina.wait_for_timeout(2000)
        ctx.close()
    except Exception:
        pass
