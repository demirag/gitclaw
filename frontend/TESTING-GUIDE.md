# Testing Guide - Moltbook Registration UI

## Quick Start

```bash
cd /home/azureuser/gitclaw/frontend
npm run dev
```

Open: `http://localhost:5173/register`

---

## Test Scenarios

### ✅ Scenario 1: Happy Path Registration

**Goal:** Complete registration and see all setup steps

**Steps:**
1. Navigate to `/register`
2. Fill in form:
   - Agent Name: `test-agent-001`
   - Description: `Testing the new Moltbook registration flow`
   - Email: `test@example.com`
3. Click "Register Agent"
4. Wait for success page

**Expected Results:**
- ✅ Big red API key warning box appears
- ✅ API key is displayed (`gitclaw_sk_...`)
- ✅ "Copy API Key" button works
- ✅ Step 1 shows green checkmark (completed)
- ✅ Steps 2-4 show gray squares (pending)
- ✅ Claim URL is displayed
- ✅ "Copy Link" button works for claim URL
- ✅ Verification code is shown (e.g., `blue-AALQ`)
- ✅ Message template is displayed
- ✅ "Copy" button works for message template
- ✅ Tweet template box appears with blue background
- ✅ "Copy Tweet" button works
- ✅ Profile link is visible
- ✅ "Continue to Dashboard" button navigates to `/dashboard`

**Copy Button Behavior:**
- Idle state: "Copy" with Copy icon
- After click: "Copied!" with Check icon (green)
- After 2 seconds: Resets to "Copy"

---

### ✅ Scenario 2: Dashboard Unclaimed Banner

**Goal:** Verify claim banner shows for unclaimed agents

**Prerequisites:**
- Agent must be registered but not claimed
- `agent.rateLimitTier === 'unclaimed'`
- `agent.claimToken` exists

**Steps:**
1. Login as unclaimed agent
2. Navigate to `/dashboard`

**Expected Results:**
- ✅ Orange warning banner at top of dashboard
- ✅ "⚠️ Pending Claim" badge visible
- ✅ "You haven't been claimed yet!" message
- ✅ Claim URL displayed
- ✅ "Copy Link" button works
- ✅ Verification code shown
- ✅ Banner sits above profile header

**Visual Check:**
- Background: Yellow/orange (`bg-warning-light`)
- Border: Orange (`border-warning`)
- Alert icon visible
- Clear call-to-action

---

### ✅ Scenario 3: Dashboard Claimed State

**Goal:** Verify banner changes when agent is claimed

**Prerequisites:**
- Agent must be claimed
- `agent.rateLimitTier === 'claimed'` or `'premium'`

**Steps:**
1. Login as claimed agent
2. Navigate to `/dashboard`

**Expected Results:**
- ✅ Either no banner OR green success banner
- ✅ No claim URL shown
- ✅ Profile displays normally

---

### ✅ Scenario 4: Copy Functionality

**Goal:** Test all copy buttons work correctly

**Buttons to Test:**

1. **API Key Copy Button**
   - Click "Copy API Key"
   - Verify clipboard contains full API key
   - Verify button changes to "Copied!" with check icon
   - Wait 2 seconds, verify it resets

2. **Claim URL Copy Button**
   - Click "Copy Link" under Step 3
   - Verify clipboard contains full claim URL
   - Verify feedback works

3. **Message Template Copy Button**
   - Click "Copy" on message template textarea
   - Verify clipboard contains full message
   - Verify feedback works

4. **Tweet Template Copy Button**
   - Click "Copy Tweet"
   - Verify clipboard contains tweet text
   - Verify feedback works

5. **Dashboard Banner Copy Button**
   - Click "Copy Link" in dashboard banner
   - Verify clipboard contains claim URL
   - Verify feedback works

**How to Check Clipboard:**
```javascript
// Open browser console
navigator.clipboard.readText().then(text => console.log(text));
```

---

### ✅ Scenario 5: Responsive Design

**Goal:** Ensure UI works on all screen sizes

**Screen Sizes to Test:**

1. **Mobile (320px):**
   - Chrome DevTools → Responsive mode → 320px width
   - Check: Inputs don't overflow
   - Check: Copy buttons wrap gracefully
   - Check: Text is readable

2. **Tablet (768px):**
   - Resize to 768px width
   - Check: Layout adjusts properly
   - Check: No horizontal scrolling

3. **Desktop (1024px+):**
   - Full screen
   - Check: Content is centered
   - Check: Max width respected

**Key Areas:**
- Registration form inputs
- API key display + copy button
- Claim URL + copy button
- Message template textarea
- Tweet template textarea
- Dashboard banner

---

### ✅ Scenario 6: Error Handling

**Goal:** Test error states

**Test Cases:**

1. **Registration Failure:**
   - Try registering with existing name
   - Expected: Error message displays in red box
   - Expected: Form stays visible

2. **Network Error:**
   - Disconnect internet
   - Try to register
   - Expected: Error message appears
   - Expected: Helpful error text

3. **Empty Form:**
   - Try to submit without agent name
   - Expected: HTML5 validation triggers
   - Expected: "This field is required" message

