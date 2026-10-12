# Product Requirements Document (PRD): ToolTaskBarHero (TTBH)

## 1. Visão Geral do Produto
O ToolTaskBarHero (TTBH) é uma aplicação web analítica focada em otimizar a progressão de jogadores no RPG incremental Task Bar Hero. A ferramenta atua como um "Save Inspector" autônomo, ingerindo o arquivo de save local do jogador (SaveFile_Live.es3), quebrando a criptografia e processando os dados brutos através de um motor estatístico.

## 2. Arquitetura de Descriptografia e Segurança
O Motor de Save: O jogo utiliza o plugin Easy Save 3 (ES3) da Unity.

O Método de Criptografia: AES (Advanced Encryption Standard), configurado no ES3Defaults.

Vetor de Vulnerabilidade: A chave AES é estática e está armazenada em texto plano no artefato sharedassets0.assets da Unity. Extrairemos ela via Editor Hexadecimal.

Processamento: A quebra do AES ocorre 100% client-side no navegador (via Web Crypto API ou CryptoJS), garantindo privacidade total.

## 3. Funcionalidades Principais (Core Features)
Dashboard de Telemetria: Mapeamento de Ouro, EXP, Nível do Cubo e limite de Baús diários.

Leitor de Inventário: Avaliação de itens por tiers e verificação de limites numéricos baseados no stat_mods.json.

## 4. NOVA FASE: Motor Algorítmico de Estatísticas e Telemetria
Esta fase encapsula as rotinas matemáticas que rodam sobre o save descriptografado, processadas pelo statistics_engine.js:

Módulo de Eficiência de Pets: Simula ganhos projetados para orientar a escolha do pet ideal (Morcego para acúmulo de EXP/Baús; Vigia para fluxo de Ouro).

Módulo de Otimização do Cubo: Aplica rigorosamente a regra da margem de nível (±10 níveis de diferença do Cubo). Separa os itens do inventário automaticamente nas tags Recomendado para Síntese e Recomendado para Alquimia.

Detector de Gargalos (Bottlenecks): Monitora ativamente o Clear Time da equipe no save. Se exceder a zona de eficiência de 60 segundos, recomenda automaticamente o rebaixamento de estágio (down-tiering) para destravar o fluxo de baús.

## 5. Estrutura de Dados Estáticos (Game Database)
A aplicação utilizará tabelas JSON do jogo extraídas:

grades.json: Probabilidades de síntese.

pet_stats.json & stat_mods.json: Multiplicadores globais da IA.