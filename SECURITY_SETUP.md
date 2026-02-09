# 🔒 Security Setup - Simple Instructions

Your API key was exposed, but it's been disabled. Here's how to fix it:

## ✅ Step 1: Get Your New API Key
1. Go to https://openrouter.ai/keys
2. Create a new API key
3. Copy the entire key (it starts with `sk-or-v1-`)

## ✅ Step 2: Paste Your New Key (THIS IS WHERE YOU PASTE IT!)
1. Open the file: `backend/.dev.vars`
2. Find this line: `OPENROUTER_API_KEY=paste_your_new_key_here`
3. Replace `paste_your_new_key_here` with your actual key
4. Save the file

**Example:**
