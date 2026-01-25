# Light/Dark Mode Implementation

## Overview

QuranTrack now supports complete light and dark mode theming across the entire application, from login to dashboard to all pages. The design matches the aesthetic of [hamzas.world](https://hamzas.world).

## Implementation Details

### Theme Context (`src/contexts/ThemeContext.tsx`)

A React context manages the theme state:
- Stores preference in `localStorage`
- Applies `light` or `dark` class to `document.documentElement` (html element)
- Default theme is dark mode

```typescript
// Usage in components
const { darkMode, toggleDarkMode } = useTheme();
```

### CSS Variables (`src/index.css`)

Theme colors are defined using CSS custom properties:

#### Dark Mode (Default)
```css
:root {
  --bg-primary: rgb(26, 31, 46);
  --bg-secondary: rgb(30, 41, 59);
  --bg-tertiary: rgb(37, 45, 61);
  --bg-card: rgba(30, 41, 59, 0.7);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent-primary: #06b6d4;
  --accent-secondary: #14b8a6;
}
```

#### Light Mode
```css
:root.light {
  --bg-primary: rgb(186, 230, 253);
  --bg-secondary: rgb(165, 243, 252);
  --bg-tertiary: rgb(207, 250, 254);
  --bg-card: rgb(255, 255, 255);
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --accent-primary: #0891b2;
  --accent-secondary: #0d9488;
}
```

### Card Styling

Cards use pure white backgrounds in light mode:

```css
.light .card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: none;
  background: #ffffff !important;
}
```

Gradient cards preserve their gradients:
```css
.card[class*="bg-gradient"],
.light .card[class*="bg-gradient"] {
  background: none !important;
}
```

### Component Pattern

Components use conditional Tailwind classes based on `darkMode`:

```tsx
<div className={`card p-6 ${
  darkMode
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
    : 'bg-white border-slate-200'
}`}>
```

### Pages Updated

All pages support both themes:
- Login (`/login`)
- Signup (`/signup`)
- Teacher Dashboard (`/teacher`)
- Student Dashboard (`/student`)
- Classes (`/classes`)
- Classroom (`/classes/:id`)
- Quran Reader (`/reader`)

### Theme Toggle

The theme toggle button is in the navbar (Layout.tsx):
- Moon icon for dark mode
- Sun icon for light mode
- Located in the top-right corner

## Design Principles

1. **Light Mode**: Cyan/teal gradient background with pure white cards
2. **Dark Mode**: Dark slate gradient background with semi-transparent cards
3. **Accent Colors**: Cyan (#06b6d4) and Teal (#14b8a6) throughout
4. **Text Contrast**: High contrast text colors for readability in both modes

## Files Modified

- `src/index.css` - CSS variables and card styling
- `src/contexts/ThemeContext.tsx` - Theme state management
- `src/components/Layout.tsx` - Theme toggle button
- `src/pages/Login.tsx` - Login page theming
- `src/pages/Signup.tsx` - Signup page theming
- `src/pages/TeacherDashboard.tsx` - Teacher dashboard theming
- `src/pages/StudentDashboard.tsx` - Student dashboard theming
- `src/pages/TeacherClasses.tsx` - Teacher classes theming
- `src/pages/StudentClasses.tsx` - Student classes theming
- `src/pages/Classroom.tsx` - Classroom page theming
- `src/pages/QuranReader.tsx` - Quran reader theming
