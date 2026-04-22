@echo off
cd /d "C:\Users\Matheus\IdeaProjects\KuHubProject"
set AWS_ACCESS_KEY_ID=AKIAWUWVQ7MYVLKB7BNM
set AWS_SECRET_ACCESS_KEY=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
set AWS_REGION=us-east-1
set PATH=%PATH%;C:\Users\Matheus\AppData\Roaming\Python\Python312\Scripts

echo /add frontend/src/pages/inventario.tsx | ^
aider --model bedrock/global.anthropic.claude-sonnet-4-6 --no-auto-commit --encoding utf-8 --dark-mode 2>&1
