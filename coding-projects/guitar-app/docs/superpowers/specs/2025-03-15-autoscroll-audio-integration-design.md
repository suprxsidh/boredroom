# Autoscroll & Audio Integration Design

**Date:** 2025-03-15
**Status:** Draft
**Author:** Claude (Anthropic)
**Project:** Guitar Tab Learner

---

## 1. Overview

### Goals
Implement a responsive autoscroll system that advances through tab notation in sync with user's guitar playing, with real-time audio feedback that can stop playback on mistakes. Create a clean, professional UI that displays tabs clearly and provides intuitive controls.

### Key Features
- Continuous autoscroll that advances as user plays correct notes (Option A from requirements)
- Audio-driven validation: compares detected pitch against expected tab notes
- Configurable stop-on-mistake behavior (user setting)
- Traditional ASCII tab display (with potential for modern graphical view in future)
- Clean, professional dark theme UI with teal/cyan accents
- Real-time feedback highlighting (correct/incorrect notes)
- Progress tracking and accuracy metrics

### Out of Scope
- Real tab API integration (mock data only)
- Modern graphical fretboard view (deferred to future)
- Advanced music theory features

---

## 2. Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   SearchBar     │  │ DifficultyPicker│                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                TabPlayerWrapper                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │              TabPlayer (State Container)     │  │  │
│  │  │  - currentPosition (timestamp)               │  │  │
│  │  │  - isPlaying, isPaused, isStopped           │  │  │
│  │  │  - settings { stopOnMistake, tolerance }    │  │  │
│  │  │  - audioState { isListening, error }        │  │  │
│  │  │  - accuracy metrics                         │  │  │
│  │  └───────────────────┬──────────────────────────┘  │  │
│  │                      │                              │  │
│  │          ┌───────────┴───────────┐                 │  │
│  │          ▼                       ▼                 │  │
│  │  ┌──────────────┐      ┌──────────────────┐       │  │
│  │  │ TabViewer    │      │ AutoscrollCtrl   │       │  │
│  │  │ - Props:     │      │ - Play/Pause     │       │  │
│  │  │   tab,       │      │ - Stop           │       │  │
│  │  │   position,  │      │ - Speed slider   │       │  │
│  │  │   highlights │      │ - Progress bar   │       │  │
│  │  └──────────────┘      └──────────────────┘       │  │
│  │                                                      │  │
│  │          ┌───────────────────┐                      │  │
│  │          ▼                   │                      │  │
│  │  ┌────────────────────┐     │                      │  │
│  │  │AudioFeedbackPanel  │     │                      │  │
│  │  │ - Recent notes     │     │                      │  │
│  │  │ - Status indicators│─────┘                      │  │
│  │  └────────────────────┘                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            TabPlayerSettings (sidebar)             │  │
│  │  - Stop on mistake toggle                          │  │
│  │  - Pitch tolerance slider                          │  │
│  │  - Scroll mode (auto/manual)                       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User plays guitar
       ↓
Microphone → AudioContext → useAudioCapture hook
       ↓
detectPitch() → detectNote() → TabNote
       ↓
AudioIntegrator (inside TabPlayer)
       ↓
Match note against expected notes at currentPosition ± threshold
       ↓
    ┌───┴───┐
    ▼       ▼
Correct   Wrong/Missed
    │         │
    ▼         ▼
highlight   stop/pause (if stopOnMistake=true)
    │
    ▼
advancePosition() → update currentPosition
    │
    ▼
