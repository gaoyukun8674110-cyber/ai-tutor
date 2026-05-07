
  # AI学习系统

  This is a code bundle for AI学习系统. The original project is available at https://www.figma.com/design/TQnY3l8YenOePMGty3bHtd/AI%E5%AD%A6%E4%B9%A0%E7%B3%BB%E7%BB%9F.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Tutor RAG v1

  Tutor chat sidebar now includes a study-material uploader for `.txt`, `.md`, `.docx`, `.pdf`, and `.epub`. Selected materials are sent to the backend as `tutor_context.material_ids`, and retrieved chunks are shown under the latest Tutor answer as source references.

  ## Architecture / Decision Records

  - Backend project now lives at `../backend` inside the `H:\ai-tutor` monorepo; API contract changes should be versioned with the frontend changes that consume them.
  - Dashboard data is cached with TanStack Query so returning to the dashboard does not blindly refetch on every view switch.
  - Browser API calls go through `src/utils/apiClient.ts`, which centralizes `VITE_API_BASE_URL`, `X-API-Key`, JSON errors, uploads, and abort signals.
  - Tutor markdown is sanitized before KaTeX rendering, and model/API errors render as UI banners instead of fake assistant messages.
  - The UI keeps only the shadcn primitives used in business code (`Button`, `Select`) to reduce dependency surface and install time.
  
