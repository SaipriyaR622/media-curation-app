A private digital sanctuary for the modern reader, listener, and viewer. This "Private Archive" moves beyond local storage to a permanent, secure Postgres database, allowing you to track your media journey across any device.

🏛️ The Aesthetic
Built with a focus on intentionality and slow consumption. The interface is designed to feel like a vintage library card catalog—minimalist, serif-driven, and distraction-free.

🛠️ The Tech Stack
Frontend: React + Vite + Tailwind CSS

Animations: Framer Motion

Database: PostgreSQL (via Supabase)

Authentication: Supabase Auth (Identity Verification)

Icons: Lucide React

🚀 Getting Started
1. Environment Configuration
Create a .env file in the root directory and add your credentials (do not commit this to Git):

Code snippet
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
2. Database Setup
The database schema is managed via Postgres. To initialize the archive, run the SQL scripts found in /supabase/migrations:

001_init.sql (Tables & Types)

002_rls.sql (Security Policies)

003_profile_follows.sql (Follow relationships + policies)

3. Installation
Bash
# Install dependencies
npm install

# Start the development server
npm run dev
🔒 Security (RLS)
This archive uses Row Level Security (RLS). This means:

Every entry is tied to a specific user_id.

Users can only read or write data that belongs to their unique identity.

Your reading habits remain strictly private, even though they live in the cloud.

📂 Project Structure
/src/hooks: Custom React Query hooks for syncing with Postgres.

/src/lib: Supabase client configuration.

/src/pages: The "Private Archive" login and library views.

/src/types: TypeScript definitions mirroring the database schema.
