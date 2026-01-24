# front-end-ecommercegraviton

React + Vite + TypeScript e-commerce application with Supabase integration.

## Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS framework
- **React Router DOM** - Routing
- **Supabase** - Backend as a service
- **Lucide React** - Icon library

## Project Structure

```
src/
├── components/     # Reusable React components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and configurations
│   └── supabaseClient.ts  # Supabase client setup
├── types/          # TypeScript type definitions
│   └── database.ts # Database type definitions
├── App.tsx         # Main application component with routing
└── main.tsx        # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Add your Supabase credentials to `.env`:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Development

Start the development server:

```bash
npm run dev
```

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

### Lint

Run ESLint:

```bash
npm run lint
```

## Features

- ⚡️ Fast development with Vite
- 🎨 Tailwind CSS for styling (no font sizes hardcoded)
- 🔒 Type-safe with TypeScript
- 🗺️ Client-side routing with React Router
- 🔐 Supabase integration ready
- 📦 Organized folder structure
- ✨ Modern React with hooks

## Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Contributing

Feel free to contribute to this project!

## License

MIT

