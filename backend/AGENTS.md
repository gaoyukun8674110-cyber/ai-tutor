# Project Operations

## Backend
- Install: `pip install -r requirements.txt`
- Run: `python start.py`
- Validate imports: `python -m compileall app tests`
- Unit tests: `python -m unittest discover -s tests -v`

## Frontend
- Install: `npm install`
- Run: `npm run dev`
- Build: `npm run build`

## Operational Notes
- API keys must stay in backend `.env` files, never in frontend code.
- Chat providers expose safe metadata to the browser; provider adapters call external APIs from the backend only.
- Prompt profiles should remain configurable and not hard-coded to only one teaching method.
- H: drive writes are currently blocked by the sandbox, so implementation is being staged in `ai-tutor-work/`.
