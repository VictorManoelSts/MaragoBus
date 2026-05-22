# MaragoBus — Design Tokens

> Valores prontos para implementação no projeto Next.js + Tailwind CSS.
> Copie diretamente nos arquivos de configuração do projeto.

---

## tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#499bd0',
          dark:    '#2d7eb5',
          light:   '#eaf4fb',
          medium:  '#daeef8',
        },
        border: {
          DEFAULT: '#c8e0f0',
          subtle:  '#daeef8',
        },
        text: {
          primary:   '#2d7eb5',
          secondary: '#6ab4d8',
          disabled:  '#a8cfe4',
        },
        surface: '#ffffff',
        background: '#eaf4fb',
        success: {
          bg:     '#edfaf2',
          text:   '#1e7a3e',
          strong: '#27ae60',
        },
        warning: {
          bg:     '#fef4e6',
          text:   '#a05e10',
          border: '#f5c6a0',
        },
        danger: {
          bg:     '#fdecea',
          text:   '#b0291e',
          strong: '#e24b4a',
        },
        info: {
          bg:   '#e8f4fb',
          text: '#1a6fa3',
        },
        metric: {
          today:    '#27ae60',
          tomorrow: '#499bd0',
          total:    '#6ab4d8',
        },
        badge:    '#e24b4a',
        required: '#e87a6a',
        overlay:  'rgba(0,0,0,0.4)',
        'input-error': '#fff8f8',
        'spinner-track': '#daeef8',
        'empty-circle':  '#daeef8',
        'header-overlay': 'rgba(255,255,255,0.2)',
        'header-border':  'rgba(255,255,255,0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':  ['7px',  { lineHeight: '1.2' }],
        'sm':  ['9px',  { lineHeight: '1.4' }],
        'md':  ['10px', { lineHeight: '1.4' }],
        'base':['11px', { lineHeight: '1.5' }],
        'body':['12px', { lineHeight: '1.5' }],
        'sub': ['13px', { lineHeight: '1.5' }],
        'title':   ['15px', { lineHeight: '1.3' }],
        'title-lg':['16px', { lineHeight: '1.3' }],
        'heading': ['18px', { lineHeight: '1.2' }],
        'display': ['20px', { lineHeight: '1.2' }],
      },
      fontWeight: {
        regular: '400',
        medium:  '500',
      },
      borderRadius: {
        'sm':     '5px',
        'md':     '7px',
        'input':  '8px',
        'button': '10px',
        'card':   '12px',
        'modal':  '16px',
        'pill':   '20px',
        'full':   '9999px',
      },
      borderWidth: {
        thin:   '0.5px',
        medium: '1px',
        thick:  '1.5px',
        metric: '3px',
      },
      spacing: {
        'xs':   '4px',
        'sm':   '6px',
        'md':   '8px',
        'lg':   '10px',
        'xl':   '12px',
        'xxl':  '14px',
        'xxxl': '16px',
        'huge': '20px',
      },
      maxWidth: {
        'content': '1200px',
      },
      width: {
        'sidebar-expanded':  '240px',
        'sidebar-collapsed': '64px',
        'avatar-sm': '30px',
        'avatar-md': '38px',
        'avatar-lg': '52px',
        'spinner':   '32px',
        'badge-dot': '16px',
        'qr':        '80px',
        'logo-sm':   '130px',
        'logo-lg':   '180px',
      },
      height: {
        'avatar-sm': '30px',
        'avatar-md': '38px',
        'avatar-lg': '52px',
        'spinner':   '32px',
        'badge-dot': '16px',
        'logo-sm':   '44px',
        'logo-lg':   '60px',
        'status-bar':'28px',
        'logo-bar':  '48px',
        'nav-bar':   '56px',
        'metric-bar':'3px',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #eaf4fb;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

@layer utilities {
  .spinner-animation {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}
```

---

## src/lib/constants/business.ts

```typescript
export const BUSINESS = {
  reserva: {
    aberturaHora:      17,
    encerramentoHora:  11,
    cancelamentoHora:  16,
  },
  motorista: {
    diaSeguinteHora: 5,
  },
  suspensao: {
    advertenciasParaSuspender: 3,
    diasUteisAfastamento:      3,
  },
  notificacoes: {
    lembreteHora:        10,
    avisoFeriadoDias:    [3, 1],
    adminReservaHora:    17,
  },
  senha: {
    digitosCPF:    6,
    minCaracteres: 6,
  },
  whatsapp: {
    secretaria: 'https://wa.me/5582991512687',
  },
} as const
```

---

## src/lib/constants/icons.ts

```typescript
// Sempre usar outline — nunca filled
// Import: import { IconName } from '@tabler/icons-react'

export const ICONS = {
  // Perfis (tabs do login)
  aluno:      'IconUser',
  motorista:  'IconSteeringWheel',
  admin:      'IconShieldCheck',

  // Navegação
  reserva:       'IconTicket',
  comprovante:   'IconClipboardList',
  alunos:        'IconUsers',
  cadastrar:     'IconPlus',
  reservasAdmin: 'IconChartBar',
  notificacoes:  'IconBell',

  // Dados
  faculdade: 'IconBuilding',
  curso:     'IconBook',
  modalidade:'IconBooks',
  ponto:     'IconMapPin',
  telefone:  'IconPhone',
  cpf:       'IconId',
  senha:     'IconLock',
  foto:      'IconCamera',
  endereco:  'IconHome',
  semestre:  'IconNumber',
  calendario:'IconCalendar',
  calendarioCheck: 'IconCalendarCheck',
  horario:   'IconClock',
  qrcode:    'IconQrcode',

  // Ações
  salvar:  'IconDeviceFloppy',
  editar:  'IconEdit',
  excluir: 'IconTrash',
  upload:  'IconUpload',
  busca:   'IconSearch',
  sair:    'IconLogout',
  fechar:  'IconX',
  confirmar: 'IconCheck',

  // Status
  ativo:      'IconCircleCheck',
  suspenso:   'IconBan',
  advertencia:'IconAlertTriangle',
  erro:       'IconAlertCircle',
  info:       'IconInfoCircle',

  // Empty states
  semReservas:    'IconCalendarOff',
  semAlunos:      'IconUsersOff',
  semResultados:  'IconSearchOff',

  // Outros
  chevronDown:  'IconChevronDown',
  chevronRight: 'IconChevronRight',
} as const
```
