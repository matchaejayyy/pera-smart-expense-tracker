import { RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return <main className="offline-shell"><section><span><WifiOff size={28} /></span><p className="eyebrow">Pera is offline</p><h1>Your private records need a connection.</h1><p>Reconnect to load current balances and save changes. Financial pages and API responses are never stored in the offline cache.</p><a href="/dashboard"><RefreshCw size={15} />Try again</a></section></main>;
}
