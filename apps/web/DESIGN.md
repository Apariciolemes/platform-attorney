# Sistema de design

Fonte única de verdade para fontes, cores, tamanhos, espaçamentos e raios do frontend
(no formato do `document` do [Impeccable](https://impeccable.style)). Os tokens vivem em
[`src/style.css`](src/style.css) como **tema do Tailwind CSS v4** (`@theme`): os valores padrão do
Tailwind para cor, fonte, tamanho de texto e raio foram substituídos pelos nossos, então só existem as
classes aprovadas (`text-ink`, `bg-surface`, `text-sm`, `rounded-md`…). **Use sempre essas classes**,
nunca valores arbitrários (`text-[#333]`, `p-[13px]`). Valor fora desta lista = atualize este documento
e o `@theme` antes.

Contexto do produto: [PRODUCT.md](PRODUCT.md).

## Tipografia

| Papel | Família | Por quê |
| --- | --- | --- |
| Títulos e marca | **Source Serif 4** (variável, peso 600, nunca itálico) | Serifa sóbria e legível: remete a documento jurídico sem cair no clichê do "serif itálico editorial". |
| Interface e texto | **Source Sans 3** (variável) | Humanista, da mesma família de desenho da serifa; boa em tamanhos pequenos. Evita Inter/Geist, que deixam tudo com cara de template. |

Ambas são hospedadas localmente via `@fontsource-variable` (sem CDN externo).

**Escala** (razão ~1,2): `--text-sm` 14px · `--text-base` 16px · `--text-lg` 19px · `--text-xl` 24px · `--text-2xl` 30px.

- Corpo: 16px, `line-height` 1.5. Títulos: `line-height` 1.2, `text-wrap: balance`. Parágrafos: `text-wrap: pretty`.
- Nada abaixo de 14px. Caixa alta só em rótulos curtos (e com `letter-spacing` leve).
- Hierarquia: `h1` (2xl, serifa) por página → `h2` (lg, serifa) por seção. Nunca pular nível.
- Leitura longa (transcrição): `max-width: 70ch`.
- Números que se comparam (tamanho, duração): `font-variant-numeric: tabular-nums`.

## Cor

Paleta derivada do produto: **tinta azul-marinho** (assinatura, documento) sobre **papel neutro frio**,
mais três cores semânticas de status. Sem gradientes, sem brilho, sem roxo/ciano.

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--color-bg` | `#f3f4f6` | `#11151c` | Fundo da página |
| `--color-surface` | `#ffffff` | `#181d26` | Painéis |
| `--color-ink` | `#1a2130` | `#e6e9ee` | Texto principal |
| `--color-muted` | `#545d6e` | `#a2abb9` | Texto secundário |
| `--color-line` | `#d8dce3` | `#2b3340` | Divisórias (decorativas) |
| `--color-control` | `#848c9b` | `#6c7686` | Borda de campos (≥ 3:1, WCAG 1.4.11) |
| `--color-primary` | `#1f3b5c` | `#9dbbe3` | Ação principal, link ativo, foco |
| `--color-on-primary` | `#ffffff` | `#0f1620` | Texto sobre a cor primária |
| `--color-success` / `-bg` | `#1d6b40` / `#e4f1e8` | `#7fcf9e` / `#173323` | Concluído |
| `--color-warning` / `-bg` | `#7a4f00` / `#f8eed8` | `#e8bb63` / `#3a2c10` | Em andamento |
| `--color-danger` / `-bg` | `#a3302b` / `#f8e5e3` | `#f2958d` / `#3b1d1b` | Erro, ação destrutiva |
| `--color-neutral-bg` | `#eceef2` | `#232a35` | Na fila |

Contraste conferido: todo texto ≥ 4,5:1 (menor: 5,59:1) nos dois temas.
Status nunca é comunicado só por cor: o badge sempre tem o texto.

## Espaço

Escala de 4px: `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-6` 24 · `--space-8` 32 · `--space-12` 48.

- Itens relacionados ficam próximos (rótulo/campo: 4–8px); grupos separados ganham mais espaço (seções: 32–48px).
- Título fica mais perto do próprio conteúdo do que da seção anterior.
- Margem lateral mínima de 16px no celular.

## Forma

- Raio: `--radius-sm` 4px (campos, botões, badges) · `--radius-md` 8px (painéis). Nada acima disso.
- Bordas de 1px; **sem sombras** (o painel se define pela borda e pelo fundo). Nada de card dentro de card.
- Foco: contorno de 2px em `--color-primary` com afastamento de 2px, em todo elemento interativo.

## Componentes

Layout e tipografia são feitos com utilitários do Tailwind direto no template. O que se repete em
várias telas fica na camada `@layer components` do `style.css`:

| Classe | O quê |
| --- | --- |
| `panel` | Superfície com borda e padding; uma por seção, nunca aninhada |
| `field-label` / `input` | Rótulo e campo de formulário (rótulo sempre visível) |
| `btn` · `btn-primary` · `btn-quiet` · `btn-danger` | Botões: ação principal, secundária, destrutiva |
| `badge` + `badge-{pending,processing,completed,failed}` | Status com texto e cor semântica |

Mapeamento de tokens para classes do Tailwind:

| Token | Classes |
| --- | --- |
| Cores (`--color-*`) | `text-ink`, `text-muted`, `text-danger`, `bg-surface`, `bg-bg`, `border-line`, `border-control`, `bg-primary`, `text-on-primary`… |
| Tipografia | `font-serif`, `font-sans`, `text-sm` … `text-2xl` (já com `line-height`) |
| Espaço | Escala padrão do Tailwind, em múltiplos de 4px (`gap-4` = 16px, `p-6` = 24px), que é a escala acima |
| Raio | `rounded-sm` (4px), `rounded-md` (8px) |
| Largura do conteúdo | `max-w-content` (64rem); leitura longa: `max-w-[70ch]` |
| Celular | `max-sm:` (abaixo de 40rem) e `sm:` (a partir de 40rem) |
| Leitor de tela | `sr-only` |

## Movimento

- Só transições curtas de cor (150ms). Sem pulsar, piscar ou animar status parado.
- Respeitar `prefers-reduced-motion`.
