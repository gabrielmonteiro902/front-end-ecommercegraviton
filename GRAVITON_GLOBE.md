# Graviton — Globo Orbital 3D

Documentação técnica de tudo que foi construído na feature do Globo de Commits 3D.

---

## Visão Geral

O Globo Orbital é uma visualização 3D interativa feita com **Three.js** que representa um repositório GitHub como um planeta. Os contribuidores do repositório aparecem como satélites flutuando acima de seus "continentes" de commits na superfície do planeta.

---

## Fluxo de Navegação

```
WelcomePage (login)
  └─ HomePage (/graviton-home)
       └─ "Ver contribuidores" → SyncLoadingPage (/sync-loading)
              └─ GlobePage (/globe?repository_id=X)
```

### Detalhamento

| Etapa | Rota | O que acontece |
|---|---|---|
| Login | `/` | Autenticação via WelcomePage |
| Lista de repos | `/graviton-home` | Usuário vê repositórios cadastrados |
| Loading | `/sync-loading` | Busca contribuidores em background, mín. 2.5s de animação |
| Globo | `/globe?repository_id=X` | Renderização 3D full-screen |

---

## Arquivos Criados/Modificados

### Criados

#### `src/components/GravityGlobe.tsx`
Componente Three.js puro. Toda a lógica 3D fica aqui.

#### `src/pages/GlobePage.tsx`
Página full-screen (sem Sidebar) que envolve o `GravityGlobe`. Recebe os dados de contributors via `location.state` (passados pelo SyncLoadingPage) ou faz o fetch diretamente se acessada por URL.

### Modificados

#### `src/pages/SyncLoadingPage.tsx`
Reescrito para:
- Buscar `/contributions?repository_id=X` em background
- Exibir animação com mensagens ciclando a cada 600ms
- Garantir mínimo de 2.5s de exibição antes de navegar
- Navegar para `/globe` passando os dados no `state` (evita segundo fetch)

#### `src/pages/HomePage.tsx`
Botão "Ver contribuidores" alterado de:
```ts
navigate(`/contributors?repository_id=${repo.id}`)
```
Para:
```ts
navigate('/sync-loading', { state: { repoId: repo.id } })
```

#### `src/App.tsx`
Adicionada rota `/globe` sem Sidebar:
```tsx
<Route path="/globe" element={
  <ProtectedRoute>
    <GlobePage />
  </ProtectedRoute>
} />
```

---

## Arquitetura do GravityGlobe

### Constantes de configuração

```ts
PLANET_RADIUS = 3.2      // Raio do planeta (60% maior que o original de 2.0)
CUBE_SIZE     = 0.115    // Tamanho de cada cubo da superfície
NUM_LATS      = 44       // Faixas de latitude
NUM_LONS_MAX  = 72       // Máximo de cubos por longitude (equador)
```

### 1. Planeta — InstancedMesh

O planeta é construído com **~2000 cubos** posicionados sobre uma esfera via coordenadas esféricas:

```
phi   = latitude  (0 → PI)
theta = longitude (0 → 2*PI)
lonCount = round(NUM_LONS_MAX * sin(phi))  ← menos cubos nos polos, mais no equador
```

Cada cubo é orientado com `lookAt(0,0,0)` para que sua face aponte radialmente para fora.

Todos os cubos são renderizados em **uma única draw call** via `THREE.InstancedMesh` com cores por instância (`setColorAt`), garantindo performance a 60fps.

### 2. Continentes — Algoritmo de Proximidade

Cada contribuidor ocupa um polo na esfera, distribuído via **Fibonacci sphere** (distribuição uniforme sem clustering nos polos):

```ts
const golden = Math.PI * (3 - Math.sqrt(5))
yy    = 1 - (i / (n-1)) * 2
r     = sqrt(1 - yy²)
theta = golden * i
pole  = { nx: cos(theta)*r, ny: yy, nz: sin(theta)*r }
```

Para cada cubo, calcula-se a distância ao polo mais próximo. Se essa distância for menor que o **raio do continente** (proporcional aos commits), o cubo recebe uma cor verde:

```
continentRadius = 0.22 + (commits / maxCommits) * 0.75
```

| Distância relativa ao centro do continente | Cor |
|---|---|
| < 25% | `#39d353` (verde neon — núcleo) |
| 25–50% | `#26a641` |
| 50–75% | `#006d32` |
| 75–100% | `#0e4429` (borda do continente) |
| > 100% | `#161b22` (oceano / sem atividade) |

### 3. Satélites — Sprites 2D

Cada contribuidor (máx. 15) tem um **sprite 2D** com seu `avatar_url` do GitHub. Sprites sempre ficam de face para a câmera (`THREE.Sprite`).

Os satélites são **filhos do `globeGroup`**, não da cena. Isso faz com que rotem junto com o globo quando o usuário arrasta.

Posição calculada frame a frame:
```ts
radial = hoverDist + sin(t * floatSpeed + floatOffset) * floatAmp
sprite.position = pole * radial
```

- `hoverDist` = distância base acima da superfície (determinística por índice)
- Flutuação senoidal com amplitude, velocidade e fase únicas por satélite
- Contribuidores com `hireable: true` têm tint roxo (`#c084fc`)

### 4. Tubo de Conexão

Cada satélite tem um `THREE.Mesh` com `CylinderGeometry(0.02, 0.02, 1, 6)` conectando a superfície do polo ao sprite. Atualizado a cada frame:

```ts
// Ponto A: polo na superfície
// Ponto B: posição do sprite
midpoint   = (A + B) / 2
tube.scale.y = distance(A, B)
tube.quaternion.setFromUnitVectors(UP, direction(A→B))
```

> `THREE.LineBasicMaterial` tem espessura máxima de 1px no WebGL — por isso usamos cilindro.

### 5. Controles Interativos

| Interação | Comportamento |
|---|---|
| Arrastar (mouse) | Rotaciona o `globeGroup` (planeta + satélites + tubos juntos) |
| Scroll | Zoom da câmera entre `z=5.5` e `z=20` |
| Soltar o mouse | Rotação continua com inércia (`rv *= 0.85` por frame) |
| Resize da janela | Atualiza aspect ratio da câmera e tamanho do renderer |

---

## SyncLoadingPage — Mensagens de Loading

As mensagens ciclam a cada 600ms:

1. Iniciando campo gravitacional...
2. Mapeando contribuidores do repositório...
3. Calculando órbitas gravitacionais...
4. Construindo o planeta de commits...
5. Gerando seu sistema graviton, por favor aguarde...

A navegação para `/globe` só ocorre quando **ambas** as condições são satisfeitas:
- API retornou os dados dos contribuidores
- Mínimo de 2.5 segundos de exibição decorridos

---

## GlobePage — Overlays

| Posição | Conteúdo |
|---|---|
| Top-left | Nome do repositório (`owner/repo`) + contagem de satélites e commits |
| Top-right | Botão "← Repositórios" |
| Bottom-left | Legenda das cores de commit + indicador de hireable |
| Bottom-right | Hint de controles (arrastar / scroll) |

---

## Marcos de Desenvolvimento

| Fase | Status | Descrição |
|---|---|---|
| **Fase 1** | ✅ Concluída | Motor gráfico: globo 3D, satélites, órbitas, interatividade |
| **Fase 2** | Futuro | Disparo de e-mails via Mailgun/SES + webhooks |
