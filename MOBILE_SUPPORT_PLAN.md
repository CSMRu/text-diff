# Mobile Support Implementation Plan

This document outlines the detailed strategy for adding robust mobile support to the text-diff project.
**Goal**: Provide a native-app-like experience for mobile users without compromising the stability of the desktop version.

## 1. Core Strategy: "Dedicated Entry Point"
We will separate the mobile experience into a new HTML file (`mobile.html`) rather than complicating the existing `index.html` with excessive responsive CSS and conditional JS logic.

### Why this approach?
- **Stability**: The complex grid layouts and keyboard shortcuts of the desktop version are left untouched.
- **Optimization**: Mobile users only load `mobile.css` and `mobile-ui.js`, preventing the downloading of unnecessary desktop-specific styles and logic.
- **Flexibility**: We can implement touch gestures (swipe, long-press) freely without conflicting with mouse events.

## 2. Architecture & File Structure

### New Files to Create
- **`mobile.html`**: The mobile-specific skeleton. Use a simplified DOM structure (Vertical Stack vs Grid).
- **`css/mobile.css`**: Mobile-exclusive styles. Replaces `layout.css`.
- **`js/mobile-ui.js`**: Mobile-exclusive logic. Replaces `ui.js`.

### Shared Resources (Do Not Modify / Reuse)
These files contain the core "Business Logic" and should be reused as-is:
- `js/renderer.js`: Handles the generation of HTML for diffs.
- `js/shared-utils.js`: Core math and string manipulation helpers.
- `js/worker-manager.js`: Web Worker management for performance.
- `css/base.css`: Defines CSS Variables (colors, spacing) to keep branding consistent.
- `css/components.css`: Reusable UI components (Buttons, Toasts).

## 3. Detailed Implementation Steps

### Step 1: Mobile Skeleton Setup (`mobile.html`)
- Copy `index.html` to `mobile.html`.
- **Clean up**:
  - Remove Reference to `css/layout.css` -> Replace with `css/mobile.css`.
  - Remove Reference to `js/ui.js` -> Replace with `js/mobile-ui.js`.
  - **Flatten Structure**: Convert the `.panel-group` (Grid) into a simple single-column layout.
  - Remove "Drag & Drop" overlays (Mobile browsers handle file input natively).

### Step 2: Mobile UI Logic (`js/mobile-ui.js`)
Create a streamlined `MobileUIController` class.
- **Input Handling**:
  - Remove "Drag and Drop" event listeners.
  - Keep `FileReader` logic for file uploads.
- **Navigation**:
  - Remove Keyboard Shortcut listeners (Arrow keys, W/A/S/D).
  - Implement larger "Next/Prev Change" buttons fixed at the bottom of the screen.
- **View Mode**:
  - Default to a view that emphasizes the *Result* or provides easy tabbing between *Input* and *Result* if screen real estate is too small.

### Step 3: Mobile Styling (`css/mobile.css`)
- **Viewport Config**: Ensure `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` is set to prevent accidental zooming while tapping controls.
- **Touch Targets**: Ensure all clickable elements (buttons, inputs) are at least **44px height**.
- **Layout**:
  - `display: grid` -> `display: flex; flex-direction: column;`.
  - Remove `min-width: 1200px` restrictions. Allow content to shrink to device width (e.g., 360px).
- **Typography**: Increase base font size slightly (e.g., 14px -> 16px) for legibility without zooming.

### Step 4: Intelligent Redirection
We must redirect users based on device width but allow them to switch back manually.

**In `index.html` (Head):**
```javascript
(function() {
    // Redirect only if width < 768px AND user didn't explicitly request desktop mode
    if (window.innerWidth < 768 && !window.location.search.includes('mode=desktop')) {
        window.location.replace('mobile.html');
    }
})();
```

**In `mobile.html`:**
- Add a "Desktop Version" link: `<a href="index.html?mode=desktop">Desktop Version</a>`
- This ensures users are never "trapped" in the mobile view if they prefer the dense layout.

## 4. Risks & Mitigations
- **Issue**: Redirect Loops (Mobile -> Desktop -> Mobile).
  - **Fix**: The `?mode=desktop` query parameter prevents the redirect script in `index.html` from firing again.
- **Issue**: Shared `js/renderer.js` dependencies.
  - **Fix**: Ensure `MobileUIController` exposes the exact same method signatures (e.g., `updateStats`, `showLoading`) that `renderer.js` expects from the UI object.

## 5. Definition of Done
- [ ] Users visiting `index.html` on mobile are redirected to `mobile.html`.
- [ ] `mobile.html` loads without horizontal scrolling.
- [ ] File uploads and text input work on mobile.
- [ ] Diff generation works (reusing the existing worker).
- [ ] "Next Change" buttons are easily tappable with a thumb.
