#!/usr/bin/env python3
"""
Test runner & Environment probe for ToolTaskBarHero (TTBH).
Support probe mode: python3 tools/test_runner.py --probe
"""

import sys
import os
import shutil
import subprocess

def probe_environment():
    """Detects available toolchain and runtime capabilities."""
    report = {}
    
    # Check Python
    report['PYTHON3'] = sys.version.split()[0]
    
    # Check Git
    git_path = shutil.which('git')
    if git_path:
        try:
            git_ver = subprocess.check_output(['git', '--version'], text=True).strip()
            report['GIT'] = git_ver
        except Exception:
            report['GIT'] = 'available'
    else:
        report['GIT'] = 'not_found'
        
    # Check Node (PATH or NVM)
    node_path = shutil.which('node')
    if not node_path:
        # Check standard NVM location if available
        nvm_default = os.path.expanduser('~/.nvm/versions/node/v24.15.0/bin/node')
        if os.path.isfile(nvm_default) and os.access(nvm_default, os.X_OK):
            node_path = nvm_default

    if node_path:
        try:
            node_ver = subprocess.check_output([node_path, '-v'], text=True).strip()
            report['NODE'] = f"{node_ver} ({node_path})"
        except Exception:
            report['NODE'] = f"available ({node_path})"
    else:
        report['NODE'] = 'not_found'

    # Check Deno and Bun
    report['DENO'] = shutil.which('deno') or 'not_found'
    report['BUN'] = shutil.which('bun') or 'not_found'
    
    # Check Write Permission
    probe_file = '.probe_write_test'
    try:
        with open(probe_file, 'w') as f:
            f.write('ok')
        os.remove(probe_file)
        report['WRITE_PERMISSION'] = 'granted'
    except Exception:
        report['WRITE_PERMISSION'] = 'denied'

    return report

def main():
    if '--probe' in sys.argv:
        probe = probe_environment()
        # Print diagnostic details
        print(f"[PROBE] Python: {probe['PYTHON3']}")
        print(f"[PROBE] Git: {probe['GIT']}")
        print(f"[PROBE] Node: {probe['NODE']}")
        print(f"[PROBE] Deno: {probe['DENO']}")
        print(f"[PROBE] Bun: {probe['BUN']}")
        print(f"[PROBE] Write: {probe['WRITE_PERMISSION']}")
        # Required signal output
        print("ENV_PROBE_OK")
        sys.exit(0)

    print("TTBH Test Runner. Use --probe to inspect environment.")
    sys.exit(0)

if __name__ == '__main__':
    main()
