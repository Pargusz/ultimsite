# YouTube Cookies Setup Guide

YouTube blocks automated requests from servers (like Render/Vercel). To bypass this, you need to provide your personal YouTube cookies.

> [!CAUTION]
> **Security Warning**: These cookies contain your YouTube login session.
> *   Do NOT share them publicly.
> *   Do NOT commit this file to GitHub.
> *   Only paste them into your secure environment variables.

## Step 1: Install a Cookie Exporter Extension

You need a browser extension to export cookies in "Netscape" format.

*   **Chrome/Edge**: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
*   **Firefox**: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)
*   **Safari**: Safari için "Cookie-Editor" veya benzeri bir eklenti mağazada bulunabilir, ancak en kolayı **geçici olarak Chrome veya Firefox kurup** oradan almaktır. Eğer Safari zorunluysa, [Cookie-Editor](https://apps.apple.com/us/app/cookie-editor/id1535783308) uygulamasını deneyebilirsin (Netscape formatında dışarı aktardığından emin ol).

## Step 2: Export Cookies

1.  Open **YouTube.com** and make sure you are logged in.
2.  Click the extension icon.
3.  Click **"Export"** (ensure it says "Netscape HTTP Cookie File" format).
4.  It will download a file (e.g., `youtube.com_cookies.txt`) or copy to clipboard.
5.  Open the file and **Copy everything**.

## Step 3: Add to Environment Variables

You need to add a new environment variable named `YOUTUBE_COOKIES`.

### For Render (Deployment)
1.  Go to your [Render Dashboard](https://dashboard.render.com/).
2.  Select your **Web Service**.
3.  Go to **Environment**.
4.  Click **Add Environment Variable**.
5.  **Key**: `YOUTUBE_COOKIES`
6.  **Value**: *Paste the entire content of the cookies text file here*.
7.  **Save Changes**. Render will automatically redeploy.

### For Local Development (.env)
1.  Open your `.env` (or `.env.local`) file.
2.  Add the variable. Since the cookie content involves newlines, you might need to encode it or use a specific format, but for simple testing, ensure it's a single string if possible, or paste it as is if your loader supports multiline.
    *   *Tip*: For local `.env` files, multiline values can sometimes be tricky.
    *   **Better method for local**: Create a file named `cookies.txt` in your project root (add it to `.gitignore`), and we can modify the code to read from there if needed, BUT for now, the code expects an ENV var.
    *   **Workaround**: You can try removing newlines or just testing on deployment where multiline env vars are supported.

## Updating Cookies
Cookies expire after a few months or if you change your password. If downloads stop working, repeat these steps to get fresh cookies.
