# Dois Corpos — Documentação Técnica

Referência ao **Problema dos Dois Corpos** da mecânica gravitacional: dois objetos que se atraem mutuamente e um orbita o outro. Aqui, dois repositórios GitHub são visualizados como sistema gravitacional 3D.

---

## O que foi construído (Frontend)

### Arquivos criados

| Arquivo | Função |
|---|---|
| `src/components/DualGlobe.tsx` | Cena Three.js com dois globos orbitais |
| `src/pages/TwoBodyPage.tsx` | Tela de seleção de repositórios (dentro da Sidebar) |
| `src/pages/TwoBodyViewPage.tsx` | Visualização full-screen do sistema |

### Arquivos modificados

| Arquivo | O que mudou |
|---|---|
| `src/components/sideBar.tsx` | Novo item "Dois Corpos" com ícone `Atom` |
| `src/App.tsx` | Rotas `/dois-corpos` e `/dois-corpos/view` |

### Rotas

```
/dois-corpos              → TwoBodyPage     (seleção, protegida, com Sidebar)
/dois-corpos/view         → TwoBodyViewPage (visualização full-screen, protegida)
  ?primary_id=X
  &secondary_id=Y
```

---

## Como funciona a cena 3D (`DualGlobe.tsx`)

### Hierarquia da cena Three.js

```
scene
└── masterGroup
    ├── primaryGroup          ← Globo principal (verde, raio 3.2)
    │   ├── InstancedMesh     ← cubos da superfície
    │   ├── Sprite[0..11]     ← avatares dos contribuidores
    │   └── Mesh[0..11]       ← tubes conectando avatar à superfície
    ├── Line (orbitRing)      ← anel circular do plano de órbita
    ├── Line (bondLine)       ← linha gravitacional centro→secundário
    └── orbitPivot            ← rotaciona no eixo Y (velocidade da órbita)
        └── secondaryGroup    ← posicionado em x = 8.5 (raio orbital)
            ├── InstancedMesh ← cubos (roxo, raio 1.5)
            ├── Sprite[0..11] ← avatares
            └── Mesh[0..11]   ← tubes
```

### Câmera — sistema de foco por clique

A câmera orbita em torno de um ponto `currentTarget` usando coordenadas esféricas `(theta, phi, radius)`.

| Ação | Resultado |
|---|---|
| Clique no globo principal | `focusTarget = 'primary'`, zoom out para `radius 16`, câmera volta ao centro |
| Clique no globo secundário | `focusTarget = 'secondary'`, zoom in para `radius 5`, câmera segue o globo enquanto orbita |
| Drag | Orbita em torno do alvo atual com inércia |
| Scroll | Ajusta o `desiredRadius` (zoom) |

A detecção de clique usa `raycaster.ray.distanceToPoint()` contra o centro de cada globo — sem raycast nos cubos (performance).

### Constantes relevantes

```ts
P_RADIUS  = 3.2    // raio do globo principal
M_RADIUS  = 1.5    // raio do globo secundário
ORBIT_R   = 8.5    // distância orbital (centro a centro)
ORBIT_SPD = 0.004  // velocidade angular da órbita (rad/frame)
SAT_LIMIT = 12     // máximo de contribuidores por globo
```

---

## Como implementar a tabela de conexões no backend

### Objetivo

Salvar pares de repositórios já vinculados para que o usuário não precise selecionar os dois toda vez.

### Migration (Laravel)

```php
// database/migrations/xxxx_create_orbit_connections_table.php

Schema::create('orbit_connections', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id');
    $table->string('name')->nullable();           // nome opcional dado pelo usuário
    $table->uuid('primary_repository_id');        // Corpo A
    $table->uuid('secondary_repository_id');      // Corpo B
    $table->timestamps();

    $table->foreign('tenant_id')
          ->references('id')->on('tenants')
          ->onDelete('cascade');

    $table->foreign('primary_repository_id')
          ->references('id')->on('repositories')
          ->onDelete('cascade');

    $table->foreign('secondary_repository_id')
          ->references('id')->on('repositories')
          ->onDelete('cascade');
});
```

### Model (Laravel)

```php
// app/Models/OrbitConnection.php

class OrbitConnection extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'name',
        'primary_repository_id',
        'secondary_repository_id',
    ];

    public function primaryRepository()
    {
        return $this->belongsTo(Repository::class, 'primary_repository_id');
    }

    public function secondaryRepository()
    {
        return $this->belongsTo(Repository::class, 'secondary_repository_id');
    }
}
```

### Endpoints necessários

```
GET    /api/v1/orbit-connections          → lista conexões salvas do tenant
POST   /api/v1/orbit-connections          → cria nova conexão
DELETE /api/v1/orbit-connections/{id}     → remove conexão
PATCH  /api/v1/orbit-connections/{id}     → atualiza nome
```

#### POST — corpo da requisição

```json
{
  "primary_repository_id": "uuid-do-repo-A",
  "secondary_repository_id": "uuid-do-repo-B",
  "name": "Minha Órbita" // opcional
}
```

#### GET — resposta esperada

```json
[
  {
    "id": "uuid",
    "name": "Minha Órbita",
    "primary_repository": {
      "id": "uuid",
      "github_owner": "owner",
      "github_repo": "repo-a",
      "status": "active"
    },
    "secondary_repository": {
      "id": "uuid",
      "github_owner": "owner",
      "github_repo": "repo-b",
      "status": "active"
    },
    "created_at": "2026-06-13T00:00:00Z"
  }
]
```

---

## Mudanças no frontend quando o backend estiver pronto

### 1. Novo tipo em `src/types/database.ts`

```ts
export interface OrbitConnection {
    id: string;
    name: string | null;
    primary_repository: Repository;
    secondary_repository: Repository;
    created_at: string;
}
```

### 2. Em `TwoBodyPage.tsx` — adicionar seção de conexões salvas

Antes dos seletores, listar as conexões salvas como cards clicáveis:

```tsx
// Buscar no mount
const [savedConnections, setSavedConnections] = useState<OrbitConnection[]>([]);

useEffect(() => {
    api.get('/orbit-connections').then(r => setSavedConnections(r.data));
}, []);

// Ao clicar numa conexão salva — ir direto pra visualização
const handleLoadSaved = (conn: OrbitConnection) => {
    navigate(`/dois-corpos/view?primary_id=${conn.primary_repository.id}&secondary_id=${conn.secondary_repository.id}`);
};
```

### 3. Após selecionar os dois repos — botão "Salvar conexão"

```tsx
const handleSave = async (name?: string) => {
    await api.post('/orbit-connections', {
        primary_repository_id: primaryId,
        secondary_repository_id: secondaryId,
        name: name ?? null,
    });
    // Recarregar lista de conexões salvas
};
```

---

## Fluxo completo com a feature de salvar

```
TwoBodyPage
├── [Conexões salvas]          ← lista do banco, clique vai direto pra view
├── [Corpo A] [Corpo B]        ← seleção manual
├── [+ Adicionar repositório]  ← para repos novos
├── [Salvar conexão]           ← ativo quando os dois estão selecionados
└── [Iniciar sistema]          ← vai pra /dois-corpos/view
```
