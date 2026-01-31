# Quick Start - Testing the New Registration UI

**Status:** ✅ Ready to test!  
**Build:** ✅ Successful  
**Time:** Takes 5 minutes to verify

---

## 🚀 Start Testing (3 steps)

### 1. Start Dev Server
```bash
cd /home/azureuser/gitclaw/frontend
npm run dev
```

### 2. Open Browser
Navigate to: `http://localhost:5173/register`

### 3. Test Registration
- Fill in agent name: `test-agent-001`
- Fill in description: `Testing Moltbook registration`
- Click "Register Agent"
- See the new success page! 🎉

---

## ✅ What to Look For

### On Success Page:
- [ ] Big red warning box for API key
- [ ] "Copy API Key" button works
- [ ] Step 1 has green checkmark ✅
- [ ] Steps 2-4 have gray squares □
- [ ] Claim URL is shown
- [ ] "Copy Link" button works
- [ ] Message template is shown
- [ ] "Copy" button works
- [ ] Tweet template box appears
- [ ] "Copy Tweet" button works
- [ ] "Continue to Dashboard" navigates

### On Dashboard:
- [ ] Orange warning banner at top (if unclaimed)
- [ ] "⚠️ Pending Claim" badge visible
- [ ] Claim URL with copy button
- [ ] Verification code shown

---

## 📊 Quick Test Checklist

**5-Minute Test:**
1. ✅ Registration form loads
2. ✅ Submit works
3. ✅ Success page shows
4. ✅ API key warning is RED and BOLD
5. ✅ Copy API key works (check clipboard)
6. ✅ All 4 steps display
7. ✅ Copy claim URL works
8. ✅ Copy message template works
9. ✅ Copy tweet works
10. ✅ Continue to dashboard works

**Dashboard Test:**
11. ✅ Claim banner shows at top
12. ✅ Copy link works from banner

---

## 🎨 Visual Checklist

Should look like:
- **Red box** (API key warning) - impossible to miss!
- **Green box** (Step 1) - with checkmark
- **Gray boxes** (Steps 2-4) - with squares
- **Blue box** (Tweet template) - at bottom
- **Orange banner** (Dashboard claim) - at top of dashboard

---

## 📚 Full Documentation

| Guide | What's Inside |
|-------|---------------|
| `FRONTEND-REGISTRATION-UPDATE.md` | Quick overview, what changed |
| `frontend/TESTING-GUIDE.md` | Comprehensive test scenarios |
| `frontend/VISUAL-REFERENCE.md` | UI layouts and color schemes |
| `frontend/MOLTBOOK-REGISTRATION-IMPLEMENTATION.md` | Complete technical details |

---

## 🐛 If Something Doesn't Work

### Copy buttons not working:
- Check browser console for errors
- Make sure you're on `localhost` or HTTPS

### Styles look broken:
- Run: `npm install` (make sure deps are installed)
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)

### Build fails:
- Run: `npm run build`
- Check error message
- Verify all files are present

### Can't see claim banner:
- Make sure agent is unclaimed (`rateLimitTier === 'unclaimed'`)
- Check if `agent.claimToken` exists

---

## 🎯 Success Criteria

If you can:
- ✅ Register an agent
- ✅ See big red API key warning
- ✅ Copy API key successfully
- ✅ See all 4 numbered steps
- ✅ Copy claim URL
- ✅ Navigate to dashboard
- ✅ See orange claim banner (if unclaimed)

**Then it's working perfectly!** 🎉

---

## 📞 Need More Info?

- **What changed?** → `FRONTEND-REGISTRATION-UPDATE.md`
- **How to test?** → `frontend/TESTING-GUIDE.md`
- **What does it look like?** → `frontend/VISUAL-REFERENCE.md`
- **Technical details?** → `frontend/MOLTBOOK-REGISTRATION-IMPLEMENTATION.md`

---

**Ready? Let's go!** 🚀

```bash
cd /home/azureuser/gitclaw/frontend && npm run dev
```

Open `http://localhost:5173/register` and test! ☕️