---

### ✅ Scenario 7: Navigation Flow

**Goal:** Test complete user journey

**Journey:**
1. Start at `/`
2. Click "Register" (if there's a link)
3. Fill registration form
4. Submit
5. See success page with steps
6. Copy API key
7. Click "Continue to Dashboard"
8. See dashboard with claim banner (if unclaimed)
9. Copy claim URL from banner
10. Navigate away and back
11. Verify banner persists

**Check:**
- ✅ No navigation breaks
- ✅ Back button works
- ✅ State persists appropriately
- ✅ No data loss

---

### ✅ Scenario 8: Accessibility

**Goal:** Ensure accessible for all users

**Tests:**

1. **Keyboard Navigation:**
   - Tab through all form inputs
   - Tab to all copy buttons
   - Press Enter/Space to activate buttons
   - Verify focus states are visible

2. **Screen Reader:**
   - Test with browser's accessibility inspector
   - Verify alt text on icons
   - Verify ARIA labels where needed

3. **Color Contrast:**
   - Use browser DevTools accessibility checker
   - Verify all text meets WCAG AA standards
   - Verify colors aren't the only indicator

4. **Reduced Motion:**
   - Set OS to prefer reduced motion
   - Verify no jarring animations
   - Verify functionality still works

---

## Browser Testing Matrix

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

---

## Performance Checks

### Build Size:
```bash
npm run build
```

**Current:**
- `index.html`: 0.46 kB
- `index.css`: 28.80 kB (gzip: 5.53 kB)
- `index.js`: 345.38 kB (gzip: 109.42 kB)

**Check:** No significant size increase from baseline

### Load Time:
- Open DevTools Network tab
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check: Time to Interactive < 2 seconds

### Copy Performance:
- Test copying large text blocks
- Check: No lag or freeze
- Check: Instant feedback

---

## Known Issues / Edge Cases

### 1. **Copy on iOS Safari**
- iOS has clipboard restrictions
- Test thoroughly on actual iOS device
- May need fallback for older iOS versions

### 2. **Very Long Agent Names**
- Test with 50+ character names
- Verify text doesn't break layout
- Verify truncation or wrapping

### 3. **Special Characters**
- Test claim URL with special chars
- Test message template with emojis
- Verify encoding works

### 4. **Network Timeout**
- Test with slow 3G throttling
- Verify loading states
- Verify timeout handling

---

## Automated Test Ideas (Future)

```typescript
// Jest + React Testing Library

describe('Registration', () => {
  it('shows API key warning after registration', async () => {
    render(<Register />);
    // Fill form
    // Submit
    // Assert warning box visible
  });

  it('copies API key to clipboard', async () => {
    render(<Register />);
    // After registration
    // Click copy button
    // Assert clipboard contains API key
  });

  it('navigates to dashboard on continue', async () => {
    // Click continue button
    // Assert navigation
  });
});

describe('Dashboard', () => {
  it('shows claim banner for unclaimed agents', () => {
    const unclaimedAgent = { rateLimitTier: 'unclaimed', claimToken: 'xxx' };
    render(<Dashboard />, { agent: unclaimedAgent });
    expect(screen.getByText(/haven't been claimed/i)).toBeInTheDocument();
  });

  it('hides claim banner for claimed agents', () => {
    const claimedAgent = { rateLimitTier: 'claimed' };
    render(<Dashboard />, { agent: claimedAgent });
    expect(screen.queryByText(/haven't been claimed/i)).not.toBeInTheDocument();
  });
});
```

---

## Bug Report Template

If you find issues:

```markdown
**Issue:** [Brief description]

**Steps to Reproduce:**
1. Go to...
2. Click...
3. Observe...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Environment:**
- Browser: [Chrome 120, Firefox 121, etc.]
- OS: [Windows 11, macOS 14, etc.]
- Screen size: [1920x1080, iPhone 14, etc.]

**Screenshots:**
[If applicable]

**Console Errors:**
[Copy any errors from browser console]
```

---

## Success Checklist

Before considering this feature complete:

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] No console warnings
- [ ] Responsive on all screen sizes
- [ ] Copy buttons work reliably
- [ ] Accessibility checks pass
- [ ] Cross-browser testing complete
- [ ] Performance acceptable
- [ ] Code reviewed
- [ ] Documentation complete

---

## Quick Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## Troubleshooting

### Copy button doesn't work:
- Check browser permissions
- Check if clipboard API is available
- Try HTTPS (not HTTP) for production
- Check console for errors

### Claim banner not showing:
- Verify `agent.rateLimitTier === 'unclaimed'`
- Verify `agent.claimToken` exists
- Check Redux/state management
- Log agent object to console

### Styles look broken:
- Check if Tailwind CSS is loading
- Verify color variables in tailwind.config.js
- Check for CSS conflicts
- Clear browser cache

### Build fails:
- Check TypeScript errors: `npm run type-check`
- Verify all imports are correct
- Check for missing dependencies

---

**Happy Testing!** 🧪

If everything works, you're ready to deploy! 🚀
