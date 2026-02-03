# Phase 7: Shared Widgets

## Overview

Documented existing shared widgets and created new common widgets for reuse across the app.

**Completed:** Phase 7 of Flutter App Overhaul

---

## Widget Library

### Existing Widgets

#### `lib/presentation/widgets/glassmorphic_card.dart`

| Widget | Description |
|--------|-------------|
| `GlassmorphicCard` | Base card with glassmorphic styling, shadow, border |
| `SectionCard` | Card with title/subtitle header |
| `StatCard` | Card for displaying statistics with icon |

**Usage:**
```dart
GlassmorphicCard(
  padding: const EdgeInsets.all(16),
  child: Text('Content'),
)

SectionCard(
  title: 'Section Title',
  subtitle: 'Optional subtitle',
  child: Text('Content'),
)

StatCard(
  label: 'Classes',
  value: '12',
  icon: Icons.calendar_today_rounded,
  color: AppColors.emerald400,
)
```

---

#### `lib/presentation/widgets/section_badge.dart`

| Widget | Description |
|--------|-------------|
| `SectionBadge` | Badge showing section type (hifz, sabqi, revision) |
| `SectionTab` | Tab button for section selection |
| `MistakeBadge` | Badge displaying a mistake word with count |

**Usage:**
```dart
SectionBadge(
  type: 'hifz',
  text: 'Al-Mulk',
  compact: true,
)

SectionTab(
  type: 'hifz',
  label: 'Hifz',
  portionCount: 2,
  isSelected: true,
  onTap: () {},
)

MistakeBadge(
  errorCount: 3,
  wordText: 'Word',
  location: '1:5',
)
```

---

### New Common Widgets

#### `lib/presentation/widgets/common/gradient_button.dart`

A button with cyan-to-teal gradient styling for primary actions.

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `text` | `String` | Button label |
| `onPressed` | `VoidCallback?` | Tap handler |
| `isLoading` | `bool` | Shows loading spinner |
| `icon` | `IconData?` | Optional leading icon |
| `width` | `double?` | Fixed width |
| `padding` | `EdgeInsets?` | Custom padding |
| `useTeacherColors` | `bool` | Use cyan->teal (true) or teal->cyan (false) |

**Usage:**
```dart
GradientButton(
  text: 'Sign In',
  onPressed: () => handleSignIn(),
  isLoading: isSubmitting,
  icon: Icons.login_rounded,
)
```

---

#### `lib/presentation/widgets/common/icon_input_field.dart`

A text input field with icon prefix for auth forms.

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `controller` | `TextEditingController?` | Text controller |
| `hintText` | `String` | Placeholder text |
| `icon` | `IconData` | Prefix icon |
| `obscureText` | `bool` | Hide text (passwords) |
| `keyboardType` | `TextInputType` | Keyboard type |
| `validator` | `String? Function(String?)?` | Form validator |
| `suffixIcon` | `Widget?` | Suffix widget |
| `isDarkMode` | `bool` | Theme mode |

**Usage:**
```dart
IconInputField(
  controller: emailController,
  hintText: 'Email address',
  icon: Icons.email_outlined,
  keyboardType: TextInputType.emailAddress,
  isDarkMode: isDarkMode,
  validator: (v) => v!.isEmpty ? 'Required' : null,
)
```

---

#### `lib/presentation/widgets/common/avatar_circle.dart`

A circular avatar with initials and role-based gradient.

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `initials` | `String` | User initials (e.g., "HF") |
| `size` | `double` | Avatar diameter (default: 56) |
| `isTeacher` | `bool` | Use teacher colors (cyan) or student (teal) |
| `fontSize` | `double` | Initials font size |

**Usage:**
```dart
AvatarCircle(
  initials: 'HF',
  size: 56,
  isTeacher: true,
)
```

---

## Barrel Export

All common widgets can be imported from a single file:

```dart
import 'package:quran_logbook/presentation/widgets/common/common_widgets.dart';
```

---

## Color Scheme Reference

### Role-Based Colors

| Role | Primary | Gradient Start | Gradient End |
|------|---------|----------------|--------------|
| Teacher | Cyan | `AppColors.cyan500` | `AppColors.teal500` |
| Student | Teal | `AppColors.teal500` | `AppColors.cyan500` |

### Section Colors

| Section | Color |
|---------|-------|
| Hifz | `AppColors.emerald500` |
| Sabqi | `AppColors.cyan500` |
| Revision/Manzil | `AppColors.purple500` |

### Mistake Severity Colors

| Count | Color |
|-------|-------|
| 1x | Amber (`mistake1`) |
| 2x | Blue (`mistake2`) |
| 3x | Orange (`mistake3`) |
| 4x | Purple (`mistake4`) |
| 5+ | Red (`mistake5`) |

---

## Widget File Structure

```
lib/presentation/widgets/
├── glassmorphic_card.dart      # GlassmorphicCard, SectionCard, StatCard
├── section_badge.dart          # SectionBadge, SectionTab, MistakeBadge
└── common/
    ├── common_widgets.dart     # Barrel export
    ├── gradient_button.dart    # GradientButton
    ├── icon_input_field.dart   # IconInputField
    └── avatar_circle.dart      # AvatarCircle
```

---

## Theme Integration

All widgets use the centralized `AppColors` class for theme-aware colors:

```dart
// Get theme-aware color
final bgColor = AppColors.background(isDarkMode);
final textColor = AppColors.text(isDarkMode);
final borderColor = AppColors.border(isDarkMode);
```

---

## Next Phase

**Final: Overview + Changelog** - Write 00-OVERVIEW.md and update PROJECT_CHANGELOG.md.