ScrollController → scrollTabContent()
```

---

## 3. Component Specifications

### 3.1 TabPlayer (Main Container)

**Responsibilities:**
- Manage all player state
- Integrate audio capture and processing
- Coordinate autoscroll
- Provide context/hooks to child components

**State:**
```typescript
interface TabPlayerState {
  // Playback position (timestamp in tab, e.g., 0.0 to N)
  currentPosition: number;
  // Player state machine
  status: 'stopped' | 'playing' | 'paused' | 'stopped-on-mistake';
  // Audio state
  audio: {
    isListening: boolean;
    error: string | null;
    detectedNotes: DetectedNote[];
  };
  // Accuracy metrics
  metrics: {
    totalNotesPlayed: number;
    correctNotes: number;
    incorrectNotes: number;
    avgPitchDeviation: number; // cents
  };
  // Settings
  settings: {
    stopOnMistake: boolean;
    pitchTolerance: number; // cents, default 25
    scrollMode: 'auto' | 'manual';
    autoScrollSpeed: number; // BPM or scroll rate
  };
}
```

**Methods:**
- `play()`: Start playback, initialize audio capture
- `pause()`: Pause playback, keep audio active or stop?
- `stop()`: Reset position to 0, stop audio
- `advancePosition()`: Move forward based on tempo/scrolling
- `handleNoteDetected(note: TabNote, pitchDeviation: number)`: Validate and update
- `handleNoteMissed()`: Triggered when expected note not played within timeout
- `updateSettings(newSettings: Partial<Settings>)`

**Audio Integration Algorithm:**

```typescript
const validateAndProcessNote = (detectedNote: TabNote) => {
  // Get expected notes at current position with lookahead window
  const expectedNotes = getExpectedNotesAt(currentPosition, {
    lookaheadMs: 200, // accept notes slightly ahead
    toleranceCents: settings.pitchTolerance
  });

  if (expectedNotes.length === 0) {
    // No expected note at this position - could be extra note
    metrics.incorrectNotes++;
    if (settings.stopOnMistake) stopOnMistake();
    return;
  }

  // Find best match
  const match = findBestNoteMatch(detectedNote, expectedNotes);

  if (match) {
    // Correct note
    metrics.correctNotes++;
    metrics.totalNotesPlayed++;
    highlightNote(match.noteIndex, 'correct');

    // Advance position if correct and auto mode
    if (settings.scrollMode === 'auto') {
      advancePosition();
    }
  } else {
    // Wrong note
    metrics.incorrectNotes++;
    highlightNote(detectedNote, 'incorrect');
    if (settings.stopOnMistake) stopOnMistake();
  }
};
```

**Edge Cases:**
- What if user plays note before expected? (accept if within lookahead?)
- What if multiple notes expected (chord)? Accept any or all?
- What if user is silent for too long? Consider "missed" after timeout
- Audio quality issues: low confidence detection should be ignored

### 3.2 TabViewer

**Props:**
```typescript
interface TabViewerProps {
  tab: Tab;
  currentPosition: number;
  highlightedNotes: HighlightedNote[]; // { lineIndex, noteIndex, status }
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}
```

**Behavior:**
- Render tab lines with monospace font
- Highlight current line (different background, pulse animation)
- Color individual notes based on status: correct (green), incorrect (red), current (blue bg), pending (gray)
- Auto-scroll to keep current line in view (via scrollContainerRef controlled by parent)
- Show measure numbers

**Implementation:**
- Use CSS classes: `.tab-line.current`, `.tab-line.correct`, `.tab-line.incorrect`
- Each note span has: `.fret`, plus modifiers: `.correct`, `.incorrect`, `.current`, `.open`, `.x`
- Smooth scrolling: `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`

### 3.3 AutoscrollCtrl

**Props:**
```typescript
interface AutoscrollCtrlProps {
  isPlaying: boolean;
  currentPosition: number;
  totalLines: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  speed: number; // BPM or scroll rate
}
```

**UI:**
- Play/Pause button (toggles)
- Stop button (resets to beginning)
- Speed slider (range input)
- Progress bar (width = currentPosition / totalLines * 100%)
- Status text: "Playing", "Paused", "Stopped", "Stopped on mistake"

### 3.4 TabPlayerSettings

**Props:**
```typescript
interface TabPlayerSettingsProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
}
```

**Settings:**
- `stopOnMistake`: boolean toggle
- `pitchTolerance`: number (10-50 cents) - slider or discrete options
- `scrollMode`: 'auto' | 'manual'
- `autoScrollSpeed`: number (BPM: 60-180)

**UI:**
- Compact panel (300px width)
- Toggle switches styled as buttons
- Labels clear and concise
- Optional tooltips for explanations

### 3.5 AudioFeedbackPanel

**Props:**
```typescript
interface AudioFeedbackPanelProps {
  recentNotes: DetectedNote[];
  metrics: Metrics;
}
```

**Display:**
- List of last 5-10 detected notes with:
  - Note name (e.g., "E2 - Open E")
  - Status: Correct / Incorrect / Missed
  - Pitch deviation (cents) if available
- Current accuracy % (total correct / total played)

---

## 4. Types & Interfaces

```typescript
// types.ts additions

