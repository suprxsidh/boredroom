# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A guitar tab learning web application built with React, TypeScript, and Vite. The app allows users to:
- Search for songs and retrieve guitar tabs (mock API currently)
- Select difficulty levels (easy/medium/hard)
- View tabs with syntax highlighting
- Practice with **audio-driven autoscroll** (in progress)
- **Real-time audio feedback** with note detection and accuracy tracking
- **Stop-on-mistake** practice mode

**Current Focus:** Implementing Tab Player with audio-driven autoscroll and real-time feedback.

---

## Development Commands

```bash
# Development server
npm run dev          # Starts Vite dev server on http://localhost:5173

# Build
npm run build        # TypeScript compile + Vite production build
npm run build -- --watch  # Watch mode for development

# Type checking
npx tsc --noEmit     # Type-check without emitting files

# Linting
npm run lint         # ESLint check for src/

# Preview production build
npm run preview      # Serve dist/ folder locally
```

---

## Architecture

### Tech Stack
- **React 18** with TypeScript
- **Vite** for fast build/dev
- **CSS** (custom styles in App.css, no Tailwind yet)
- **Web Audio API** for pitch detection
- **Mock API** in `src/api/` (to be replaced with real tab sources)

### Key File Structure

```
src/
├── components/
│   ├── SearchBar.tsx        # Song search input
│   ├── DifficultyPicker.tsx # Easy/Medium/Hard selector
│   ├── TabViewer.tsx        # Renders tab notation (being enhanced)
│   ├── TabPlayer.tsx        # Main player container (NEW)
│   ├── AutoscrollCtrl.tsx   # Playback controls (NEW)
│   ├── TabPlayerSettings.tsx # Settings panel (NEW)
│   └── AudioFeedbackPanel.tsx # Audio feedback display (NEW)
├── hooks/
│   └── useAudioCapture.ts   # Microphone input and pitch detection
├── utils/
│   ├── pitchDetection.ts    # Auto-correlation pitch detection
│   ├── noteMatching.ts      # Note validation and matching (NEW)
│   └── scrollController.ts  # Smooth scrolling logic (NEW)
├── api/
│   ├── search.ts            # Mock tab search
│   └── tabs.ts              # Mock tab retrieval
├── types.ts                 # All TypeScript interfaces
├── App.tsx                  # Main application state and layout
├── App.css                  # All component styles
├── index.css                # Global styles
└── index.tsx                # Entry point
```

### Data Flow (Current → Future)

**Current:**
1. User enters search query → `handleSearch` calls `searchTabs()` from `api/search.ts`
2. Mock returns `Tab[]` objects with `lines` containing `TabNote[]`
3. Clicking a tab sets `selectedTab` in App state
4. `TabViewer` renders the tab; `Autoscroll` animates position (numeric only, not actual scroll)
5. `useAudioCapture` hook exists but not integrated

**After TabPlayer Implementation:**
1. User selects tab → `TabPlayer` component mounts
2. User clicks Play → audio capture starts, scroll controller begins
3. Audio detects pitch → `noteMatching` validates against expected notes
4. Valid notes → highlight, advance position, autoscroll
5. Invalid notes or stop-on-mistake → pause/stop playback
6. Real-time metrics shown in `AudioFeedbackPanel`

### Types

**Core Types:**
- `Tab`: Main data structure (id, title, artist, difficulty, tuning, lines[], tempo, timeSignature)
- `TabLine`: measure number + array of `TabNote`
- `TabNote`: string (1-6), fret (0-22), timestamp, isChord, chordNotes
- `Difficulty`: 'easy' | 'medium' | 'hard'

**New Player Types (being added):**
- `PlayerSettings`: stopOnMistake, pitchTolerance, scrollMode, autoScrollSpeed
- `PlayerMetrics`: accuracy, total/correct/incorrect notes, avg deviation
- `HighlightedNote`: lineIndex, noteIndex, status (correct/incorrect/current/pending)
- `DetectedNote`: note, pitch (Hz), timestamp, confidence, pitchDeviation

---

## Current Implementation State

