# front-end-ecommercegraviton

E-commerce application built with React, TypeScript, Vite, and Tailwind CSS.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Supabase** - Backend and database
- **Lucide React** - Icon library

## Project Structure

```
src/
├── components/    # Reusable components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Library configurations (Supabase client)
├── types/         # TypeScript type definitions
├── App.tsx        # Main App component
├── main.tsx       # Application entry point
└── index.css      # Global styles with Tailwind
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your Supabase credentials.

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file with the following variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```