export interface TabNote {
  string: number; // 1-6 (1 = high E, 6 = low E)
  fret: number; // 0 for open string
  duration?: number; // beat duration
  timestamp: number; // position in tab (seconds or beats)
  isChord?: boolean;
  chordNotes?: TabNote[];
}

export interface TabLine {
  measure: number;
  notes: TabNote[];
}

export interface Tab {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  tuning?: string; // e.g., "EADGBE"
  lines: TabLine[];
  tempo?: number; // BPM
  timeSignature?: string; // e.g., "4/4"
}

// New interfaces

export interface DetectedNote {
  note: TabNote;
  pitch: number; // Hz
  timestamp: number; // Date.now() or audio context time
  confidence: number; // 0-1
  pitchDeviation: number; // cents from expected
}

export interface HighlightedNote {
  lineIndex: number;
  noteIndex: number;
  status: 'correct' | 'incorrect' | 'current' | 'pending';
}

export interface Settings {
  stopOnMistake: boolean;
  pitchTolerance: number; // cents
  scrollMode: 'auto' | 'manual';
  autoScrollSpeed: number; // BPM or ms per line
}

export interface Metrics {
  totalNotesPlayed: number;
  correctNotes: number;
  incorrectNotes: number;
  avgPitchDeviation: number;
  startTime: number | null;
  elapsedTime: number;
}
```

---

## 5. Implementation Phases

### Phase 1: Core Player State & Components (Day 1-2)
1. Create `TabPlayer` component with state management
2. Build `TabViewer` with highlighting support
3. Basic `AutoscrollCtrl` with play/pause/stop
4. Implement scrolling mechanism (requestAnimationFrame)
5. Basic visual testing

### Phase 2: Audio Integration (Day 3-4)
1. Integrate `useAudioCapture` hook into TabPlayer
2. Implement note matching algorithm
3. Connect audio events to player state updates
4. Add error handling for microphone permissions
5. Test with actual guitar (or tone generator)

### Phase 3: Settings & Polish (Day 5)
1. Build `TabPlayerSettings` component
2. Wire settings to player behavior
3. Add `AudioFeedbackPanel`
4. Tune animations and transitions
5. Accessibility improvements (ARIA labels, keyboard navigation)

### Phase 4: Testing & Refinement (Day 6-7)
1. Unit tests for tab matching logic
2. Integration tests for player state machine
3. Manual testing and bug fixes
4. Performance optimization
5. Code review and cleanup

---

## 6. Error Handling & Edge Cases

### Microphone Access
- **Permission denied:** Show clear error message with "Retry" button
- **No microphone available:** Disable audio features, show banner
- **AudioContext not supported:** Detect and show fallback message

### Audio Detection Issues
- **Low confidence detection:** Ignore if confidence < threshold (0.7?)
- **Background noise:** Use filtering; consider requiring amplitude threshold
- **Polyphonic confusion:** Single-note detection only; ignore chords for now

### Tab Data Issues
- **Empty tab:** Show "No tab selected" placeholder
- **Malformed notes:** Skip with console warning, don't crash
- **Missing tuning:** Default to "Standard EADGBE"

### State Edge Cases
- **User resets while playing:** Stop and reset position to 0
- **Tab changed mid-play:** Stop playback, reset state
- **Component unmount:** Clean up audio context and animation frames

---

## 7. Testing Strategy

### Unit Tests
- `getExpectedNotesAt(position)` - verify note lookup with tolerance window
- `findBestNoteMatch(detected, expected)` - pitch matching logic
- Metrics calculation
- Settings validation

### Integration Tests
- Play → pause → stop sequence
- Audio detection → highlight → advance flow
- Stop-on-mistake behavior
- Settings changes during playback

### Manual Testing Checklist
- [ ] Audio capture works in browser (Chrome/Firefox/Safari)
- [ ] Correct notes advance playback
- [ ] Wrong notes stop playback (when enabled)
- [ ] Scroll speed is smooth and configurable
- [ ] Visual feedback colors are clear
- [ ] Responsive layout works on mobile
- [ ] Keyboard shortcuts (optional)

---

## 8. Performance Considerations

- **Animation:** Use `requestAnimationFrame` for smooth scrolling
- **Rerender optimization:** Use `React.memo` on display components that don't need frequent updates
- **Audio processing:** Web Audio API runs on separate thread; use AnalyserNode efficiently
- **Scroll performance:** Use CSS transforms or native scroll; avoid layout thrashing
- **Memory:** Clean up audio context on unmount; limit detected note history buffer

---

## 9. Accessibility

- **Keyboard navigation:**
  - Space: Play/Pause
  - Escape: Stop
  - Arrow keys: Adjust speed or position (optional)
- **ARIA labels:**
  - Buttons have descriptive labels (aria-label)
  - Status updates via aria-live regions
  - Progress bar has aria-valuenow, aria-valuetext
- **Color contrast:** Ensure text is readable, don't rely on color alone (add icons or labels)
- **Focus management:** Visible focus states, logical tab order

---

## 10. Next Steps After MVP

- Connect real tab API (Ultimate Guitar, etc.)
- Graphical fretboard view (VexFlow or custom canvas)
- Loop practice mode (loop sections)
- Speed adjustment (slow down without pitch shift)
- Metronome integration
- Progress persistence (localStorage)
- Multiple tuning support
- Chord detection/highlighting
- Mobile-optimized touch controls
- MIDI input support

---

## 11. Success Criteria

### MVP (Minimum Viable Product)
- [ ] Autoscroll advances continuously while playing
- [ ] Audio detection works and identifies notes with <50ms latency
- [ ] Stop-on-mistake feature functional
- [ ] Clean professional UI with good contrast
- [ ] Tab display readable with clear highlighting
- [ ] All controls work intuitively
- [ ] No console errors in normal operation
- [ ] Works in latest Chrome/Firefox

### Stretch Goals
- [ ] Settings persist across sessions
- [ ] Customizable color scheme
- [ ] Keyboard shortcuts fully implemented
- [ ] Comprehensive test coverage (>70%)

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Audio detection inaccurate in browser | High | Use well-tested pitch detection algorithm; provide tolerance settings; consider alternative libraries |
| Autoscroll timing issues (jumpy) | Medium | Use smooth interpolation; decouple scroll rate from frame rate |
| Microphone permissions denied | Medium | Show helpful instructions; allow retry; disable audio gracefully |
| Performance on low-end devices | Medium | Optimize renders; use CSS will-change; limit animation complexity |
| Complex tab formats (chords, slides) | Low | Defer advanced notation; handle basic chords only |

---

## Appendix A: Mock Design Reference

The visual design mockup is located at:
`.superpowers/mockups/tab-player-layout.html`

Key design elements:
- Dark gradient background (#0a0a0a to #1a1a1a)
- Accent colors: Teal (#4ecdc4) for correct/success, Coral (#ff6b6b) for errors/stop
- Glass-morphism: backdrop-filter blur, semi-transparent panels
- Typography: Courier New (monospace) for tab notation
- Layout: Header with controls, Left tab viewer, Right settings panel
- Components: Rounded corners (8-12px), subtle shadows, smooth transitions

---

## Appendix B: Related Files

Existing code to be modified:
- `src/App.tsx` - Integrate TabPlayer wrapper
- `src/App.css` - Update styles, keep existing theme
- `src/components/TabViewer.tsx` - Enhance with highlighting
- `src/components/Autoscroll.tsx` - Replace with AutoscrollCtrl
- `src/hooks/useAudioCapture.ts` - Improve and integrate
- `src/api/` - Keep mock data initially

New files to create:
- `src/components/TabPlayer.tsx`
- `src/components/TabPlayerSettings.tsx`
- `src/components/AudioFeedbackPanel.tsx`
- `src/utils/noteMatching.ts`
- `src/utils/scrollController.ts`

---

**Document Version:** 1.0
**Last Updated:** 2025-03-15
