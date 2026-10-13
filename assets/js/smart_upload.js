/**
 * [V1.1.0] Smart Upload - Detecção de SO e Caminhos Padrão
 * Detecta automaticamente o sistema operacional e sugere o caminho correto
 */

export const SmartUpload = {
    // Caminhos padrão por SO
    PATHS: {
        windows: {
            primary: '%USERPROFILE%\\AppData\\LocalLow\\TesseractStudio\\TaskbarHero',
            backup: '%USERPROFILE%\\AppData\\LocalLow\\TesseractStudio\\TaskbarHero\\Backup',
            steam: '%PROGRAMFILES(X86)%\\Steam\\steamapps\\common\\Taskbar Hero',
            display: 'C:\\Users\\{USERNAME}\\AppData\\LocalLow\\TesseractStudio\\TaskbarHero'
        },
        linux: {
            primary: '~/.config/unity3d/TesseractStudio/TaskbarHero',
            backup: '~/.config/unity3d/TesseractStudio/TaskbarHero/Backup',
            steam: '~/.steam/steam/steamapps/common/Taskbar Hero',
            proton: '~/.steam/steam/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero',
            display: '~/.config/unity3d/TesseractStudio/TaskbarHero'
        },
        mac: {
            primary: '~/Library/Application Support/TesseractStudio/TaskbarHero',
            backup: '~/Library/Application Support/TesseractStudio/TaskbarHero/Backup',
            steam: '~/Library/Application Support/Steam/steamapps/common/Taskbar Hero',
            display: '~/Library/Application Support/TesseractStudio/TaskbarHero'
        }
    },

    /**
     * Detecta o sistema operacional do usuário
     */
    detectOS() {
        if (typeof navigator === 'undefined') return 'linux';
        const userAgent = (navigator.userAgent || '').toLowerCase();
        const platform = (navigator.platform || '').toLowerCase();
        
        if (userAgent.includes('win') || platform.includes('win')) {
            return 'windows';
        } else if (userAgent.includes('mac') || platform.includes('mac')) {
            return 'mac';
        } else if (userAgent.includes('linux') || platform.includes('linux')) {
            return 'linux';
        }
        
        return 'windows'; // fallback
    },

    /**
     * Retorna o caminho primário baseado no SO detectado
     */
    getPrimaryPath() {
        const os = this.detectOS();
        return this.PATHS[os].primary;
    },

    /**
     * Retorna todos os caminhos relevantes para o SO
     */
    getAllPaths() {
        const os = this.detectOS();
        return this.PATHS[os];
    },

    /**
     * Copia texto para a área de transferência
     */
    async copyToClipboard(text) {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback:', err);
        }

        // Fallback para ambientes sem Clipboard API
        try {
            if (typeof document !== 'undefined') {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (e) {
            console.warn('Fallback copy failed:', e);
        }
        return false;
    },

    /**
     * Expande variáveis de ambiente (apenas para display)
     */
    expandPath(path) {
        if (this.detectOS() === 'windows') {
            return path;
        } else {
            if (path && path.startsWith('~/')) {
                const home = (typeof process !== 'undefined' && process?.env?.HOME) ? process.env.HOME : '/home/user';
                return path.replace('~', home);
            }
            return path;
        }
    },

    /**
     * Retorna instruções para o usuário
     */
    getOpenInstructions() {
        const os = this.detectOS();
        const path = this.getPrimaryPath();
        
        const instructions = {
            windows: {
                steps: [
                    'Pressione Win + E para abrir o Explorador de Arquivos',
                    `Cole este caminho na barra de endereço: ${path}`,
                    'Pressione Enter para navegar até a pasta',
                    'Selecione os arquivos e arraste para o TTBH'
                ],
                shortcut: 'Win + E'
            },
            linux: {
                steps: [
                    'Abra seu gerenciador de arquivos (Nautilus, Dolphin, Thunar, etc.)',
                    'Pressione Ctrl + L para focar na barra de endereço',
                    `Cole este caminho: ${path}`,
                    'Pressione Enter para navegar até a pasta',
                    'Selecione os arquivos e arraste para o TTBH'
                ],
                shortcut: 'Ctrl + L'
            },
            mac: {
                steps: [
                    'Abra o Finder',
                    'Pressione Cmd + Shift + G para "Ir para Pasta"',
                    `Cole este caminho: ${path}`,
                    'Pressione Enter para navegar até a pasta',
                    'Selecione os arquivos e arraste para o TTBH'
                ],
                shortcut: 'Cmd + Shift + G'
            }
        };
        
        return instructions[os] || instructions.windows;
    }
};

if (typeof window !== 'undefined') {
    window.TTBH_SmartUpload = SmartUpload;
    window.SmartUpload = SmartUpload;
}
