# Supabase Publish Setup

This project uses a Supabase Edge Function as a simple proxy so the DashScope API key is not exposed in the browser.

## 1. Create or link a Supabase project

Install and login to Supabase CLI, then link this folder to your project:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Save the secret in Supabase

Never put the real key in GitHub. Store it as a Supabase secret:

```powershell
supabase secrets set DASHSCOPE_API_KEY=your_real_dashscope_api_key
```

## 3. Deploy the Edge Function

```powershell
supabase functions deploy qwen-proxy
```

Your function URL will be:

```text
https://gbertobhdcjqkvbvgena.functions.supabase.co/qwen-proxy
```

## 4. Update the frontend URL

In `mandarin-reader (1).html`, replace:

```js
const SUPABASE_QWEN_PROXY_URL = "https://YOUR_PROJECT_REF.functions.supabase.co/qwen-proxy";
```

with your real Supabase function URL.

This URL is okay to publish. The DashScope API key is not okay to publish.

## 5. Commit only safe files

Safe to commit:

```text
.gitignore
.env.example
supabase/.env.example
supabase/config.toml
supabase/functions/qwen-proxy/index.ts
mandarin-reader (1).html
SUPABASE_SETUP.md
```

Do not commit:

```text
.env
supabase/.env.local
```