### Existing Features
- ✅ Search functionality with mock data
- ✅ Basic tab display in ASCII format
- ✅ Difficulty picker
- ✅ Dark theme with gradient accents (#4ecdc4, #ff6b6b)
- ✅ Responsive layout

### In Progress
- 🚧 **TabPlayer** component with audio-driven autoscroll
- 🚧 Note matching and validation algorithm
- 🚧 Real-time audio feedback highlighting
- 🚧 Stop-on-mistake practice mode
- 🚧 Settings panel for customization

### Completed Design Phase
- ✅ Design mockup created: `.superpowers/mockups/tab-player-layout.html`
- ✅ Design specification: `docs/superpowers/specs/2025-03-15-autoscroll-audio-integration-design.md`
- ✅ Implementation plan: `docs/superpowers/plans/2025-03-15-autoscroll-audio-integration.md`

### Not Yet Implemented
- Real tab API integration (Ultimate Guitar or similar)
- Modern graphical fretboard view
- Loop practice mode
- MIDI input support
- Speed adjustment without pitch shift
- Metronome integration
- Progress persistence (localStorage)
- Multiple tuning support
- Chord detection

---

## Styling

- Dark theme: background gradient `#0a0a0a` to `#1a1a1a`
- Accent colors:
  - Teal/Cyan `#4ecdc4` for correct notes, success states
  - Coral/Red `#ff6b6b` for errors, stop actions
  - Orange `#ff9f40` for medium difficulty
- Glass-morphism effects: backdrop-filter blur, semi-transparent panels
- Monospace font (`Courier New`) for tab notation
- Rounded corners (8-12px), subtle shadows, smooth transitions

---

## Testing Strategy (Planned)

**TDD Approach:** Each component and utility will have accompanying tests.

**Test Categories:**
- Unit tests: `noteMatching` logic, `scrollController` state machine
- Component tests: `TabViewer` highlighting, `TabPlayer` state management
- Integration tests: Full play → note detection → stop flow
- Accessibility tests: Keyboard navigation, ARIA labels

**Commands:**
```bash
npm test                 # Run all tests
npm run test:coverage    # Generate coverage report
```

---

## Design & Planning Resources

### Mock Design
Open `.superpowers/mockups/tab-player-layout.html` in a browser to see the proposed UI:
- Tab viewer with current line highlight
- Settings panel with toggles
- Audio feedback panel
- Playback controls and progress bar
- Professional dark theme

### Documentation
- **Design Spec:** `docs/superpowers/specs/2025-03-15-autoscroll-audio-integration-design.md`
  - Component architecture diagrams
  - Data flowcharts
  - Complete type definitions
  - Implementation phases
  - Error handling strategies
  - Accessibility requirements

- **Implementation Plan:** `docs/superpowers/plans/2025-03-15-autoscroll-audio-integration.md`
  - Chunked tasks with TDD steps
  - Exact file paths and code snippets
  - Testing checklists
  - Commit messages

---

## Known Issues & TODOs

### Code Quality
- Old `Autoscroll.tsx` component is non-functional (just numeric counter) - will be replaced
- Some `any` types in existing code need to be cleaned up
- No error boundaries currently
- No test infrastructure yet (being added)

### Architecture
- State management in `App.tsx` is simple but will move to `TabPlayer`
- `useAudioCapture` hook needs integration with player state
- Mock API generates deterministic but limited tab data

---

## Git Workflow

**Worktrees:** This project uses Git worktrees for isolated feature development.
- Worktree directory: `.worktrees/` (ignored in .gitignore)
- Before implementing a feature, create a worktree branch
- After completion, merge to master and clean up worktree

**Branch Naming:** `feature/<description>` or `fix/<description>`

**Commit Standards:**
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Include Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com> for AI-assisted commits
- Commit early and often (after each working step)

---

## Future Roadmap (After Current Implementation)

1. **Real Tab API Integration**
   - Connect to Ultimate Guitar API or similar
   - Handle tab scraping, parsing, and formatting
   - Add caching and rate limiting

2. **Advanced Practice Features**
   - Loop sections (set start/end points)
   - Variable speed playback (slow down without pitch shift)
   - Metronome with configurable time signature
   - Progress tracking and practice stats

3. **UI Enhancements**
   - VexFlow-based graphical fretboard display
   - Multiple color themes
   - Customizable layout
   - Mobile-optimized touch controls

4. **Audio Improvements**
   - Better polyphonic rejection
   - Background noise filtering
   - MIDI input support
   - Custom tuning support

5. **User Experience**
   - LocalStorage for settings persistence
   - Save/load practice sessions
   - Share tabs via URL
   - Print-friendly tab output

---

## Getting Help

- **Design questions:** Refer to design spec and mockup
- **Implementation guidance:** Follow the implementation plan step-by-step
- **Architecture decisions:** Check component diagrams in spec
- **Testing:** See testing strategy section above

---

**Last Updated:** 2025-03-15
**Maintainers:** Claude (Anthropic) + User