import Dashboard from "@/components/Dashboard";
import { loadAllProviders } from "@/lib/data";

export default function Home() {
  const providers = loadAllProviders();

  const hasData = Object.values(providers).some(p => p !== null);

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2">No Data Available</h1>
          <p className="text-gray-400 mb-6">
            Run the scrapers from the project root to generate model data:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-left text-gray-300 space-y-1">
            <code>npm run scrape:azure{"\n"}npm run scrape:aws{"\n"}npm run scrape:azure-databricks{"\n"}npm run scrape:gcp{"\n"}npm run scrape:openai{"\n"}npm run scrape:claude</code>
          </pre>
          <p className="text-gray-500 text-xs mt-4">
            Then reload this page.
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard providers={providers} />;
}
